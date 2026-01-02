"""
Node Schemas - Zero Meaning 적용
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class NodeBase(BaseModel):
    """노드 기본 스키마 (Zero Meaning)"""
    lat: float = Field(..., description="위도", ge=-90, le=90)
    lon: float = Field(..., description="경도", ge=-180, le=180)


class NodeCreate(NodeBase):
    """노드 생성 스키마"""
    value: float = Field(default=0, description="초기 가치")
    time_cost: float = Field(default=0, ge=0, description="시간 비용")


class NodeUpdate(BaseModel):
    """노드 수정 스키마"""
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    value: Optional[float] = None
    time_cost: Optional[float] = Field(None, ge=0)


class NodeResponse(NodeBase):
    """노드 응답 스키마"""
    id: int
    value: float
    direct_money: float
    time_cost: float
    synergy_money: float
    status: str
    is_active: bool
    created_at: Optional[datetime] = None
    calculated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class NodeList(BaseModel):
    """노드 목록 응답"""
    items: List[NodeResponse]
    total: int
    page: int
    limit: int
    has_next: bool


class NodeCalculation(BaseModel):
    """노드 계산 결과"""
    node_id: int
    value: float
    breakdown: dict = Field(
        default_factory=lambda: {
            "direct_money": 0,
            "time_cost": 0,
            "synergy_money": 0
        }
    )
    status: str


class NodePrediction(BaseModel):
    """노드 예측 결과"""
    node_id: int
    current_value: float
    predictions: List[dict]
    synergy_rate: float





"""
Node Schemas - Zero Meaning 적용
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class NodeBase(BaseModel):
    """노드 기본 스키마 (Zero Meaning)"""
    lat: float = Field(..., description="위도", ge=-90, le=90)
    lon: float = Field(..., description="경도", ge=-180, le=180)


class NodeCreate(NodeBase):
    """노드 생성 스키마"""
    value: float = Field(default=0, description="초기 가치")
    time_cost: float = Field(default=0, ge=0, description="시간 비용")


class NodeUpdate(BaseModel):
    """노드 수정 스키마"""
    lat: Optional[float] = Field(None, ge=-90, le=90)
    lon: Optional[float] = Field(None, ge=-180, le=180)
    value: Optional[float] = None
    time_cost: Optional[float] = Field(None, ge=0)


class NodeResponse(NodeBase):
    """노드 응답 스키마"""
    id: int
    value: float
    direct_money: float
    time_cost: float
    synergy_money: float
    status: str
    is_active: bool
    created_at: Optional[datetime] = None
    calculated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class NodeList(BaseModel):
    """노드 목록 응답"""
    items: List[NodeResponse]
    total: int
    page: int
    limit: int
    has_next: bool


class NodeCalculation(BaseModel):
    """노드 계산 결과"""
    node_id: int
    value: float
    breakdown: dict = Field(
        default_factory=lambda: {
            "direct_money": 0,
            "time_cost": 0,
            "synergy_money": 0
        }
    )
    status: str


class NodePrediction(BaseModel):
    """노드 예측 결과"""
    node_id: int
    current_value: float
    predictions: List[dict]
    synergy_rate: float










