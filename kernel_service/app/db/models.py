"""
AUTUS Database Models
=====================

SQLAlchemy ORM 모델 정의

Version: 1.0.0
Status: PRODUCTION
"""

from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, 
    Text, JSON, ForeignKey, create_engine
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()


class UserModel(Base):
    """사용자 모델"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, nullable=False, index=True)
    email = Column(String(128), unique=True, nullable=True)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    sessions = relationship("SessionModel", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User {self.username}>"


class SessionModel(Base):
    """AUTUS 세션 모델 (물리 상태 저장)"""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), unique=True, nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # 물리 상태 (JSON)
    state_json = Column(JSON, nullable=False, default=dict)
    
    # 메타데이터
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_commit_at = Column(DateTime, nullable=True)
    commit_count = Column(Integer, default=0)
    
    # 현재 모드
    mode = Column(String(10), default="SIM")
    
    # Relationships
    user = relationship("UserModel", back_populates="sessions")
    markers = relationship("MarkerModel", back_populates="session", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Session {self.session_id}>"


class MarkerModel(Base):
    """Replay 마커 모델"""
    __tablename__ = "markers"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    marker_id = Column(String(32), unique=True, nullable=False, index=True)
    session_id = Column(String(64), ForeignKey("sessions.session_id"), nullable=False)
    
    # 해시 체인
    state_hash = Column(String(64), nullable=False)
    prev_hash = Column(String(64), nullable=True)
    chain_hash = Column(String(64), nullable=False)
    
    # 물리 상태 스냅샷
    physics_snapshot = Column(JSON, nullable=False)
    
    # 메타데이터
    label = Column(String(128), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    t_ms = Column(Integer, nullable=False)
    
    # Relationships
    session = relationship("SessionModel", back_populates="markers")
    
    def __repr__(self):
        return f"<Marker {self.marker_id}>"


class AuditLogModel(Base):
    """감사 로그 모델"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(64), nullable=True)
    user_id = Column(Integer, nullable=True)
    
    action = Column(String(32), nullable=False)  # COMMIT, UPDATE, LOGIN, etc.
    details = Column(JSON, nullable=True)
    
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(256), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<AuditLog {self.action} @ {self.created_at}>"





