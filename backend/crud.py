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

    if patient.assigned_doctor_id:
        doctor = db.query(models.User).filter(models.User.id == patient.assigned_doctor_id).first()
        if doctor:
            patient.assigned_doctor_name = doctor.full_name
            patient.assigned_doctor_location = doctor.assigned_location

    return patient

def recalculate_hospital_triage(db: Session, hospital_id: str):
    hospital = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
    if not hospital:
        return
        
    patients = db.query(models.Patient).filter(
        models.Patient.hospital_id == hospital_id,
        models.Patient.status == "Active"
    ).all()
    
    run_allocation(patients, hospital.total_icu_beds)
    rebalance_patient_doctor_assignments(db, hospital_id, patients)
    db.commit()
    for patient in patients:
        attach_patient_context(db, patient)
    return patients

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
    return get_patient(db, db_patient.id)

def update_patient(db: Session, patient_id: str, updates: dict):
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
