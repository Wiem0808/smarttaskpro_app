import psycopg2
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
conn = psycopg2.connect("postgresql://postgres:admin@localhost:5433/SmartTask_Pro")
cur = conn.cursor()
cur.execute("SELECT id, email, hashed_password FROM users WHERE email=%s", ("wiem.hsairi@benozzi.com",))
row = cur.fetchone()
if row:
    print(f"User found: {row[1]}")
    print(f"Password 'benozzi2026' match: {pwd_context.verify('benozzi2026', row[2])}")
    print(f"Password 'Wiem2024!' match: {pwd_context.verify('Wiem2024!', row[2])}")
else:
    print("User NOT found")
cur.close()
conn.close()
