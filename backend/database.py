# ══════════════════════════════════════════
# SmartTask Pro — Database Layer (Optimized Pool)
# ══════════════════════════════════════════
import os, logging, psycopg2, psycopg2.extras, psycopg2.pool
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger("smarttask.db")

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:admin@localhost:5433/smarttask")

# ── Connection Pool ─────────────────────
_pool = None

def _get_pool():
    """Lazy-initialize a threaded connection pool."""
    global _pool
    if _pool is None or _pool.closed:
        logger.info("Creating new DB connection pool")
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=20,
            dsn=DATABASE_URL,
            # Connection-level optimizations
            options="-c statement_timeout=30000",  # 30s timeout per query
        )
    return _pool


def _reset_pool():
    """Force-reset the pool (called on fatal DB errors)."""
    global _pool
    logger.warning("Resetting DB connection pool")
    try:
        if _pool and not _pool.closed:
            _pool.closeall()
    except Exception:
        pass
    _pool = None


def get_conn():
    """Return a pooled DB connection with RealDictCursor."""
    pool = _get_pool()
    conn = pool.getconn()
    try:
        # Quick health check — only if connection seems stale
        if conn.closed:
            raise psycopg2.InterfaceError("Connection is closed")
        conn.cursor_factory = psycopg2.extras.RealDictCursor
        # Use a lightweight ping instead of SELECT 1
        conn.isolation_level  # Will raise if connection is dead
        return conn
    except Exception:
        # Connection is dead, discard it and get a new one
        logger.warning("Stale connection detected, reconnecting...")
        try:
            pool.putconn(conn, close=True)
        except Exception:
            pass
        # Try again with a fresh connection
        try:
            conn = pool.getconn()
            conn.cursor_factory = psycopg2.extras.RealDictCursor
            return conn
        except Exception:
            # Pool is broken, reset it completely
            _reset_pool()
            pool = _get_pool()
            conn = pool.getconn()
            conn.cursor_factory = psycopg2.extras.RealDictCursor
            return conn


def put_conn(conn):
    """Return a connection back to the pool."""
    try:
        pool = _get_pool()
        pool.putconn(conn)
    except Exception:
        pass


def query(sql: str, params=None, *, fetchone=False, fetchall=False, returning=False):
    """Execute SQL and optionally fetch results. Auto-retries on connection errors."""
    for attempt in range(2):
        conn = get_conn()
        try:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                if fetchone or returning:
                    result = cur.fetchone()
                elif fetchall:
                    result = cur.fetchall()
                else:
                    result = None
                conn.commit()
                return result
        except (psycopg2.OperationalError, psycopg2.InterfaceError) as e:
            # Connection-level error -> reset and retry
            logger.warning("DB connection error (attempt %d): %s", attempt + 1, e)
            try:
                conn.rollback()
            except Exception:
                pass
            put_conn(conn)
            if attempt == 0:
                _reset_pool()
                continue
            raise
        except Exception:
            conn.rollback()
            raise
        finally:
            put_conn(conn)


def query_all(sql: str, params=None):
    return query(sql, params, fetchall=True) or []


def query_one(sql: str, params=None):
    return query(sql, params, fetchone=True)


def execute(sql: str, params=None):
    return query(sql, params)


def execute_returning(sql: str, params=None):
    return query(sql, params, returning=True)


def init_db():
    """Apply schema.sql to create all tables."""
    schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql = f.read()
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
        print("[OK] Database schema applied successfully")
    except Exception as e:
        conn.rollback()
        print(f"[ERROR] Database init error: {e}")
        raise
    finally:
        put_conn(conn)
