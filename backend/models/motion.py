"""
Motion Model - Zero Meaning 적용
돈 흐름 (source → target)
"""
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from database import Base


class Motion(Base):
    """
    Motion (Zero Meaning)
    
    돈 흐름을 나타내는 엣지
    source_id → target_id : amount
    
    Zero Meaning Lock:
    - 출발 노드 (source_id)
    - 도착 노드 (target_id)
    - 금액 (amount)
    
    ❌ 금지 필드:
    - reason, type, label, description, category
    """
    __tablename__ = "motions"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Zero Meaning: 출발, 도착, 금액만
    source_id = Column(
        Integer, 
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="출발 노드"
    )
    target_id = Column(
        Integer,
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="도착 노드"
    )
    amount = Column(Float, nullable=False, comment="금액")
    
    # 시간 정보
    occurred_at = Column(DateTime, server_default=func.now(), comment="발생 시각")
    created_at = Column(DateTime, server_default=func.now())
    
    # 제약조건
    __table_args__ = (
        CheckConstraint('source_id != target_id', name='different_nodes'),
        CheckConstraint('amount > 0', name='positive_amount'),
    )
    
    def __repr__(self):
        return f"<Motion(id={self.id}, {self.source_id}→{self.target_id}, amount={self.amount})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "amount": self.amount,
            "occurred_at": self.occurred_at.isoformat() if self.occurred_at else None,
        }





"""
Motion Model - Zero Meaning 적용
돈 흐름 (source → target)
"""
from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.sql import func
from database import Base


class Motion(Base):
    """
    Motion (Zero Meaning)
    
    돈 흐름을 나타내는 엣지
    source_id → target_id : amount
    
    Zero Meaning Lock:
    - 출발 노드 (source_id)
    - 도착 노드 (target_id)
    - 금액 (amount)
    
    ❌ 금지 필드:
    - reason, type, label, description, category
    """
    __tablename__ = "motions"
    
    # Primary Key
    id = Column(Integer, primary_key=True, index=True)
    
    # Zero Meaning: 출발, 도착, 금액만
    source_id = Column(
        Integer, 
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="출발 노드"
    )
    target_id = Column(
        Integer,
        ForeignKey("nodes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="도착 노드"
    )
    amount = Column(Float, nullable=False, comment="금액")
    
    # 시간 정보
    occurred_at = Column(DateTime, server_default=func.now(), comment="발생 시각")
    created_at = Column(DateTime, server_default=func.now())
    
    # 제약조건
    __table_args__ = (
        CheckConstraint('source_id != target_id', name='different_nodes'),
        CheckConstraint('amount > 0', name='positive_amount'),
    )
    
    def __repr__(self):
        return f"<Motion(id={self.id}, {self.source_id}→{self.target_id}, amount={self.amount})>"
    
    def to_dict(self):
        return {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "amount": self.amount,
            "occurred_at": self.occurred_at.isoformat() if self.occurred_at else None,
        }











