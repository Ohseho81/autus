"""
Action Schemas - 2버튼 시스템
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class ActionCut(BaseModel):
    """CUT 액션 요청"""
    node_id: int = Field(..., description="삭제할 노드 ID")


class ActionLink(BaseModel):
    """LINK 액션 요청"""
    source_id: int = Field(..., description="출발 노드 ID")
    target_id: int = Field(..., description="도착 노드 ID")
    amount: float = Field(..., gt=0, description="연결 금액")


class ActionResponse(BaseModel):
    """액션 결과"""
    action: str
    success: bool
    node_id: Optional[int] = None
    before_value: Optional[float] = None
    after_value: Optional[float] = None
    affected_nodes: List[int] = []
    message: Optional[str] = None





"""
Action Schemas - 2버튼 시스템
"""
from pydantic import BaseModel, Field
from typing import Optional, List


class ActionCut(BaseModel):
    """CUT 액션 요청"""
    node_id: int = Field(..., description="삭제할 노드 ID")


class ActionLink(BaseModel):
    """LINK 액션 요청"""
    source_id: int = Field(..., description="출발 노드 ID")
    target_id: int = Field(..., description="도착 노드 ID")
    amount: float = Field(..., gt=0, description="연결 금액")


class ActionResponse(BaseModel):
    """액션 결과"""
    action: str
    success: bool
    node_id: Optional[int] = None
    before_value: Optional[float] = None
    after_value: Optional[float] = None
    affected_nodes: List[int] = []
    message: Optional[str] = None










