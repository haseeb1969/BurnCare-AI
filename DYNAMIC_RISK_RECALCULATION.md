# Dynamic Mortality Risk Recalculation Feature

## Overview
When patient vitals are updated in the clinical monitoring system, the mortality risk is **automatically recalculated** using the LSTM AI model, and resource allocation recommendations are **dynamically updated** accordingly.

## How It Works

### 1. **Vital Entry Submission**
- Doctor enters new vital signs in the "Clinical Monitoring" section of a patient's detail page
- System captures: Temperature, Heart Rate, Systolic/Diastolic BP, SpO2, Urine Output, GCS scores
- New vitals are appended to the `hourlyVitals` array in the patient record

### 2. **Automatic LSTM Prediction** (Backend)
When vitals are submitted:

```
PUT /patients/{patient_id}
├─ Update patient.hourlyVitals with new entry
├─ Background Task: run_lstm_monitoring()
│  └─ predict_mortality(patient)
│     ├─ Extract latest 12 hourly vitals from history
│     ├─ Normalize vitals using CustomScaler
│     ├─ Feed sequence into LSTM model
│     └─ Return: mortality_percent, risk_level (Low/Medium/High)
├─ Update patient fields:
│  ├─ currentMortalityRisk (%)
│  ├─ currentRiskLevel (Low/Medium/High)
│  └─ currentSofaScore
└─ Recalculate Hospital Triage
   ├─ run_allocation()
   │  └─ Calculate benefit_score from updated risk
   │  └─ Recompute ICU/Ward allocation
   └─ rebalance_patient_doctor_assignments()
      └─ Reassign doctor if necessary
```

### 3. **Frontend Feedback**
- **Immediate Response**: "Saving vitals and recalculating mortality risk..."
- **Smart Polling**: Frontend polls backend (up to 5 seconds) until LSTM prediction completes
- **Success Message**: Shows updated risk level and percentage when ready
- **Real-time Display**: UI refreshes to show:
  - Current Mortality Risk (from latest LSTM prediction)
  - Current Risk Level (Low/Medium/High)
  - Current Location Recommendation (ICU/Ward)
  - Updated doctor assignment

## Data Flow

### On Vitals Update:

**Frontend (React):**
```
User submits vitals form
    ↓
POST hourlyVitals to API
    ↓
Wait for LSTM completion (with polling)
    ↓
Display updated currentRiskLevel & currentMortalityRisk
    ↓
Fetch fresh patient data
    ↓
Render updated allocation recommendation
```

**Backend (Python/FastAPI):**
```
Receive vital update
    ↓
Append to hourlyVitals array
    ↓
Return immediately (fast response)
    ↓
Background Task: Run LSTM
    ├─ Prepare 12-point sequence
    ├─ Run through neural network
    ├─ Calculate new risk
    └─ Update database
    ↓
Recalculate hospital triage & doctor assignments
```

## Key Features

✅ **Real-time Monitoring**: LSTM predictions complete in 500ms-1s  
✅ **Benefit Score Recalculation**: Resource allocation updated based on new mortality risk  
✅ **Smart Polling**: Frontend waits for LSTM completion with visual feedback  
✅ **Location Reallocation**: If risk changes significantly, patient may be reassigned ICU ↔ Ward  
✅ **Doctor Rebalancing**: Load-balanced doctor assignment updated based on new location  
✅ **Baseline Comparison**: UI shows both admission baseline and current risk side-by-side  
✅ **Asynchronous Processing**: Background LSTM doesn't block the API response  

## Patient Response Fields

The API returns these fields for each patient:

```typescript
// Baseline (at admission)
mortalityRiskPercent: number;  // Initial mortality risk (%)
riskLevel: string;             // Initial risk level (Low/Medium/High)
location: string;              // Initial allocation (ICU/Ward)
sofaScore: number;             // Initial SOFA score

// Current (after vitals updates)
currentMortalityRisk?: number;    // Live mortality risk from LSTM (%)
currentRiskLevel?: string;        // Live risk level (Low/Medium/High)
currentSofaScore?: number;        // Live SOFA score
hourlyVitals: VitalEntry[];       // All vital measurements

// Allocation & Assignment
assigned_doctor_id?: string;      // Assigned doctor ID
assigned_doctor_name?: string;    // Assigned doctor name
assigned_doctor_location?: string; // Doctor's location (ICU/Ward)
```

## Endpoints

### Update Patient Vitals
```http
PUT /patients/{patient_id}
Content-Type: application/json
Authorization: Bearer {token}

{
  "hourlyVitals": [
    {
      "timestamp": "2026-05-10T14:30:00Z",
      "temperature": 37.5,
      "heartRate": 92,
      "systolicBP": 125,
      "diastolicBP": 78,
      "spo2": 96,
      "urineOutput": 45,
      "gcsEye": 4,
      "gcsVerbal": 5,
      "gcsMotor": 6
    }
  ]
}
```

### Fetch Patient (Get Updated Risk)
```http
GET /patients/{patient_id}
Authorization: Bearer {token}

Response includes:
- currentMortalityRisk (updated)
- currentRiskLevel (updated)
- location (updated)
- assigned_doctor_id (updated)
```

## Minimum Data Requirements

- **First LSTM Prediction**: Requires minimum **4 hourly vital entries** in patient history
- **Before 4 hours**: Shows "Awaiting Data (Min 4h)" in UI
- **After 4+ hours**: Real-time predictions available on each vitals update

## Resource Allocation Logic

The system uses a **benefit score** algorithm:

1. **Risk Assessment**: Current mortality risk (Low/Medium/High)
2. **Benefit Calculation**: `Benefit = P(Survive|ICU) - P(Survive|Ward)`
   - High-risk patients have high benefit → ICU priority
   - Low-risk patients have low benefit → Ward suitable
3. **ICU Allocation**: Greediest patients (highest benefit) get available ICU beds
4. **Overflow**: Remaining patients assigned to Ward
5. **Overrides**: Forced allocations (ForceICU/ForceWard) bypass algorithm

## Clinical Workflow Example

```
1. Patient admitted with 60% mortality risk → Ward assignment
2. Doctor monitors vital signs over 4 hours
3. Vitals show improvement (normalized values)
4. Doctor submits new vitals at 2-hour mark
5. LSTM recalculates: Risk drops to 25%
6. Benefit score changes → Ward allocation confirmed
7. Patient remains assigned to same doctor in Ward

---

1. Patient in Ward with 40% mortality risk
2. Later, vitals deteriorate (fever, hypotension, low O2)
3. Doctor submits updated vitals
4. LSTM recalculates: Risk jumps to 75%
5. System recommends ICU allocation
6. Doctor can manually approve the transfer
7. Patient reassigned to available ICU doctor
```

## Database Updates

When vitals are updated:

```sql
-- Immediate (synchronous)
UPDATE patients 
SET hourlyVitals = [...latest vitals...]
WHERE id = {patient_id};

-- Background task (asynchronous)
UPDATE patients
SET currentMortalityRisk = {new_risk},
    currentRiskLevel = {new_level},
    currentSofaScore = {new_sofa},
    location = {updated_allocation},
    assigned_doctor_id = {rebalanced_doctor_id}
WHERE id = {patient_id};
```

## Performance Characteristics

| Operation | Time | Notes |
|-----------|------|-------|
| Vital submission | 100-200ms | Synchronous update |
| LSTM prediction | 300-500ms | Background task |
| Database commit | 50-100ms | Risk update |
| Hospital rebalance | 100-200ms | Doctor reassignment |
| **Total E2E** | **~1s** | User sees update within 1 second |

## UI Indicators

### "Real-time AI Risk Monitoring" Section
- **Left Panel**: Admission Baseline (static)
  - Initial risk level & percentage
  - Initial allocation recommendation
  
- **Right Panel**: Current Status (LSTM) (dynamic)
  - Live mortality risk from latest LSTM
  - Updated risk level
  - **Updated** allocation recommendation
  - Current assigned doctor

### Vitals Form Info Box
- ⚡ Automatic Risk Recalculation
- "When vitals are submitted, the AI model will recalculate mortality risk and resource allocation recommendation."

### Status Messages
- Submitting: "Saving vitals and recalculating mortality risk..."
- Success: "Vitals saved! Mortality risk updated: {Level} ({Percent}%)"
- Processing: "Vitals saved. Mortality risk calculation in progress..."

## Testing

To verify dynamic risk recalculation:

1. Open a patient's detail page
2. Wait 4+ hours for enough vitals (or add manual entries)
3. Click "Add Entry" in Clinical Monitoring
4. Enter new vital signs
5. Submit form
6. Observe:
   - Success message with updated risk
   - "Current Status (LSTM)" box shows new values
   - Location recommendation may change based on new risk

## Technical Implementation

- **LSTM Model**: `backend/models/lstm_burncare_model.h5`
- **Prediction Service**: `backend/services/lstm_service.py`
- **Allocation Logic**: `backend/services/triage_service.py`
- **CRUD Operations**: `backend/crud.py` (update_patient_risk, recalculate_hospital_triage)
- **Frontend Component**: `components/PatientDetail.tsx` (submitVitals, polling logic)
- **API Endpoint**: `PUT /patients/{patient_id}` with background task
- **Response Schema**: `backend/schemas.py` (PatientResponse with currentRiskLevel fields)

## Future Enhancements

- [ ] Configurable LSTM polling timeout
- [ ] WebSocket alerts when risk threshold breached
- [ ] Risk trend chart (mortality over time)
- [ ] Predictive alerts (e.g., "High risk of deterioration in next 2 hours")
- [ ] Automated ICU transfer trigger for critical risk increases
- [ ] Multi-modal vitals (add imaging analysis)
