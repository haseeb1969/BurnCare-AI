import requests
import json
import time
import random
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def create_patient():
    print("\n[1] Creating Patient...")
    payload = {
        "name": "LSTM Test Patient",
        "age": 45,
        "gender": "Male",
        "tbsa": 30.0,
        "burnDepth": "Full Thickness",
        "inhalationInjury": False,
        "heartRate": 80.0,
        "systolicBP": 120.0,
        "diastolicBP": 80.0,
        "temperature": 37.0,
        "spo2": 98.0,
        "pao2": 95.0,
        "fio2": 21.0,
        "urineOutput": 50.0,
        "platelets": 250.0,
        "bilirubin": 0.8,
        "creatinine": 0.9,
        "gcsEye": 4,
        "gcsVerbal": 5,
        "gcsMotor": 6,
        "burnedRegions": ["Arm"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/patients/", json=payload)
        response.raise_for_status()
        data = response.json()
        print(f"    Created Patient ID: {data['id']}")
        print(f"    Initial Mortality Risk: {data.get('mortalityRiskPercent')}%")
        return data
    except Exception as e:
        print(f"    Error creating patient: {e}")
        return None

def update_hourly(patient_id, hour, vitals_preset):
    # Simulate a timestamp
    fake_time = datetime.now() - timedelta(hours=24 - hour)
    
    # Base vitals modified by preset
    current_vitals = {
        "timestamp": fake_time.isoformat(),
        # Add some noise
        "heartRate": vitals_preset["hr"] + random.uniform(-2, 2),
        "systolicBP": vitals_preset["sys"] + random.uniform(-5, 5),
        "diastolicBP": vitals_preset["dia"] + random.uniform(-3, 3),
        "temperature": vitals_preset["temp"] + random.uniform(-0.2, 0.2),
        "spo2": vitals_preset["spo2"] + random.uniform(-1, 1),
        "urineOutput": vitals_preset["urine"] + random.uniform(-5, 5),
        "gcsEye": vitals_preset["gcs"][0],
        "gcsVerbal": vitals_preset["gcs"][1],
        "gcsMotor": vitals_preset["gcs"][2],
    }
    
    # We need to construct the update dict. 
    # Usually we append to hourlyVitals.
    # But crud.update_patient replaces fields. 
    # We need to GET the patient, append to the list, and PUT the whole list?
    # Or does the backend handle appending?
    # Backend main.py calls crud.update_patient, which does `db...update(updates)`.
    # SQLite generally needs you to rewrite the whole JSON list if using standard JSON text.
    
    # Fetch current patient first to get existing history
    try:
        res = requests.get(f"{BASE_URL}/patients/{patient_id}")
        current_data = res.json()
        history = current_data.get("hourlyVitals", [])
        if history is None: history = []
        
        # Append new vital
        history.append(current_vitals)
        
        # Prepare update payload
        # We also key update the "current" fields on the main object so the model sees them as "latest"
        updates = {
            "hourlyVitals": history,
            "heartRate": current_vitals["heartRate"],
            "systolicBP": current_vitals["systolicBP"],
            "diastolicBP": current_vitals["diastolicBP"],
            "temperature": current_vitals["temperature"],
            "spo2": current_vitals["spo2"],
            "urineOutput": current_vitals["urineOutput"],
            "gcsEye": current_vitals["gcsEye"],
            "gcsVerbal": current_vitals["gcsVerbal"],
            "gcsMotor": current_vitals["gcsMotor"]
        }
        
        # Send Update
        res = requests.put(f"{BASE_URL}/patients/{patient_id}", json=updates)
        res.raise_for_status()
        updated_data = res.json()
        
        risk = updated_data.get('mortalityRiskPercent')
        level = updated_data.get('riskLevel')
        sofa = updated_data.get('sofaScore')
        
        print(f"Hour {hour:02d}: HR={int(current_vitals['heartRate'])} BP={int(current_vitals['systolicBP'])} SpO2={int(current_vitals['spo2'])} -> Risk: {risk:.2f}% ({level})")
        return updated_data
        
    except Exception as e:
        print(f"Error updating hour {hour}: {e}")
        return None

def run_simulation():
    patient = create_patient()
    if not patient: return

    pid = patient['id']
    
    print("\n[2] Simulating 24 Hours of Vitals...")
    
    for h in range(1, 25):
        # Define trends
        if h <= 10:
            # Stable
            preset = {"hr": 80, "sys": 120, "dia": 80, "temp": 37.0, "spo2": 98, "urine": 50, "gcs": (4,5,6)}
        elif h <= 18:
            # Deteriorating
            factor = (h - 10) / 8.0 # 0 to 1
            preset = {
                "hr": 80 + (40 * factor),       # 80 -> 120
                "sys": 120 - (30 * factor),     # 120 -> 90
                "dia": 80 - (20 * factor),      # 80 -> 60
                "temp": 37.0 + (1.5 * factor),  # 37 -> 38.5
                "spo2": 98 - (6 * factor),      # 98 -> 92
                "urine": 50 - (30 * factor),    # 50 -> 20
                "gcs": (3,4,5) if h > 15 else (4,5,6)
            }
        else:
            # Critical
            preset = {"hr": 140, "sys": 80, "dia": 50, "temp": 39.0, "spo2": 85, "urine": 10, "gcs": (2,2,3)}
            
        update_hourly(pid, h, preset)
        time.sleep(0.5) # small delay

if __name__ == "__main__":
    run_simulation()
