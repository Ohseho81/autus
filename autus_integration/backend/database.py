# backend/database.py
# AUTUS PostgreSQL 데이터베이스 클라이언트

from sqlalchemy import create_engine, Column, String, Float, DateTime, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import contextmanager
import enum

from config import settings

# ═══════════════════════════════════════════════════════════════════════════
# 엔진 및 세션 설정
# ═══════════════════════════════════════════════════════════════════════════

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════

class FlowDirection(enum.Enum):
    INFLOW = "inflow"
    OUTFLOW = "outflow"


class AbsorptionStage(enum.Enum):
    PARASITIC = "parasitic"
    ABSORBING = "absorbing"
    REPLACING = "replacing"
    REPLACED = "replaced"


# ═══════════════════════════════════════════════════════════════════════════
# 모델 정의
# ═══════════════════════════════════════════════════════════════════════════

class Node(Base):
    """노드 (사람/조직)"""
    __tablename__ = "nodes"
    
    id = Column(String(50), primary_key=True)
    external_id = Column(String(100), unique=True, index=True)
    source = Column(String(50), default="unknown")
    value = Column(Float, default=0)
    direct_money = Column(Float, default=0)
    synergy = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class Motion(Base):
    """모션 (돈 흐름)"""
    __tablename__ = "motions"
    
    id = Column(String(50), primary_key=True)
    source_id = Column(String(100), index=True)
    target_id = Column(String(100), index=True)
    amount = Column(Float)
    direction = Column(SQLEnum(FlowDirection), default=FlowDirection.INFLOW)
    fee = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())


class SaaSConnector(Base):
    """SaaS 연동 커넥터"""
    __tablename__ = "saas_connectors"
    
    id = Column(String(50), primary_key=True)
    saas_type = Column(String(50))
    stage = Column(SQLEnum(AbsorptionStage), default=AbsorptionStage.PARASITIC)
    webhook_url = Column(String(200))
    sync_count = Column(Float, default=0)
    data_migrated_percent = Column(Float, default=0)
    monthly_savings = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class WebhookLog(Base):
    """Webhook 로그"""
    __tablename__ = "webhook_logs"
    
    id = Column(String(50), primary_key=True)
    source = Column(String(50))
    event_type = Column(String(100))
    payload = Column(Text)
    processed = Column(String(10), default="pending")
    created_at = Column(DateTime, server_default=func.now())


class AnalysisLog(Base):
    """CrewAI 분석 로그"""
    __tablename__ = "analysis_logs"
    
    id = Column(String(50), primary_key=True)
    delete_count = Column(Float, default=0)
    automate_count = Column(Float, default=0)
    outsource_count = Column(Float, default=0)
    total_impact = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())


# ═══════════════════════════════════════════════════════════════════════════
# 데이터베이스 클라이언트
# ═══════════════════════════════════════════════════════════════════════════

class DatabaseClient:
    """PostgreSQL 데이터베이스 클라이언트"""
    
    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal
    
    @contextmanager
    def get_session(self):
        """세션 컨텍스트 매니저"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def init_db(self):
        """테이블 생성"""
        Base.metadata.create_all(bind=self.engine)
    
    # ─────────────────────────────────────────────────────────────────
    # 노드 CRUD
    # ─────────────────────────────────────────────────────────────────
    
    def create_node(self, external_id: str, source: str = "unknown") -> Dict:
        """노드 생성"""
        import uuid
        
        with self.get_session() as session:
            node = Node(
                id=str(uuid.uuid4()),
                external_id=external_id,
                source=source
            )
            session.add(node)
            session.flush()
            
            return {
                "id": node.id,
                "external_id": node.external_id,
                "source": node.source,
                "value": node.value
            }
    
    def get_node(self, external_id: str) -> Optional[Dict]:
        """노드 조회"""
        with self.get_session() as session:
            node = session.query(Node).filter(
                Node.external_id == external_id
            ).first()
            
            if node:
                return {
                    "id": node.id,
                    "external_id": node.external_id,
                    "value": node.value,
                    "source": node.source
                }
            return None
    
    def upsert_node(self, external_id: str, source: str = "unknown") -> Dict:
        """노드 생성 또는 업데이트"""
        existing = self.get_node(external_id)
        if existing:
            return existing
        return self.create_node(external_id, source)
    
    def get_all_nodes(self, limit: int = 1000) -> List[Dict]:
        """전체 노드 조회"""
        with self.get_session() as session:
            nodes = session.query(Node).order_by(
                Node.value.desc()
            ).limit(limit).all()
            
            return [
                {
                    "id": n.external_id,
                    "value": n.value,
                    "source": n.source,
                    "direct_money": n.direct_money,
                    "synergy": n.synergy
                }
                for n in nodes
            ]
    
    def get_negative_value_nodes(self) -> List[Dict]:
        """가치 ≤ 0 노드 조회"""
        with self.get_session() as session:
            nodes = session.query(Node).filter(
                Node.value <= 0
            ).order_by(Node.value.asc()).all()
            
            return [
                {"id": n.external_id, "value": n.value, "source": n.source}
                for n in nodes
            ]
    
    # ─────────────────────────────────────────────────────────────────
    # 모션 CRUD
    # ─────────────────────────────────────────────────────────────────
    
    def create_motion(
        self,
        source_id: str,
        target_id: str,
        amount: float,
        direction: str = "inflow",
        fee: float = 0
    ) -> Dict:
        """모션 생성"""
        import uuid
        
        with self.get_session() as session:
            motion = Motion(
                id=str(uuid.uuid4()),
                source_id=source_id,
                target_id=target_id,
                amount=amount,
                direction=FlowDirection(direction),
                fee=fee
            )
            session.add(motion)
            
            return {
                "source": source_id,
                "target": target_id,
                "amount": amount,
                "direction": direction
            }
    
    def get_all_motions(self, limit: int = 5000) -> List[Dict]:
        """전체 모션 조회"""
        with self.get_session() as session:
            motions = session.query(Motion).order_by(
                Motion.created_at.desc()
            ).limit(limit).all()
            
            return [
                {
                    "source": m.source_id,
                    "target": m.target_id,
                    "amount": m.amount,
                    "direction": m.direction.value,
                    "fee": m.fee
                }
                for m in motions
            ]
    
    # ─────────────────────────────────────────────────────────────────
    # 통계
    # ─────────────────────────────────────────────────────────────────
    
    def get_stats(self) -> Dict:
        """시스템 통계"""
        with self.get_session() as session:
            total_nodes = session.query(Node).count()
            total_motions = session.query(Motion).count()
            total_value = session.query(func.sum(Node.value)).scalar() or 0
            total_synergy = session.query(func.sum(Node.synergy)).scalar() or 0
            negative_count = session.query(Node).filter(Node.value <= 0).count()
            
            return {
                "total_nodes": total_nodes,
                "total_motions": total_motions,
                "total_value": total_value,
                "total_synergy": total_synergy,
                "negative_value_nodes": negative_count
            }


# 싱글톤 인스턴스
db_client = DatabaseClient()


# backend/database.py
# AUTUS PostgreSQL 데이터베이스 클라이언트

from sqlalchemy import create_engine, Column, String, Float, DateTime, Text, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.sql import func
from typing import Optional, List, Dict, Any
from datetime import datetime
from contextlib import contextmanager
import enum

from config import settings

# ═══════════════════════════════════════════════════════════════════════════
# 엔진 및 세션 설정
# ═══════════════════════════════════════════════════════════════════════════

engine = create_engine(
    settings.DATABASE_URL,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ═══════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════

class FlowDirection(enum.Enum):
    INFLOW = "inflow"
    OUTFLOW = "outflow"


class AbsorptionStage(enum.Enum):
    PARASITIC = "parasitic"
    ABSORBING = "absorbing"
    REPLACING = "replacing"
    REPLACED = "replaced"


# ═══════════════════════════════════════════════════════════════════════════
# 모델 정의
# ═══════════════════════════════════════════════════════════════════════════

class Node(Base):
    """노드 (사람/조직)"""
    __tablename__ = "nodes"
    
    id = Column(String(50), primary_key=True)
    external_id = Column(String(100), unique=True, index=True)
    source = Column(String(50), default="unknown")
    value = Column(Float, default=0)
    direct_money = Column(Float, default=0)
    synergy = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class Motion(Base):
    """모션 (돈 흐름)"""
    __tablename__ = "motions"
    
    id = Column(String(50), primary_key=True)
    source_id = Column(String(100), index=True)
    target_id = Column(String(100), index=True)
    amount = Column(Float)
    direction = Column(SQLEnum(FlowDirection), default=FlowDirection.INFLOW)
    fee = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())


class SaaSConnector(Base):
    """SaaS 연동 커넥터"""
    __tablename__ = "saas_connectors"
    
    id = Column(String(50), primary_key=True)
    saas_type = Column(String(50))
    stage = Column(SQLEnum(AbsorptionStage), default=AbsorptionStage.PARASITIC)
    webhook_url = Column(String(200))
    sync_count = Column(Float, default=0)
    data_migrated_percent = Column(Float, default=0)
    monthly_savings = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())


class WebhookLog(Base):
    """Webhook 로그"""
    __tablename__ = "webhook_logs"
    
    id = Column(String(50), primary_key=True)
    source = Column(String(50))
    event_type = Column(String(100))
    payload = Column(Text)
    processed = Column(String(10), default="pending")
    created_at = Column(DateTime, server_default=func.now())


class AnalysisLog(Base):
    """CrewAI 분석 로그"""
    __tablename__ = "analysis_logs"
    
    id = Column(String(50), primary_key=True)
    delete_count = Column(Float, default=0)
    automate_count = Column(Float, default=0)
    outsource_count = Column(Float, default=0)
    total_impact = Column(Float, default=0)
    created_at = Column(DateTime, server_default=func.now())


# ═══════════════════════════════════════════════════════════════════════════
# 데이터베이스 클라이언트
# ═══════════════════════════════════════════════════════════════════════════

class DatabaseClient:
    """PostgreSQL 데이터베이스 클라이언트"""
    
    def __init__(self):
        self.engine = engine
        self.SessionLocal = SessionLocal
    
    @contextmanager
    def get_session(self):
        """세션 컨텍스트 매니저"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def init_db(self):
        """테이블 생성"""
        Base.metadata.create_all(bind=self.engine)
    
    # ─────────────────────────────────────────────────────────────────
    # 노드 CRUD
    # ─────────────────────────────────────────────────────────────────
    
    def create_node(self, external_id: str, source: str = "unknown") -> Dict:
        """노드 생성"""
        import uuid
        
        with self.get_session() as session:
            node = Node(
                id=str(uuid.uuid4()),
                external_id=external_id,
                source=source
            )
            session.add(node)
            session.flush()
            
            return {
                "id": node.id,
                "external_id": node.external_id,
                "source": node.source,
                "value": node.value
            }
    
    def get_node(self, external_id: str) -> Optional[Dict]:
        """노드 조회"""
        with self.get_session() as session:
            node = session.query(Node).filter(
                Node.external_id == external_id
            ).first()
            
            if node:
                return {
                    "id": node.id,
                    "external_id": node.external_id,
                    "value": node.value,
                    "source": node.source
                }
            return None
    
    def upsert_node(self, external_id: str, source: str = "unknown") -> Dict:
        """노드 생성 또는 업데이트"""
        existing = self.get_node(external_id)
        if existing:
            return existing
        return self.create_node(external_id, source)
    
    def get_all_nodes(self, limit: int = 1000) -> List[Dict]:
        """전체 노드 조회"""
        with self.get_session() as session:
            nodes = session.query(Node).order_by(
                Node.value.desc()
            ).limit(limit).all()
            
            return [
                {
                    "id": n.external_id,
                    "value": n.value,
                    "source": n.source,
                    "direct_money": n.direct_money,
                    "synergy": n.synergy
                }
                for n in nodes
            ]
    
    def get_negative_value_nodes(self) -> List[Dict]:
        """가치 ≤ 0 노드 조회"""
        with self.get_session() as session:
            nodes = session.query(Node).filter(
                Node.value <= 0
            ).order_by(Node.value.asc()).all()
            
            return [
                {"id": n.external_id, "value": n.value, "source": n.source}
                for n in nodes
            ]
    
    # ─────────────────────────────────────────────────────────────────
    # 모션 CRUD
    # ─────────────────────────────────────────────────────────────────
    
    def create_motion(
        self,
        source_id: str,
        target_id: str,
        amount: float,
        direction: str = "inflow",
        fee: float = 0
    ) -> Dict:
        """모션 생성"""
        import uuid
        
        with self.get_session() as session:
            motion = Motion(
                id=str(uuid.uuid4()),
                source_id=source_id,
                target_id=target_id,
                amount=amount,
                direction=FlowDirection(direction),
                fee=fee
            )
            session.add(motion)
            
            return {
                "source": source_id,
                "target": target_id,
                "amount": amount,
                "direction": direction
            }
    
    def get_all_motions(self, limit: int = 5000) -> List[Dict]:
        """전체 모션 조회"""
        with self.get_session() as session:
            motions = session.query(Motion).order_by(
                Motion.created_at.desc()
            ).limit(limit).all()
            
            return [
                {
                    "source": m.source_id,
                    "target": m.target_id,
                    "amount": m.amount,
                    "direction": m.direction.value,
                    "fee": m.fee
                }
                for m in motions
            ]
    
    # ─────────────────────────────────────────────────────────────────
    # 통계
    # ─────────────────────────────────────────────────────────────────
    
    def get_stats(self) -> Dict:
        """시스템 통계"""
        with self.get_session() as session:
            total_nodes = session.query(Node).count()
            total_motions = session.query(Motion).count()
            total_value = session.query(func.sum(Node.value)).scalar() or 0
            total_synergy = session.query(func.sum(Node.synergy)).scalar() or 0
            negative_count = session.query(Node).filter(Node.value <= 0).count()
            
            return {
                "total_nodes": total_nodes,
                "total_motions": total_motions,
                "total_value": total_value,
                "total_synergy": total_synergy,
                "negative_value_nodes": negative_count
            }


# 싱글톤 인스턴스
db_client = DatabaseClient()







