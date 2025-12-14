import sqlite3
import json

with open('db_contents.txt', 'w', encoding='utf-8') as f:
    conn = sqlite3.connect('burncare.db')
    conn.row_factory = sqlite3.Row  # This allows accessing columns by name
    cursor = conn.cursor()

    f.write("=" * 70 + "\n")
    f.write("DATABASE: burncare.db - FULL PATIENT RECORDS\n")
    f.write("=" * 70 + "\n")

    # Select all columns
    cursor.execute("SELECT * FROM patients")
    rows = cursor.fetchall()

    for row in rows:
        f.write("\n" + "#" * 70 + "\n")
        f.write(f"PATIENT: {row['name']} (ID: {row['id']})\n")
        f.write("#" * 70 + "\n")

        # 1. Basic Info
        f.write("\n--- [1] BASIC DEMOGRAPHICS ---\n")
        f.write(f"  Created: {row['timestamp']}\n")
        f.write(f"  Age:     {row['age']}\n")
        f.write(f"  Gender:  {row['gender']}\n")
        f.write(f"  Status:  {row['status']}\n")

        # 2. Burn Injury
        f.write("\n--- [2] BURN INJURY ---\n")
        f.write(f"  TBSA:       {row['tbsa']}%\n")
        f.write(f"  Depth:      {row['burnDepth']}\n")
        f.write(f"  Inhalation: {'Yes' if row['inhalationInjury'] else 'No'}\n")
        
        # 3. Initial Assessment (The values stored in main columns)
        f.write("\n--- [3] INITIAL ASSESSMENT (Baseline) ---\n")
        f.write("  Hemodynamics:\n")
        f.write(f"    - HR:   {row['heartRate']} bpm\n")
        f.write(f"    - BP:   {row['systolicBP']}/{row['diastolicBP']} mmHg\n")
        f.write(f"    - Temp: {row['temperature']} °C\n")
        
        f.write("  Respiratory:\n")
        f.write(f"    - SPO2: {row['spo2']}%\n")
        f.write(f"    - PaO2: {row['pao2']}\n")
        f.write(f"    - FiO2: {row['fio2']}\n")

        f.write("  Renal:\n")
        f.write(f"    - Urine Output: {row['urineOutput']} ml/hr\n")

        f.write("  Labs:\n")
        f.write(f"    - Platelets:  {row['platelets']}\n")
        f.write(f"    - Bilirubin:  {row['bilirubin']}\n")
        f.write(f"    - Creatinine: {row['creatinine']}\n")
        
        f.write("  Neurological (GCS):\n")
        f.write(f"    - Eye:    {row['gcsEye']}\n")
        f.write(f"    - Verbal: {row['gcsVerbal']}\n")
        f.write(f"    - Motor:  {row['gcsMotor']}\n")
        total_gcs = (row['gcsEye'] or 0) + (row['gcsVerbal'] or 0) + (row['gcsMotor'] or 0)
        f.write(f"    - TOTAL:  {total_gcs}/15\n")

        # 4. Prediction
        f.write("\n--- [4] AI PREDICTION ---\n")
        f.write(f"  [BASELINE] Mortality Risk: {row['mortalityRiskPercent']}%\n")
        f.write(f"  [BASELINE] Risk Level:     {row['riskLevel']}\n")
        f.write(f"  [BASELINE] SOFA Score:     {row['sofaScore']}\n")
        
        # Check if columns exist (handled by row factory but key error if not selected?) 
        # Select * grabs all.
        if 'currentMortalityRisk' in row.keys():
             f.write("\n")
             f.write(f"  [CURRENT]  Mortality Risk: {row['currentMortalityRisk']}%\n")
             f.write(f"  [CURRENT]  Risk Level:     {row['currentRiskLevel']}\n")
             f.write(f"  [CURRENT]  SOFA Score:     {row['currentSofaScore']}\n")

        # 5. Hourly History
        f.write("\n--- [5] HOURLY VITALS HISTORY ---\n")
        hourly_vitals_raw = row['hourlyVitals']
        
        if hourly_vitals_raw:
            try:
                vitals_list = json.loads(hourly_vitals_raw)
                if not vitals_list:
                    f.write("  (No hourly updates recorded)\n")
                else:
                    for i, vital in enumerate(vitals_list, 1):
                        f.write(f"  Update #{i} [{vital.get('timestamp', 'Unknown Time')}]:\n")
                        f.write(f"    HR: {vital.get('heartRate')} | BP: {vital.get('systolicBP')}/{vital.get('diastolicBP')} | SPO2: {vital.get('spo2')} | Temp: {vital.get('temperature')} | Urine: {vital.get('urineOutput')}\n")
                        # GCS might not be in hourly updates depending on frontend, checking just in case
                        if 'gcsEye' in vital:
                             f.write(f"    GCS: E{vital.get('gcsEye')} V{vital.get('gcsVerbal')} M{vital.get('gcsMotor')}\n")
            except Exception as e:
                f.write(f"  Error parsing hourly vitals: {e}\n")
        else:
            f.write("  (None)\n")
            
    conn.close()
    print("Full database dump written to db_contents.txt")
