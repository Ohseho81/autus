"""
ActionLog Model
2버튼 시스템 히스토리 (CUT, LINK)
"""
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class ActionLog(Base):
    """
    2버튼 액션 로그
    CUT: 노드 삭제
    LINK: 노드 연결
    """
    __tablename__ = "action_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 액션 타입
    action_type = Column(
        String(20), 
        nullable=False,
        comment="CUT | LINK"
    )
    
    # 대상 노드
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)
    target_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)
    
    # 실행 전후 가치
    before_value = Column(Float, nullable=True)
    after_value = Column(Float, nullable=True)
    
    # 메타데이터
    executed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    executed_at = Column(DateTime, server_default=func.now())
    
    def __repr__(self):
        return f"<ActionLog(id={self.id}, type={self.action_type}, node={self.node_id})>"





"""
ActionLog Model
2버튼 시스템 히스토리 (CUT, LINK)
"""
from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from database import Base


class ActionLog(Base):
    """
    2버튼 액션 로그
    CUT: 노드 삭제
    LINK: 노드 연결
    """
    __tablename__ = "action_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # 액션 타입
    action_type = Column(
        String(20), 
        nullable=False,
        comment="CUT | LINK"
    )
    
    # 대상 노드
    node_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)
    target_node_id = Column(Integer, ForeignKey("nodes.id"), nullable=True)
    
    # 실행 전후 가치
    before_value = Column(Float, nullable=True)
    after_value = Column(Float, nullable=True)
    
    # 메타데이터
    executed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    executed_at = Column(DateTime, server_default=func.now())
    
    def __repr__(self):
        return f"<ActionLog(id={self.id}, type={self.action_type}, node={self.node_id})>"











