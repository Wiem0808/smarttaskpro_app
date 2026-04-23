import os, psycopg2, psycopg2.extras

DATABASE_URL = "postgresql://postgres:admin@localhost:5433/SmartTask_Pro"

conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)

with open("schema.sql", "r", encoding="utf-8") as f:
    sql = f.read()

try:
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    print("[OK] Schema applique avec succes sur SmartTask_Pro !")

    with conn.cursor() as cur:
        cur.execute("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
        tables = cur.fetchall()

    print("Tables creees:")
    for t in tables:
        print(f"  - {t['tablename']}")

except Exception as e:
    conn.rollback()
    print(f"[ERREUR] {e}")
finally:
    conn.close()
