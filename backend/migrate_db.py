import sqlite3

DB_PATH = 'burncare.db'

def migrate():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    columns_to_add = [
        ("currentMortalityRisk", "FLOAT"),
        ("currentRiskLevel", "VARCHAR"),
        ("currentSofaScore", "FLOAT")
    ]
    
    print("Migrating database...")
    
    # Check existing columns
    cursor.execute("PRAGMA table_info(patients)")
    existing = {row[1] for row in cursor.fetchall()}
    
    for col_name, col_type in columns_to_add:
        if col_name not in existing:
            print(f"Adding column: {col_name}")
            try:
                cursor.execute(f"ALTER TABLE patients ADD COLUMN {col_name} {col_type}")
            except Exception as e:
                print(f"Error adding {col_name}: {e}")
        else:
            print(f"Column {col_name} already exists.")
            
    conn.commit()
    conn.close()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
