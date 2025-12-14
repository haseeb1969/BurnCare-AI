from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List

import models, schemas, crud, database
from services.prediction_service import predict_mortality 

# Create DB tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI()

# CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# DB Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --------------------------------------------------------
# CREATE PATIENT + RUN LOCAL LIGHTGBM MORTALITY PREDICTION
# --------------------------------------------------------
# --------------------------------------------------------
# CREATE PATIENT + RUN LOCAL LIGHTGBM MORTALITY PREDICTION
# --------------------------------------------------------
@app.post("/patients/", response_model=schemas.PatientResponse)
def create_patient(patient: schemas.PatientBase, db: Session = Depends(get_db)):
    try:
        # Run local machine-learning model
        mortality, risk, sofa_score = predict_mortality(patient)

        # Reasoning and recommendations (example)
        reasoning = "Predicted based on burn severity, vitals, and lab values."
        recommendations = [
            "Monitor vitals closely",
            "Provide supportive care",
            "Adjust treatment based on response"
        ]

        prediction = schemas.PredictionResult(
            mortalityRiskPercent=mortality,
            riskLevel=risk,
            sofaScore=sofa_score,
            reasoning=reasoning,
            recommendations=recommendations
        )

        # Save to database
        db_patient = crud.create_patient(db=db, patient=patient, prediction=prediction)
        return db_patient
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


# --------------------------------------------------------
# READ LIST OF PATIENTS
# --------------------------------------------------------
@app.get("/patients/", response_model=List[schemas.PatientResponse])
def read_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_patients(db, skip=skip, limit=limit)


# --------------------------------------------------------
# READ A SINGLE PATIENT
# --------------------------------------------------------
@app.get("/patients/{patient_id}", response_model=schemas.PatientResponse)
def read_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = crud.get_patient(db, patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


# --------------------------------------------------------
# UPDATE PATIENT
# --------------------------------------------------------
@app.put("/patients/{patient_id}", response_model=schemas.PatientResponse)
def update_patient(patient_id: str, updates: dict, db: Session = Depends(get_db)):
    updated = crud.update_patient(db, patient_id, updates)
    if updated is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Run LSTM Monitoring Model on updates
    try:
        from services import lstm_service
        # LSTM prediction based on history
        mortality, risk, sofa = lstm_service.predict_mortality(updated)
        
        # Save new dynamic risk
        updated = crud.update_patient_risk(db, patient_id, mortality, risk, sofa)
        
        # If High Risk, maybe add a visual alert flag? taking advantage of 'reasoning' or similar?
        # For now, updating the fields is sufficient as the frontend displays them.
        
    except Exception as e:
        print(f"LSTM Monitoring Error: {e}")
        # Don't fail the request, just log error
        
    return updated


# --------------------------------------------------------
# DELETE PATIENT
# --------------------------------------------------------
@app.delete("/patients/{patient_id}", response_model=schemas.PatientResponse)
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    deleted = crud.delete_patient(db, patient_id)
    if deleted is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return deleted
