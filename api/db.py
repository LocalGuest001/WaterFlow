import uuid
from psycopg_pool import ConnectionPool
try:
    from .settings import get_settings
except Exception:
    from settings import get_settings

settings = get_settings()

# Simple sync connection pool. Calls are blocking; acceptable for this small app.
pool = ConnectionPool(settings.database_url)


def _dict_rows(cursor):
    if cursor.description is None:
        return []
    cols = [col.name for col in cursor.description]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]


def query(sql: str, params=()):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return _dict_rows(cur)


def query_one(sql: str, params=()):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
            if row is None:
                return None
            cols = [col.name for col in cur.description]
            return dict(zip(cols, row))


def execute(sql: str, params=()):
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            try:
                if cur.description:
                    cols = [col.name for col in cur.description]
                    rows = [dict(zip(cols, r)) for r in cur.fetchall()]
                    return rows
            except Exception:
                pass
            return {'rowcount': cur.rowcount}
