#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🗄️ AUTUS v3.0 - Database Connection                                    ║
║                                                                                           ║
║  Layer 3: 데이터베이스 연결 및 CRUD 작업                                                    ║
║  - SQLite (로컬 개발, 기본값)                                                              ║
║  - PostgreSQL (프로덕션, 환경변수 설정 시)                                                  ║
║                                                                                           ║
║  환경변수:                                                                                  ║
║  - DATABASE_URL: PostgreSQL 연결 문자열                                                    ║
║  - 미설정 시: SQLite (data/autus.db)                                                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import sqlite3
import json
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from contextlib import contextmanager
import uuid

from .db_schema import (
    SQLITE_SCHEMA, POSTGRESQL_SCHEMA,
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Database Manager
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DatabaseManager:
    """데이터베이스 매니저 (SQLite/PostgreSQL 자동 선택)"""
    
    def __init__(self, db_path: str = None):
        """
        초기화
        
        Args:
            db_path: SQLite 파일 경로 (기본값: data/autus.db)
        """
        self.database_url = os.getenv("DATABASE_URL")
        self.is_postgres = self.database_url is not None
        
        if self.is_postgres:
            # PostgreSQL
            try:
                import psycopg2
                self.pg_conn = psycopg2.connect(self.database_url)
                self._init_postgres()
            except ImportError:
                print("⚠️ psycopg2 not installed. Falling back to SQLite.")
                self.is_postgres = False
        
        if not self.is_postgres:
            # SQLite
            self.db_path = db_path or "data/autus.db"
            os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
            self._init_sqlite()
    
    def _init_sqlite(self):
        """SQLite 초기화"""
        with self._get_connection() as conn:
            conn.executescript(SQLITE_SCHEMA)
            conn.commit()
    
    def _init_postgres(self):
        """PostgreSQL 초기화"""
        cursor = self.pg_conn.cursor()
        cursor.execute(POSTGRESQL_SCHEMA)
        self.pg_conn.commit()
        cursor.close()
    
    @contextmanager
    def _get_connection(self):
        """연결 컨텍스트 매니저"""
        if self.is_postgres:
            yield self.pg_conn
        else:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    def _generate_id(self, prefix: str = "") -> str:
        """고유 ID 생성"""
        return f"{prefix}{uuid.uuid4().hex[:12]}"
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Money Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_money_event(self, event: MoneyEvent) -> str:
        """Money 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO money_events 
                (event_id, date, event_type, currency, amount, people_tags,
                 effective_minutes, evidence_id, recommendation_type, customer_id,
                 project_id, amount_krw, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.event_id, event.date, event.event_type, event.currency,
                event.amount, event.people_tags, event.effective_minutes,
                event.evidence_id, event.recommendation_type, event.customer_id,
                event.project_id, event.amount_krw, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.event_id
    
    def get_unprocessed_money_events(self) -> List[MoneyEvent]:
        """미처리 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    def mark_money_event_processed(self, event_id: str, week_id: str):
        """Money 이벤트 처리 완료 표시"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE money_events SET processed = 1, week_id = ? WHERE event_id = ?",
                (week_id, event_id)
            )
            conn.commit()
    
    def get_money_events_by_week(self, week_id: str) -> List[MoneyEvent]:
        """주간 Money 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM money_events WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [MoneyEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Burn Events CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_burn_event(self, event: BurnEvent) -> str:
        """Burn 이벤트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO burn_events 
                (burn_id, date, burn_type, loss_minutes, evidence_id,
                 person_or_edge, prevented_by, prevented_minutes, week_id, processed, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                event.burn_id, event.date, event.burn_type, event.loss_minutes,
                event.evidence_id, event.person_or_edge, event.prevented_by,
                event.prevented_minutes, event.week_id,
                1 if event.processed else 0, event.created_at
            ))
            conn.commit()
        return event.burn_id
    
    def get_unprocessed_burn_events(self) -> List[BurnEvent]:
        """미처리 Burn 이벤트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM burn_events WHERE processed = 0")
            rows = cursor.fetchall()
            return [BurnEvent.from_dict(dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Insights CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_insight(self, insight: Insight) -> str:
        """인사이트 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO insights 
                (insight_id, week_id, source, category, content, confidence, metadata, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                insight.insight_id, insight.week_id, insight.source,
                insight.category, insight.content, insight.confidence,
                insight.metadata, insight.created_at
            ))
            conn.commit()
        return insight.insight_id
    
    def get_insights_by_week(self, week_id: str) -> List[Insight]:
        """주간 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE week_id = ?", (week_id,))
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    def get_high_confidence_insights(self, min_confidence: float = 0.7) -> List[Insight]:
        """높은 신뢰도 인사이트 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM insights WHERE confidence >= ? ORDER BY confidence DESC",
                (min_confidence,)
            )
            rows = cursor.fetchall()
            return [Insight(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Archives CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_archive(self, archive: Archive) -> str:
        """아카이브 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO archives 
                (archive_id, original_type, original_id, summary, reason, original_data, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                archive.archive_id, archive.original_type, archive.original_id,
                archive.summary, archive.reason, archive.original_data, archive.created_at
            ))
            conn.commit()
        return archive.archive_id
    
    def get_archives_by_type(self, original_type: str) -> List[Archive]:
        """타입별 아카이브 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM archives WHERE original_type = ?", (original_type,))
            rows = cursor.fetchall()
            return [Archive(**dict(row)) for row in rows]
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Proposals CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_proposal(self, proposal: Proposal) -> str:
        """제안 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO proposals 
                (proposal_id, week_id, trigger, analysis, suggestion, expected_impact,
                 status, approved_by, approved_at, executed_at, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                proposal.proposal_id, proposal.week_id, proposal.trigger,
                proposal.analysis, proposal.suggestion, proposal.expected_impact,
                proposal.status, proposal.approved_by, proposal.approved_at,
                proposal.executed_at, proposal.created_at
            ))
            conn.commit()
        return proposal.proposal_id
    
    def get_pending_proposals(self) -> List[Proposal]:
        """대기 중인 제안 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM proposals WHERE status = ?", (ProposalStatus.PENDING.value,))
            rows = cursor.fetchall()
            return [Proposal(**dict(row)) for row in rows]
    
    def approve_proposal(self, proposal_id: str, approved_by: str):
        """제안 승인"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, approved_by = ?, approved_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.APPROVED.value, approved_by,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    def execute_proposal(self, proposal_id: str):
        """제안 실행 완료"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE proposals 
                SET status = ?, executed_at = ?
                WHERE proposal_id = ?
            """, (
                ProposalStatus.EXECUTED.value,
                datetime.now().isoformat(), proposal_id
            ))
            conn.commit()
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Flywheel History CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_flywheel_cycle(self, cycle: FlywheelCycle) -> str:
        """Flywheel 사이클 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO flywheel_history 
                (cycle_id, week_id, net_krw, mint_krw, burn_krw, entropy_ratio,
                 vision_score, risk_score, innovation_score, learning_score,
                 impact_score, total_pillar_score, velocity, momentum,
                 invest_krw, grow_krw, profit_krw, reinvest_krw, team, team_score, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                cycle.cycle_id, cycle.week_id, cycle.net_krw, cycle.mint_krw,
                cycle.burn_krw, cycle.entropy_ratio, cycle.vision_score,
                cycle.risk_score, cycle.innovation_score, cycle.learning_score,
                cycle.impact_score, cycle.total_pillar_score, cycle.velocity,
                cycle.momentum, cycle.invest_krw, cycle.grow_krw, cycle.profit_krw,
                cycle.reinvest_krw, cycle.team, cycle.team_score, cycle.created_at
            ))
            conn.commit()
        return cycle.cycle_id
    
    def get_flywheel_history(self, limit: int = 12) -> List[FlywheelCycle]:
        """Flywheel 이력 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM flywheel_history ORDER BY week_id DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [FlywheelCycle(**dict(row)) for row in rows]
    
    def get_latest_flywheel_cycle(self) -> Optional[FlywheelCycle]:
        """최신 Flywheel 사이클 조회"""
        history = self.get_flywheel_history(limit=1)
        return history[0] if history else None
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Agent Logs CRUD
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def insert_agent_log(self, log: AgentLog) -> str:
        """에이전트 로그 삽입"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO agent_logs 
                (log_id, agent_role, task, input_data, output_data, success, 
                 duration_ms, error_message, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log.log_id, log.agent_role, log.task, log.input_data,
                log.output_data, 1 if log.success else 0, log.duration_ms,
                log.error_message, log.created_at
            ))
            conn.commit()
        return log.log_id
    
    def get_agent_logs_by_role(self, role: str, limit: int = 100) -> List[AgentLog]:
        """역할별 에이전트 로그 조회"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM agent_logs WHERE agent_role = ? ORDER BY created_at DESC LIMIT ?",
                (role, limit)
            )
            rows = cursor.fetchall()
            return [AgentLog(**dict(row)) for row in rows]
    
    def get_agent_success_rate(self, role: str = None) -> float:
        """에이전트 성공률 계산"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            if role:
                cursor.execute(
                    "SELECT AVG(success) FROM agent_logs WHERE agent_role = ?",
                    (role,)
                )
            else:
                cursor.execute("SELECT AVG(success) FROM agent_logs")
            result = cursor.fetchone()
            return float(result[0]) if result[0] else 0.0
    
    # ═══════════════════════════════════════════════════════════════════════════════════════
    # Utility Methods
    # ═══════════════════════════════════════════════════════════════════════════════════════
    
    def delete_old_data(self, days: int = 90) -> Dict[str, int]:
        """오래된 데이터 삭제 (아카이브 이후)"""
        from datetime import timedelta
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        
        deleted = {}
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # 각 테이블에서 삭제
            for table in ["insights", "agent_logs"]:
                cursor.execute(f"DELETE FROM {table} WHERE created_at < ?", (cutoff,))
                deleted[table] = cursor.rowcount
            
            conn.commit()
        
        return deleted
    
    def get_statistics(self) -> Dict[str, int]:
        """데이터베이스 통계"""
        stats = {}
        tables = [
            "money_events", "burn_events", "insights",
            "archives", "proposals", "flywheel_history", "agent_logs"
        ]
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[table] = cursor.fetchone()[0]
        
        return stats
    
    def close(self):
        """연결 종료"""
        if self.is_postgres and hasattr(self, 'pg_conn'):
            self.pg_conn.close()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Singleton Instance
# ═══════════════════════════════════════════════════════════════════════════════════════════

_db_instance: Optional[DatabaseManager] = None


def get_database(db_path: str = None) -> DatabaseManager:
    """데이터베이스 싱글톤 인스턴스 반환"""
    global _db_instance
    if _db_instance is None:
        _db_instance = DatabaseManager(db_path)
    return _db_instance




















