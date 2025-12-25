#!/usr/bin/env python3
"""
AUTUS Database Layer
SQLite (기본) / PostgreSQL (확장) 지원
"""

import os
import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
from contextlib import contextmanager

# ═══════════════════════════════════════════════════════════════
# CONFIG
# ═══════════════════════════════════════════════════════════════

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///autus.db")
USE_POSTGRES = DATABASE_URL.startswith("postgres")

if USE_POSTGRES:
    try:
        import psycopg2
        from psycopg2.extras import RealDictCursor
    except ImportError:
        print("⚠️ psycopg2 not installed. Falling back to SQLite.")
        USE_POSTGRES = False

# ═══════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════

class EventType(str, Enum):
    STATE_CHANGE = "state_change"
    PACK_SWITCH = "pack_switch"
    THRESHOLD_CHECK = "threshold_check"
    PROOF_RECORD = "proof_record"
    BEAD_UNLOCK = "bead_unlock"
    DETOUR_ENTER = "detour_enter"
    LOOP_COMPLETE = "loop_complete"
    METRIC_UPDATE = "metric_update"

@dataclass
class Event:
    id: Optional[int]
    timestamp: str
    event_type: str
    pack: str
    station: int
    accel: float
    energy: float
    flow: float
    risk: float
    loss_velocity: float
    bead1: str
    bead2: str
    bead3: str
    has_proof: bool
    data: str  # JSON string for additional data

@dataclass
class Session:
    id: Optional[int]
    session_id: str
    started_at: str
    ended_at: Optional[str]
    total_events: int
    loops_completed: int
    beads_unlocked: int
    final_accel: float

@dataclass
class DailyReport:
    date: str
    total_events: int
    sessions: int
    loops_completed: int
    avg_energy: float
    avg_risk: float
    total_loss: float
    beads_unlocked: int
    most_used_pack: str

# ═══════════════════════════════════════════════════════════════
# DATABASE MANAGER
# ═══════════════════════════════════════════════════════════════

class DatabaseManager:
    """AUTUS 데이터베이스 매니저"""
    
    def __init__(self, db_path: str = "autus.db"):
        self.db_path = db_path
        self.use_postgres = USE_POSTGRES
        self._init_db()
    
    @contextmanager
    def get_connection(self):
        """데이터베이스 연결 컨텍스트 매니저"""
        if self.use_postgres:
            conn = psycopg2.connect(DATABASE_URL)
            try:
                yield conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise e
            finally:
                conn.close()
    
    def _init_db(self):
        """테이블 초기화"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Events 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    pack TEXT NOT NULL,
                    station INTEGER NOT NULL,
                    accel REAL NOT NULL,
                    energy REAL NOT NULL,
                    flow REAL NOT NULL,
                    risk REAL NOT NULL,
                    loss_velocity REAL NOT NULL,
                    bead1 TEXT NOT NULL,
                    bead2 TEXT NOT NULL,
                    bead3 TEXT NOT NULL,
                    has_proof INTEGER NOT NULL,
                    data TEXT
                )
            """)
            
            # Sessions 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT UNIQUE NOT NULL,
                    started_at TEXT NOT NULL,
                    ended_at TEXT,
                    total_events INTEGER DEFAULT 0,
                    loops_completed INTEGER DEFAULT 0,
                    beads_unlocked INTEGER DEFAULT 0,
                    final_accel REAL DEFAULT 0.0
                )
            """)
            
            # Daily Reports 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS daily_reports (
                    date TEXT PRIMARY KEY,
                    total_events INTEGER NOT NULL,
                    sessions INTEGER NOT NULL,
                    loops_completed INTEGER NOT NULL,
                    avg_energy REAL NOT NULL,
                    avg_risk REAL NOT NULL,
                    total_loss REAL NOT NULL,
                    beads_unlocked INTEGER NOT NULL,
                    most_used_pack TEXT NOT NULL
                )
            """)
            
            # Goals 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS goals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL,
                    goal_text TEXT NOT NULL,
                    pack TEXT NOT NULL,
                    status TEXT DEFAULT 'active',
                    completed_at TEXT,
                    initial_energy REAL,
                    final_energy REAL,
                    total_loops INTEGER DEFAULT 0
                )
            """)
            
            # Proofs 테이블
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS proofs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    proof_type TEXT NOT NULL,
                    session_id TEXT,
                    accel_before REAL NOT NULL,
                    accel_after REAL NOT NULL,
                    note TEXT
                )
            """)
            
            # 인덱스 생성
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_events_pack ON events(pack)")
            
            conn.commit()
            print(f"✅ Database initialized: {self.db_path}")
    
    # ═══════════════════════════════════════════════════════════════
    # EVENT OPERATIONS
    # ═══════════════════════════════════════════════════════════════
    
    def log_event(self, event_type: EventType, state: Dict, extra_data: Dict = None) -> int:
        """이벤트 기록"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            beads = state.get("beads", {})
            metrics = state.get("metrics", {})
            
            cursor.execute("""
                INSERT INTO events (
                    timestamp, event_type, pack, station, accel,
                    energy, flow, risk, loss_velocity,
                    bead1, bead2, bead3, has_proof, data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                datetime.now().isoformat(),
                event_type.value,
                state.get("current_pack", "unknown"),
                state.get("current_station", 0),
                beads.get("accel", 0.0),
                metrics.get("energy", 0.0),
                metrics.get("flow", 0.0),
                metrics.get("risk", 0.0),
                metrics.get("loss_velocity", 0.0),
                beads.get("bead1", "LOCK"),
                beads.get("bead2", "LOCK"),
                beads.get("bead3", "LOCK"),
                1 if beads.get("has_proof", False) else 0,
                json.dumps(extra_data) if extra_data else None
            ))
            
            return cursor.lastrowid
    
    def get_events(self, limit: int = 100, event_type: str = None, pack: str = None) -> List[Dict]:
        """이벤트 조회"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM events WHERE 1=1"
            params = []
            
            if event_type:
                query += " AND event_type = ?"
                params.append(event_type)
            
            if pack:
                query += " AND pack = ?"
                params.append(pack)
            
            query += " ORDER BY timestamp DESC LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            return [dict(row) for row in rows]
    
    def get_event_count(self, since: str = None) -> int:
        """이벤트 수 조회"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if since:
                cursor.execute("SELECT COUNT(*) FROM events WHERE timestamp >= ?", (since,))
            else:
                cursor.execute("SELECT COUNT(*) FROM events")
            
            return cursor.fetchone()[0]
    
    # ═══════════════════════════════════════════════════════════════
    # SESSION OPERATIONS
    # ═══════════════════════════════════════════════════════════════
    
    def create_session(self, session_id: str) -> int:
        """새 세션 생성"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO sessions (session_id, started_at)
                VALUES (?, ?)
            """, (session_id, datetime.now().isoformat()))
            return cursor.lastrowid
    
    def end_session(self, session_id: str, stats: Dict):
        """세션 종료"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE sessions SET
                    ended_at = ?,
                    total_events = ?,
                    loops_completed = ?,
                    beads_unlocked = ?,
                    final_accel = ?
                WHERE session_id = ?
            """, (
                datetime.now().isoformat(),
                stats.get("total_events", 0),
                stats.get("loops_completed", 0),
                stats.get("beads_unlocked", 0),
                stats.get("final_accel", 0.0),
                session_id
            ))
    
    def get_sessions(self, limit: int = 10) -> List[Dict]:
        """세션 목록 조회"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM sessions
                ORDER BY started_at DESC
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    # ═══════════════════════════════════════════════════════════════
    # GOAL OPERATIONS
    # ═══════════════════════════════════════════════════════════════
    
    def create_goal(self, goal_text: str, pack: str, initial_energy: float = None) -> int:
        """목표 생성"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO goals (created_at, goal_text, pack, initial_energy)
                VALUES (?, ?, ?, ?)
            """, (datetime.now().isoformat(), goal_text, pack, initial_energy))
            return cursor.lastrowid
    
    def complete_goal(self, goal_id: int, final_energy: float, total_loops: int):
        """목표 완료"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE goals SET
                    status = 'completed',
                    completed_at = ?,
                    final_energy = ?,
                    total_loops = ?
                WHERE id = ?
            """, (datetime.now().isoformat(), final_energy, total_loops, goal_id))
    
    def get_active_goals(self) -> List[Dict]:
        """활성 목표 조회"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM goals
                WHERE status = 'active'
                ORDER BY created_at DESC
            """)
            return [dict(row) for row in cursor.fetchall()]
    
    def get_goals_history(self, limit: int = 20) -> List[Dict]:
        """목표 이력 조회"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM goals
                ORDER BY created_at DESC
                LIMIT ?
            """, (limit,))
            return [dict(row) for row in cursor.fetchall()]
    
    # ═══════════════════════════════════════════════════════════════
    # PROOF OPERATIONS
    # ═══════════════════════════════════════════════════════════════
    
    def log_proof(self, proof_type: str, session_id: str, accel_before: float, accel_after: float, note: str = None) -> int:
        """증거 기록"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proofs (timestamp, proof_type, session_id, accel_before, accel_after, note)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (datetime.now().isoformat(), proof_type, session_id, accel_before, accel_after, note))
            return cursor.lastrowid
    
    def get_proofs(self, session_id: str = None, limit: int = 50) -> List[Dict]:
        """증거 조회"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if session_id:
                cursor.execute("""
                    SELECT * FROM proofs
                    WHERE session_id = ?
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (session_id, limit))
            else:
                cursor.execute("""
                    SELECT * FROM proofs
                    ORDER BY timestamp DESC
                    LIMIT ?
                """, (limit,))
            
            return [dict(row) for row in cursor.fetchall()]
    
    # ═══════════════════════════════════════════════════════════════
    # ANALYTICS & REPORTS
    # ═══════════════════════════════════════════════════════════════
    
    def generate_daily_report(self, date: str = None) -> Dict:
        """일일 리포트 생성"""
        if date is None:
            date = datetime.now().strftime("%Y-%m-%d")
        
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 해당 날짜의 이벤트 통계
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_events,
                    AVG(energy) as avg_energy,
                    AVG(risk) as avg_risk,
                    SUM(loss_velocity) as total_loss,
                    SUM(CASE WHEN bead2 = 'UNLOCK' OR bead3 = 'UNLOCK' THEN 1 ELSE 0 END) as beads_unlocked
                FROM events
                WHERE DATE(timestamp) = ?
            """, (date,))
            
            stats = cursor.fetchone()
            
            # 세션 수
            cursor.execute("""
                SELECT COUNT(*) FROM sessions
                WHERE DATE(started_at) = ?
            """, (date,))
            sessions = cursor.fetchone()[0]
            
            # 루프 완료 수
            cursor.execute("""
                SELECT COUNT(*) FROM events
                WHERE DATE(timestamp) = ? AND event_type = 'loop_complete'
            """, (date,))
            loops = cursor.fetchone()[0]
            
            # 가장 많이 사용된 Pack
            cursor.execute("""
                SELECT pack, COUNT(*) as cnt FROM events
                WHERE DATE(timestamp) = ?
                GROUP BY pack
                ORDER BY cnt DESC
                LIMIT 1
            """, (date,))
            pack_row = cursor.fetchone()
            most_used_pack = pack_row[0] if pack_row else "none"
            
            report = {
                "date": date,
                "total_events": stats[0] or 0,
                "sessions": sessions,
                "loops_completed": loops,
                "avg_energy": round(stats[1] or 0, 2),
                "avg_risk": round(stats[2] or 0, 4),
                "total_loss": round(stats[3] or 0, 2),
                "beads_unlocked": stats[4] or 0,
                "most_used_pack": most_used_pack
            }
            
            # 리포트 저장
            cursor.execute("""
                INSERT OR REPLACE INTO daily_reports 
                (date, total_events, sessions, loops_completed, avg_energy, avg_risk, total_loss, beads_unlocked, most_used_pack)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                report["date"], report["total_events"], report["sessions"],
                report["loops_completed"], report["avg_energy"], report["avg_risk"],
                report["total_loss"], report["beads_unlocked"], report["most_used_pack"]
            ))
            
            return report
    
    def get_weekly_summary(self) -> Dict:
        """주간 요약"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_events,
                    AVG(energy) as avg_energy,
                    AVG(risk) as avg_risk,
                    SUM(loss_velocity) as total_loss,
                    MIN(timestamp) as first_event,
                    MAX(timestamp) as last_event
                FROM events
                WHERE timestamp >= datetime('now', '-7 days')
            """)
            
            stats = cursor.fetchone()
            
            # Pack별 사용량
            cursor.execute("""
                SELECT pack, COUNT(*) as cnt
                FROM events
                WHERE timestamp >= datetime('now', '-7 days')
                GROUP BY pack
            """)
            pack_usage = {row[0]: row[1] for row in cursor.fetchall()}
            
            # 일별 이벤트 수
            cursor.execute("""
                SELECT DATE(timestamp) as day, COUNT(*) as cnt
                FROM events
                WHERE timestamp >= datetime('now', '-7 days')
                GROUP BY DATE(timestamp)
                ORDER BY day
            """)
            daily_counts = {row[0]: row[1] for row in cursor.fetchall()}
            
            return {
                "period": "last_7_days",
                "total_events": stats[0] or 0,
                "avg_energy": round(stats[1] or 0, 2),
                "avg_risk": round(stats[2] or 0, 4),
                "total_loss": round(stats[3] or 0, 2),
                "first_event": stats[4],
                "last_event": stats[5],
                "pack_usage": pack_usage,
                "daily_counts": daily_counts
            }
    
    def get_pack_analytics(self, pack: str) -> Dict:
        """Pack별 분석"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    COUNT(*) as total_events,
                    AVG(energy) as avg_energy,
                    AVG(flow) as avg_flow,
                    AVG(risk) as avg_risk,
                    AVG(loss_velocity) as avg_loss,
                    MAX(accel) as max_accel,
                    SUM(CASE WHEN event_type = 'threshold_check' THEN 1 ELSE 0 END) as threshold_checks,
                    SUM(CASE WHEN event_type = 'loop_complete' THEN 1 ELSE 0 END) as loops
                FROM events
                WHERE pack = ?
            """, (pack,))
            
            stats = cursor.fetchone()
            
            return {
                "pack": pack,
                "total_events": stats[0] or 0,
                "avg_energy": round(stats[1] or 0, 2),
                "avg_flow": round(stats[2] or 0, 2),
                "avg_risk": round(stats[3] or 0, 4),
                "avg_loss_velocity": round(stats[4] or 0, 2),
                "max_accel": round(stats[5] or 0, 2),
                "threshold_checks": stats[6] or 0,
                "loops_completed": stats[7] or 0
            }
    
    # ═══════════════════════════════════════════════════════════════
    # EXPORT
    # ═══════════════════════════════════════════════════════════════
    
    def export_to_json(self, filepath: str = "autus_export.json"):
        """전체 데이터 JSON 내보내기"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            data = {
                "exported_at": datetime.now().isoformat(),
                "events": [],
                "sessions": [],
                "goals": [],
                "proofs": [],
                "daily_reports": []
            }
            
            for table in ["events", "sessions", "goals", "proofs", "daily_reports"]:
                cursor.execute(f"SELECT * FROM {table}")
                data[table] = [dict(row) for row in cursor.fetchall()]
            
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            return filepath
    
    def get_stats(self) -> Dict:
        """전체 통계"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            stats = {}
            
            for table in ["events", "sessions", "goals", "proofs"]:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[f"{table}_count"] = cursor.fetchone()[0]
            
            # 최근 이벤트
            cursor.execute("SELECT MAX(timestamp) FROM events")
            stats["last_event"] = cursor.fetchone()[0]
            
            # 평균 가속도
            cursor.execute("SELECT AVG(accel) FROM events")
            avg = cursor.fetchone()[0]
            stats["avg_accel"] = round(avg, 2) if avg else 0
            
            return stats


# ═══════════════════════════════════════════════════════════════
# CLI TEST
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    db = DatabaseManager()
    
    print("\n" + "="*60)
    print("🗄️ AUTUS Database Test")
    print("="*60)
    
    # 테스트 이벤트 기록
    test_state = {
        "current_pack": "overseas",
        "current_station": 3,
        "beads": {
            "accel": 1.5,
            "bead1": "ACTIVE",
            "bead2": "UNLOCK",
            "bead3": "LOCK",
            "has_proof": True
        },
        "metrics": {
            "energy": 85.5,
            "flow": 2.4,
            "risk": 0.23,
            "loss_velocity": 250.0
        }
    }
    
    event_id = db.log_event(EventType.STATE_CHANGE, test_state, {"test": True})
    print(f"✅ Event logged: ID {event_id}")
    
    # 통계 조회
    stats = db.get_stats()
    print(f"\n📊 Database Stats:")
    for key, value in stats.items():
        print(f"   {key}: {value}")
    
    # 주간 요약
    weekly = db.get_weekly_summary()
    print(f"\n📅 Weekly Summary:")
    print(f"   Total events: {weekly['total_events']}")
    print(f"   Avg energy: {weekly['avg_energy']}")
    
    print("\n" + "="*60)
    print("✅ Database test completed!")
    print("="*60)
