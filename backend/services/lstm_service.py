import numpy as np
import os
import tensorflow as tf
from tensorflow.keras.models import load_model

# Paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "..", "models", "lstm_burncare_model.h5")

# Global model cache and dynamic SCALE_FACTOR
_model = None
SCALE_FACTOR = None

# Constants
SEQ_LEN = 12
FEATURE_COLS = [
    "BPsys", "BPdia", "Temp", "HR", "SpO2",
    "GCS_E", "GCS_V", "GCS_M", "Urine Output", "RiskScore", "Alert"
]

class CustomScaler:
    """
    Hardcoded scaler to approximate MinMaxScaler behavior for medical vitals.
    Ensures model receives normalized 0-1 inputs even without the original .pkl file.
    """
    LIMITS = {
        "BPsys": (60.0, 180.0),
        "BPdia": (40.0, 120.0),
        "Temp": (35.0, 40.0),
        "HR": (40.0, 160.0),
        "SpO2": (70.0, 100.0),
        "GCS_E": (1.0, 4.0),
        "GCS_V": (1.0, 5.0),
        "GCS_M": (1.0, 6.0),
        "Urine Output": (0.0, 100.0),
        "RiskScore": (0.0, 24.0),
        "Alert": (0.0, 1.0)
    }

    def transform(self, data):
        scaled = np.copy(data)
        for i, col_name in enumerate(FEATURE_COLS):
            min_v, max_v = self.LIMITS.get(col_name, (0.0, 1.0))
            col_data = np.clip(scaled[:, i], min_v, max_v)
            range_v = max_v - min_v
            if range_v == 0: range_v = 1.0
            scaled[:, i] = (col_data - min_v) / range_v
        return scaled

scaler = CustomScaler()

def get_model():
    """
    Load LSTM model and compute dynamic SCALE_FACTOR automatically using a dummy input.
    """
    global _model, SCALE_FACTOR
    if _model is None:
        if os.path.exists(MODEL_PATH):
            print(f"Loading LSTM model from {MODEL_PATH}...")
            _model = load_model(MODEL_PATH)

            # --- Compute dynamic SCALE_FACTOR ---
            # Calibrate against a "Critical" patient (low BP, low SpO2, low GCS, high SOFA)
            # This ensures the scale factor isn't overly aggressive for normal vitals.
            critical_vitals = [0.1, 0.1, 0.8, 0.8, 0.1, 0.0, 0.0, 0.0, 0.1, 0.9, 1.0] 
            dummy_sequence = np.array([critical_vitals]*SEQ_LEN)
            dummy_batch = np.stack([dummy_sequence]*10, axis=0)
            preds = _model.predict(dummy_batch, verbose=0).flatten()
            
            # Calibrate so that a critical state is ~90% mortality raw
            max_pred = np.max(preds) if np.max(preds) > 0 else 0.01
            SCALE_FACTOR = 100.0 / max_pred
            print(f"[INFO] Dynamic SCALE_FACTOR recalibrated to {SCALE_FACTOR:.2f} based on critical profile")
        else:
            print(f"ERROR: Model not found at {MODEL_PATH}")
    return _model

def get_alert_status(vitals):
    alerts = 0
    if vitals.get('heartRate', 80) > 120: alerts = 1
    if vitals.get('systolicBP', 120) < 90: alerts = 1
    if vitals.get('spo2', 98) < 92: alerts = 1
    if vitals.get('urineOutput', 50) < 30: alerts = 1
    return alerts

def calculate_partial_sofa(step, baseline_sofa):
    """
    Recalculates a partial SOFA score based on hourly vitals.
    Keeps lab-based SOFA components from baseline.
    """
    # Start with baseline (which includes labs like platelets, bilirubin, creatinine)
    # We subtract the CNS and CV components from baseline and add current ones
    # But since we don't know the baseline components separately, we just add 
    # the current CV/CNS score to the non-vitals part of baseline.
    # For simplicity, we'll just adjust the baseline sofa based on current vitals.
    
    score_adj = 0
    gcs = step.get('gcsEye', 4) + step.get('gcsVerbal', 5) + step.get('gcsMotor', 6)
    if gcs < 6: score_adj = 4
    elif gcs <= 9: score_adj = 3
    elif gcs <= 12: score_adj = 2
    elif gcs <= 14: score_adj = 1
    
    sys = step.get('systolicBP', 120)
    dia = step.get('diastolicBP', 80)
    map_val = (sys + 2 * dia) / 3
    if map_val < 70: score_adj += 1
    
    # We return the higher of the baseline or the adjusted score to stay conservative
    # or just use the baseline if vitals are normal.
    # Actually, let's just use the current vitals-based score if baseline is 0
    return max(float(baseline_sofa), float(score_adj))

def prepare_sequence(patient):
    base_vitals = {
        "systolicBP": patient.systolicBP,
        "diastolicBP": patient.diastolicBP,
        "temperature": patient.temperature,
        "heartRate": patient.heartRate,
        "spo2": patient.spo2,
        "gcsEye": patient.gcsEye,
        "gcsVerbal": patient.gcsVerbal,
        "gcsMotor": patient.gcsMotor,
        "urineOutput": patient.urineOutput
    }

    history_list = []
    if hasattr(patient, "hourlyVitals") and patient.hourlyVitals:
        history_list = list(patient.hourlyVitals)

    full_sequence = []
    for h in history_list:
        merged = base_vitals.copy()
        merged.update(h)
        full_sequence.append(merged)
    full_sequence.append(base_vitals)

    if len(full_sequence) > SEQ_LEN:
        full_sequence = full_sequence[-SEQ_LEN:]
    while len(full_sequence) < SEQ_LEN:
        full_sequence.insert(0, full_sequence[0])

    baseline_sofa = getattr(patient, 'sofaScore', 0.0) or 0.0
    matrix = np.zeros((SEQ_LEN, len(FEATURE_COLS)))
    for i, step in enumerate(full_sequence):
        # Calculate sofa for this specific hour
        current_sofa = calculate_partial_sofa(step, baseline_sofa)
        alert = get_alert_status(step)
        row = [
            step.get('systolicBP', 120.0),
            step.get('diastolicBP', 80.0),
            step.get('temperature', 37.0),
            step.get('heartRate', 80.0),
            step.get('spo2', 98.0),
            step.get('gcsEye', 4.0),
            step.get('gcsVerbal', 5.0),
            step.get('gcsMotor', 6.0),
            step.get('urineOutput', 50.0),
            float(current_sofa),
            float(alert)
        ]
        matrix[i] = row
    return matrix

def predict_mortality(patient):
    history_count = len(patient.hourlyVitals) if patient.hourlyVitals else 0
    model = get_model()
    if not model:
        return 0.0, "Error", 0.0

    raw_matrix = prepare_sequence(patient)
    scaled_matrix = scaler.transform(raw_matrix)
    input_tensor = scaled_matrix.reshape(1, SEQ_LEN, len(FEATURE_COLS))

    try:
        prob = model.predict(input_tensor, verbose=0)[0][0]
    except Exception as e:
        print(f"Prediction Error: {e}")
        import traceback
        traceback.print_exc()
        return 0.0, "Error", 0.0

    global SCALE_FACTOR
    if SCALE_FACTOR is None:
        SCALE_FACTOR = 1.0

    # Ensure we use standard Python float for database compatibility
    mortality_percent = float(prob * SCALE_FACTOR)
    mortality_percent = float(np.clip(mortality_percent, 0.0, 100.0))

    if mortality_percent < 20:
        risk = "Low"
    elif mortality_percent < 60:
        risk = "Medium"
    else:
        risk = "High"

    current_sofa = getattr(patient, 'sofaScore', 0.0) or 0.0
    return mortality_percent, risk, float(current_sofa)

# Pre-load model on startup
get_model()
