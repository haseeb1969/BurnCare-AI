import psycopg2

conn = psycopg2.connect('postgresql://postgres:22L7933@localhost:5432/burncareai')
cur = conn.cursor()
cur.execute('select id,email,hashed_password,is_approved from users order by email')
rows = cur.fetchall()
for r in rows:
    id,email,hashed,is_approved = r
    hashed_len = len(hashed) if hashed else 0
    print(f"{email} approved={is_approved} hashed_len={hashed_len} hashed_preview={hashed[:20] if hashed else ''}")
cur.close()
conn.close()
