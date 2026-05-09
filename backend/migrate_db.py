from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres:postgres@localhost:5432/burncare')
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE patients ADD COLUMN IF NOT EXISTS "bodyMapImage" TEXT'))
    conn.commit()
    print("Column 'bodyMapImage' added successfully.")
