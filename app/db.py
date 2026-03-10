import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from app.config import DB_CONFIG, DB_POOL_MIN, DB_POOL_MAX

db_pool: pool.ThreadedConnectionPool | None = None


def init_pool():
    global db_pool
    db_pool = pool.ThreadedConnectionPool(DB_POOL_MIN, DB_POOL_MAX, **DB_CONFIG)


def close_pool():
    if db_pool:
        db_pool.closeall()


def query(sql: str, params: tuple | None = None) -> list[dict]:
    conn = db_pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            return cur.fetchall()
    finally:
        db_pool.putconn(conn)


def execute(sql: str, params: tuple | None = None) -> list[dict]:
    conn = db_pool.getconn()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, params)
            conn.commit()
            try:
                return cur.fetchall()
            except psycopg2.ProgrammingError:
                return []
    except Exception:
        conn.rollback()
        raise
    finally:
        db_pool.putconn(conn)
