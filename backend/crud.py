from sqlalchemy.orm import Session
import models, schemas
import uuid
from datetime import datetime
from auth import get_password_hash

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

def update_user_approval(db: Session, user_id: str, is_approved: bool):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db_user.is_approved = is_approved
        db.commit()
        db.refresh(db_user)
    return db_user

# --- Hospital CRUD ---
def create_hospital(db: Session, hospital: schemas.HospitalCreate):
    db_hospital = models.Hospital(**hospital.dict())
    db.add(db_hospital)
    db.commit()
    db.refresh(db_hospital)
    return db_hospital

# --- Patient CRUD ---
def get_patient(db: Session, patient_id: str):
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()

def get_patients(db: Session, hospital_id: str = None, skip: int = 0, limit: int = 100):
    query = db.query(models.Patient)
    if hospital_id:
        query = query.filter(models.Patient.hospital_id == hospital_id)
    return query.offset(skip).limit(limit).all()

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

    db_patient = models.Patient(
        id=new_id,
        timestamp=datetime.now().isoformat(),
        status="Active",
        hospital_id=hospital_id,
        created_by=user_id,
        **patient.dict(),
        **prediction.dict(),
        hourlyVitals=[initial_vitals]
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

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
    return patient
