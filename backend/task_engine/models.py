"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 570 업무 - Pydantic 모델
═══════════════════════════════════════════════════════════════════════════════
"""

from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


# ═══════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════

class UserType(str, Enum):
    """사용자 타입 (6가지)"""
    INDIVIDUAL = "INDIVIDUAL"       # 개인
    SMALL_TEAM = "SMALL_TEAM"       # 소규모 팀 (2-10명)
    SMB = "SMB"                     # 중소기업 (11-500명)
    ENTERPRISE = "ENTERPRISE"       # 대기업 (500+명)
    NATION = "NATION"               # 국가
    GLOBAL = "GLOBAL"               # 글로벌


class TaskLayer(str, Enum):
    """업무 레이어"""
    COMMON = "COMMON"     # L1: 공통 엔진 (50개)
    DOMAIN = "DOMAIN"     # L2: 도메인 로직 (120개)
    EDGE = "EDGE"         # L3: 엣지 자동화 (400개)


class TaskStatus(str, Enum):
    """업무 상태"""
    ACTIVE = "ACTIVE"           # 활성
    PAUSED = "PAUSED"           # 일시 정지
    DECAYING = "DECAYING"       # 쇠퇴 중 (r < 0)
    ELIMINATED = "ELIMINATED"   # 소멸됨
    MANUAL_ONLY = "MANUAL_ONLY" # 수동만


class KStatus(str, Enum):
    """K 상수 상태"""
    THRIVING = "THRIVING"       # K >= 1.2
    STABLE = "STABLE"           # 0.8 <= K < 1.2
    STRUGGLING = "STRUGGLING"   # 0.5 <= K < 0.8
    CRITICAL = "CRITICAL"       # K < 0.5


class IStatus(str, Enum):
    """I 상수 상태"""
    HIGH_SYNERGY = "HIGH_SYNERGY"   # I >= 0.3
    NEUTRAL = "NEUTRAL"             # 0 <= I < 0.3
    LOW_CONFLICT = "LOW_CONFLICT"   # -0.3 <= I < 0
    HIGH_CONFLICT = "HIGH_CONFLICT" # I < -0.3


class RStatus(str, Enum):
    """r 지수 상태"""
    GROWING = "GROWING"     # r >= 0.05
    STABLE = "STABLE"       # -0.02 <= r < 0.05
    DECLINING = "DECLINING" # -0.05 <= r < -0.02
    DECAYING = "DECAYING"   # r < -0.05


# ═══════════════════════════════════════════════════════════════════════════════
# 업무 정의
# ═══════════════════════════════════════════════════════════════════════════════

class TaskDefinition(BaseModel):
    """업무 정의 (570개 마스터)"""
    task_id: str = Field(..., description="업무 ID (예: L1_AUTH_001)")
    layer: TaskLayer = Field(..., description="레이어")
    category: str = Field(..., description="카테고리 (AUTH, NOTIFY 등)")
    subcategory: Optional[str] = Field(None, description="서브카테고리")
    
    # 기본 정보
    name_en: str = Field(..., description="영문 이름")
    name_ko: str = Field(..., description="한글 이름")
    description: Optional[str] = Field(None, description="설명")
    
    # 기본 상수
    base_k: float = Field(1.0, ge=0.1, le=2.0, description="기본 K 상수")
    base_i: float = Field(0.0, ge=-1.0, le=1.0, description="기본 I 상수")
    base_r: float = Field(0.0, ge=-0.1, le=0.1, description="기본 r 지수")
    
    # 자동화
    automation_level: int = Field(50, ge=0, le=100, description="자동화 레벨 0-100")
    energy_cost: float = Field(1.0, ge=0.1, description="에너지 비용")
    
    # 외부 툴
    external_tool: Optional[str] = Field(None, description="외부 툴")
    api_endpoint: Optional[str] = Field(None, description="API 엔드포인트")
    
    # 타입별 활성화
    enabled_types: List[UserType] = Field(
        default=[UserType.INDIVIDUAL, UserType.SMALL_TEAM, UserType.SMB, UserType.ENTERPRISE]
    )
    
    is_active: bool = Field(True)


class UserTask(BaseModel):
    """사용자별 업무 상태 (개인화)"""
    entity_id: UUID
    task_id: str
    user_type: UserType = UserType.INDIVIDUAL
    
    # 개인화된 상수
    personal_k: float = Field(1.0, description="개인 K 상수")
    personal_i: float = Field(0.0, description="개인 I 상수")
    personal_r: float = Field(0.0, description="개인 r 지수")
    
    # 상태
    status: TaskStatus = TaskStatus.ACTIVE
    automation_level: int = Field(50, ge=0, le=100)
    
    # 통계
    execution_count: int = 0
    success_count: int = 0
    failure_count: int = 0
    total_energy_spent: float = 0.0
    
    last_executed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# ═══════════════════════════════════════════════════════════════════════════════
# K/I/r 관련
# ═══════════════════════════════════════════════════════════════════════════════

class KIRSnapshot(BaseModel):
    """K/I/r 스냅샷"""
    entity_id: UUID
    task_id: str
    
    k_value: float
    i_value: float
    r_value: float
    
    delta_k: float = 0.0
    delta_i: float = 0.0
    delta_r: float = 0.0
    
    trigger_reason: Optional[str] = None
    measured_at: datetime = Field(default_factory=datetime.now)
    
    @property
    def k_status(self) -> KStatus:
        if self.k_value >= 1.2:
            return KStatus.THRIVING
        elif self.k_value >= 0.8:
            return KStatus.STABLE
        elif self.k_value >= 0.5:
            return KStatus.STRUGGLING
        return KStatus.CRITICAL
    
    @property
    def i_status(self) -> IStatus:
        if self.i_value >= 0.3:
            return IStatus.HIGH_SYNERGY
        elif self.i_value >= 0:
            return IStatus.NEUTRAL
        elif self.i_value >= -0.3:
            return IStatus.LOW_CONFLICT
        return IStatus.HIGH_CONFLICT
    
    @property
    def r_status(self) -> RStatus:
        if self.r_value >= 0.05:
            return RStatus.GROWING
        elif self.r_value >= -0.02:
            return RStatus.STABLE
        elif self.r_value >= -0.05:
            return RStatus.DECLINING
        return RStatus.DECAYING


class KIRInput(BaseModel):
    """K/I/r 입력값"""
    success_rate: float = Field(0.5, ge=0, le=1, description="성공률")
    energy_efficiency: float = Field(1.0, ge=0, description="에너지 효율")
    synergy_score: float = Field(0.0, ge=-1, le=1, description="시너지 점수")
    growth_rate: float = Field(0.0, ge=-1, le=1, description="성장률")


# ═══════════════════════════════════════════════════════════════════════════════
# 자동화 규칙
# ═══════════════════════════════════════════════════════════════════════════════

class ConditionType(str, Enum):
    K_THRESHOLD = "K_THRESHOLD"
    I_THRESHOLD = "I_THRESHOLD"
    R_DECAY = "R_DECAY"
    TIME_BASED = "TIME_BASED"
    ENERGY_LOW = "ENERGY_LOW"


class ActionType(str, Enum):
    ADJUST_AUTOMATION = "ADJUST_AUTOMATION"
    ELIMINATE = "ELIMINATE"
    NOTIFY = "NOTIFY"
    TRIGGER_TOOL = "TRIGGER_TOOL"
    PAUSE = "PAUSE"


class AutomationRule(BaseModel):
    """자동화 규칙"""
    rule_id: Optional[UUID] = None
    entity_id: Optional[UUID] = None  # NULL = 글로벌 규칙
    task_id: Optional[str] = None     # NULL = 모든 업무
    
    condition_type: ConditionType
    condition_operator: str = Field(..., pattern="^(>|<|>=|<=|==)$")
    condition_value: float
    
    action_type: ActionType
    action_params: Dict[str, Any]
    
    priority: int = Field(5, ge=1, le=10)
    enabled: bool = True
    
    def evaluate(self, k: float, i: float, r: float) -> bool:
        """조건 평가"""
        if self.condition_type == ConditionType.K_THRESHOLD:
            target = k
        elif self.condition_type == ConditionType.I_THRESHOLD:
            target = i
        elif self.condition_type == ConditionType.R_DECAY:
            target = r
        else:
            return False
        
        ops = {
            ">": lambda a, b: a > b,
            "<": lambda a, b: a < b,
            ">=": lambda a, b: a >= b,
            "<=": lambda a, b: a <= b,
            "==": lambda a, b: abs(a - b) < 0.001,
        }
        
        return ops[self.condition_operator](target, self.condition_value)


# ═══════════════════════════════════════════════════════════════════════════════
# 업무 실행
# ═══════════════════════════════════════════════════════════════════════════════

class TaskExecution(BaseModel):
    """업무 실행 로그"""
    execution_id: Optional[UUID] = None
    entity_id: UUID
    task_id: str
    
    execution_type: str = "auto"  # auto, manual, triggered
    external_tool: Optional[str] = None
    
    success: bool
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    energy_consumed: float = 0.0
    k_impact: float = 0.0
    i_impact: float = 0.0
    r_impact: float = 0.0
    
    started_at: datetime = Field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    duration_ms: Optional[int] = None


class TaskExecuteRequest(BaseModel):
    """업무 실행 요청"""
    entity_id: UUID
    task_id: str
    execution_type: str = "auto"
    params: Optional[Dict[str, Any]] = None


class TaskExecuteResponse(BaseModel):
    """업무 실행 응답"""
    success: bool
    execution_id: UUID
    task_id: str
    
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    k_impact: float = 0.0
    i_impact: float = 0.0
    r_impact: float = 0.0
    
    new_k: float
    new_i: float
    new_r: float
    
    duration_ms: int


# ═══════════════════════════════════════════════════════════════════════════════
# 대시보드
# ═══════════════════════════════════════════════════════════════════════════════

class TaskSummary(BaseModel):
    """업무 요약"""
    total_tasks: int
    active_tasks: int
    decaying_tasks: int
    eliminated_tasks: int
    
    avg_k: float
    avg_i: float
    avg_r: float
    
    layer_breakdown: Dict[str, int]
    category_breakdown: Dict[str, int]


class PersonalizationRecommendation(BaseModel):
    """개인화 추천"""
    task_id: str
    task_name: str
    current_status: TaskStatus
    
    recommendation_type: str  # 'increase_automation', 'decrease_automation', 'eliminate', 'enhance'
    reason: str
    
    current_k: float
    current_i: float
    current_r: float
    
    expected_k_change: float
    expected_energy_saving: float
