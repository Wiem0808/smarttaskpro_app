import requests, json, time

tok = requests.post('http://localhost:8150/api/auth/login', 
    json={'email':'oussama.dhouib@benozzi.com','password':'Benozzi2026!'}
).json()['access_token']
h = {'Authorization': f'Bearer {tok}'}

# Get all users and departments
users = requests.get('http://localhost:8150/api/users', headers=h).json()
depts = requests.get('http://localhost:8150/api/departments', headers=h).json()
dept_map = {d['id']: d['name'] for d in depts}

print(f"Testing {len(users)} users...\n")

results = []
for u in users:
    email = u['email']
    name = u['full_name']
    dept_id = u.get('department_id') or depts[0]['id']
    
    # Create a task for this user
    r = requests.post('http://localhost:8150/api/tasks', headers=h, json={
        'title': f'Test calendrier - {name}',
        'description': f'Test automatique de synchronisation Google Calendar pour {name}',
        'department_id': dept_id,
        'assigned_to': u['id'],
        'importance': 3,
        'estimated_hours': 1,
        'deadline': '2026-04-22T17:00:00',
    })
    
    if r.status_code == 201:
        task = r.json()
        status = 'OK'
    else:
        status = f'FAIL ({r.status_code})'
        task = {}
    
    results.append((email, name, status, task.get('id', '?')))
    print(f"  {'V' if status=='OK' else 'X'} {email:40s} -> Task #{task.get('id','?')} {status}")
    time.sleep(1)  # Small delay between API calls

print(f"\n=== RESULTS ===")
ok = sum(1 for r in results if r[2] == 'OK')
print(f"{ok}/{len(results)} tasks created with Google Calendar sync")

# Check gcal events
import psycopg2
conn = psycopg2.connect('postgresql://postgres:admin@localhost:5433/SmartTask_Pro')
cur = conn.cursor()
cur.execute("SELECT count(*) FROM google_calendar_events")
total = cur.fetchone()[0]
print(f"\nTotal Google Calendar events in DB: {total}")
cur.close()
conn.close()
