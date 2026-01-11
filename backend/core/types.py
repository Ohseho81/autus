"""
═══════════════════════════════════════════════════════════════════════════════
🌌 AUTUS v2.1 - Core Type Definitions
═══════════════════════════════════════════════════════════════════════════════
"""

from typing import TypedDict, List, Optional, Dict, Any, Literal
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ENUMS
# ═══════════════════════════════════════════════════════════════════════════════

class LayerId(str, Enum):
    L1 = "L1"  # 재무
    L2 = "L2"  # 생체
    L3 = "L3"  # 운영
    L4 = "L4"  # 고객
    L5 = "L5"  # 외부

class NodeState(str, Enum):
    IGNORABLE = "IGNORABLE"
    PRESSURING = "PRESSURING"
    IRREVERSIBLE = "IRREVERSIBLE"

class MissionType(str, Enum):
    AUTO = "자동화"
    OUTSOURCE = "외주"
    DELEGATE = "지시"

class MissionStatus(str, Enum):
    CREATED = "created"
    ACTIVE = "active"
    DONE = "done"
    IGNORED = "ignored"
    EXPIRED = "expired"
    REACTIVATED = "reactivated"

class CircuitId(str, Enum):
    SURVIVAL = "survival"
    FATIGUE = "fatigue"
    REPEAT = "repeat"
    PEOPLE = "people"
    GROWTH = "growth"

class AlertLevel(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    BOUNDARY = "boundary"
    REMINDER = "reminder"
    INFO = "info"

class DataSource(str, Enum):
    MANUAL = "manual"
    DEVICE = "device"
    OAUTH = "oauth"
    API = "api"
    WEBHOOK = "webhook"

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 NODE INTERFACES
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class NodeSpec:
    """노드 명세"""
    id: str
    name: str
    icon: str
    layer: LayerId
    unit: str
    desc: str
    ideal: float
    danger: float
    inverse: bool  # True면 낮을수록 위험
    data_source: List[DataSource] = field(default_factory=list)
    collection_interval: str = "1d"

@dataclass
class NodeHistory:
    """노드 히스토리"""
    timestamp: datetime
    value: float
    pressure: float
    state: NodeState
    source: DataSource

@dataclass
class Node:
    """노드 인스턴스"""
    spec: NodeSpec
    active: bool = True
    value: float = 0.0
    pressure: float = 0.0
    state: NodeState = NodeState.IGNORABLE
    trend: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)
    history: List[NodeHistory] = field(default_factory=list)
    
    @property
    def id(self) -> str:
        return self.spec.id
    
    @property
    def name(self) -> str:
        return self.spec.name
    
    @property
    def icon(self) -> str:
        return self.spec.icon

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 LAYER & CIRCUIT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class LayerSpec:
    """레이어 명세"""
    id: LayerId
    name: str
    icon: str
    color: str
    node_ids: List[str]
    desc: str

@dataclass
class CircuitSpec:
    """회로 명세"""
    id: CircuitId
    name: str
    name_kr: str
    icon: str
    node_ids: List[str]
    desc: str
    formula: str
    threshold: float

@dataclass
class Circuit:
    """회로 인스턴스"""
    spec: CircuitSpec
    value: float = 0.0
    state: NodeState = NodeState.IGNORABLE

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 INFLUENCE MATRIX
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class InfluenceLink:
    """노드 간 영향 링크"""
    source: str
    target: str
    weight: float  # -1 ~ +1
    delay: int = 0  # 시간 (일)
    desc: str = ""

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 MISSION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class MissionStep:
    """미션 단계"""
    id: str
    title: str
    completed: bool = False
    completed_at: Optional[datetime] = None

@dataclass
class Mission:
    """미션"""
    id: str
    node_id: str
    type: MissionType
    title: str
    desc: str = ""
    status: MissionStatus = MissionStatus.CREATED
    steps: List[MissionStep] = field(default_factory=list)
    progress: int = 0
    eta: datetime = field(default_factory=datetime.now)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
    assignee: str = ""
    estimated_cost: int = 0

@dataclass
class MissionTemplate:
    """미션 템플릿"""
    node_id: str
    type: MissionType
    title: str
    desc: str
    steps: List[str]
    eta_days: int
    condition: str = ""
    estimated_cost: int = 0
    assignee_role: str = ""

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ALERT
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Alert:
    """알림"""
    id: str
    level: AlertLevel
    node_id: Optional[str] = None
    mission_id: Optional[str] = None
    title: str = ""
    message: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    read_at: Optional[datetime] = None
    action_taken: str = ""

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Identity:
    """사용자 정체성"""
    type: str = "창업자"  # 창업자, 프리랜서, 직장인, 학생, 기타
    stage: str = "초기"   # 초기, 성장기, 안정기, 전환기
    industry: str = "테크"

@dataclass
class BoundaryLimit:
    """경계 제한"""
    node_id: str
    operator: str  # >, <, >=, <=
    value: float
    desc: str

@dataclass
class Boundaries:
    """경계 설정"""
    never: List[str] = field(default_factory=list)
    limits: List[BoundaryLimit] = field(default_factory=list)

@dataclass
class Settings:
    """설정"""
    goal: str = ""
    goal_months: int = 12
    identity: Identity = field(default_factory=Identity)
    values: List[str] = field(default_factory=list)
    boundaries: Boundaries = field(default_factory=Boundaries)
    daily_limit: int = 3
    auto_level: int = 2
    quiet_hours: Dict[str, str] = field(default_factory=lambda: {"start": "22:00", "end": "08:00"})
    active_nodes: List[str] = field(default_factory=list)

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SYSTEM STATS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SystemStats:
    """시스템 통계"""
    equilibrium: float = 0.0
    stability: float = 1.0
    danger_count: int = 0
    active_missions: int = 0
    last_calculated: datetime = field(default_factory=datetime.now)

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 SIMULATION
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class NodeChange:
    """노드 변경"""
    node_id: str
    change_type: str  # absolute, relative, percent
    value: float

@dataclass
class SimulationScenario:
    """시뮬레이션 시나리오"""
    id: str
    name: str
    changes: List[NodeChange]
    observe: List[str]

@dataclass
class NodeImpact:
    """노드 영향"""
    node_id: str
    original_pressure: float
    new_pressure: float
    original_state: NodeState
    new_state: NodeState
    propagation_depth: int = 0

@dataclass
class CircuitImpact:
    """회로 영향"""
    circuit_id: CircuitId
    original_value: float
    new_value: float
    original_state: NodeState
    new_state: NodeState

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario: SimulationScenario
    impacts: List[NodeImpact]
    circuit_impacts: List[CircuitImpact]
    warnings: List[str]
