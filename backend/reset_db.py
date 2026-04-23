"""Clean SmartTask_Pro database and re-apply schema."""
import psycopg2, psycopg2.extras

DB_URL = "postgresql://postgres:admin@localhost:5433/SmartTask_Pro"

conn = psycopg2.connect(DB_URL, cursor_factory=psycopg2.extras.RealDictCursor)
try:
    with conn.cursor() as cur:
        # Drop all tables in correct order
        cur.execute("""
            DROP TABLE IF EXISTS knowledge_base CASCADE;
            DROP TABLE IF EXISTS attachments CASCADE;
            DROP TABLE IF EXISTS notifications CASCADE;
            DROP TABLE IF EXISTS user_stats CASCADE;
            DROP TABLE IF EXISTS flags CASCADE;
            DROP TABLE IF EXISTS task_dependencies CASCADE;
            DROP TABLE IF EXISTS tasks CASCADE;
            DROP TABLE IF EXISTS projects CASCADE;
            DROP TABLE IF EXISTS users CASCADE;
            DROP TABLE IF EXISTS departments CASCADE;
        """)
    conn.commit()
    print("[OK] All tables dropped")
    
    # Re-apply schema
    with open("schema.sql", "r", encoding="utf-8") as f:
        sql = f.read()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("[OK] Schema re-applied")
    
    # Fix admin password
    import bcrypt
    hashed = bcrypt.hashpw("admin123".encode(), bcrypt.gensalt()).decode()
    with conn.cursor() as cur:
        cur.execute("UPDATE users SET password_hash = %s WHERE email = 'admin@smarttask.local'", (hashed,))
    conn.commit()
    print("[OK] Admin password set to 'admin123'")
    
except Exception as e:
    conn.rollback()
    print(f"[ERROR] {e}")
finally:
    conn.close()
