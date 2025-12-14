from sqlalchemy import Column, Integer, String, Float, Boolean, Text, JSON
from database import Base

class Patient(Base):
    __tablename__ = "patients"

    id = Column(String, primary_key=True, index=True) # Keeping string ID to match frontend generation or UUID
    timestamp = Column(String)
    status = Column(String, default="Active")
    
    # Patient Data
    name = Column(String)
    age = Column(Integer)
    gender = Column(String)
    tbsa = Column(Float)
    burnDepth = Column(String)
    inhalationInjury = Column(Boolean)
    comorbidities = Column(String)
    burnedRegions = Column(JSON) # List of strings

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
