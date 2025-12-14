from sqlalchemy.orm import Session
import models, schemas
import uuid
from datetime import datetime
import json

def get_patient(db: Session, patient_id: str):
    return db.query(models.Patient).filter(models.Patient.id == patient_id).first()

def get_patients(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Patient).offset(skip).limit(limit).all()

def generate_patient_id(db: Session) -> str:
    # Fetch all IDs
    patients = db.query(models.Patient.id).all()
    # Extract integer parts safely
    existing_ids = []
    for p in patients:
        try:
            # Assuming format is like "001", "002", etc.
            val = int(p.id)
            existing_ids.append(val)
        except ValueError:
            pass # Ignore UUIDs or malformed IDs
    
    max_id = max(existing_ids) if existing_ids else 0
    next_id = max_id + 1
    return str(next_id).zfill(3)

def create_patient(db: Session, patient: schemas.PatientBase, prediction: schemas.PredictionResult):
    new_id = generate_patient_id(db)
    
    # Create initial vital entry
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
        **patient.dict(),
        **prediction.dict(),
        hourlyVitals=[initial_vitals] # Initialize with first entry
    )
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return db_patient

def update_patient(db: Session, patient_id: str, updates: dict):
    # simplistic update
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
