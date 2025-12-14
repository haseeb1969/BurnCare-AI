# LSTM Mortality Prediction Workflow

This document outlines the data flow for the real-time AI risk monitoring system using the LSTM model.

## 1. Trigger: Frontend Update
The workflow starts when a user adds new vital signs in the frontend (e.g., via the "Add Hourly Entry" button).

- **Action**: User submits new vitals.
- **Payload**: The frontend sends a `PUT` request to `/patients/{id}`.
- **Data**: The payload contains the *entire* updated list of `hourlyVitals` (history + new entry).

## 2. API Endpoint (`backend/main.py`)
The request hits the `update_patient` endpoint.

1.  **Receive Request**: `update_patient(patient_id, updates)` is called.
2.  **Save Data**: It calls `crud.update_patient(db, patient_id, updates)` to save the raw vital signs to the database immediately.
3.  **Trigger AI**: After saving, it imports `services.lstm_service` and calls `lstm_service.predict_mortality(updated_patient)`.

## 3. LSTM Service (`backend/services/lstm_service.py`)
This service handles the core AI logic.

### A. Sequence Preparation (`prepare_sequence`)
The model requires a sequence of the last 12 hours of data.
1.  **Extract History**: It reads the `hourlyVitals` JSON list from the patient object.
2.  **Combine**: It appends the current patient state (static fields + latest update) to ensure the sequence ends with the most recent data.
3.  **Feature Selection**: It extracts 11 specific features for each time step:
    *   `systolicBP`, `diastolicBP`, `temperature`, `heartRate`, `spo2`, `gcsEye`, `gcsVerbal`, `gcsMotor`, `urineOutput`.
    *   **Calculated Features**: 
        *   `RiskScore` (Calculated SOFA Score).
        *   `Alert` (Binary 0/1 based on vital thresholds like HR > 120).
4.  **Padding**: If history is shorter than 12 hours, it pads the beginning with zeros.
5.  **Truncating**: If history is longer than 12 hours, it takes the **last 12 entries**.

### B. Data Scaling (`CustomScaler`)
The raw values are normalized to a 0-1 range using hardcoded physiological limits (since the original training scaler was not available).
*   Example: Heart Rate 30-200 maps to 0.0-1.0.

### C. Model Inference
1.  **Load Model**: The `.h5` model is loaded (lazily) using TensorFlow/Keras.
2.  **Predict**: `model.predict(input_sequence)` outputs a probability (0.0 to 1.0).

### D. Result Formatting
1.  **Mortality %**: `probability * 100`.
2.  **Risk Level**:
    *   **Low**: < 30%
    *   **Medium**: 30% - 60%
    *   **High**: > 60%

## 4. Saving Results (`backend/crud.py`)
The `main.py` script receives the prediction results (`mortality`, `risk`, `sofa`) and calls `crud.update_patient_risk`.

- **Action**: Updates specific columns in the `patients` table:
    *   `currentMortalityRisk`
    *   `currentRiskLevel`
    *   `currentSofaScore`
- **Constraint**: The *Initial* admission risk (`mortalityRiskPercent`) is **NOT** changed, preserving the baseline.

## 5. Frontend Display (`components/PatientDetail.tsx`)
The API returns the updated patient object to the frontend.

- **Real-time Status**: The UI updates the "Current Status (LSTM)" section with the new values.
- **Visuals**:
    *   **Risk Chart**: Displays the dynamic percentage.
    *   **Badge**: Shows "Low", "Medium", or "High" risk.
    *   **SOFA**: Displays the calculated SOFA score.

---
**Summary**: The system transforms a simple list of vital signs into a time-series matrix, runs it through an LSTM neural network, and updates a dedicated set of "Current" risk fields in the database, ensuring the Initial assessment remains untouched.
