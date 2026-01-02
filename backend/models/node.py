"""
Node Model - Zero Meaning 적용
사람/자산을 나타내는 노드 (의미 필드 없음)
"""
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Node(Base):
    """
    Node (Zero Meaning)
    
    Zero Meaning Lock:
    - 위치 (lat, lon)
    - 가치 (value)
    - 돈 관련 숫자만
    
    ❌ 금지 필드:
    - name, role, country, category, description
    """
    __tablename__ = "nodes"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Zero Meaning: 위치만
    lat = Column(Float, nullable=False, comment="위도")
    lon = Column(Float, nullable=False, comment="경도")
    
    # 최종 가치 (V = M - T + S)
    value = Column(Float, default=0, comment="최종 가치")
    
    # 계산된 필드 (V = M - T + S)
    direct_money = Column(Float, default=0, comment="M: 직접 돈")
    time_cost = Column(Float, default=0, comment="T: 시간 비용")
    synergy_money = Column(Float, default=0, comment="S: 시너지 돈")
    
    # 상태
    status = Column(
        String(20), 
        default="STABLE",
        comment="STABLE | OVERHEATED | DECAYING"
    )
    is_active = Column(Boolean, default=True)
    
    # 소유자 (옵션)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # 타임스탬프
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    calculated_at = Column(DateTime, nullable=True, comment="마지막 계산 시각")
    
    def __repr__(self):
        return f"<Node(id={self.id}, value={self.value}, status={self.status})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "lat": self.lat,
            "lon": self.lon,
            "value": self.value,
            "direct_money": self.direct_money,
            "time_cost": self.time_cost,
            "synergy_money": self.synergy_money,
            "status": self.status,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }





"""
Node Model - Zero Meaning 적용
사람/자산을 나타내는 노드 (의미 필드 없음)
"""
from sqlalchemy import Column, Integer, Float, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class Node(Base):
    """
    Node (Zero Meaning)
    
    Zero Meaning Lock:
    - 위치 (lat, lon)
    - 가치 (value)
    - 돈 관련 숫자만
    
    ❌ 금지 필드:
    - name, role, country, category, description
    """
    __tablename__ = "nodes"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Zero Meaning: 위치만
    lat = Column(Float, nullable=False, comment="위도")
    lon = Column(Float, nullable=False, comment="경도")
    
    # 최종 가치 (V = M - T + S)
    value = Column(Float, default=0, comment="최종 가치")
    
    # 계산된 필드 (V = M - T + S)
    direct_money = Column(Float, default=0, comment="M: 직접 돈")
    time_cost = Column(Float, default=0, comment="T: 시간 비용")
    synergy_money = Column(Float, default=0, comment="S: 시너지 돈")
    
    # 상태
    status = Column(
        String(20), 
        default="STABLE",
        comment="STABLE | OVERHEATED | DECAYING"
    )
    is_active = Column(Boolean, default=True)
    
    # 소유자 (옵션)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # 타임스탬프
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    calculated_at = Column(DateTime, nullable=True, comment="마지막 계산 시각")
    
    def __repr__(self):
        return f"<Node(id={self.id}, value={self.value}, status={self.status})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "lat": self.lat,
            "lon": self.lon,
            "value": self.value,
            "direct_money": self.direct_money,
            "time_cost": self.time_cost,
            "synergy_money": self.synergy_money,
            "status": self.status,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }











