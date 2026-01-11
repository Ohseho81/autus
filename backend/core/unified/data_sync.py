"""
═══════════════════════════════════════════════════════════════════════════════
📡 AUTUS v3.0 - Data Sync Layer
═══════════════════════════════════════════════════════════════════════════════

36개 노드와 실제 데이터 소스의 동기화

데이터 흐름:
┌─────────────────────────────────────────────────────────────────────────────┐
│  [외부 API] → [Data Sync] → [압력 변환] → [노드 업데이트] → [경고]          │
└─────────────────────────────────────────────────────────────────────────────┘
"""

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Literal, Optional
from datetime import datetime
import random
import copy

from .engine import (
    AutusState, Node, NodeState,
    get_state_from_pressure, run_cycle,
)

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데이터 소스 타입
# ═══════════════════════════════════════════════════════════════════════════════

DataSourceType = Literal[
    'banking', 'accounting', 'wearable', 'calendar',
    'project', 'crm', 'analytics', 'market', 'manual'
]


@dataclass
class DataSource:
    """데이터 소스"""
    id: str
    source_type: DataSourceType
    name: str
    
    # 연결 정보
    api_endpoint: Optional[str] = None
    auth_method: str = 'none'  # oauth, apikey, none
    
    # 동기화
    sync_interval: int = 60  # 초
    last_sync: Optional[datetime] = None
    status: str = 'disconnected'  # connected, disconnected, error
    
    # 매핑 노드
    target_nodes: List[str] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 노드-데이터 매핑
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SourceMapping:
    """소스 매핑"""
    source_type: DataSourceType
    data_field: str
    transform: Callable[[Any], float]  # 0~1 압력으로 변환
    weight: float


@dataclass
class NodeDataMapping:
    """노드-데이터 매핑"""
    node_id: str
    sources: List[SourceMapping]


# 변환 함수들
def _cash_transform(v: float) -> float:
    return max(0, min(1, 1 - v / 10_000_000))  # 1천만원 기준

def _cashflow_transform(v: float) -> float:
    return max(0, min(1, v < 0 and 1 + v / 5_000_000 or 0.3 - v / 10_000_000))

def _runway_transform(v: float) -> float:
    if v < 3: return 1.0
    if v < 6: return 0.7
    if v < 12: return 0.4
    return 0.2

def _sleep_transform(v: float) -> float:
    if v < 5: return 1.0
    if v < 6: return 0.7
    if v < 7: return 0.4
    return 0.2

def _hrv_transform(v: float) -> float:
    if v < 20: return 1.0
    if v < 40: return 0.7
    if v < 60: return 0.4
    return 0.2

def _stress_transform(v: float) -> float:
    return max(0, min(1, v / 100))

def _meeting_transform(v: float) -> float:
    return max(0, min(1, 0.8 if v > 6 else v / 10))

def _compliance_transform(v: float) -> float:
    return max(0, min(1, 1 - v / 100))

def _delay_transform(v: float) -> float:
    return max(0, min(1, v / 30))

def _churn_transform(v: float) -> float:
    return max(0, min(1, v * 10))  # 10% = 1.0

def _nps_transform(v: float) -> float:
    return max(0, min(1, (50 - v) / 100 + 0.5))

def _volatility_transform(v: float) -> float:
    return max(0, min(1, v / 100))


NODE_DATA_MAPPINGS: List[NodeDataMapping] = [
    # FINANCIAL
    NodeDataMapping('n01', [
        SourceMapping('banking', 'balance', _cash_transform, 0.7),
        SourceMapping('accounting', 'cashPosition', _cash_transform, 0.3),
    ]),
    NodeDataMapping('n02', [
        SourceMapping('accounting', 'monthlyNetCashFlow', _cashflow_transform, 1.0),
    ]),
    NodeDataMapping('n03', [
        SourceMapping('accounting', 'runwayMonths', _runway_transform, 1.0),
    ]),
    
    # BIOMETRIC
    NodeDataMapping('n09', [
        SourceMapping('wearable', 'sleepHours', _sleep_transform, 1.0),
    ]),
    NodeDataMapping('n10', [
        SourceMapping('wearable', 'hrv', _hrv_transform, 1.0),
    ]),
    NodeDataMapping('n15', [
        SourceMapping('wearable', 'stressScore', _stress_transform, 0.6),
        SourceMapping('calendar', 'meetingHours', _meeting_transform, 0.4),
    ]),
    
    # OPERATIONAL
    NodeDataMapping('n16', [
        SourceMapping('project', 'deadlineComplianceRate', _compliance_transform, 1.0),
    ]),
    NodeDataMapping('n17', [
        SourceMapping('project', 'totalDelayDays', _delay_transform, 1.0),
    ]),
    NodeDataMapping('n19', [
        SourceMapping('project', 'taskCompletionRate', _compliance_transform, 1.0),
    ]),
    
    # CUSTOMER
    NodeDataMapping('n25', [
        SourceMapping('crm', 'monthlyChurnRate', _churn_transform, 1.0),
    ]),
    NodeDataMapping('n26', [
        SourceMapping('crm', 'npsScore', _nps_transform, 1.0),
    ]),
    
    # EXTERNAL
    NodeDataMapping('n31', [
        SourceMapping('market', 'volatilityIndex', _volatility_transform, 1.0),
    ]),
]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 동기화 결과
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class SourceContribution:
    """소스 기여"""
    source_type: DataSourceType
    value: Any
    contribution: float


@dataclass
class SyncResult:
    """동기화 결과"""
    node_id: str
    old_pressure: float
    new_pressure: float
    delta: float
    sources: List[SourceContribution]
    timestamp: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데이터 동기화 함수
# ═══════════════════════════════════════════════════════════════════════════════

def sync_node_data(
    node_id: str,
    raw_data: Dict[DataSourceType, Dict[str, Any]],
    current_pressure: float
) -> Optional[SyncResult]:
    """단일 노드 데이터 동기화"""
    mapping = next((m for m in NODE_DATA_MAPPINGS if m.node_id == node_id), None)
    if not mapping:
        return None
    
    total_weight = 0.0
    weighted_pressure = 0.0
    contributions: List[SourceContribution] = []
    
    for source in mapping.sources:
        data = raw_data.get(source.source_type)
        if not data or source.data_field not in data:
            continue
        
        value = data[source.data_field]
        pressure = source.transform(value)
        
        weighted_pressure += pressure * source.weight
        total_weight += source.weight
        
        contributions.append(SourceContribution(
            source_type=source.source_type,
            value=value,
            contribution=pressure * source.weight,
        ))
    
    if total_weight == 0:
        return None
    
    new_pressure = weighted_pressure / total_weight
    
    return SyncResult(
        node_id=node_id,
        old_pressure=current_pressure,
        new_pressure=new_pressure,
        delta=new_pressure - current_pressure,
        sources=contributions,
        timestamp=datetime.now(),
    )


def sync_all_nodes(
    state: AutusState,
    raw_data: Dict[DataSourceType, Dict[str, Any]]
) -> tuple[AutusState, List[SyncResult]]:
    """전체 노드 데이터 동기화"""
    results: List[SyncResult] = []
    new_state = copy.deepcopy(state)
    
    for mapping in NODE_DATA_MAPPINGS:
        node = new_state.nodes.get(mapping.node_id)
        if not node:
            continue
        
        result = sync_node_data(mapping.node_id, raw_data, node.pressure)
        if result:
            results.append(result)
            node.pressure = result.new_pressure
            node.state = get_state_from_pressure(result.new_pressure)
    
    new_state.last_update = datetime.now()
    return new_state, results


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 모의 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_mock_data() -> Dict[DataSourceType, Dict[str, Any]]:
    """모의 데이터 생성 (실제 환경에서는 API 호출)"""
    return {
        'banking': {
            'balance': 3_000_000 + random.random() * 2_000_000,
            'transactions': [],
        },
        'accounting': {
            'cashPosition': 2_500_000 + random.random() * 1_500_000,
            'monthlyNetCashFlow': -500_000 + random.random() * 1_000_000,
            'runwayMonths': 4 + random.random() * 8,
        },
        'wearable': {
            'sleepHours': 5 + random.random() * 3,
            'hrv': 30 + random.random() * 40,
            'stressScore': 30 + random.random() * 50,
            'steps': 3000 + random.random() * 7000,
        },
        'calendar': {
            'meetingHours': 2 + random.random() * 6,
            'freeTimeHours': 1 + random.random() * 4,
            'upcomingDeadlines': int(random.random() * 5),
        },
        'project': {
            'deadlineComplianceRate': 60 + random.random() * 40,
            'totalDelayDays': int(random.random() * 20),
            'taskCompletionRate': 50 + random.random() * 50,
            'activeProjects': 3 + int(random.random() * 5),
        },
        'crm': {
            'monthlyChurnRate': random.random() * 0.1,
            'npsScore': -20 + random.random() * 80,
            'activeCustomers': 100 + int(random.random() * 200),
            'newCustomers': int(random.random() * 20),
        },
        'analytics': {
            'pageViews': 1000 + int(random.random() * 5000),
            'conversionRate': 0.01 + random.random() * 0.05,
        },
        'market': {
            'volatilityIndex': 10 + random.random() * 40,
            'competitorActivity': random.random() * 100,
        },
        'manual': {},
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 자동 동기화 매니저
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AutoSyncConfig:
    """자동 동기화 설정"""
    interval_ms: int = 60000
    enabled_sources: List[DataSourceType] = field(default_factory=lambda: ['banking', 'wearable', 'project', 'crm'])
    on_sync: Optional[Callable[[List[SyncResult]], None]] = None
    on_alert: Optional[Callable[[Any], None]] = None


class AutoSyncManager:
    """자동 동기화 매니저"""
    
    def __init__(self, initial_state: AutusState, config: AutoSyncConfig):
        self.state = initial_state
        self.config = config
        self._running = False
    
    def sync_once(self) -> List[SyncResult]:
        """1회 동기화"""
        # 데이터 수집
        raw_data = generate_mock_data()
        
        # 동기화
        self.state, results = sync_all_nodes(self.state, raw_data)
        
        # 압력 전파
        self.state = run_cycle(self.state)
        
        # 콜백
        if self.config.on_sync:
            self.config.on_sync(results)
        
        if self.config.on_alert and self.state.top_alert:
            self.config.on_alert(self.state.top_alert)
        
        return results
    
    def get_state(self) -> AutusState:
        """현재 상태 반환"""
        return self.state


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 동기화 리포트
# ═══════════════════════════════════════════════════════════════════════════════

def generate_sync_report(results: List[SyncResult]) -> str:
    """동기화 리포트 생성"""
    if not results:
        return '동기화된 노드 없음'
    
    lines = [
        '╔═══════════════════════════════════════════════════════════════════════════════╗',
        '║ 📡 데이터 동기화 리포트                                                       ║',
        '╠═══════════════════════════════════════════════════════════════════════════════╣',
    ]
    
    for r in results:
        arrow = '↑' if r.delta > 0 else '↓' if r.delta < 0 else '→'
        color = '🔴' if r.delta > 0.1 else '🟡' if r.delta > 0 else '🟢'
        line = f'║ {color} {r.node_id} │ {r.old_pressure*100:>3.0f}% {arrow} {r.new_pressure*100:>3.0f}% │ Δ{r.delta*100:>+5.1f}%                          ║'
        lines.append(line)
    
    lines.append('╚═══════════════════════════════════════════════════════════════════════════════╝')
    
    return '\n'.join(lines)
