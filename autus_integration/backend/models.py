# backend/models.py
# AUTUS Pydantic 스키마

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════

class FlowDirection(str, Enum):
    INFLOW = "inflow"
    OUTFLOW = "outflow"


class AbsorptionStage(str, Enum):
    PARASITIC = "parasitic"
    ABSORBING = "absorbing"
    REPLACING = "replacing"
    REPLACED = "replaced"


class SystemType(str, Enum):
    PAYMENT = "payment"
    ERP = "erp"
    CRM = "crm"
    BOOKING = "booking"
    POS = "pos"
    ACCOUNTING = "accounting"


# ═══════════════════════════════════════════════════════════════════════════
# 기본 모델
# ═══════════════════════════════════════════════════════════════════════════

class BaseResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════
# 노드 (Node)
# ═══════════════════════════════════════════════════════════════════════════

class NodeCreate(BaseModel):
    """노드 생성 요청"""
    external_id: str = Field(..., description="외부 시스템 ID")
    source: str = Field(default="unknown", description="데이터 소스")


class NodeResponse(BaseModel):
    """노드 응답"""
    id: str
    external_id: str
    value: float = 0
    direct_money: float = 0
    synergy: float = 0
    source: str
    created_at: Optional[datetime] = None


class NodeList(BaseModel):
    """노드 목록"""
    nodes: List[NodeResponse]
    total: int


# ═══════════════════════════════════════════════════════════════════════════
# 모션 (Motion)
# ═══════════════════════════════════════════════════════════════════════════

class MotionCreate(BaseModel):
    """모션 생성 요청"""
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    amount: float = Field(..., gt=0, description="금액")
    direction: FlowDirection = FlowDirection.INFLOW
    fee: float = Field(default=0, ge=0, description="수수료")


class MotionResponse(BaseModel):
    """모션 응답"""
    source: str
    target: str
    amount: float
    direction: str
    fee: float
    created_at: Optional[datetime] = None


class MotionList(BaseModel):
    """모션 목록"""
    motions: List[MotionResponse]
    total: int


# ═══════════════════════════════════════════════════════════════════════════
# Zero Meaning
# ═══════════════════════════════════════════════════════════════════════════

class ZeroMeaningInput(BaseModel):
    """Zero Meaning 변환 입력"""
    data: Dict[str, Any]
    source: str = "unknown"


class ZeroMeaningOutput(BaseModel):
    """Zero Meaning 변환 출력"""
    node_id: Optional[str] = None
    value: float = 0
    timestamp: str
    source: str


# ═══════════════════════════════════════════════════════════════════════════
# CrewAI
# ═══════════════════════════════════════════════════════════════════════════

class CrewAIAnalyzeRequest(BaseModel):
    """CrewAI 분석 요청"""
    nodes: List[Dict[str, Any]]
    motions: List[Dict[str, Any]]


class DeleteTarget(BaseModel):
    """삭제 대상"""
    id: str
    value: float
    recommendation: str = "DELETE"


class AutomateTarget(BaseModel):
    """자동화 대상"""
    motion: str
    frequency: int
    estimated_time_saved_hours: float


class OutsourceRecommendation(BaseModel):
    """외부용역 추천"""
    role: str
    expected_roi: float
    monthly_cost: float


class CrewAIAnalyzeResponse(BaseModel):
    """CrewAI 분석 응답"""
    success: bool = True
    delete: Dict[str, Any] = {}
    automate: Dict[str, Any] = {}
    outsource: Dict[str, Any] = {}
    total_monthly_impact: float = 0
    velocity: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════
# Parasitic
# ═══════════════════════════════════════════════════════════════════════════

class ParasiticConnectRequest(BaseModel):
    """Parasitic 연동 요청"""
    saas_type: str
    credentials: Optional[Dict[str, str]] = {}


class ParasiticConnectResponse(BaseModel):
    """Parasitic 연동 응답"""
    success: bool
    connector_id: Optional[str] = None
    stage: Optional[str] = None
    webhook_url: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class ParasiticStatusResponse(BaseModel):
    """Parasitic 상태 응답"""
    connectors: Dict[str, Any]
    total_absorbed: int
    total_replaced: int


class FlywheelStatus(BaseModel):
    """Flywheel 상태"""
    stages: Dict[str, int]
    progress_percent: float
    flywheel_multiplier: float
    monthly_savings: float
    projected_12month_savings: float
    message: str


# ═══════════════════════════════════════════════════════════════════════════
# AutoSync
# ═══════════════════════════════════════════════════════════════════════════

class AutoSyncDetectRequest(BaseModel):
    """AutoSync 감지 요청"""
    cookies: Optional[str] = None
    domains: Optional[List[str]] = None
    api_keys: Optional[Dict[str, str]] = None


class DetectedSystem(BaseModel):
    """감지된 시스템"""
    id: str
    name: str
    type: str
    confidence: float = 0.9


class AutoSyncDetectResponse(BaseModel):
    """AutoSync 감지 응답"""
    detected_count: int
    systems: List[DetectedSystem]
    message: str


class AutoSyncTransformRequest(BaseModel):
    """AutoSync 변환 요청"""
    data: Dict[str, Any]
    system_id: str


class AutoSyncTransformResponse(BaseModel):
    """AutoSync 변환 응답"""
    success: bool
    original: Dict[str, Any]
    transformed: ZeroMeaningOutput
    system: str


# ═══════════════════════════════════════════════════════════════════════════
# Webhook
# ═══════════════════════════════════════════════════════════════════════════

class WebhookResponse(BaseModel):
    """Webhook 응답"""
    received: bool = True
    action: str
    node_id: Optional[str] = None
    amount: Optional[float] = None
    flow_type: Optional[str] = None
    source: Optional[str] = None
    fee_saved: Optional[float] = None
    message: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════════════════════

class HealthStatus(BaseModel):
    """헬스 상태"""
    status: str = "healthy"
    services: Dict[str, str]
    version: str
    timestamp: datetime = Field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════
# Statistics
# ═══════════════════════════════════════════════════════════════════════════

class SystemStats(BaseModel):
    """시스템 통계"""
    total_nodes: int
    total_motions: int
    total_value: float
    total_synergy: float
    negative_value_nodes: int
    top_nodes: List[NodeResponse]


# backend/models.py
# AUTUS Pydantic 스키마

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ═══════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════

class FlowDirection(str, Enum):
    INFLOW = "inflow"
    OUTFLOW = "outflow"


class AbsorptionStage(str, Enum):
    PARASITIC = "parasitic"
    ABSORBING = "absorbing"
    REPLACING = "replacing"
    REPLACED = "replaced"


class SystemType(str, Enum):
    PAYMENT = "payment"
    ERP = "erp"
    CRM = "crm"
    BOOKING = "booking"
    POS = "pos"
    ACCOUNTING = "accounting"


# ═══════════════════════════════════════════════════════════════════════════
# 기본 모델
# ═══════════════════════════════════════════════════════════════════════════

class BaseResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════
# 노드 (Node)
# ═══════════════════════════════════════════════════════════════════════════

class NodeCreate(BaseModel):
    """노드 생성 요청"""
    external_id: str = Field(..., description="외부 시스템 ID")
    source: str = Field(default="unknown", description="데이터 소스")


class NodeResponse(BaseModel):
    """노드 응답"""
    id: str
    external_id: str
    value: float = 0
    direct_money: float = 0
    synergy: float = 0
    source: str
    created_at: Optional[datetime] = None


class NodeList(BaseModel):
    """노드 목록"""
    nodes: List[NodeResponse]
    total: int


# ═══════════════════════════════════════════════════════════════════════════
# 모션 (Motion)
# ═══════════════════════════════════════════════════════════════════════════

class MotionCreate(BaseModel):
    """모션 생성 요청"""
    source_id: str = Field(..., description="출발 노드 ID")
    target_id: str = Field(..., description="도착 노드 ID")
    amount: float = Field(..., gt=0, description="금액")
    direction: FlowDirection = FlowDirection.INFLOW
    fee: float = Field(default=0, ge=0, description="수수료")


class MotionResponse(BaseModel):
    """모션 응답"""
    source: str
    target: str
    amount: float
    direction: str
    fee: float
    created_at: Optional[datetime] = None


class MotionList(BaseModel):
    """모션 목록"""
    motions: List[MotionResponse]
    total: int


# ═══════════════════════════════════════════════════════════════════════════
# Zero Meaning
# ═══════════════════════════════════════════════════════════════════════════

class ZeroMeaningInput(BaseModel):
    """Zero Meaning 변환 입력"""
    data: Dict[str, Any]
    source: str = "unknown"


class ZeroMeaningOutput(BaseModel):
    """Zero Meaning 변환 출력"""
    node_id: Optional[str] = None
    value: float = 0
    timestamp: str
    source: str


# ═══════════════════════════════════════════════════════════════════════════
# CrewAI
# ═══════════════════════════════════════════════════════════════════════════

class CrewAIAnalyzeRequest(BaseModel):
    """CrewAI 분석 요청"""
    nodes: List[Dict[str, Any]]
    motions: List[Dict[str, Any]]


class DeleteTarget(BaseModel):
    """삭제 대상"""
    id: str
    value: float
    recommendation: str = "DELETE"


class AutomateTarget(BaseModel):
    """자동화 대상"""
    motion: str
    frequency: int
    estimated_time_saved_hours: float


class OutsourceRecommendation(BaseModel):
    """외부용역 추천"""
    role: str
    expected_roi: float
    monthly_cost: float


class CrewAIAnalyzeResponse(BaseModel):
    """CrewAI 분석 응답"""
    success: bool = True
    delete: Dict[str, Any] = {}
    automate: Dict[str, Any] = {}
    outsource: Dict[str, Any] = {}
    total_monthly_impact: float = 0
    velocity: Optional[float] = None
    timestamp: datetime = Field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════
# Parasitic
# ═══════════════════════════════════════════════════════════════════════════

class ParasiticConnectRequest(BaseModel):
    """Parasitic 연동 요청"""
    saas_type: str
    credentials: Optional[Dict[str, str]] = {}


class ParasiticConnectResponse(BaseModel):
    """Parasitic 연동 응답"""
    success: bool
    connector_id: Optional[str] = None
    stage: Optional[str] = None
    webhook_url: Optional[str] = None
    message: Optional[str] = None
    error: Optional[str] = None


class ParasiticStatusResponse(BaseModel):
    """Parasitic 상태 응답"""
    connectors: Dict[str, Any]
    total_absorbed: int
    total_replaced: int


class FlywheelStatus(BaseModel):
    """Flywheel 상태"""
    stages: Dict[str, int]
    progress_percent: float
    flywheel_multiplier: float
    monthly_savings: float
    projected_12month_savings: float
    message: str


# ═══════════════════════════════════════════════════════════════════════════
# AutoSync
# ═══════════════════════════════════════════════════════════════════════════

class AutoSyncDetectRequest(BaseModel):
    """AutoSync 감지 요청"""
    cookies: Optional[str] = None
    domains: Optional[List[str]] = None
    api_keys: Optional[Dict[str, str]] = None


class DetectedSystem(BaseModel):
    """감지된 시스템"""
    id: str
    name: str
    type: str
    confidence: float = 0.9


class AutoSyncDetectResponse(BaseModel):
    """AutoSync 감지 응답"""
    detected_count: int
    systems: List[DetectedSystem]
    message: str


class AutoSyncTransformRequest(BaseModel):
    """AutoSync 변환 요청"""
    data: Dict[str, Any]
    system_id: str


class AutoSyncTransformResponse(BaseModel):
    """AutoSync 변환 응답"""
    success: bool
    original: Dict[str, Any]
    transformed: ZeroMeaningOutput
    system: str


# ═══════════════════════════════════════════════════════════════════════════
# Webhook
# ═══════════════════════════════════════════════════════════════════════════

class WebhookResponse(BaseModel):
    """Webhook 응답"""
    received: bool = True
    action: str
    node_id: Optional[str] = None
    amount: Optional[float] = None
    flow_type: Optional[str] = None
    source: Optional[str] = None
    fee_saved: Optional[float] = None
    message: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════
# Health Check
# ═══════════════════════════════════════════════════════════════════════════

class HealthStatus(BaseModel):
    """헬스 상태"""
    status: str = "healthy"
    services: Dict[str, str]
    version: str
    timestamp: datetime = Field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════
# Statistics
# ═══════════════════════════════════════════════════════════════════════════

class SystemStats(BaseModel):
    """시스템 통계"""
    total_nodes: int
    total_motions: int
    total_value: float
    total_synergy: float
    negative_value_nodes: int
    top_nodes: List[NodeResponse]








