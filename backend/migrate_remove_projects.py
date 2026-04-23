"""
Migration: Remove projects — Link tasks directly to departments.
1. Add department_id column to tasks
2. Copy department_id from projects into tasks
3. Drop project_id FK from tasks
4. Drop projects table
"""
import os
from dotenv import load_dotenv
load_dotenv()

import psycopg2

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin@localhost:5433/SmartTask_Pro")

def migrate():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    print("[1/5] Adding department_id to tasks...")
    cur.execute("""
        ALTER TABLE tasks ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL
    """)

    print("[2/5] Copying department_id from projects to tasks...")
    cur.execute("""
        UPDATE tasks t
        SET department_id = p.department_id
        FROM projects p
        WHERE t.project_id = p.id
        AND t.department_id IS NULL
    """)

    print("[3/5] Dropping project_id constraint and column...")
    # Drop index first
    cur.execute("DROP INDEX IF EXISTS idx_tasks_project")
    # Drop FK constraint
    cur.execute("""
        ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey
    """)
    # Drop the column
    cur.execute("""
        ALTER TABLE tasks DROP COLUMN IF EXISTS project_id
    """)

    print("[4/5] Adding index on tasks.department_id...")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id)")

    print("[5/5] Dropping projects table...")
    cur.execute("DROP TABLE IF EXISTS projects CASCADE")

    cur.close()
    conn.close()
    print("\n✅ Migration complete! Projects removed, tasks now linked to departments.")

if __name__ == "__main__":
    migrate()
