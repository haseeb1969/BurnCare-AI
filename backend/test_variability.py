import requests
import json
import random

url = "http://127.0.0.1:8000/patients/"

# Baseline patient (Healthy/Minor)
base_patient = {
  "name": "Test Patient",
  "age": 30,
  "gender": "Male",
  "tbsa": 10.0,
  "burnDepth": "Superficial",
  "inhalationInjury": False,
  "comorbidities": "None",
  "burnedRegions": [],
  "heartRate": 80,
  "systolicBP": 120,
  "diastolicBP": 80,
  "temperature": 37.0,
  "spo2": 98,
  "pao2": 95,
  "fio2": 21,
  "urineOutput": 50,
  "platelets": 250,
  "bilirubin": 0.8,
  "creatinine": 0.9,
  "gcsEye": 4,
  "gcsVerbal": 5,
  "gcsMotor": 6
}

test_cases = [
    # 1. Very Low Risk
    {"tbsa": 5, "age": 20, "burnDepth": "Superficial"},
    
    # 2. Low Risk
    {"tbsa": 15, "age": 35, "burnDepth": "Partial Thickness"},

    # 3. Moderate TBSA
    {"tbsa": 30, "age": 40, "burnDepth": "Partial Thickness"},

    # 4. Moderate TBSA + Inhalation
    {"tbsa": 30, "age": 40, "inhalationInjury": True, "pao2": 80},

    # 5. High TBSA
    {"tbsa": 50, "age": 50, "burnDepth": "Full Thickness"},

    # 6. Elderly + Moderate Burn
    {"tbsa": 25, "age": 75, "heartRate": 100},

    # 7. Organ Dysfunction Signs
    {"tbsa": 40, "creatinine": 2.0, "bilirubin": 2.5, "platelets": 100},

    # 8. Very High TBSA
    {"tbsa": 70, "age": 30, "burnDepth": "Full Thickness"},

    # 9. Severe Shock
    {"tbsa": 60, "systolicBP": 80, "diastolicBP": 50, "heartRate": 130, "urineOutput": 10},

    # 10. Extreme Critical
    {"tbsa": 90, "age": 80, "inhalationInjury": True, "gcsEye": 1, "gcsVerbal": 1, "gcsMotor": 1}
]

output_file = "c:\\Users\\abdul\\OneDrive\\Desktop\\Projects\\burncare-ai\\backend\\variability_results.txt"

with open(output_file, "w") as f:
    f.write(f"{'ID':<3} | {'Age':<3} | {'TBSA':<4} | {'Inhal':<5} | {'Depth':<10} | {'Pred (%)':<10} | {'Risk':<10}\n")
    f.write("-" * 75 + "\n")

    for i, case in enumerate(test_cases):
        # Merge case into base patient
        data = base_patient.copy()
        data.update(case)
        
        try:
            response = requests.post(url, json=data)
            if response.status_code == 200:
                res = response.json()
                line = f"{i+1:<3} | {data['age']:<3} | {data['tbsa']:<4} | {str(data['inhalationInjury'])[0]:<5} | {data['burnDepth'][:10]:<10} | {res['mortalityRiskPercent']:<10} | {res['riskLevel']:<10}\n"
                f.write(line)
            else:
                f.write(f"{i+1:<3} | Error: {response.status_code} - {response.text}\n")
        except Exception as e:
            f.write(f"{i+1:<3} | Request Failed: {e}\n")

print(f"Results written to {output_file}")
