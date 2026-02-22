"""
AUTUS PostgreSQL Client - 관계형 데이터베이스 연동

테이블:
- persons: 인물/엔티티
- flows: 자금 흐름
- scale_nodes: 멀티스케일 노드

환경 변수:
- DATABASE_URL: postgresql://user:password@host:5432/autus
"""

import os
from typing import Dict, List, Optional, Any
from datetime import datetime

# SQLAlchemy는 옵션 (설치되지 않아도 동작)
try:
    from sqlalchemy import (
        create_engine, Column, String, Float, Integer, DateTime,
        ForeignKey, Text, Index
    )
    from sqlalchemy.ext.declarative import declarative_base
    from sqlalchemy.orm import sessionmaker, Session
    SQLALCHEMY_AVAILABLE = True
except ImportError:
    SQLALCHEMY_AVAILABLE = False
    create_engine = None
    Column = String = Float = Integer = DateTime = None
    ForeignKey = Text = Index = None
    declarative_base = sessionmaker = Session = None


# 환경 변수
DATABASE_URL = os.getenv("DATABASE_URL", "")

# SQLAlchemy 설정
if SQLALCHEMY_AVAILABLE and DATABASE_URL:
    engine = create_engine(DATABASE_URL, echo=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base = declarative_base()
else:
    engine = None
    SessionLocal = None
    Base = object


# ═══════════════════════════════════════════════════════════════
# 테이블 정의
# ═══════════════════════════════════════════════════════════════

if SQLALCHEMY_AVAILABLE:
    class PersonTable(Base):
        """persons 테이블"""
        __tablename__ = "persons"
        
        id = Column(String(100), primary_key=True)
        name = Column(String(200), nullable=False)
        level = Column(String(10), default="L4", index=True)
        lat = Column(Float, default=0.0)
        lng = Column(Float, default=0.0)
        ki_score = Column(Float, default=0.0, index=True)
        rank = Column(String(50), default="Terminal")
        sector = Column(String(100), default="")
        parent_id = Column(String(100), nullable=True, index=True)
        
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        # 인덱스
        __table_args__ = (
            Index("idx_person_level_ki", "level", "ki_score"),
        )
        
        def to_dict(self) -> Dict:
            return {
                "id": self.id,
                "name": self.name,
                "level": self.level,
                "lat": self.lat,
                "lng": self.lng,
                "ki_score": self.ki_score,
                "rank": self.rank,
                "sector": self.sector,
                "parent_id": self.parent_id,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            }
    
    
    class FlowTable(Base):
        """flows 테이블"""
        __tablename__ = "flows"
        
        id = Column(String(100), primary_key=True)
        source_id = Column(String(100), nullable=False, index=True)
        target_id = Column(String(100), nullable=False, index=True)
        amount = Column(Float, nullable=False, default=0.0)
        flow_type = Column(String(50), default="trade", index=True)
        timestamp = Column(DateTime, default=datetime.utcnow)
        description = Column(Text, default="")
        confidence = Column(Float, default=1.0)
        
        created_at = Column(DateTime, default=datetime.utcnow)
        
        # 인덱스
        __table_args__ = (
            Index("idx_flow_source_target", "source_id", "target_id"),
            Index("idx_flow_amount", "amount"),
        )
        
        def to_dict(self) -> Dict:
            return {
                "id": self.id,
                "source_id": self.source_id,
                "target_id": self.target_id,
                "amount": self.amount,
                "flow_type": self.flow_type,
                "timestamp": self.timestamp.isoformat() if self.timestamp else None,
                "description": self.description,
                "confidence": self.confidence,
            }
    
    
    class ScaleNodeTable(Base):
        """scale_nodes 테이블"""
        __tablename__ = "scale_nodes"
        
        id = Column(String(100), primary_key=True)
        name = Column(String(200), nullable=False)
        level = Column(String(10), nullable=False, index=True)
        lat = Column(Float, default=0.0)
        lng = Column(Float, default=0.0)
        
        # Bounds (JSON 대신 개별 컬럼)
        bounds_sw_lat = Column(Float, nullable=True)
        bounds_sw_lng = Column(Float, nullable=True)
        bounds_ne_lat = Column(Float, nullable=True)
        bounds_ne_lng = Column(Float, nullable=True)
        
        parent_id = Column(String(100), nullable=True, index=True)
        
        # 집계
        total_mass = Column(Float, default=0.0)
        total_flow = Column(Float, default=0.0)
        node_count = Column(Integer, default=0)
        ki_score = Column(Float, default=0.0, index=True)
        top_keyman_id = Column(String(100), nullable=True)
        
        # 메타
        sector = Column(String(100), default="")
        flag = Column(String(10), default="")
        icon = Column(String(10), default="")
        
        created_at = Column(DateTime, default=datetime.utcnow)
        updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
        
        def to_dict(self) -> Dict:
            bounds = None
            if self.bounds_sw_lat is not None:
                bounds = [
                    self.bounds_sw_lat,
                    self.bounds_sw_lng,
                    self.bounds_ne_lat,
                    self.bounds_ne_lng,
                ]
            
            return {
                "id": self.id,
                "name": self.name,
                "level": self.level,
                "lat": self.lat,
                "lng": self.lng,
                "bounds": bounds,
                "parent_id": self.parent_id,
                "total_mass": self.total_mass,
                "total_flow": self.total_flow,
                "node_count": self.node_count,
                "ki_score": self.ki_score,
                "top_keyman_id": self.top_keyman_id,
                "sector": self.sector,
                "flag": self.flag,
                "icon": self.icon,
            }

else:
    # SQLAlchemy 없을 때 더미 클래스
    class PersonTable:
        pass
    
    class FlowTable:
        pass
    
    class ScaleNodeTable:
        pass


# ═══════════════════════════════════════════════════════════════
# PostgreSQL Client
# ═══════════════════════════════════════════════════════════════

class PostgresClient:
    """
    PostgreSQL 클라이언트
    """
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or DATABASE_URL
        self._connected = False
        
        if SQLALCHEMY_AVAILABLE:
            try:
                self.engine = create_engine(self.database_url, echo=False)
                self.SessionLocal = sessionmaker(
                    autocommit=False,
                    autoflush=False,
                    bind=self.engine
                )
                self._connected = True
            except Exception as e:
                print(f"⚠️ PostgreSQL 연결 실패: {e}")
                self.engine = None
                self.SessionLocal = None
        else:
            self.engine = None
            self.SessionLocal = None
    
    @property
    def is_connected(self) -> bool:
        return self._connected and self.engine is not None
    
    def get_session(self) -> Optional[Any]:
        """세션 생성"""
        if self.SessionLocal:
            return self.SessionLocal()
        return None
    
    def init_tables(self) -> bool:
        """테이블 생성"""
        if not SQLALCHEMY_AVAILABLE or not self.engine:
            return False
        
        try:
            Base.metadata.create_all(bind=self.engine)
            return True
        except Exception as e:
            print(f"⚠️ 테이블 생성 실패: {e}")
            return False
    
    # ═══════════════════════════════════════════════════════════════
    # Person CRUD
    # ═══════════════════════════════════════════════════════════════
    
    def create_person(self, person_data: Dict) -> bool:
        """Person 생성"""
        if not self.is_connected:
            return False
        
        session = self.get_session()
        try:
            person = PersonTable(**person_data)
            session.merge(person)  # INSERT or UPDATE
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"⚠️ Person 생성 실패: {e}")
            return False
        finally:
            session.close()
    
    def get_person(self, person_id: str) -> Optional[Dict]:
        """Person 조회"""
        if not self.is_connected:
            return None
        
        session = self.get_session()
        try:
            person = session.query(PersonTable).filter(
                PersonTable.id == person_id
            ).first()
            return person.to_dict() if person else None
        finally:
            session.close()
    
    def get_persons_by_level(self, level: str, limit: int = 100) -> List[Dict]:
        """레벨별 Person 조회"""
        if not self.is_connected:
            return []
        
        session = self.get_session()
        try:
            persons = session.query(PersonTable).filter(
                PersonTable.level == level
            ).order_by(
                PersonTable.ki_score.desc()
            ).limit(limit).all()
            return [p.to_dict() for p in persons]
        finally:
            session.close()
    
    def get_top_keyman(self, n: int = 10, level: str = None) -> List[Dict]:
        """TOP N Keyman"""
        if not self.is_connected:
            return []
        
        session = self.get_session()
        try:
            query = session.query(PersonTable)
            if level:
                query = query.filter(PersonTable.level == level)
            persons = query.order_by(
                PersonTable.ki_score.desc()
            ).limit(n).all()
            return [p.to_dict() for p in persons]
        finally:
            session.close()
    
    def delete_person(self, person_id: str) -> bool:
        """Person 삭제"""
        if not self.is_connected:
            return False
        
        session = self.get_session()
        try:
            session.query(PersonTable).filter(
                PersonTable.id == person_id
            ).delete()
            session.commit()
            return True
        except Exception:
            session.rollback()
            return False
        finally:
            session.close()
    
    # ═══════════════════════════════════════════════════════════════
    # Flow CRUD
    # ═══════════════════════════════════════════════════════════════
    
    def create_flow(self, flow_data: Dict) -> bool:
        """Flow 생성"""
        if not self.is_connected:
            return False
        
        session = self.get_session()
        try:
            flow = FlowTable(**flow_data)
            session.merge(flow)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"⚠️ Flow 생성 실패: {e}")
            return False
        finally:
            session.close()
    
    def get_flows(
        self,
        source_id: str = None,
        target_id: str = None,
        limit: int = 100,
    ) -> List[Dict]:
        """Flow 조회"""
        if not self.is_connected:
            return []
        
        session = self.get_session()
        try:
            query = session.query(FlowTable)
            if source_id:
                query = query.filter(FlowTable.source_id == source_id)
            if target_id:
                query = query.filter(FlowTable.target_id == target_id)
            flows = query.order_by(
                FlowTable.amount.desc()
            ).limit(limit).all()
            return [f.to_dict() for f in flows]
        finally:
            session.close()
    
    def get_flow_stats(self) -> Dict:
        """Flow 통계"""
        if not self.is_connected:
            return {}
        
        session = self.get_session()
        try:
            from sqlalchemy import func
            
            result = session.query(
                func.count(FlowTable.id).label("count"),
                func.sum(FlowTable.amount).label("total_amount"),
            ).first()
            
            return {
                "flow_count": result.count or 0,
                "total_amount": float(result.total_amount or 0),
            }
        finally:
            session.close()
    
    # ═══════════════════════════════════════════════════════════════
    # Scale Node CRUD
    # ═══════════════════════════════════════════════════════════════
    
    def create_scale_node(self, node_data: Dict) -> bool:
        """ScaleNode 생성"""
        if not self.is_connected:
            return False
        
        session = self.get_session()
        try:
            # bounds 처리
            bounds = node_data.pop("bounds", None)
            if bounds and len(bounds) == 4:
                node_data["bounds_sw_lat"] = bounds[0]
                node_data["bounds_sw_lng"] = bounds[1]
                node_data["bounds_ne_lat"] = bounds[2]
                node_data["bounds_ne_lng"] = bounds[3]
            
            node = ScaleNodeTable(**node_data)
            session.merge(node)
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"⚠️ ScaleNode 생성 실패: {e}")
            return False
        finally:
            session.close()
    
    def get_scale_nodes_by_level(self, level: str, limit: int = 100) -> List[Dict]:
        """레벨별 ScaleNode 조회"""
        if not self.is_connected:
            return []
        
        session = self.get_session()
        try:
            nodes = session.query(ScaleNodeTable).filter(
                ScaleNodeTable.level == level
            ).order_by(
                ScaleNodeTable.ki_score.desc()
            ).limit(limit).all()
            return [n.to_dict() for n in nodes]
        finally:
            session.close()
    
    def get_children(self, parent_id: str) -> List[Dict]:
        """하위 노드 조회"""
        if not self.is_connected:
            return []
        
        session = self.get_session()
        try:
            nodes = session.query(ScaleNodeTable).filter(
                ScaleNodeTable.parent_id == parent_id
            ).order_by(
                ScaleNodeTable.ki_score.desc()
            ).all()
            return [n.to_dict() for n in nodes]
        finally:
            session.close()
    
    # ═══════════════════════════════════════════════════════════════
    # 통계
    # ═══════════════════════════════════════════════════════════════
    
    def get_stats(self) -> Dict:
        """전체 통계"""
        if not self.is_connected:
            return {"connected": False}
        
        session = self.get_session()
        try:
            from sqlalchemy import func
            
            person_count = session.query(func.count(PersonTable.id)).scalar() or 0
            flow_count = session.query(func.count(FlowTable.id)).scalar() or 0
            scale_count = session.query(func.count(ScaleNodeTable.id)).scalar() or 0
            
            return {
                "connected": True,
                "person_count": person_count,
                "flow_count": flow_count,
                "scale_node_count": scale_count,
            }
        finally:
            session.close()


# ═══════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════

def init_db() -> bool:
    """데이터베이스 초기화"""
    if not SQLALCHEMY_AVAILABLE or not engine:
        print("⚠️ SQLAlchemy 없음 - DB 초기화 스킵")
        return False
    
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ PostgreSQL 테이블 생성 완료")
        return True
    except Exception as e:
        print(f"⚠️ PostgreSQL 초기화 실패: {e}")
        return False


# 싱글톤 인스턴스
_postgres_client: Optional[PostgresClient] = None


def get_postgres_client() -> PostgresClient:
    """PostgreSQL 클라이언트 싱글톤"""
    global _postgres_client
    if _postgres_client is None:
        _postgres_client = PostgresClient()
    return _postgres_client

