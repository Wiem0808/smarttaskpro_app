import psycopg2, psycopg2.extras

conn = psycopg2.connect('postgresql://postgres:admin@localhost:5433/SmartTask_Pro')
conn.autocommit = True
cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

# Check departments
cur.execute('SELECT id, name FROM departments ORDER BY id')
print("=== Departements ===")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['name']}")

# Check users
cur.execute('SELECT id, email, full_name FROM users ORDER BY id')
print("\n=== Utilisateurs ===")
for r in cur.fetchall():
    print(f"  {r['id']}: {r['email']} - {r['full_name']}")

# Create Production department if not exists
cur.execute("SELECT id FROM departments WHERE name = 'Production'")
prod = cur.fetchone()
if not prod:
    cur.execute("INSERT INTO departments (name) VALUES ('Production') RETURNING id")
    prod_id = cur.fetchone()['id']
    print(f"\n[+] Departement Production cree (ID: {prod_id})")
else:
    prod_id = prod['id']
    print(f"\n[OK] Departement Production existe (ID: {prod_id})")

# Add new users
import bcrypt
pwd = bcrypt.hashpw('Benozzi2026!'.encode(), bcrypt.gensalt()).decode()

new_users = [
    ('Jebali.Nizar@benozzi.com', 'Nizar Jebali'),
    ('Bouslah.Souhail@benozzi.com', 'Souhail Bouslah'),
    ('Agerbi.Adam@benozzi.com', 'Adam Agerbi'),
    ('Benturkia.Marwen@benozzi.com', 'Marwen Benturkia'),
]

for email, name in new_users:
    cur.execute("SELECT id FROM users WHERE email = %s", (email,))
    if cur.fetchone():
        print(f"[OK] {email} existe deja")
    else:
        cur.execute(
            "INSERT INTO users (email, full_name, password_hash, role, department_id) VALUES (%s, %s, %s, %s, %s) RETURNING id",
            (email, name, pwd, 'employee', prod_id)
        )
        uid = cur.fetchone()['id']
        print(f"[+] {email} - {name} (ID: {uid}, Production)")

cur.close()
conn.close()
print("\nDone!")
