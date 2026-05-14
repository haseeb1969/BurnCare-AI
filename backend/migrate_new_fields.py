import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:22L7933@localhost:5432/burncareai")

def run_migration():
    if not DATABASE_URL or not DATABASE_URL.startswith("postgresql"):
        print("Skipping PostgreSQL migration (SQLite or no URL)")
        return

    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Add total_icu_beds to hospitals
        print("Adding total_icu_beds to hospitals...")
        cur.execute("ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS total_icu_beds INTEGER DEFAULT 5;")

        # Add assigned_location to users
        print("Adding assigned_location to users...")
        cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_location VARCHAR DEFAULT 'Ward';")

        # Add location to patients
        print("Adding location to patients...")
        cur.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS location VARCHAR DEFAULT 'Ward';")

        # Add triage fields to patients
        print("Adding triage fields to patients...")
        cur.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS triage_override VARCHAR;")
        cur.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS benefit_score FLOAT;")
        cur.execute("ALTER TABLE patients ADD COLUMN IF NOT EXISTS assigned_doctor_id VARCHAR;")

        conn.commit()
        cur.close()
        conn.close()
        print("Migration completed successfully.")

    except Exception as e:
        print(f"Migration failed: {e}")

if __name__ == "__main__":
    run_migration()
