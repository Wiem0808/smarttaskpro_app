# ══════════════════════════════════════════════════════════════
# BNZ TASK — FastAPI Backend (No Projects)
# ══════════════════════════════════════════════════════════════
import os, json
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Query, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import bcrypt as _bcrypt
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from database import query_all, query_one, execute, execute_returning, init_db
from models import (
    LoginRequest, TokenResponse,
    DepartmentCreate, DepartmentUpdate,
    UserCreate, UserUpdate,
    TaskCreate, TaskUpdate,
    FlagCreate, FlagUpdate,
)
import google_calendar as gcal
import email_notifications as notif

# ── Config ────────────────────────────────
JWT_SECRET    = os.getenv("JWT_SECRET", "change-me-super-secret-key")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE    = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))
UPLOAD_DIR    = os.getenv("UPLOAD_DIR", "./uploads")

os.makedirs(UPLOAD_DIR, exist_ok=True)

def hash_password(plain: str) -> str:
    return _bcrypt.hashpw(plain.encode(), _bcrypt.gensalt()).decode()

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return _bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False

bearer = HTTPBearer()

app = FastAPI(title="BNZ TASK", version="2.0.0")

# CORS: allow Railway domains + localhost dev
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "").split(",") if os.getenv("CORS_ORIGINS") else []
CORS_ORIGINS += [
    "https://wonderful-emotion-production-b949.up.railway.app",
    "http://localhost:5174",
    "http://localhost:5173",
    "http://127.0.0.1:5174",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Health Check (required by Render) ──
@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "BNZ TASK API"}


# ── Global Error Handler (prevents crashes) ──
import logging
from fastapi.responses import JSONResponse
from starlette.requests import Request

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("BNZ TASK")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    return JSONResponse(status_code=500, content={"detail": str(exc)})

# Serve uploaded files
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Auto-Migration: ensure missing columns exist ──────────────
def _run_migrations():
    """Add any missing columns to the database."""
    migrations = [
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS link TEXT",
        "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ",
        "ALTER TABLE flags ADD COLUMN IF NOT EXISTS detected_by INTEGER REFERENCES users(id)",
        "ALTER TABLE flags ADD COLUMN IF NOT EXISTS link TEXT",
        """CREATE TABLE IF NOT EXISTS google_calendar_events (
            id SERIAL PRIMARY KEY,
            task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
            flag_id INTEGER REFERENCES flags(id) ON DELETE CASCADE,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            google_event_id TEXT NOT NULL,
            calendar_id TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )""",
    ]
    for sql in migrations:
        try:
            execute(sql)
        except Exception as e:
            logger.warning("Migration skipped: %s", e)
    logger.info("Database migrations applied successfully")

_run_migrations()

# ── Deadline Reminder Scheduler ──────────────
import threading
import time as _time

def _deadline_reminder_loop():
    """Background loop: checks overdue tasks every hour and sends reminder emails."""
    logger.info("Deadline reminder scheduler started (checks every 60 min)")
    _time.sleep(30)  # Wait 30s after startup before first check

    # Ensure the column exists
    try:
        execute("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ DEFAULT NULL")
        logger.info("Ensured last_reminder_sent column exists")
    except Exception as e:
        logger.warning("Could not add last_reminder_sent column: %s", e)

    while True:
        try:
            overdue_tasks = query_all("""
                SELECT t.id, t.title, t.description, t.status, t.deadline, t.importance,
                       u.email AS assigned_email, u.full_name AS assigned_name
                FROM tasks t
                JOIN users u ON t.assigned_to = u.id
                WHERE t.status NOT IN ('done')
                  AND t.deadline IS NOT NULL
                  AND t.deadline < NOW()
            """)
            if overdue_tasks:
                logger.info("Found %d overdue tasks, sending reminders...", len(overdue_tasks))
                for task in overdue_tasks:
                    t = dict(task)
                    try:
                        days_overdue = (datetime.now(timezone.utc) - t["deadline"].replace(tzinfo=timezone.utc)).days
                        if days_overdue < 1:
                            days_overdue = 1
                        notif.notify_task_overdue(
                            to_email=t["assigned_email"],
                            to_name=t["assigned_name"],
                            task=t,
                            days_overdue=days_overdue,
                        )
                    except Exception as e2:
                        logger.warning("Reminder send failed for task %s: %s", t["id"], e2)
                    _time.sleep(2)  # Small delay between emails
        except Exception as e:
            logger.error("Reminder scheduler error: %s", e)
        _time.sleep(3600)  # Wait 1 hour

# Start the reminder thread
threading.Thread(target=_deadline_reminder_loop, daemon=True, name="deadline-reminders").start()



# ══════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════

def create_token(user_id: int, role: str) -> str:
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_EXPIRE),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(cred.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(401, "Token invalide")
    user = query_one("SELECT * FROM users WHERE id = %s AND is_active = TRUE", (user_id,))
    if not user:
        raise HTTPException(401, "Utilisateur introuvable")
    return dict(user)


def require_role(*roles):
    def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, "Accès interdit")
        return user
    return checker


@app.post("/api/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    user = query_one("SELECT * FROM users WHERE LOWER(email) = LOWER(%s) AND is_active = TRUE", (body.email,))
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "Email ou mot de passe incorrect")
    token = create_token(user["id"], user["role"])
    return {
        "access_token": token,
        "user": {
            "id": user["id"], "email": user["email"],
            "full_name": user["full_name"], "role": user["role"],
            "department_id": user["department_id"],
            "avatar_url": user["avatar_url"],
        },
    }


@app.get("/api/auth/me")
def get_me(user=Depends(get_current_user)):
    dept = None
    if user["department_id"]:
        d = query_one("SELECT name FROM departments WHERE id = %s", (user["department_id"],))
        dept = d["name"] if d else None
    return {
        **{k: user[k] for k in ["id", "email", "full_name", "role", "department_id", "avatar_url", "daily_capacity"]},
        "department_name": dept,
    }


# ══════════════════════════════════════════
#  DEPARTMENTS CRUD
# ══════════════════════════════════════════

@app.get("/api/departments")
def list_departments(user=Depends(get_current_user)):
    rows = query_all("""
        SELECT d.*,
               u.full_name AS manager_name,
               (SELECT COUNT(*) FROM users WHERE department_id = d.id AND is_active = TRUE) AS employee_count,
               (SELECT COUNT(*) FROM tasks WHERE department_id = d.id) AS task_count
        FROM departments d
        LEFT JOIN users u ON d.manager_id = u.id
        ORDER BY d.name
    """)
    return [dict(r) for r in rows]


@app.post("/api/departments", status_code=201)
def create_department(body: DepartmentCreate, user=Depends(get_current_user)):
    existing = query_one("SELECT id FROM departments WHERE name = %s", (body.name,))
    if existing:
        raise HTTPException(400, "Un département avec ce nom existe déjà")
    row = execute_returning("""
        INSERT INTO departments (name, description, color, icon, manager_id)
        VALUES (%s, %s, %s, %s, %s) RETURNING *
    """, (body.name, body.description, body.color, body.icon, body.manager_id))
    return dict(row)


@app.put("/api/departments/{dept_id}")
def update_department(dept_id: int, body: DepartmentUpdate, user=Depends(get_current_user)):
    existing = query_one("SELECT * FROM departments WHERE id = %s", (dept_id,))
    if not existing:
        raise HTTPException(404, "Département introuvable")
    fields, values = [], []
    for k, v in body.dict(exclude_none=True).items():
        fields.append(f"{k} = %s")
        values.append(v)
    if not fields:
        return dict(existing)
    fields.append("updated_at = NOW()")
    values.append(dept_id)
    row = execute_returning(
        f"UPDATE departments SET {', '.join(fields)} WHERE id = %s RETURNING *", values
    )
    return dict(row)


@app.delete("/api/departments/{dept_id}")
def delete_department(dept_id: int, user=Depends(get_current_user)):
    existing = query_one("SELECT id FROM departments WHERE id = %s", (dept_id,))
    if not existing:
        raise HTTPException(404, "Département introuvable")
    emp_count = query_one("SELECT COUNT(*) AS c FROM users WHERE department_id = %s AND is_active = TRUE", (dept_id,))
    if emp_count and emp_count["c"] > 0:
        raise HTTPException(400, f"Impossible de supprimer : {emp_count['c']} employés encore rattachés")
    execute("DELETE FROM departments WHERE id = %s", (dept_id,))
    return {"ok": True}


# ══════════════════════════════════════════
#  USERS CRUD
# ══════════════════════════════════════════

@app.get("/api/users")
def list_users(
    department_id: Optional[int] = None,
    role: Optional[str] = None,
    active_only: bool = True,
    user=Depends(get_current_user),
):
    sql = """
        SELECT u.id, u.email, u.full_name, u.avatar_url, u.role,
               u.department_id, d.name AS department_name,
               u.daily_capacity, u.is_active, u.created_at
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE 1=1
    """
    params = []
    if active_only:
        sql += " AND u.is_active = TRUE"
    if department_id:
        sql += " AND u.department_id = %s"
        params.append(department_id)
    if role:
        sql += " AND u.role = %s"
        params.append(role)
    sql += " ORDER BY u.full_name"
    return [dict(r) for r in query_all(sql, params)]


@app.post("/api/users", status_code=201)
def create_user(body: UserCreate, user=Depends(get_current_user)):
    existing = query_one("SELECT id FROM users WHERE email = %s", (body.email,))
    if existing:
        raise HTTPException(400, "Un utilisateur avec cet email existe déjà")
    hashed = hash_password(body.password)
    row = execute_returning("""
        INSERT INTO users (email, full_name, password_hash, role, department_id, daily_capacity)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
    """, (body.email, body.full_name, hashed, body.role, body.department_id, body.daily_capacity))
    # Create stats row
    execute("INSERT INTO user_stats (user_id) VALUES (%s) ON CONFLICT DO NOTHING", (row["id"],))
    return dict(row)


@app.put("/api/users/{uid}")
def update_user(uid: int, body: UserUpdate, user=Depends(get_current_user)):
    existing = query_one("SELECT * FROM users WHERE id = %s", (uid,))
    if not existing:
        raise HTTPException(404, "Utilisateur introuvable")
    data = body.dict(exclude_none=True)
    if "password" in data:
        data["password_hash"] = hash_password(data.pop("password"))
    fields, values = [], []
    for k, v in data.items():
        fields.append(f"{k} = %s")
        values.append(v)
    if not fields:
        return dict(existing)
    fields.append("updated_at = NOW()")
    values.append(uid)
    row = execute_returning(
        f"UPDATE users SET {', '.join(fields)} WHERE id = %s RETURNING *", values
    )
    return dict(row)


@app.delete("/api/users/{uid}")
def deactivate_user(uid: int, user=Depends(get_current_user)):
    existing = query_one("SELECT id FROM users WHERE id = %s", (uid,))
    if not existing:
        raise HTTPException(404, "Utilisateur introuvable")
    execute("UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = %s", (uid,))
    return {"ok": True, "message": "Utilisateur désactivé"}


# ══════════════════════════════════════════
#  TASKS CRUD (linked to departments)
# ══════════════════════════════════════════

def recalc_priority(task_id: int):
    """Recalculate dynamic priority score for a task using a single optimized query."""
    row = query_one("""
        SELECT t.*,
               COALESCE(u.daily_capacity, 8) AS user_capacity,
               COALESCE(active_count.c, 0) AS active_task_count,
               COALESCE(dep_count.c, 0) AS dep_count
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS c FROM tasks
            WHERE assigned_to = t.assigned_to AND status IN ('todo','in_progress')
        ) active_count ON t.assigned_to IS NOT NULL
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS c FROM task_dependencies WHERE depends_on = t.id
        ) dep_count ON TRUE
        WHERE t.id = %s
    """, (task_id,))
    if not row:
        return

    # Urgency
    urgency = 30
    if row["deadline"]:
        hours_left = max(0, (row["deadline"] - datetime.now(timezone.utc)).total_seconds() / 3600)
        est = float(row["estimated_hours"] or 1)
        urgency = max(0, min(100, 100 - (hours_left - est) / 24 * 10))

    # Importance
    importance = (row["importance"] / 5) * 3 * 4

    # Load
    load = 30
    if row["assigned_to"]:
        load = min(100, (row["active_task_count"] / max(row["user_capacity"], 1)) * 100)

    # Dependencies
    deps = min(100, row["dep_count"] * 25)

    score = round(urgency * 0.4 + importance * 0.3 + load * 0.2 + deps * 0.1, 2)
    execute("UPDATE tasks SET priority_score = %s WHERE id = %s", (score, task_id))
    return score


@app.get("/api/tasks")
def list_tasks(
    assigned_to: Optional[int] = None,
    status: Optional[str] = None,
    department_id: Optional[int] = None,
    user=Depends(get_current_user),
):
    sql = """
        SELECT t.*,
               d.name AS department_name,
               ua.full_name AS assigned_name,
               uc.full_name AS creator_name
        FROM tasks t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users ua ON t.assigned_to = ua.id
        JOIN users uc ON t.created_by = uc.id
        WHERE 1=1
    """
    params = []
    if assigned_to:
        sql += " AND t.assigned_to = %s"; params.append(assigned_to)
    if status:
        sql += " AND t.status = %s"; params.append(status)
    if department_id:
        sql += " AND t.department_id = %s"; params.append(department_id)
    sql += " ORDER BY t.priority_score DESC, t.deadline ASC NULLS LAST"
    return [dict(r) for r in query_all(sql, params)]


@app.get("/api/tasks/my")
def my_tasks(user=Depends(get_current_user)):
    rows = query_all("""
        SELECT t.*, d.name AS department_name
        FROM tasks t
        LEFT JOIN departments d ON t.department_id = d.id
        WHERE t.assigned_to = %s AND t.status != 'done'
        ORDER BY t.priority_score DESC
    """, (user["id"],))
    return [dict(r) for r in rows]


# ── Google Calendar Sync Helpers (Background Threads) ──
import threading

def _sync_task_to_gcal(task_id: int, user_id: int):
    """Sync a task to Google Calendar in a background thread (non-blocking)."""
    def _do_sync():
        try:
            user = query_one("SELECT id, email FROM users WHERE id = %s", (user_id,))
            if not user or not user["email"]:
                return
            task = query_one("""
                SELECT t.*, d.name AS department_name
                FROM tasks t LEFT JOIN departments d ON t.department_id = d.id
                WHERE t.id = %s
            """, (task_id,))
            if not task:
                return
            event_body = gcal.task_to_event(dict(task))
            existing = query_one(
                "SELECT * FROM google_calendar_events WHERE user_id = %s AND task_id = %s",
                (user_id, task_id)
            )
            if existing:
                gcal.update_calendar_event(user["email"], existing["google_event_id"], event_body)
            else:
                gid = gcal.create_calendar_event(user["email"], event_body)
                if gid:
                    execute(
                        "INSERT INTO google_calendar_events (user_id, task_id, google_event_id) VALUES (%s, %s, %s)",
                        (user_id, task_id, gid)
                    )
                    execute(
                        "UPDATE tasks SET google_event_id = %s WHERE id = %s",
                        (gid, task_id)
                    )
        except Exception as e:
            logger.error("Task sync error: %s", e)
    threading.Thread(target=_do_sync, daemon=True).start()


def _sync_flag_to_gcal(flag_id: int, user_id: int):
    """Sync a flag to Google Calendar in a background thread (non-blocking)."""
    def _do_sync():
        try:
            user = query_one("SELECT id, email FROM users WHERE id = %s", (user_id,))
            if not user or not user["email"]:
                return
            flag = query_one("""
                SELECT f.*, t.title AS task_title, ur.full_name AS raiser_name
                FROM flags f
                LEFT JOIN tasks t ON f.task_id = t.id
                LEFT JOIN users ur ON f.raised_by = ur.id
                WHERE f.id = %s
            """, (flag_id,))
            if not flag:
                return
            event_body = gcal.flag_to_event(dict(flag))
            existing = query_one(
                "SELECT * FROM google_calendar_events WHERE user_id = %s AND flag_id = %s",
                (user_id, flag_id)
            )
            if existing:
                gcal.update_calendar_event(user["email"], existing["google_event_id"], event_body)
            else:
                gid = gcal.create_calendar_event(user["email"], event_body)
                if gid:
                    execute(
                        "INSERT INTO google_calendar_events (user_id, flag_id, google_event_id) VALUES (%s, %s, %s)",
                        (user_id, flag_id, gid)
                    )
        except Exception as e:
            logger.error("Flag sync error: %s", e)
    threading.Thread(target=_do_sync, daemon=True).start()


def _delete_gcal_event(task_id: int = None, flag_id: int = None):
    """Delete Google Calendar events in a background thread (non-blocking)."""
    def _do_delete():
        try:
            if task_id:
                rows = query_all("SELECT ge.*, u.email FROM google_calendar_events ge JOIN users u ON ge.user_id = u.id WHERE ge.task_id = %s", (task_id,))
            elif flag_id:
                rows = query_all("SELECT ge.*, u.email FROM google_calendar_events ge JOIN users u ON ge.user_id = u.id WHERE ge.flag_id = %s", (flag_id,))
            else:
                return
            for row in rows:
                gcal.delete_calendar_event(row["email"], row["google_event_id"])
                execute("DELETE FROM google_calendar_events WHERE id = %s", (row["id"],))
        except Exception as e:
            logger.error("Delete gcal error: %s", e)
    threading.Thread(target=_do_delete, daemon=True).start()


@app.get("/api/tasks/{tid}")
def get_task(tid: int, user=Depends(get_current_user)):
    row = query_one("""
        SELECT t.*,
               d.name AS department_name,
               ua.full_name AS assigned_name,
               uc.full_name AS creator_name
        FROM tasks t
        LEFT JOIN departments d ON t.department_id = d.id
        LEFT JOIN users ua ON t.assigned_to = ua.id
        JOIN users uc ON t.created_by = uc.id
        WHERE t.id = %s
    """, (tid,))
    if not row:
        raise HTTPException(404, "Tâche introuvable")
    return dict(row)


@app.post("/api/tasks", status_code=201)
def create_task(body: TaskCreate, user=Depends(get_current_user)):
    row = execute_returning("""
        INSERT INTO tasks (title, description, department_id, assigned_to, created_by,
                           importance, estimated_hours, deadline, link)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
    """, (body.title, body.description, body.department_id, body.assigned_to,
          user["id"], body.importance, body.estimated_hours, body.deadline, body.link))
    recalc_priority(row["id"])
    task = dict(query_one("SELECT * FROM tasks WHERE id = %s", (row["id"],)))
    # 🔔 Sync to Google Calendar
    if task.get("assigned_to"):
        _sync_task_to_gcal(task["id"], task["assigned_to"])
        # 📧 Email notification
        assigned_user = query_one("SELECT email, full_name FROM users WHERE id = %s", (task["assigned_to"],))
        if assigned_user:
            notif.notify_task_assigned(
                to_email=assigned_user["email"], to_name=assigned_user["full_name"],
                task=task, assigner_name=user["full_name"]
            )
    return task


@app.put("/api/tasks/{tid}")
def update_task(tid: int, body: TaskUpdate, user=Depends(get_current_user)):
    existing = query_one("SELECT * FROM tasks WHERE id = %s", (tid,))
    if not existing:
        raise HTTPException(404, "Tâche introuvable")
    data = body.dict(exclude_none=True)
    # Handle status transitions
    if "status" in data:
        if data["status"] == "in_progress" and not existing["started_at"]:
            data["started_at"] = datetime.now(timezone.utc)
        elif data["status"] == "done" and not existing["completed_at"]:
            data["completed_at"] = datetime.now(timezone.utc)
    fields, values = [], []
    for k, v in data.items():
        fields.append(f"{k} = %s"); values.append(v)
    if not fields:
        return dict(existing)
    fields.append("updated_at = NOW()")
    values.append(tid)
    row = execute_returning(f"UPDATE tasks SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
    recalc_priority(tid)
    task = dict(row)
    # 🔔 Sync to Google Calendar
    if task.get("assigned_to"):
        _sync_task_to_gcal(task["id"], task["assigned_to"])
    # 📧 Email notification ONLY when task is marked as "done" → notify the creator
    if "status" in data and data["status"] == "done" and data["status"] != existing["status"]:
        current_user_id = user["id"]
        # Notify the creator (the person who assigned the task)
        created_by_id = task.get("created_by")
        if created_by_id and created_by_id != current_user_id:
            creator = query_one("SELECT email, full_name FROM users WHERE id = %s", (created_by_id,))
            if creator:
                notif.notify_task_status_changed(
                    to_email=creator["email"], to_name=creator["full_name"],
                    task=task, changer_name=user["full_name"],
                    old_status=existing["status"], new_status="done"
                )
    return task


@app.delete("/api/tasks/{tid}")
def delete_task(tid: int, user=Depends(get_current_user)):
    # 🔔 Remove from Google Calendar
    _delete_gcal_event(task_id=tid)
    # Clean up dependent records
    execute("DELETE FROM google_calendar_events WHERE task_id = %s", (tid,))
    execute("DELETE FROM knowledge_base WHERE flag_id IN (SELECT id FROM flags WHERE task_id = %s)", (tid,))
    execute("DELETE FROM attachments WHERE flag_id IN (SELECT id FROM flags WHERE task_id = %s)", (tid,))
    execute("DELETE FROM attachments WHERE task_id = %s", (tid,))
    execute("DELETE FROM flags WHERE task_id = %s", (tid,))
    execute("DELETE FROM task_dependencies WHERE task_id = %s OR depends_on = %s", (tid, tid))
    execute("DELETE FROM tasks WHERE id = %s", (tid,))
    return {"ok": True}

# ══════════════════════════════════════════
#  GOOGLE CALENDAR
# ══════════════════════════════════════════

@app.get("/api/gcal/status")
def gcal_status(user=Depends(get_current_user)):
    """Check if Google Calendar integration is configured."""
    configured = gcal._is_configured()
    return {
        "configured": configured,
        "service_account_file": "google-service-account.json",
        "message": "Prêt ! Placez le fichier google-service-account.json dans le dossier backend." if not configured else "Google Calendar connecté ✅"
    }


@app.post("/api/gcal/test/{email}")
def gcal_test(email: str, user=Depends(get_current_user)):
    """Test Google Calendar connection by creating a test event."""
    if not gcal._is_configured():
        raise HTTPException(400, "Service account non configuré")
    
    from datetime import datetime, timedelta, timezone
    test_event = {
        "summary": "🧪 Test BNZ TASK",
        "description": "Ceci est un test de connexion BNZ TASK → Google Calendar.\nSi vous voyez cet événement, la synchronisation fonctionne ! ✅",
        "start": {"dateTime": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(), "timeZone": "Europe/Rome"},
        "end": {"dateTime": (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat(), "timeZone": "Europe/Rome"},
        "colorId": "10",
    }
    event_id = gcal.create_calendar_event(email, test_event)
    if event_id:
        return {"ok": True, "message": f"Test envoyé à {email} ✅", "event_id": event_id}
    raise HTTPException(500, f"Échec de la connexion à Google Calendar pour {email}")


# ══════════════════════════════════════════
#  FLAGS
# ══════════════════════════════════════════

SLA_HOURS = {"normal": 48, "urgent": 24, "critical": 4}


@app.get("/api/flags")
def list_flags(status: Optional[str] = None, user=Depends(get_current_user)):
    sql = """
        SELECT f.*,
               t.title AS task_title,
               ur.full_name AS raiser_name,
               ua.full_name AS assignee_name,
               ud.full_name AS detected_name
        FROM flags f
        JOIN tasks t ON f.task_id = t.id
        JOIN users ur ON f.raised_by = ur.id
        LEFT JOIN users ua ON f.assigned_to = ua.id
        LEFT JOIN users ud ON f.detected_by = ud.id
        WHERE 1=1
    """
    params = []
    if status:
        sql += " AND f.status = %s"; params.append(status)
    sql += " ORDER BY CASE f.urgency WHEN 'critical' THEN 1 WHEN 'urgent' THEN 2 ELSE 3 END, f.created_at DESC"
    return [dict(r) for r in query_all(sql, params)]


@app.post("/api/flags", status_code=201)
def create_flag(body: FlagCreate, user=Depends(get_current_user)):
    sla_hours = SLA_HOURS.get(body.urgency, 48)
    sla_deadline = datetime.now(timezone.utc) + timedelta(hours=sla_hours)

    # Use provided assigned_to, or fallback to department manager
    assigned_to = body.assigned_to
    if not assigned_to and body.task_id:
        task = query_one("SELECT department_id FROM tasks WHERE id = %s", (body.task_id,))
        if task and task["department_id"]:
            dept = query_one("SELECT manager_id FROM departments WHERE id = %s", (task["department_id"],))
            assigned_to = dept["manager_id"] if dept else None

    # detected_by defaults to the logged-in user if not specified
    detected_by = body.detected_by or user["id"]

    row = execute_returning("""
        INSERT INTO flags (task_id, raised_by, assigned_to, detected_by, category, urgency, description, link, sla_deadline)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING *
    """, (body.task_id, user["id"], assigned_to, detected_by, body.category, body.urgency, body.description, body.link, sla_deadline))
    # Set task as blocked (only if linked to a task)
    if body.task_id:
        execute("UPDATE tasks SET status = 'blocked', updated_at = NOW() WHERE id = %s", (body.task_id,))
    flag = dict(row)
    # 🔔 Sync to Google Calendar + 📧 Email
    if flag.get("assigned_to"):
        _sync_flag_to_gcal(flag["id"], flag["assigned_to"])
        assigned_user = query_one("SELECT email, full_name FROM users WHERE id = %s", (flag["assigned_to"],))
        if assigned_user:
            # Add task_title to flag for email
            if flag.get("task_id"):
                t = query_one("SELECT title FROM tasks WHERE id = %s", (flag["task_id"],))
                flag["task_title"] = t["title"] if t else None
            notif.notify_flag_assigned(
                to_email=assigned_user["email"], to_name=assigned_user["full_name"],
                flag=flag, raiser_name=user["full_name"]
            )
    return flag


@app.put("/api/flags/{fid}")
def update_flag(fid: int, body: FlagUpdate, user=Depends(get_current_user)):
    existing = query_one("SELECT * FROM flags WHERE id = %s", (fid,))
    if not existing:
        raise HTTPException(404, "Flag introuvable")
    data = body.dict(exclude_none=True)
    if "status" in data and data["status"] == "resolved":
        data["resolved_at"] = datetime.now(timezone.utc)
    fields, values = [], []
    for k, v in data.items():
        fields.append(f"{k} = %s"); values.append(v)
    if not fields:
        return dict(existing)
    values.append(fid)
    row = execute_returning(f"UPDATE flags SET {', '.join(fields)} WHERE id = %s RETURNING *", values)
    flag = dict(row)
    # 📧 Email notification on flag status change -> notify the OTHER person
    if "status" in data and data["status"] != existing["status"]:
        current_user_id = user["id"]
        assigned_to_id = flag.get("assigned_to")
        raised_by_id = flag.get("raised_by")
        notify_ids = set()
        if assigned_to_id and assigned_to_id != current_user_id:
            notify_ids.add(assigned_to_id)
        if raised_by_id and raised_by_id != current_user_id:
            notify_ids.add(raised_by_id)
        for uid in notify_ids:
            target_user = query_one("SELECT email, full_name FROM users WHERE id = %s", (uid,))
            if target_user:
                notif.notify_flag_status_changed(
                    to_email=target_user["email"], to_name=target_user["full_name"],
                    flag=flag, changer_name=user["full_name"],
                    old_status=existing["status"], new_status=data["status"]
                )
    return flag


@app.post("/api/flags/{fid}/close")
def close_flag(fid: int, user=Depends(get_current_user)):
    flag = query_one("SELECT * FROM flags WHERE id = %s", (fid,))
    if not flag:
        raise HTTPException(404, "Flag introuvable")
    old_status = flag["status"]
    execute("UPDATE flags SET status = 'closed', closed_at = NOW() WHERE id = %s", (fid,))
    # Unblock the task
    if flag.get("task_id"):
        execute("UPDATE tasks SET status = 'in_progress', updated_at = NOW() WHERE id = %s", (flag["task_id"],))
    # Auto-create knowledge base entry
    if flag.get("resolution"):
        resolution_time = None
        if flag.get("resolved_at") and flag.get("created_at"):
            resolution_time = flag["resolved_at"] - flag["created_at"]
        execute_returning("""
            INSERT INTO knowledge_base (flag_id, problem_summary, solution, category, resolved_by, resolution_time)
            VALUES (%s, %s, %s, %s, %s, %s) RETURNING id
        """, (fid, flag["description"], flag["resolution"], flag["category"], flag["assigned_to"], resolution_time))
    # 📧 Email notification on close -> notify the OTHER person
    current_user_id = user["id"]
    notify_ids = set()
    if flag.get("assigned_to") and flag["assigned_to"] != current_user_id:
        notify_ids.add(flag["assigned_to"])
    if flag.get("raised_by") and flag["raised_by"] != current_user_id:
        notify_ids.add(flag["raised_by"])
    for uid in notify_ids:
        target_user = query_one("SELECT email, full_name FROM users WHERE id = %s", (uid,))
        if target_user:
            notif.notify_flag_status_changed(
                to_email=target_user["email"], to_name=target_user["full_name"],
                flag=dict(flag), changer_name=user["full_name"],
                old_status=old_status, new_status="closed"
            )
    return {"ok": True}


@app.delete("/api/flags/{fid}")
def delete_flag(fid: int, user=Depends(get_current_user)):
    flag = query_one("SELECT * FROM flags WHERE id = %s", (fid,))
    if not flag:
        raise HTTPException(404, "Flag introuvable")
    # 🔔 Remove from Google Calendar
    _delete_gcal_event(flag_id=fid)
    # Delete related records
    execute("DELETE FROM google_calendar_events WHERE flag_id = %s", (fid,))
    execute("DELETE FROM attachments WHERE flag_id = %s", (fid,))
    execute("DELETE FROM knowledge_base WHERE flag_id = %s", (fid,))
    # Delete flag
    execute("DELETE FROM flags WHERE id = %s", (fid,))
    # Unblock the task if it was blocked
    execute("UPDATE tasks SET status = 'todo', updated_at = NOW() WHERE id = %s AND status = 'blocked'", (flag["task_id"],))
    return {"ok": True}


# ══════════════════════════════════════════
#  FILE UPLOADS
# ══════════════════════════════════════════

@app.post("/api/attachments")
async def upload_attachment(
    file: UploadFile = File(...),
    flag_id: Optional[int] = Form(None),
    task_id: Optional[int] = Form(None),
    user=Depends(get_current_user),
):
    import uuid
    ext = os.path.splitext(file.filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join(UPLOAD_DIR, unique_name)
    with open(path, "wb") as f:
        content = await file.read()
        f.write(content)
    file_url = f"/uploads/{unique_name}"
    row = execute_returning("""
        INSERT INTO attachments (flag_id, task_id, file_name, file_url, file_type, uploaded_by)
        VALUES (%s, %s, %s, %s, %s, %s) RETURNING *
    """, (flag_id, task_id, file.filename, file_url, file.content_type, user["id"]))
    return dict(row)


@app.get("/api/attachments")
def list_attachments(flag_id: Optional[int] = None, task_id: Optional[int] = None):
    sql = "SELECT * FROM attachments WHERE 1=1"
    params = []
    if flag_id:
        sql += " AND flag_id = %s"; params.append(flag_id)
    if task_id:
        sql += " AND task_id = %s"; params.append(task_id)
    sql += " ORDER BY created_at DESC"
    return [dict(r) for r in query_all(sql, params)]


@app.delete("/api/attachments/{att_id}")
def delete_attachment(att_id: int, user=Depends(get_current_user)):
    att = query_one("SELECT * FROM attachments WHERE id = %s", (att_id,))
    if not att:
        raise HTTPException(404, "Attachment introuvable")
    file_path = os.path.join(UPLOAD_DIR, os.path.basename(att["file_url"]))
    if os.path.exists(file_path):
        os.remove(file_path)
    execute("DELETE FROM attachments WHERE id = %s", (att_id,))
    return {"ok": True}


# ══════════════════════════════════════════
#  KNOWLEDGE BASE
# ══════════════════════════════════════════

@app.get("/api/knowledge")
def search_knowledge(q: Optional[str] = None, category: Optional[str] = None, user=Depends(get_current_user)):
    sql = """
        SELECT kb.*, u.full_name AS resolver_name
        FROM knowledge_base kb
        LEFT JOIN users u ON kb.resolved_by = u.id
        WHERE 1=1
    """
    params = []
    if q:
        sql += " AND (kb.problem_summary ILIKE %s OR kb.solution ILIKE %s)"
        params.extend([f"%{q}%", f"%{q}%"])
    if category:
        sql += " AND kb.category = %s"; params.append(category)
    sql += " ORDER BY kb.created_at DESC LIMIT 50"
    return [dict(r) for r in query_all(sql, params)]


# ══════════════════════════════════════════
#  DASHBOARD / STATS
# ══════════════════════════════════════════

@app.get("/api/dashboard/stats")
def dashboard_stats(user=Depends(get_current_user)):
    row = query_one("""
        SELECT
            (SELECT COUNT(*) FROM tasks) AS total_tasks,
            (SELECT COUNT(*) FROM tasks WHERE status = 'done') AS done_tasks,
            (SELECT COUNT(*) FROM tasks WHERE status = 'blocked') AS blocked_tasks,
            (SELECT COUNT(*) FROM flags WHERE status IN ('open', 'in_progress')) AS open_flags,
            (SELECT COUNT(*) FROM users WHERE is_active = TRUE) AS total_users,
            (SELECT COUNT(*) FROM departments) AS total_departments
    """)
    return {
        "total_tasks":   row["total_tasks"],
        "done_tasks":    row["done_tasks"],
        "blocked_tasks": row["blocked_tasks"],
        "open_flags":    row["open_flags"],
        "total_users":   row["total_users"],
        "total_departments": row["total_departments"],
        "completion_rate": round(row["done_tasks"] / max(row["total_tasks"], 1) * 100, 1),
    }


@app.get("/api/dashboard/heatmap")
def department_heatmap(user=Depends(get_current_user)):
    """Return workload per user: active tasks vs capacity."""
    rows = query_all("""
        SELECT u.id, u.full_name, u.daily_capacity, d.name AS department,
               COUNT(t.id) FILTER (WHERE t.status IN ('todo', 'in_progress')) AS active_tasks,
               COUNT(t.id) FILTER (WHERE t.status = 'blocked') AS blocked_tasks,
               COUNT(t.id) FILTER (WHERE t.status = 'done') AS completed_tasks
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN tasks t ON t.assigned_to = u.id
        WHERE u.is_active = TRUE
        GROUP BY u.id, u.full_name, u.daily_capacity, d.name
        ORDER BY d.name, u.full_name
    """)
    return [
        {
            **dict(r),
            "load_pct": round(r["active_tasks"] / max(r["daily_capacity"], 1) * 100, 1),
        }
        for r in rows
    ]


# ══════════════════════════════════════════
#  NOTIFICATIONS
# ══════════════════════════════════════════

@app.get("/api/notifications")
def list_notifications(user=Depends(get_current_user)):
    return [dict(r) for r in query_all(
        "SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC LIMIT 50",
        (user["id"],),
    )]


@app.put("/api/notifications/{nid}/read")
def mark_read(nid: int, user=Depends(get_current_user)):
    execute("UPDATE notifications SET is_read = TRUE WHERE id = %s AND user_id = %s", (nid, user["id"]))
    return {"ok": True}


# ══════════════════════════════════════════
# ══════════════════════════════════════════
#  DATABASE SETUP (one-time, for Railway deployment)
# ══════════════════════════════════════════

@app.get("/api/setup/{secret}")
def setup_database(secret: str):
    """One-time setup: create departments + admin user. Use secret to prevent abuse."""
    if secret != "init-BNZ TASK-2026":
        raise HTTPException(403, "Invalid setup key")

    results = []

    # Create departments
    departments = [
        ("Direction", "Direction générale", "#6366f1", "building"),
        ("Production", "Production industrielle", "#10b981", "factory"),
        ("Qualité", "Contrôle qualité", "#f59e0b", "shield"),
        ("Commercial", "Service commercial", "#06b6d4", "briefcase"),
        ("Logistique", "Supply chain", "#8b5cf6", "truck"),
    ]
    for name, desc, color, icon in departments:
        existing = query_one("SELECT id FROM departments WHERE name = %s", (name,))
        if not existing:
            execute_returning(
                "INSERT INTO departments (name, description, color, icon) VALUES (%s, %s, %s, %s) RETURNING id",
                (name, desc, color, icon)
            )
            results.append(f"[+] Département '{name}' créé")
        else:
            results.append(f"[OK] Département '{name}' existe déjà")

    # Create admin user
    admin_email = "admin@BNZ TASK.local"
    existing_admin = query_one("SELECT id FROM users WHERE email = %s", (admin_email,))
    if not existing_admin:
        dept = query_one("SELECT id FROM departments WHERE name = 'Direction'")
        dept_id = dept["id"] if dept else None
        hashed = hash_password("admin123")
        row = execute_returning(
            "INSERT INTO users (email, full_name, password_hash, role, department_id, daily_capacity) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (admin_email, "Administrateur", hashed, "super_admin", dept_id, 8)
        )
        execute("INSERT INTO user_stats (user_id) VALUES (%s) ON CONFLICT DO NOTHING", (row["id"],))
        results.append(f"[+] Admin créé: {admin_email} / admin123")
    else:
        results.append(f"[OK] Admin existe déjà: {admin_email}")

    # Create Wiem user
    wiem_email = "wiem.hsairi@benozzi.com"
    existing_wiem = query_one("SELECT id FROM users WHERE email = %s", (wiem_email,))
    if not existing_wiem:
        dept = query_one("SELECT id FROM departments WHERE name = 'Direction'")
        dept_id = dept["id"] if dept else None
        hashed = hash_password("Benozzi2026!")
        row = execute_returning(
            "INSERT INTO users (email, full_name, password_hash, role, department_id, daily_capacity) "
            "VALUES (%s, %s, %s, %s, %s, %s) RETURNING id",
            (wiem_email, "Wiem Hsairi", hashed, "super_admin", dept_id, 8)
        )
        execute("INSERT INTO user_stats (user_id) VALUES (%s) ON CONFLICT DO NOTHING", (row["id"],))
        results.append(f"[+] User créé: {wiem_email}")
    else:
        results.append(f"[OK] User existe déjà: {wiem_email}")

    return {"results": results}


@app.get("/api/debug/{secret}")
def debug_database(secret: str):
    """Temporary: view database contents."""
    if secret != "init-BNZ TASK-2026":
        raise HTTPException(403, "Invalid key")

    users = query_all("SELECT id, email, full_name, role, department_id FROM users ORDER BY id")
    departments = query_all("SELECT id, name, description FROM departments ORDER BY id")

    return {
        "users": users,
        "departments": departments,
        "user_count": len(users),
        "dept_count": len(departments),
    }


@app.post("/api/migrate/{secret}")
def migrate_data(secret: str, data: dict):
    """Import data from local database dump."""
    if secret != "init-BNZ TASK-2026":
        raise HTTPException(403, "Invalid key")

    results = []

    try:
        # Clear existing data (in correct order for FK constraints)
        for table in ["knowledge_base", "attachments", "notifications", "user_stats", "flags", "task_dependencies", "tasks", "users", "departments"]:
            execute(f"DELETE FROM {table}")
            results.append(f"[CLEAR] {table}")

        # Import departments (WITHOUT manager_id to avoid FK issues)
        dept_managers = {}
        for d in data.get("departments", []):
            dept_managers[d["id"]] = d.get("manager_id")
            execute(
                "INSERT INTO departments (id, name, description, color, icon, created_at, updated_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (d["id"], d["name"], d.get("description"), d.get("color", "#3b82f6"),
                 d.get("icon", ""), d.get("created_at"), d.get("updated_at"))
            )
        results.append(f"[+] {len(data.get('departments', []))} départements importés")

        # Import users
        for u in data.get("users", []):
            execute(
                "INSERT INTO users (id, email, full_name, avatar_url, password_hash, role, department_id, "
                "google_id, daily_capacity, is_active, created_at, updated_at) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) ON CONFLICT (id) DO NOTHING",
                (u["id"], u["email"], u["full_name"], u.get("avatar_url"), u.get("password_hash"),
                 u.get("role", "employee"), u.get("department_id"), u.get("google_id"),
                 u.get("daily_capacity", 8), u.get("is_active", True), u.get("created_at"), u.get("updated_at"))
            )
        results.append(f"[+] {len(data.get('users', []))} utilisateurs importés")

        # Now update department managers
        for dept_id, mgr_id in dept_managers.items():
            if mgr_id:
                try:
                    execute("UPDATE departments SET manager_id = %s WHERE id = %s", (mgr_id, dept_id))
                except:
                    pass
        results.append("[OK] Manager IDs mis à jour")

        # Import tasks
        for t in data.get("tasks", []):
            execute(
                "INSERT INTO tasks (id, title, description, department_id, assigned_to, created_by, status, "
                "importance, estimated_hours, deadline, priority_score, google_event_id, started_at, "
                "completed_at, created_at, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
                (t["id"], t["title"], t.get("description"), t.get("department_id"), t.get("assigned_to"),
                 t["created_by"], t.get("status", "todo"), t.get("importance", 3),
                 t.get("estimated_hours", 1), t.get("deadline"), t.get("priority_score", 0),
                 t.get("google_event_id"), t.get("started_at"), t.get("completed_at"),
                 t.get("created_at"), t.get("updated_at"))
            )
        results.append(f"[+] {len(data.get('tasks', []))} tâches importées")

        # Import flags
        for f in data.get("flags", []):
            execute(
                "INSERT INTO flags (id, task_id, raised_by, assigned_to, category, urgency, status, "
                "description, resolution, sla_deadline, resolution_deadline, blocked_duration, "
                "created_at, resolved_at, closed_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
                (f["id"], f["task_id"], f["raised_by"], f.get("assigned_to"), f.get("category"),
                 f.get("urgency"), f.get("status", "open"), f["description"], f.get("resolution"),
                 f.get("sla_deadline"), f.get("resolution_deadline"), f.get("blocked_duration"),
                 f.get("created_at"), f.get("resolved_at"), f.get("closed_at"))
            )
        results.append(f"[+] {len(data.get('flags', []))} flags importés")

        # Import user_stats
        for s in data.get("user_stats", []):
            execute(
                "INSERT INTO user_stats (user_id, completion_streak, reliability_score, tasks_completed, "
                "flags_resolved, badges, updated_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (user_id) DO NOTHING",
                (s["user_id"], s.get("completion_streak", 0), s.get("reliability_score", 100),
                 s.get("tasks_completed", 0), s.get("flags_resolved", 0),
                 json.dumps(s.get("badges", [])), s.get("updated_at"))
            )
        results.append(f"[+] {len(data.get('user_stats', []))} stats importées")

        # Import notifications
        for n in data.get("notifications", []):
            execute(
                "INSERT INTO notifications (id, user_id, type, title, body, link, is_read, created_at) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s) ON CONFLICT (id) DO NOTHING",
                (n["id"], n["user_id"], n["type"], n.get("title"), n.get("body"),
                 n.get("link"), n.get("is_read", False), n.get("created_at"))
            )
        results.append(f"[+] {len(data.get('notifications', []))} notifications importées")

        # Reset sequences
        for table in ["departments", "users", "tasks", "flags", "notifications", "knowledge_base", "attachments"]:
            try:
                execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1))")
            except:
                pass
        results.append("[OK] Séquences réinitialisées")

        # Update department manager FKs
        execute("UPDATE departments SET manager_id = NULL WHERE manager_id NOT IN (SELECT id FROM users)")
        results.append("[OK] FK manager_id nettoyées")

    except Exception as e:
        results.append(f"[ERROR] {str(e)}")

    return {"results": results}


# ══════════════════════════════════════════
#  STARTUP
# ══════════════════════════════════════════

@app.on_event("startup")
def on_startup():
    try:
        init_db()
    except Exception as e:
        print(f"[WARN] DB init warning: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8150, reload=False, log_level="info")
