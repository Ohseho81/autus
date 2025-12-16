"""
AUTUS Database Layer - PostgreSQL + SQLite Fallback
100만명 대응 가능
"""
import os
import sqlite3
from contextlib import contextmanager

# DATABASE_URL이 있으면 PostgreSQL, 없으면 SQLite
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    USE_POSTGRES = True
    print(f"✅ PostgreSQL 연결")
else:
    USE_POSTGRES = False
    DB_PATH = os.getenv("DB_PATH", "/tmp/autus.db")
    print(f"⚠️ SQLite 사용: {DB_PATH}")


@contextmanager
def get_db():
    """DB 연결 컨텍스트 매니저"""
    if USE_POSTGRES:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()
    else:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()


def init_db():
    """테이블 초기화"""
    with get_db() as conn:
        cur = conn.cursor()
        
        # PostgreSQL vs SQLite 문법 차이 처리
        if USE_POSTGRES:
            cur.execute('''CREATE TABLE IF NOT EXISTS state (
                id TEXT PRIMARY KEY,
                tick INTEGER DEFAULT 0,
                cycle INTEGER DEFAULT 0,
                pressure REAL DEFAULT 0,
                release REAL DEFAULT 0,
                decision REAL DEFAULT 0,
                gravity REAL DEFAULT 0.3,
                entropy REAL DEFAULT 0,
                status TEXT DEFAULT 'GREEN',
                bottleneck TEXT DEFAULT 'NONE',
                required_action TEXT DEFAULT 'NONE',
                failure_in_ticks INTEGER DEFAULT 999,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            
            cur.execute('''CREATE TABLE IF NOT EXISTS actors (
                actor_id TEXT PRIMARY KEY,
                total_pressure REAL DEFAULT 0,
                total_release REAL DEFAULT 0,
                total_decisions INTEGER DEFAULT 0,
                last_event TEXT,
                last_event_ts TIMESTAMP,
                risk_score REAL DEFAULT 0
            )''')
            
            cur.execute('''CREATE TABLE IF NOT EXISTS audit (
                id SERIAL PRIMARY KEY,
                ts TIMESTAMP,
                event TEXT,
                actor_id TEXT,
                data TEXT,
                state_snapshot TEXT
            )''')
        else:
            cur.execute('''CREATE TABLE IF NOT EXISTS state (
                id TEXT PRIMARY KEY,
                tick INTEGER DEFAULT 0,
                cycle INTEGER DEFAULT 0,
                pressure REAL DEFAULT 0,
                release REAL DEFAULT 0,
                decision REAL DEFAULT 0,
                gravity REAL DEFAULT 0.3,
                entropy REAL DEFAULT 0,
                status TEXT DEFAULT 'GREEN',
                bottleneck TEXT DEFAULT 'NONE',
                required_action TEXT DEFAULT 'NONE',
                failure_in_ticks INTEGER DEFAULT 999,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )''')
            
            cur.execute('''CREATE TABLE IF NOT EXISTS actors (
                actor_id TEXT PRIMARY KEY,
                total_pressure REAL DEFAULT 0,
                total_release REAL DEFAULT 0,
                total_decisions INTEGER DEFAULT 0,
                last_event TEXT,
                last_event_ts TIMESTAMP,
                risk_score REAL DEFAULT 0
            )''')
            
            cur.execute('''CREATE TABLE IF NOT EXISTS audit (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts TIMESTAMP,
                event TEXT,
                actor_id TEXT,
                data TEXT,
                state_snapshot TEXT
            )''')
        
        # 인덱스 생성
        try:
            cur.execute('CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit(ts)')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit(actor_id)')
        except:
            pass
        
        # 초기 상태 삽입
        if USE_POSTGRES:
            cur.execute("SELECT id FROM state WHERE id='SUN_001'")
        else:
            cur.execute("SELECT id FROM state WHERE id='SUN_001'")
        
        if not cur.fetchone():
            cur.execute('''INSERT INTO state (id, tick, cycle, pressure, release, decision, gravity, entropy, status, bottleneck, required_action, failure_in_ticks)
                          VALUES ('SUN_001', 0, 0, 0, 0, 0, 0.3, 0, 'GREEN', 'NONE', 'NONE', 999)''')


def execute_query(query, params=None, fetch_one=False, fetch_all=False):
    """쿼리 실행 헬퍼"""
    with get_db() as conn:
        cur = conn.cursor()
        
        # PostgreSQL은 %s, SQLite는 ? 사용
        if USE_POSTGRES and params:
            query = query.replace('?', '%s')
        
        if params:
            cur.execute(query, params)
        else:
            cur.execute(query)
        
        if fetch_one:
            return cur.fetchone()
        elif fetch_all:
            return cur.fetchall()
        return None
