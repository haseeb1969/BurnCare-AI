import os
import models
from database import SessionLocal, engine
from auth import get_password_hash
from dotenv import load_dotenv

load_dotenv()

def bootstrap():
    db = SessionLocal()
    try:
        # Ensure Hospital exists
        hospital = db.query(models.Hospital).first()
        if not hospital:
            hospital = models.Hospital(name="General Burn Care Center", address="123 Health Ave")
            db.add(hospital)
            db.commit()
            db.refresh(hospital)
            print(f"Created Hospital: {hospital.name}")
        else:
            print(f"Hospital exists: {hospital.name}")

        # Ensure Admin exists and is approved
        admin_email = "admin@burncare.ai"
        admin = db.query(models.User).filter(models.User.email == admin_email).first()
        if not admin:
            admin = models.User(
                email=admin_email,
                hashed_password=get_password_hash("admin123"),
                full_name="System Administrator",
                role="ADMIN",
                hospital_id=hospital.id,
                is_approved=True
            )
            db.add(admin)
            db.commit()
            print(f"Created Admin: {admin_email}")
        else:
            admin.is_approved = True
            admin.role = "ADMIN" # Ensure role is correct
            db.commit()
            print(f"Admin {admin_email} is now approved.")

    finally:
        db.close()

if __name__ == "__main__":
    bootstrap()
