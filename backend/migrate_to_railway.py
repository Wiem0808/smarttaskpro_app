"""
Migrate local SmartTask DB to Railway via API
"""
import psycopg2
import psycopg2.extras
import requests
import json

# === CONFIG ===
LOCAL_DB = "postgresql://postgres:admin@localhost:5433/SmartTask_Pro"
RAILWAY_API = "https://smarttaskproapp-production.up.railway.app/api"
SETUP_SECRET = "init-smarttask-2026"

def get_local_data():
    """Extract all data from local database."""
    conn = psycopg2.connect(LOCAL_DB)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # Get departments
    cur.execute("SELECT * FROM departments ORDER BY id")
    departments = cur.fetchall()
    print(f"[LOCAL] {len(departments)} départements")

    # Get users
    cur.execute("SELECT * FROM users ORDER BY id")
    users = cur.fetchall()
    print(f"[LOCAL] {len(users)} utilisateurs")

    # Get tasks
    cur.execute("SELECT * FROM tasks ORDER BY id")
    tasks = cur.fetchall()
    print(f"[LOCAL] {len(tasks)} tâches")

    # Get flags
    cur.execute("SELECT * FROM flags ORDER BY id")
    flags = cur.fetchall()
    print(f"[LOCAL] {len(flags)} flags")

    # Get user_stats
    cur.execute("SELECT * FROM user_stats")
    stats = cur.fetchall()
    print(f"[LOCAL] {len(stats)} user_stats")

    # Get notifications
    cur.execute("SELECT * FROM notifications ORDER BY id")
    notifications = cur.fetchall()
    print(f"[LOCAL] {len(notifications)} notifications")

    # Get knowledge_base
    cur.execute("SELECT * FROM knowledge_base ORDER BY id")
    kb = cur.fetchall()
    print(f"[LOCAL] {len(kb)} knowledge_base entries")

    cur.close()
    conn.close()

    return {
        "departments": departments,
        "users": users,
        "tasks": tasks,
        "flags": flags,
        "user_stats": stats,
        "notifications": notifications,
        "knowledge_base": kb,
    }


def serialize(obj):
    """JSON serializer for objects not serializable by default."""
    import datetime
    from decimal import Decimal
    if isinstance(obj, (datetime.datetime, datetime.date)):
        return obj.isoformat()
    if isinstance(obj, datetime.timedelta):
        return str(obj)
    if isinstance(obj, Decimal):
        return float(obj)
    raise TypeError(f"Type {type(obj)} not serializable")


def migrate():
    print("=" * 50)
    print("SmartTask Pro — Migration Local → Railway")
    print("=" * 50)

    # Step 1: Get local data
    print("\n[1/3] Extraction des données locales...")
    data = get_local_data()

    # Step 2: Send to Railway via migrate endpoint
    print("\n[2/3] Envoi vers Railway...")
    payload = json.dumps(data, default=serialize)

    resp = requests.post(
        f"{RAILWAY_API}/migrate/{SETUP_SECRET}",
        json=json.loads(payload),
        timeout=60
    )

    if resp.status_code == 200:
        result = resp.json()
        print("\n[3/3] Résultats:")
        for r in result.get("results", []):
            print(f"  {r}")
        print("\n✅ Migration terminée!")
    else:
        print(f"\n❌ Erreur: {resp.status_code}")
        print(resp.text)


if __name__ == "__main__":
    migrate()
