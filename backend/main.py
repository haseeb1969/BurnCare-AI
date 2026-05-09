from fastapi import FastAPI, Depends, HTTPException, status, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List
from datetime import timedelta

import models, schemas, crud, database
from auth import (
    authenticate_user, 
    create_access_token, 
    get_current_user, 
    get_db,
    check_role,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
from services.prediction_service import predict_mortality 
from services import lstm_service

# Create DB tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="BurnCare AI API")

# CORS settings
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------
# AUTHENTICATION ENDPOINTS
# --------------------------------------------------------

@app.post("/auth/login", response_model=schemas.Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending administrator approval."
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)

@app.get("/auth/pending", response_model=List[schemas.User])
def get_pending_doctors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_role("ADMIN"))
):
    return crud.get_pending_users(db, hospital_id=current_user.hospital_id)

@app.put("/auth/approve/{user_id}", response_model=schemas.User)
def approve_doctor(
    user_id: str,
    approval: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(check_role("ADMIN"))
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.hospital_id != current_user.hospital_id:
        raise HTTPException(status_code=403, detail="Not authorized to approve users from other hospitals")
    
    return crud.update_user_approval(db, user_id, approval.is_approved)

@app.get("/hospitals/", response_model=List[schemas.Hospital])
def get_hospitals(db: Session = Depends(get_db)):
    return db.query(models.Hospital).all()

@app.get("/auth/me", response_model=schemas.User)
async def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --------------------------------------------------------
# PATIENT ENDPOINTS (PROTECTED)
# --------------------------------------------------------

@app.post("/patients/", response_model=schemas.PatientResponse)
def create_patient(
    patient: schemas.PatientBase, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        # Run local machine-learning model
        mortality, risk, sofa_score = predict_mortality(patient)

        prediction = schemas.PredictionResult(
            mortalityRiskPercent=mortality,
            riskLevel=risk,
            sofaScore=sofa_score,
            reasoning="Predicted based on burn severity and clinical parameters.",
            recommendations=["Monitor vitals", "Ensure fluid resuscitation", "Assess for inhalation injury"]
        )

        # Save to database with user and hospital info
        db_patient = crud.create_patient(
            db=db, 
            patient=patient, 
            prediction=prediction,
            user_id=current_user.id,
            hospital_id=current_user.hospital_id
        )
        return db_patient
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/patients/", response_model=List[schemas.PatientResponse])
def read_patients(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Doctors only see patients in their hospital
    return crud.get_patients(db, hospital_id=current_user.hospital_id, skip=skip, limit=limit)

@app.get("/patients/{patient_id}", response_model=schemas.PatientResponse)
def read_patient(
    patient_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    patient = crud.get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check if patient belongs to user's hospital
    if patient.hospital_id != current_user.hospital_id and current_user.role != "SYSTEM_ADMIN":
        raise HTTPException(status_code=403, detail="Access denied")
    
    return patient

@app.put("/patients/{patient_id}", response_model=schemas.PatientResponse)
def update_patient(
    patient_id: str, 
    updates: dict, 
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    patient = crud.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if patient.hospital_id != current_user.hospital_id and current_user.role != "SYSTEM_ADMIN":
        raise HTTPException(status_code=403, detail="Access denied")

    updated = crud.update_patient(db, patient_id, updates)
    
    # Run LSTM Monitoring in background to ensure snappy UI and prevent timeouts
    background_tasks.add_task(run_lstm_monitoring, patient_id)
        
    return updated

def run_lstm_monitoring(patient_id: str):
    """Background task to run LSTM prediction without blocking the main request."""
    db = database.SessionLocal()
    try:
        patient = crud.get_patient(db, patient_id)
        if patient:
            mortality, risk, sofa = lstm_service.predict_mortality(patient)
            crud.update_patient_risk(db, patient_id, mortality, risk, sofa)
    except Exception as e:
        print(f"Background LSTM Error for patient {patient_id}: {e}")
    finally:
        db.close()

@app.delete("/patients/{patient_id}", response_model=schemas.PatientResponse)
def delete_patient(
    patient_id: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    # Only Admin or creator can delete
    patient = crud.get_patient(db, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if current_user.role != "ADMIN" and patient.created_by != current_user.id:
         raise HTTPException(status_code=403, detail="Only Admins or the creator can delete records")

    return crud.delete_patient(db, patient_id)
