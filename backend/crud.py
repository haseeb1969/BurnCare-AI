from sqlalchemy.orm import Session
import models, schemas
import uuid
from datetime import datetime
from auth import get_password_hash
from services.triage_service import run_allocation

# --- User CRUD ---
def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        full_name=user.full_name,
        role=user.role,
        license_number=user.license_number,
        specialization=user.specialization,
        phone_number=user.phone_number,
        hospital_id=user.hospital_id,
        assigned_location=user.assigned_location,
        is_approved=(user.role == "ADMIN") # Auto-approve admins for now, or use a system flag
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def get_pending_users(db: Session, hospital_id: str):
    return db.query(models.User).filter(
        models.User.hospital_id == hospital_id,
        models.User.is_approved == False
    ).all()

def update_user(db: Session, user_id: str, updates: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        if updates.is_approved is not None:
            db_user.is_approved = updates.is_approved
        if updates.assigned_location is not None:
            db_user.assigned_location = updates.assigned_location
        db.commit()
        db.refresh(db_user)
    return db_user

def get_hospital_users(db: Session, hospital_id: str):
    return db.query(models.User).filter(models.User.hospital_id == hospital_id).all()

def update_hospital_beds(db: Session, hospital_id: str, total_beds: int):
    db_hospital = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
    if db_hospital:
        db_hospital.total_icu_beds = total_beds
        db.commit()
        db.refresh(db_hospital)
        # Recalculate triage for all patients in this hospital
        recalculate_hospital_triage(db, hospital_id)
    return db_hospital

def get_doctors_by_location(db: Session, hospital_id: str):
    doctors = db.query(models.User).filter(
        models.User.hospital_id == hospital_id,
        models.User.role == "DOCTOR",
        models.User.is_approved == True
    ).order_by(models.User.created_at.asc()).all()

    by_location = {
        "ICU": [d for d in doctors if d.assigned_location == "ICU"],
        "Ward": [d for d in doctors if d.assigned_location == "Ward"],
        "ALL": doctors
    }
    return by_location

def rebalance_patient_doctor_assignments(db: Session, hospital_id: str, active_patients):
    doctors_by_location = get_doctors_by_location(db, hospital_id)
    all_doctors = doctors_by_location["ALL"]
    if not all_doctors:
        for p in active_patients:
            p.assigned_doctor_id = None
        return

    load_by_doctor = {doctor.id: 0 for doctor in all_doctors}

    # Deterministic ordering keeps assignment stable for equivalent loads.
    ordered_patients = sorted(active_patients, key=lambda p: ((p.timestamp or ""), p.id or ""))
    for patient in ordered_patients:
        location = patient.location if patient.location in ("ICU", "Ward") else "Ward"
        pool = doctors_by_location[location] if doctors_by_location[location] else all_doctors

        chosen = min(pool, key=lambda d: (load_by_doctor[d.id], d.created_at or ""))
        patient.assigned_doctor_id = chosen.id
        load_by_doctor[chosen.id] += 1

def attach_patient_context(db: Session, patient):
    if not patient:
        return patient

    if patient.hospital_id:
        hospital = db.query(models.Hospital).filter(models.Hospital.id == patient.hospital_id).first()
        if hospital:
            patient.hospital_name = hospital.name

    patient.assigned_doctor_name = None
    patient.assigned_doctor_location = None
    patient.baseline_assigned_doctor_name = None
    patient.baseline_assigned_doctor_location = None

    if patient.assigned_doctor_id:
        doctor = db.query(models.User).filter(models.User.id == patient.assigned_doctor_id).first()
        if doctor:
            patient.assigned_doctor_name = doctor.full_name
            patient.assigned_doctor_location = doctor.assigned_location

    if getattr(patient, 'baseline_assigned_doctor_id', None):
        baseline_doctor = db.query(models.User).filter(models.User.id == patient.baseline_assigned_doctor_id).first()
        if baseline_doctor:
            patient.baseline_assigned_doctor_name = baseline_doctor.full_name
            patient.baseline_assigned_doctor_location = baseline_doctor.assigned_location

    return patient

def recalculate_hospital_triage(db: Session, hospital_id: str):
    hospital = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
    if not hospital:
        return
        
    patients = db.query(models.Patient).filter(
        models.Patient.hospital_id == hospital_id,
        models.Patient.status == "Active"
    ).all()
    
    # Compute allocation recommendations but DO NOT apply them automatically.
    # This will return entries with recommended allocations.
    entries = run_allocation(patients, hospital.total_icu_beds, apply_changes=False)

    # Update benefit_score on patients and keep relocation notifications in sync
    # with the latest mortality risk / recommendation.
    for e in entries:
        p = e["patient"]
        p.benefit_score = e.get("benefit_score")
        recommended = e.get("allocation")
        current_location = p.location or 'Ward'

        doctor_id = p.assigned_doctor_id
        vitals_snapshot = None
        try:
            vitals_snapshot = p.hourlyVitals[-1] if p.hourlyVitals else None
        except Exception:
            vitals_snapshot = None

        existing_pending = db.query(models.Notification).filter(
            models.Notification.patient_id == p.id,
            models.Notification.status == 'pending'
        ).first()

        if recommended and recommended != current_location:
            # Relocation is needed: create/update pending request for the doctor.
            if existing_pending:
                existing_pending.doctor_id = doctor_id
                existing_pending.hospital_id = p.hospital_id
                existing_pending.proposed_location = recommended
                existing_pending.proposedMortalityRisk = p.currentMortalityRisk or p.mortalityRiskPercent
                existing_pending.vitals_snapshot = vitals_snapshot
                existing_pending.original_location = current_location
                existing_pending.original_assigned_doctor_id = p.assigned_doctor_id
                existing_pending.created_at = datetime.now().isoformat()
            else:
                notif = models.Notification(
                    patient_id=p.id,
                    doctor_id=doctor_id,
                    hospital_id=p.hospital_id,
                    proposed_location=recommended,
                    proposedMortalityRisk=p.currentMortalityRisk or p.mortalityRiskPercent,
                    vitals_snapshot=vitals_snapshot,
                    original_location=current_location,
                    original_assigned_doctor_id=p.assigned_doctor_id,
                )
                db.add(notif)
        else:
            # No relocation needed anymore: remove stale pending request.
            if existing_pending:
                db.delete(existing_pending)

    db.commit()
    # Attach context for returning
    for patient in patients:
        attach_patient_context(db, patient)
    return patients


# --- Notification CRUD ---
def get_notifications_for_doctor(db: Session, doctor_id: str, skip: int = 0, limit: int = 100):
    query = db.query(models.Notification).filter(
        models.Notification.doctor_id == doctor_id,
        models.Notification.status == 'pending'
    ).order_by(models.Notification.created_at.desc())
    notifs = query.offset(skip).limit(limit).all()
    return notifs


def get_notifications_for_staff(db: Session, hospital_id: str, location: str, skip: int = 0, limit: int = 100):
    query = db.query(models.Notification).filter(
        models.Notification.hospital_id == hospital_id,
        models.Notification.status.in_(['approved', 'completed']),
        models.Notification.proposed_location == location
    ).order_by(models.Notification.created_at.desc())
    notifs = query.offset(skip).limit(limit).all()
    return notifs


def complete_notification(db: Session, notification_id: str, staff_id: str):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        return None
    if notif.status != 'approved':
        return None

    notif.status = 'completed'
    notif.responded_by = staff_id
    notif.responded_at = datetime.now().isoformat()
    db.commit()
    db.refresh(notif)
    return notif

def create_notification(db: Session, patient_id: str, doctor_id: str, hospital_id: str, proposed_location: str, mortality: float = None, vitals_snapshot = None):
    notif = models.Notification(
        patient_id=patient_id,
        doctor_id=doctor_id,
        hospital_id=hospital_id,
        proposed_location=proposed_location,
        proposedMortalityRisk=mortality,
        vitals_snapshot=vitals_snapshot,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif

def respond_notification(db: Session, notification_id: str, approver_id: str, action: str):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id).first()
    if not notif:
        return None
    if notif.status != 'pending':
        return notif

    if action not in ('approve','reject'):
        return None

    notif.status = 'approved' if action == 'approve' else 'rejected'
    notif.responded_by = approver_id
    notif.responded_at = datetime.now().isoformat()

    # If approved, apply the allocation change
    if action == 'approve':
        patient = db.query(models.Patient).filter(models.Patient.id == notif.patient_id).first()
        if patient:
            patient.location = notif.proposed_location
            db.commit()
            # Rebalance doctor assignments now that locations have changed
            active_patients = db.query(models.Patient).filter(models.Patient.hospital_id == notif.hospital_id, models.Patient.status == 'Active').all()
            rebalance_patient_doctor_assignments(db, notif.hospital_id, active_patients)
    else:
        # If rejected, ensure we do not apply the proposed allocation.
        # If some background process already applied the change erroneously, revert it to the original
        # snapshot saved on the notification.
        patient = db.query(models.Patient).filter(models.Patient.id == notif.patient_id).first()
        if patient and getattr(notif, 'original_location', None):
            if patient.location != notif.original_location:
                patient.location = notif.original_location
                db.commit()
                active_patients = db.query(models.Patient).filter(models.Patient.hospital_id == notif.hospital_id, models.Patient.status == 'Active').all()
                rebalance_patient_doctor_assignments(db, notif.hospital_id, active_patients)

    db.commit()
    db.refresh(notif)
    return notif

# --- Hospital CRUD ---
def create_hospital(db: Session, hospital: schemas.HospitalCreate):
    db_hospital = models.Hospital(**hospital.dict())
    db.add(db_hospital)
    db.commit()
    db.refresh(db_hospital)
    return db_hospital

# --- Patient CRUD ---
def get_patient(db: Session, patient_id: str):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    return attach_patient_context(db, patient)

def get_patients(db: Session, hospital_id: str = None, skip: int = 0, limit: int = 100, location: str = None):
    query = db.query(models.Patient)
    if hospital_id:
        query = query.filter(models.Patient.hospital_id == hospital_id)
    if location in ("Ward", "ICU"):
        query = query.filter(models.Patient.location == location)
    patients = query.offset(skip).limit(limit).all()
    
    for patient in patients:
        attach_patient_context(db, patient)
    
    return patients

def get_patients_assigned_to_doctor(db: Session, doctor_id: str, skip: int = 0, limit: int = 100):
    query = db.query(models.Patient).filter(
        models.Patient.assigned_doctor_id == doctor_id,
        models.Patient.status == "Active"
    )
    patients = query.offset(skip).limit(limit).all()
    
    for patient in patients:
        attach_patient_context(db, patient)
    
    return patients

def generate_patient_id(db: Session) -> str:
    patients = db.query(models.Patient.id).all()
    existing_ids = []
    for p in patients:
        try:
            val = int(p.id)
            existing_ids.append(val)
        except ValueError:
            pass
    
    max_id = max(existing_ids) if existing_ids else 0
    next_id = max_id + 1
    return str(next_id).zfill(3)

def create_patient(db: Session, patient: schemas.PatientBase, prediction: schemas.PredictionResult, user_id: str, hospital_id: str):
    new_id = generate_patient_id(db)
    
    initial_vitals = {
        "timestamp": datetime.now().isoformat(),
        "temperature": patient.temperature,
        "systolicBP": patient.systolicBP,
        "diastolicBP": patient.diastolicBP,
        "heartRate": patient.heartRate,
        "spo2": patient.spo2,
        "urineOutput": patient.urineOutput,
        "gcsEye": patient.gcsEye,
        "gcsVerbal": patient.gcsVerbal,
        "gcsMotor": patient.gcsMotor
    }

    # Determine initial location based on triage risk
    # High risk patients are automatically assigned to ICU
    determined_location = "ICU" if prediction.riskLevel == "High" else "Ward"
    
    # Prepare patient data from schema, removing the 'location' field to avoid duplicate keyword argument error
    patient_data = patient.dict()
    if "location" in patient_data:
        del patient_data["location"]

    db_patient = models.Patient(
        id=new_id,
        timestamp=datetime.now().isoformat(),
        status="Active",
        location=determined_location,
        baseline_location=determined_location,
        hospital_id=hospital_id,
        created_by=user_id,
        **patient_data,
        **prediction.dict(),
        hourlyVitals=[initial_vitals]
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    
    # New patient added, recalculate triage for the whole hospital
    recalculate_hospital_triage(db, hospital_id)

    # Capture the initial assigned doctor after triage runs so it remains a
    # stable baseline even if later relocations rebalance doctor assignment.
    db.refresh(db_patient)
    if not db_patient.baseline_assigned_doctor_id and db_patient.assigned_doctor_id:
        db_patient.baseline_assigned_doctor_id = db_patient.assigned_doctor_id
        db.commit()
        db.refresh(db_patient)

    return get_patient(db, db_patient.id)

def update_patient(db: Session, patient_id: str, updates: dict):
    # If hourlyVitals provided, mirror the latest entry into top-level vitals
    try:
        if 'hourlyVitals' in updates and updates.get('hourlyVitals'):
            last = updates['hourlyVitals'][-1]
            # Map common vital fields from the last entry to patient columns
            if isinstance(last, dict):
                vitals_map = {
                    'systolicBP': last.get('systolicBP'),
                    'diastolicBP': last.get('diastolicBP'),
                    'temperature': last.get('temperature'),
                    'heartRate': last.get('heartRate'),
                    'spo2': last.get('spo2'),
                    'urineOutput': last.get('urineOutput'),
                    'gcsEye': last.get('gcsEye'),
                    'gcsVerbal': last.get('gcsVerbal'),
                    'gcsMotor': last.get('gcsMotor')
                }
                # Only set keys that have non-None values
                for k, v in vitals_map.items():
                    if v is not None:
                        updates[k] = v
    except Exception:
        pass

    db.query(models.Patient).filter(models.Patient.id == patient_id).update(updates)
    db.commit()
    return get_patient(db, patient_id)

def delete_patient(db: Session, patient_id: str):
    patient = db.query(models.Patient).filter(models.Patient.id == patient_id).first()
    if patient:
        db.delete(patient)
        db.commit()
    return patient

def update_patient_risk(db: Session, patient_id: str, mortality: float, risk: str, sofa: float):
    patient = get_patient(db, patient_id)
    if patient:
        patient.currentMortalityRisk = mortality
        patient.currentRiskLevel = risk
        patient.currentSofaScore = sofa
        db.commit()
        db.refresh(patient)
        # Risk changed, recalculate triage for the whole hospital
        recalculate_hospital_triage(db, patient.hospital_id)
        return get_patient(db, patient_id)
    return patient
