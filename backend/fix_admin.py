import bcrypt
import psycopg2, psycopg2.extras

# Generate hash for admin123
password = "admin123"
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
print(f"New hash for admin123: {hashed}")

# Update the admin user in the database
conn = psycopg2.connect("postgresql://postgres:admin@localhost:5433/SmartTask_Pro", cursor_factory=psycopg2.extras.RealDictCursor)
try:
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET password_hash = %s WHERE email = 'admin@smarttask.local'", (hashed,))
        cur.execute("SELECT id, email, full_name, role FROM users WHERE email = 'admin@smarttask.local'")
        user = cur.fetchone()
        if user:
            print(f"Updated admin user: {dict(user)}")
        else:
            print("Admin user not found!")
    conn.commit()
    print("[OK] Admin password updated to 'admin123'")
except Exception as e:
    conn.rollback()
    print(f"[ERROR] {e}")
finally:
    conn.close()
