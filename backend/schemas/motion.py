"""
Motion Schemas - Zero Meaning 적용
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MotionCreate(BaseModel):
    """모션 생성 스키마 (Zero Meaning)"""
    source_id: int = Field(..., description="출발 노드 ID")
    target_id: int = Field(..., description="도착 노드 ID")
    amount: float = Field(..., gt=0, description="금액")


class MotionResponse(BaseModel):
    """모션 응답 스키마"""
    id: int
    source_id: int
    target_id: int
    amount: float
    occurred_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MotionList(BaseModel):
    """모션 목록 응답"""
    items: List[MotionResponse]
    total: int





"""
Motion Schemas - Zero Meaning 적용
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class MotionCreate(BaseModel):
    """모션 생성 스키마 (Zero Meaning)"""
    source_id: int = Field(..., description="출발 노드 ID")
    target_id: int = Field(..., description="도착 노드 ID")
    amount: float = Field(..., gt=0, description="금액")


class MotionResponse(BaseModel):
    """모션 응답 스키마"""
    id: int
    source_id: int
    target_id: int
    amount: float
    occurred_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MotionList(BaseModel):
    """모션 목록 응답"""
    items: List[MotionResponse]
    total: int











