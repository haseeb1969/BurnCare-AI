import joblib
import numpy as np
import os

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "burncare_lightgbm.pkl")

# Load model once on startup
model = joblib.load(MODEL_PATH)

# Feature order MUST match training
FEATURE_ORDER = [
    "age", "gender", "tbsa", "burnDepth", "inhalationInjury",
    "heartRate", "systolicBP", "diastolicBP", "spo2",
    "pao2", "fio2", "platelets", "bilirubin", "creatinine",
    "gcsEye", "gcsVerbal", "gcsMotor"
]

def encode_gender(g):
    return 1 if g.lower() == "male" else 0

def encode_burn_depth(d):
    mapping = {"superficial": 0, "partial": 1, "full": 2}
    return mapping.get(d.lower(), 1)

def calculate_sofa(p):
    score = 0
    
    # 1. Respiration (PaO2/FiO2)
    # Avoid division by zero
    fio2 = p.fio2 if p.fio2 > 0 else 21
    # Convert FiO2 percentage to fraction (e.g. 50 -> 0.5) if needed, but usually clinical inputs depend on units.
    # Assuming p.fio2 is 21-100.
    ratio = p.pao2 / (fio2 / 100.0)
    
    if ratio < 100: score += 4
    elif ratio < 200: score += 3
    elif ratio < 300: score += 2
    elif ratio < 400: score += 1
    
    # 2. Coagulation (Platelets x10^3/uL)
    if p.platelets < 20: score += 4
    elif p.platelets < 50: score += 3
    elif p.platelets < 100: score += 2
    elif p.platelets < 150: score += 1
    
    # 3. Liver (Bilirubin mg/dL)
    if p.bilirubin > 12.0: score += 4
    elif p.bilirubin >= 6.0: score += 3
    elif p.bilirubin >= 2.0: score += 2
    elif p.bilirubin >= 1.2: score += 1
    
    # 4. Cardiovascular (MAP mmHg)
    # Calculate MAP
    map_val = (p.systolicBP + 2 * p.diastolicBP) / 3
    if map_val < 70: score += 1
    # Note: Higher SOFA cardiovascular scores require vasopressor doses which are not in our input.
    
    # 5. CNS (GCS)
    gcs = p.gcsEye + p.gcsVerbal + p.gcsMotor
    if gcs < 6: score += 4
    elif gcs <= 9: score += 3
    elif gcs <= 12: score += 2
    elif gcs <= 14: score += 1
    
    # 6. Renal (Creatinine mg/dL || Urine Output)
    # Using Creatinine primarily as standard SOFA
    if p.creatinine > 5.0: score += 4
    elif p.creatinine >= 3.5: score += 3
    elif p.creatinine >= 2.0: score += 2
    elif p.creatinine >= 1.2: score += 1
    
    return score

def predict_mortality(patient):
    """
    patient: object or dict with attributes matching FEATURE_ORDER
    Returns: mortality percentage, risk category, and sofa score
    """
    # Calculated Features
    burn_depth_num = encode_burn_depth(patient.burnDepth)
    gcs_total = patient.gcsEye + patient.gcsVerbal + patient.gcsMotor
    tbsa_x_depth = patient.tbsa * burn_depth_num

    # Prepare input vector in correct feature order (20 features)
    x = [
        patient.age,                            # Age
        encode_gender(patient.gender),          # Gender
        patient.tbsa,                           # TBSA
        burn_depth_num,                         # Burn_Depth (Using numeric encoding)
        1 if patient.inhalationInjury else 0,   # Inhalation_Injury
        patient.heartRate,                      # Heart_Rate
        patient.systolicBP,                     # Systolic_BP
        patient.diastolicBP,                    # Diastolic_BP
        patient.spo2,                           # SpO2
        patient.pao2,                           # PaO2
        patient.fio2,                           # FiO2
        patient.platelets,                      # Platelets
        patient.bilirubin,                      # Bilirubin
        patient.creatinine,                     # Creatinine
        patient.gcsEye,                         # GCS_Eye
        patient.gcsVerbal,                      # GCS_Verbal
        patient.gcsMotor,                       # GCS_Motor
        gcs_total,                              # GCS_Total
        tbsa_x_depth,                           # TBSA_x_BurnDepth
        burn_depth_num                          # Burn_Depth_Num
    ]

    x = np.array(x).reshape(1, -1)

    # Predict using sklearn-style LightGBM model
    pred = model.predict(x)[0] * 100  # percentage

    # Clamp prediction to 0-100% range
    pred = max(0.0, min(100.0, pred))

    # Risk categories
    if pred < 20:
        risk = "Low"
    elif pred < 60:
        risk = "Medium"
    else:
        risk = "High"
        
    # Calculate SOFA
    sofa = calculate_sofa(patient)

    return pred, risk, sofa
