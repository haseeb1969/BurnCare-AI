from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# --- Hospital ---
class HospitalBase(BaseModel):
    name: str
    address: Optional[str] = None

class HospitalCreate(HospitalBase):
    pass

class Hospital(HospitalBase):
    id: str
    total_icu_beds: int

    class Config:
        orm_mode = True

# --- User ---
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: str
    assigned_location: Optional[str] = "Ward"
    license_number: Optional[str] = None
    specialization: Optional[str] = None
    phone_number: Optional[str] = None
    hospital_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    is_approved: Optional[bool] = None
    assigned_location: Optional[str] = None

class User(UserBase):
    id: str
    is_approved: bool
    created_at: Optional[str] = None

    class Config:
        orm_mode = True

# --- Auth ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

# --- Patient ---
class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    tbsa: float
    location: Optional[str] = "Ward"
    burnDepth: str
    inhalationInjury: bool
    comorbidities: Optional[str] = None
    burnedRegions: List[str] = []
    bodyMapImage: Optional[str] = None
    triage_override: Optional[str] = None
    benefit_score: Optional[float] = None

    heartRate: float
    systolicBP: float
    diastolicBP: float
    temperature: float
    
    spo2: float
    pao2: float
    fio2: float
    
    urineOutput: float
    
    platelets: float
    bilirubin: float
    creatinine: float
    
    gcsEye: int
    gcsVerbal: int
    gcsMotor: int

class PredictionResult(BaseModel):
    mortalityRiskPercent: float
    riskLevel: str
    sofaScore: Optional[float] = None
    reasoning: str
    recommendations: List[str]

class PatientResponse(PatientBase, PredictionResult):
    id: str
    timestamp: str
    status: str
    hospital_id: Optional[str] = None
    hospital_name: Optional[str] = None
    created_by: Optional[str] = None
    hourlyVitals: List[dict] = []
    
    currentMortalityRisk: Optional[float] = None
    currentRiskLevel: Optional[str] = None
    currentSofaScore: Optional[float] = None

    class Config:
        orm_mode = True
