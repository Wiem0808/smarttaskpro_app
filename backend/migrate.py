import psycopg2
conn = psycopg2.connect('postgresql://postgres:admin@localhost:5433/SmartTask_Pro')
cur = conn.cursor()
cur.execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ DEFAULT NULL")
conn.commit()
print('OK - colonne last_reminder_sent ajoutee')
cur.close()
conn.close()
