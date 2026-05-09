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

    # Relationships
    users = relationship("User", back_populates="hospital")
    patients = relationship("Patient", back_populates="hospital")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String)
    role = Column(String) # "ADMIN", "DOCTOR"
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
    
    # Multi-tenancy & Ownership
    hospital_id = Column(String, ForeignKey("hospitals.id"))
    created_by = Column(String, ForeignKey("users.id"))

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
