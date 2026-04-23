-- ══════════════════════════════════════════
-- SmartTask Pro — Database Schema (v2 - No Projects)
-- ══════════════════════════════════════════

-- 1. Départements
CREATE TABLE IF NOT EXISTS departments (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL UNIQUE,
    description     TEXT,
    color           VARCHAR(7) DEFAULT '#3b82f6',
    icon            VARCHAR(10) DEFAULT '🏢',
    manager_id      INTEGER,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Utilisateurs
CREATE TABLE IF NOT EXISTS users (
    id              SERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    full_name       VARCHAR(150) NOT NULL,
    avatar_url      TEXT,
    password_hash   TEXT,
    role            VARCHAR(20) NOT NULL DEFAULT 'employee'
                    CHECK (role IN ('super_admin', 'manager', 'project_lead', 'employee')),
    department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    google_id       VARCHAR(100) UNIQUE,
    daily_capacity  INTEGER DEFAULT 8,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- FK departments.manager_id → users
ALTER TABLE departments ADD CONSTRAINT fk_dept_manager
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL;

-- 3. Tâches (liées directement aux départements)
CREATE TABLE IF NOT EXISTS tasks (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(300) NOT NULL,
    description     TEXT,
    department_id   INTEGER REFERENCES departments(id) ON DELETE SET NULL,
    assigned_to     INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_by      INTEGER NOT NULL REFERENCES users(id),
    status          VARCHAR(20) DEFAULT 'todo'
                    CHECK (status IN ('todo', 'in_progress', 'blocked', 'in_review', 'done')),
    importance      INTEGER DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
    estimated_hours DECIMAL(5,1) DEFAULT 1,
    deadline        TIMESTAMPTZ,
    priority_score  DECIMAL(5,2) DEFAULT 0,
    google_event_id VARCHAR(200),
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Dépendances entre tâches
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on      INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, depends_on)
);

-- 5. Flags (Blocages)
CREATE TABLE IF NOT EXISTS flags (
    id              SERIAL PRIMARY KEY,
    task_id         INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    raised_by       INTEGER NOT NULL REFERENCES users(id),
    assigned_to     INTEGER REFERENCES users(id),
    category        VARCHAR(30) DEFAULT 'technical'
                    CHECK (category IN ('technical', 'resources', 'communication', 'external')),
    urgency         VARCHAR(20) DEFAULT 'normal'
                    CHECK (urgency IN ('normal', 'urgent', 'critical')),
    status          VARCHAR(20) DEFAULT 'open'
                    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    description     TEXT NOT NULL,
    resolution      TEXT,
    sla_deadline    TIMESTAMPTZ,
    resolution_deadline TIMESTAMPTZ,
    blocked_duration INTERVAL DEFAULT '0',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ
);

-- 6. Pièces jointes
CREATE TABLE IF NOT EXISTS attachments (
    id              SERIAL PRIMARY KEY,
    flag_id         INTEGER REFERENCES flags(id) ON DELETE CASCADE,
    task_id         INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    file_name       VARCHAR(255) NOT NULL,
    file_url        TEXT NOT NULL,
    file_type       VARCHAR(50),
    uploaded_by     INTEGER REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Base de connaissances
CREATE TABLE IF NOT EXISTS knowledge_base (
    id              SERIAL PRIMARY KEY,
    flag_id         INTEGER REFERENCES flags(id),
    problem_summary TEXT NOT NULL,
    solution        TEXT NOT NULL,
    category        VARCHAR(30),
    resolved_by     INTEGER REFERENCES users(id),
    resolution_time INTERVAL,
    tags            TEXT[],
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id              SERIAL PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            VARCHAR(30) NOT NULL,
    title           VARCHAR(300),
    body            TEXT,
    link            TEXT,
    is_read         BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Gamification / Stats
CREATE TABLE IF NOT EXISTS user_stats (
    user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    completion_streak INTEGER DEFAULT 0,
    reliability_score DECIMAL(5,2) DEFAULT 100,
    tasks_completed INTEGER DEFAULT 0,
    flags_resolved  INTEGER DEFAULT 0,
    badges          JSONB DEFAULT '[]',
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Index ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tasks_assigned   ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status     ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_flags_task       ON flags(task_id);
CREATE INDEX IF NOT EXISTS idx_flags_status     ON flags(status);
CREATE INDEX IF NOT EXISTS idx_notif_user       ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_users_dept       ON users(department_id);

-- ── Default super admin ──────────────────
INSERT INTO users (email, full_name, role, password_hash)
VALUES ('admin@smarttask.local', 'Super Admin', 'super_admin',
        '$2b$12$LJ3m4ys3hz.wF4JGRKcFNOnzH5JH5r6FO2KQb8l66IG2Rk8ByLLSe')
ON CONFLICT (email) DO NOTHING;
