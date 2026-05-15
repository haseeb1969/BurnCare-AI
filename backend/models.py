from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

def generate_uuid():
    return str(uuid.uuid4())

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, index=True)
    address = Column(String, nullable=True)
    total_icu_beds = Column(Integer, default=5)

    # Relationships
    users = relationship("User", back_populates="hospital")
    patients = relationship("Patient", back_populates="hospital")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String) # "ADMIN", "DOCTOR", "STAFF"
    assigned_location = Column(String, default="Ward") # "Ward", "ICU", "N/A"
    license_number = Column(String, nullable=True)
    specialization = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    hospital_id = Column(String, ForeignKey("hospitals.id"))
    is_approved = Column(Boolean, default=False)
    created_at = Column(String, default=lambda: datetime.now().isoformat())

    # Relationships
    hospital = relationship("Hospital", back_populates="users")
    created_patients = relationship("Patient", back_populates="creator")

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True) 
    timestamp = Column(String)
    status = Column(String, default="Active")
    location = Column(String, default="Ward") # "Ward", "ICU"
    baseline_location = Column(String, nullable=True)
    
    # Multi-tenancy & Ownership
    hospital_id = Column(String, ForeignKey("hospitals.id"))
    created_by = Column(String, ForeignKey("users.id"))
    assigned_doctor_id = Column(String, nullable=True)
    baseline_assigned_doctor_id = Column(String, nullable=True)

    # Patient Data
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    tbsa = Column(Float)
    burnDepth = Column(String)
    inhalationInjury = Column(Boolean)
    comorbidities = Column(String)
    burnedRegions = Column(JSON) # List of strings
    bodyMapImage = Column(Text, nullable=True) # Base64 drawing
    triage_override = Column(String, nullable=True) # "ForceICU", "ForceWard", null
    benefit_score = Column(Float, nullable=True)

    # Hemodynamics
    heartRate = Column(Float)
    systolicBP = Column(Float)
    diastolicBP = Column(Float)
    temperature = Column(Float)

    # Respiratory
    spo2 = Column(Float)
    pao2 = Column(Float)
    fio2 = Column(Float)

    # Renal
    urineOutput = Column(Float)

    # Labs
    platelets = Column(Float)
    bilirubin = Column(Float)
    creatinine = Column(Float)

    # Neurological
    gcsEye = Column(Integer)
    gcsVerbal = Column(Integer)
    gcsMotor = Column(Integer)

    # Prediction Results
    mortalityRiskPercent = Column(Float, nullable=True)
    riskLevel = Column(String, nullable=True)
    sofaScore = Column(Float, nullable=True)
    reasoning = Column(Text, nullable=True)
    recommendations = Column(JSON, nullable=True) # List of strings

    # History
    hourlyVitals = Column(JSON, default=list)

    # Real-time Monitoring (LSTM)
    currentMortalityRisk = Column(Float, nullable=True)
    currentRiskLevel = Column(String, nullable=True)
    currentSofaScore = Column(Float, nullable=True)

    # Relationships
    hospital = relationship("Hospital", back_populates="patients")
    creator = relationship("User", back_populates="created_patients")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    patient_id = Column(String, ForeignKey("patients.id"))
    doctor_id = Column(String, ForeignKey("users.id"))
    hospital_id = Column(String, ForeignKey("hospitals.id"))
    proposed_location = Column(String)  # ICU or Ward
    proposedMortalityRisk = Column(Float, nullable=True)
    vitals_snapshot = Column(JSON, nullable=True)
    original_location = Column(String, nullable=True)
    original_assigned_doctor_id = Column(String, nullable=True)
    status = Column(String, default="pending")  # pending, approved, rejected
    created_at = Column(String, default=lambda: datetime.now().isoformat())
    responded_by = Column(String, nullable=True)
    responded_at = Column(String, nullable=True)

    # Relationships
    patient = relationship("Patient")
    doctor = relationship("User")
    hospital = relationship("Hospital")
