"""
AUTUS Database Repository
=========================

데이터베이스 접근 계층

Version: 1.0.0
Status: PRODUCTION
"""

import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from contextlib import contextmanager

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from .models import Base, UserModel, SessionModel, MarkerModel, AuditLogModel

# ================================================================
# DATABASE CONFIGURATION
# ================================================================

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./autus.db")

# SQLite 특수 설정
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL, 
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db():
    """데이터베이스 초기화 (테이블 생성)"""
    Base.metadata.create_all(bind=engine)


def get_db():
    """DB 세션 의존성"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """컨텍스트 매니저 버전"""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ================================================================
# REPOSITORY CLASS
# ================================================================

class Repository:
    """데이터베이스 저장소"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ============================================================
    # USER OPERATIONS
    # ============================================================
    
    def create_user(self, username: str, password_hash: str, email: str = None) -> UserModel:
        """사용자 생성"""
        user = UserModel(
            username=username,
            password_hash=password_hash,
            email=email
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user
    
    def get_user_by_username(self, username: str) -> Optional[UserModel]:
        """사용자명으로 조회"""
        return self.db.query(UserModel).filter(UserModel.username == username).first()
    
    def get_user_by_id(self, user_id: int) -> Optional[UserModel]:
        """ID로 사용자 조회"""
        return self.db.query(UserModel).filter(UserModel.id == user_id).first()
    
    # ============================================================
    # SESSION OPERATIONS
    # ============================================================
    
    def create_session(self, session_id: str, user_id: int = None, state_json: dict = None) -> SessionModel:
        """AUTUS 세션 생성"""
        session = SessionModel(
            session_id=session_id,
            user_id=user_id,
            state_json=state_json or {}
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def get_session(self, session_id: str) -> Optional[SessionModel]:
        """세션 조회"""
        return self.db.query(SessionModel).filter(SessionModel.session_id == session_id).first()
    
    def get_or_create_session(self, session_id: str, user_id: int = None) -> SessionModel:
        """세션 조회 또는 생성"""
        session = self.get_session(session_id)
        if not session:
            session = self.create_session(session_id, user_id)
        return session
    
    def update_session_state(self, session_id: str, state_json: dict, mode: str = None) -> Optional[SessionModel]:
        """세션 상태 업데이트"""
        session = self.get_session(session_id)
        if session:
            session.state_json = state_json
            session.updated_at = datetime.utcnow()
            if mode:
                session.mode = mode
            self.db.commit()
            self.db.refresh(session)
        return session
    
    def increment_commit_count(self, session_id: str) -> None:
        """커밋 카운트 증가"""
        session = self.get_session(session_id)
        if session:
            session.commit_count += 1
            session.last_commit_at = datetime.utcnow()
            self.db.commit()
    
    def get_user_sessions(self, user_id: int) -> List[SessionModel]:
        """사용자의 모든 세션 조회"""
        return self.db.query(SessionModel).filter(SessionModel.user_id == user_id).all()
    
    def delete_session(self, session_id: str) -> bool:
        """세션 삭제"""
        session = self.get_session(session_id)
        if session:
            self.db.delete(session)
            self.db.commit()
            return True
        return False
    
    # ============================================================
    # MARKER OPERATIONS
    # ============================================================
    
    def create_marker(
        self, 
        marker_id: str, 
        session_id: str,
        state_hash: str,
        chain_hash: str,
        physics_snapshot: dict,
        t_ms: int,
        prev_hash: str = None,
        label: str = None
    ) -> MarkerModel:
        """리플레이 마커 생성"""
        marker = MarkerModel(
            marker_id=marker_id,
            session_id=session_id,
            state_hash=state_hash,
            prev_hash=prev_hash,
            chain_hash=chain_hash,
            physics_snapshot=physics_snapshot,
            t_ms=t_ms,
            label=label
        )
        self.db.add(marker)
        self.db.commit()
        self.db.refresh(marker)
        return marker
    
    def get_marker(self, marker_id: str) -> Optional[MarkerModel]:
        """마커 조회"""
        return self.db.query(MarkerModel).filter(MarkerModel.marker_id == marker_id).first()
    
    def get_session_markers(self, session_id: str) -> List[MarkerModel]:
        """세션의 모든 마커 조회 (시간순)"""
        return (
            self.db.query(MarkerModel)
            .filter(MarkerModel.session_id == session_id)
            .order_by(MarkerModel.t_ms.asc())
            .all()
        )
    
    def get_latest_marker(self, session_id: str) -> Optional[MarkerModel]:
        """세션의 최신 마커 조회"""
        return (
            self.db.query(MarkerModel)
            .filter(MarkerModel.session_id == session_id)
            .order_by(MarkerModel.t_ms.desc())
            .first()
        )
    
    # ============================================================
    # AUDIT LOG OPERATIONS
    # ============================================================
    
    def log_action(
        self,
        action: str,
        session_id: str = None,
        user_id: int = None,
        details: dict = None,
        ip_address: str = None,
        user_agent: str = None
    ) -> AuditLogModel:
        """감사 로그 기록"""
        log = AuditLogModel(
            action=action,
            session_id=session_id,
            user_id=user_id,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(log)
        self.db.commit()
        return log
    
    def get_audit_logs(self, session_id: str = None, limit: int = 100) -> List[AuditLogModel]:
        """감사 로그 조회"""
        query = self.db.query(AuditLogModel)
        if session_id:
            query = query.filter(AuditLogModel.session_id == session_id)
        return query.order_by(AuditLogModel.created_at.desc()).limit(limit).all()





