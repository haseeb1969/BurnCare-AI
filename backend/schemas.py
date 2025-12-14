from pydantic import BaseModel
from typing import List, Optional

class PatientBase(BaseModel):
    name: str
    age: int
    gender: str
    tbsa: float
    burnDepth: str
    inhalationInjury: bool
    comorbidities: Optional[str] = None
    burnedRegions: List[str] = []

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
    hourlyVitals: List[dict] = []
    
    currentMortalityRisk: Optional[float] = None
    currentRiskLevel: Optional[str] = None
    currentSofaScore: Optional[float] = None

    class Config:
        orm_mode = True
