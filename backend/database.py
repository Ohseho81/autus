"""
AUTUS Database
==============

SQLAlchemy 비동기 데이터베이스
"""

from typing import Optional, AsyncGenerator
from datetime import datetime

try:
    from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
    from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
    from sqlalchemy import String, Float, Integer, DateTime, JSON, Boolean, Text
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False

from .config import settings


# ============================================================
# BASE MODEL
# ============================================================

if SQLALCHEMY_AVAILABLE:
    class Base(DeclarativeBase):
        """SQLAlchemy Base"""
        pass
    
    # ============================================================
    # MODELS
    # ============================================================
    
    class NodeModel(Base):
        """노드 테이블"""
        __tablename__ = "nodes"
        
        id: Mapped[str] = mapped_column(String(100), primary_key=True)
        name: Mapped[str] = mapped_column(String(200))
        revenue: Mapped[float] = mapped_column(Float, default=0.0)
        time_spent: Mapped[float] = mapped_column(Float, default=0.0)
        x: Mapped[float] = mapped_column(Float, default=0.0)
        y: Mapped[float] = mapped_column(Float, default=0.0)
        z: Mapped[float] = mapped_column(Float, default=0.0)
        fitness: Mapped[float] = mapped_column(Float, default=0.5)
        density: Mapped[float] = mapped_column(Float, default=0.5)
        frequency: Mapped[float] = mapped_column(Float, default=0.5)
        penalty: Mapped[float] = mapped_column(Float, default=0.0)
        cluster: Mapped[str] = mapped_column(String(50), default="STABLE")
        orbit: Mapped[str] = mapped_column(String(50), default="SAFETY")
        tags: Mapped[dict] = mapped_column(JSON, default=list)
        metadata_: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
        created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
        updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    class EntanglementModel(Base):
        """얽힘 테이블"""
        __tablename__ = "entanglements"
        
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        node_a: Mapped[str] = mapped_column(String(100))
        node_b: Mapped[str] = mapped_column(String(100))
        intensity: Mapped[float] = mapped_column(Float, default=0.5)
        correlation: Mapped[float] = mapped_column(Float, default=0.8)
        entanglement_type: Mapped[str] = mapped_column(String(50), default="synergy")
        created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
    
    class ActionLogModel(Base):
        """액션 로그 테이블"""
        __tablename__ = "action_logs"
        
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        action_id: Mapped[str] = mapped_column(String(100))
        action_type: Mapped[str] = mapped_column(String(50))
        target_id: Mapped[str] = mapped_column(String(100))
        params: Mapped[dict] = mapped_column(JSON, default=dict)
        result: Mapped[dict] = mapped_column(JSON, default=dict)
        status: Mapped[str] = mapped_column(String(20), default="pending")
        created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
        executed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    
    class SystemStateModel(Base):
        """시스템 상태 테이블"""
        __tablename__ = "system_states"
        
        id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
        timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.now)
        total_nodes: Mapped[int] = mapped_column(Integer)
        total_value: Mapped[float] = mapped_column(Float)
        entropy: Mapped[float] = mapped_column(Float)
        money_efficiency: Mapped[float] = mapped_column(Float)
        cluster_distribution: Mapped[dict] = mapped_column(JSON)
        orbit_distribution: Mapped[dict] = mapped_column(JSON)
        quantum_stats: Mapped[dict] = mapped_column(JSON)


# ============================================================
# DATABASE CLASS
# ============================================================

class Database:
    """데이터베이스 클래스"""
    
    def __init__(self, url: str = None):
        self.url = url or settings.DATABASE_URL
        self.engine = None
        self.session_factory = None
    
    async def initialize(self):
        """데이터베이스 초기화"""
        if not SQLALCHEMY_AVAILABLE:
            raise RuntimeError("SQLAlchemy not available")
        
        self.engine = create_async_engine(
            self.url,
            echo=settings.DEBUG,
            pool_size=5,
            max_overflow=10,
        )
        
        self.session_factory = async_sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False,
        )
        
        # 테이블 생성
        async with self.engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    
    async def close(self):
        """연결 종료"""
        if self.engine:
            await self.engine.dispose()
    
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """세션 제공"""
        if not self.session_factory:
            raise RuntimeError("Database not initialized")
        
        async with self.session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise


# 전역 인스턴스
_db: Optional[Database] = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """데이터베이스 세션 의존성"""
    global _db
    
    if _db is None:
        _db = Database()
        await _db.initialize()
    
    async for session in _db.get_session():
        yield session


class MockDatabase:
    """Mock 데이터베이스"""
    
    def __init__(self):
        self._data = {
            "nodes": {},
            "entanglements": {},
            "actions": [],
            "states": [],
        }
    
    async def initialize(self):
        pass
    
    async def close(self):
        pass


def create_database() -> Database:
    """데이터베이스 팩토리"""
    if SQLALCHEMY_AVAILABLE:
        return Database()
    else:
        return MockDatabase()

