"""
═══════════════════════════════════════════════════════════════════════════════
🎯 AUTUS v3.0 - Unified Engine
═══════════════════════════════════════════════════════════════════════════════

"무슨 존재가 될지는 당신이 정한다.
 그 존재를 유지하는 일은 우리가 한다."

통합 파이프라인:
┌─────────────────────────────────────────────────────────────────────────────┐
│  [입력] → [ERT 분류] → [전략 결정] → [노드 영향] → [압력 전파] → [Top-1 경고] │
└─────────────────────────────────────────────────────────────────────────────┘
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Tuple
from datetime import datetime
import copy

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

Entity = Literal['CASH', 'PEOPLE', 'KNOWLEDGE', 'TIME', 'ENERGY', 'ASSET',
                 'HEALTH', 'RELATION', 'MARKET', 'RISK', 'SPACE', 'DATA']

Relation = Literal['OWN', 'DEPEND', 'EXCHANGE', 'COOPERATE', 'COMPETE', 'INFLUENCE']

TimeType = Literal['POINT', 'DURATION', 'FREQUENCY', 'SEQUENCE']

WorkStrategy = Literal['DELETE', 'AUTOMATE', 'PARALLELIZE', 'HUMANIZE']

NodeState = Literal['STABLE', 'MONITORING', 'PRESSURING', 'IRREVERSIBLE', 'CRITICAL']

NodeLayer = Literal['FINANCIAL', 'BIOMETRIC', 'OPERATIONAL', 'CUSTOMER', 'EXTERNAL']

EdgeType = Literal['DEPENDENCY', 'BUFFER', 'SUBSTITUTION', 'AMPLIFY']


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 노드 정의 (36개)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Node:
    """노드 정의"""
    id: str
    name: str
    name_ko: str
    layer: NodeLayer
    pressure: float = 0.2
    state: NodeState = 'STABLE'
    entropy_rate: float = 0.01
    mass: float = 1.0
    linked_entities: List[Entity] = field(default_factory=list)


def _create_nodes() -> Dict[str, Node]:
    """36개 노드 생성"""
    return {
        # FINANCIAL (8)
        'n01': Node('n01', 'Cash', '현금', 'FINANCIAL', 0.2, 'STABLE', 0.01, 1.5, ['CASH']),
        'n02': Node('n02', 'CashFlow', '현금흐름', 'FINANCIAL', 0.2, 'STABLE', 0.008, 1.2, ['CASH']),
        'n03': Node('n03', 'Runway', '런웨이', 'FINANCIAL', 0.2, 'STABLE', 0.015, 2.0, ['CASH', 'TIME']),
        'n04': Node('n04', 'Revenue', '매출', 'FINANCIAL', 0.2, 'STABLE', 0.005, 1.8, ['CASH', 'MARKET']),
        'n05': Node('n05', 'Debt', '부채', 'FINANCIAL', 0.2, 'STABLE', 0.012, 2.5, ['CASH']),
        'n06': Node('n06', 'Investment', '투자', 'FINANCIAL', 0.2, 'STABLE', 0.003, 1.0, ['ASSET']),
        'n07': Node('n07', 'Receivables', '미수금', 'FINANCIAL', 0.2, 'STABLE', 0.008, 1.3, ['CASH']),
        'n08': Node('n08', 'Reserve', '예비비', 'FINANCIAL', 0.2, 'STABLE', 0.002, 0.8, ['CASH']),
        
        # BIOMETRIC (7)
        'n09': Node('n09', 'Sleep', '수면', 'BIOMETRIC', 0.2, 'STABLE', 0.02, 1.0, ['HEALTH', 'ENERGY']),
        'n10': Node('n10', 'HRV', 'HRV', 'BIOMETRIC', 0.2, 'STABLE', 0.015, 1.2, ['HEALTH']),
        'n11': Node('n11', 'Activity', '활동량', 'BIOMETRIC', 0.2, 'STABLE', 0.01, 0.8, ['ENERGY']),
        'n12': Node('n12', 'Focus', '집중시간', 'BIOMETRIC', 0.2, 'STABLE', 0.018, 1.0, ['ENERGY', 'TIME']),
        'n13': Node('n13', 'Rest', '휴식', 'BIOMETRIC', 0.2, 'STABLE', 0.015, 0.7, ['ENERGY']),
        'n14': Node('n14', 'SickDays', '병가', 'BIOMETRIC', 0.2, 'STABLE', 0.005, 1.5, ['HEALTH']),
        'n15': Node('n15', 'Stress', '스트레스', 'BIOMETRIC', 0.2, 'STABLE', 0.02, 1.3, ['HEALTH', 'ENERGY']),
        
        # OPERATIONAL (8)
        'n16': Node('n16', 'Deadline', '마감', 'OPERATIONAL', 0.2, 'STABLE', 0.01, 1.2, ['TIME']),
        'n17': Node('n17', 'Delay', '지연', 'OPERATIONAL', 0.2, 'STABLE', 0.012, 1.5, ['TIME']),
        'n18': Node('n18', 'Utilization', '가동률', 'OPERATIONAL', 0.2, 'STABLE', 0.008, 1.0, ['ASSET']),
        'n19': Node('n19', 'TaskCompletion', '태스크', 'OPERATIONAL', 0.2, 'STABLE', 0.01, 1.1, ['TIME', 'KNOWLEDGE']),
        'n20': Node('n20', 'ErrorRate', '오류율', 'OPERATIONAL', 0.2, 'STABLE', 0.008, 1.3, ['DATA']),
        'n21': Node('n21', 'Speed', '처리속도', 'OPERATIONAL', 0.2, 'STABLE', 0.006, 1.0, ['TIME']),
        'n22': Node('n22', 'Inventory', '재고', 'OPERATIONAL', 0.2, 'STABLE', 0.005, 1.2, ['ASSET', 'SPACE']),
        'n23': Node('n23', 'Dependency', '의존도', 'OPERATIONAL', 0.2, 'STABLE', 0.004, 2.0, ['RISK']),
        
        # CUSTOMER (7)
        'n24': Node('n24', 'CustomerCount', '고객수', 'CUSTOMER', 0.2, 'STABLE', 0.005, 1.5, ['MARKET', 'PEOPLE']),
        'n25': Node('n25', 'Churn', '이탈률', 'CUSTOMER', 0.2, 'STABLE', 0.01, 1.3, ['MARKET', 'RELATION']),
        'n26': Node('n26', 'NPS', 'NPS', 'CUSTOMER', 0.2, 'STABLE', 0.003, 1.8, ['RELATION']),
        'n27': Node('n27', 'RepeatRate', '재구매', 'CUSTOMER', 0.2, 'STABLE', 0.004, 1.4, ['MARKET']),
        'n28': Node('n28', 'CAC', 'CAC', 'CUSTOMER', 0.2, 'STABLE', 0.006, 1.2, ['CASH', 'MARKET']),
        'n29': Node('n29', 'LTV', 'LTV', 'CUSTOMER', 0.2, 'STABLE', 0.004, 1.6, ['CASH', 'MARKET']),
        'n30': Node('n30', 'KeyCustomer', '주요고객', 'CUSTOMER', 0.2, 'STABLE', 0.005, 2.2, ['RISK', 'RELATION']),
        
        # EXTERNAL (6)
        'n31': Node('n31', 'MarketVolatility', '시장변동', 'EXTERNAL', 0.2, 'STABLE', 0.003, 2.5, ['MARKET', 'RISK']),
        'n32': Node('n32', 'Regulation', '규제', 'EXTERNAL', 0.2, 'STABLE', 0.002, 3.0, ['RISK']),
        'n33': Node('n33', 'SupplyChain', '공급망', 'EXTERNAL', 0.2, 'STABLE', 0.004, 2.0, ['ASSET', 'RISK']),
        'n34': Node('n34', 'DisasterPrep', '재난대비', 'EXTERNAL', 0.2, 'STABLE', 0.001, 2.5, ['RISK']),
        'n35': Node('n35', 'Competition', '경쟁', 'EXTERNAL', 0.2, 'STABLE', 0.005, 1.8, ['MARKET']),
        'n36': Node('n36', 'TippingPoint', '티핑포인트', 'EXTERNAL', 0.2, 'STABLE', 0.008, 3.0, ['RISK']),
    }


NODES = _create_nodes()
NODE_LIST = list(NODES.values())


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 엣지 정의 (압력 전파)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Edge:
    """엣지 정의"""
    from_node: str
    to_node: str
    edge_type: EdgeType
    weight: float
    conductivity: float


EDGES: List[Edge] = [
    # 재무 내부
    Edge('n01', 'n03', 'DEPENDENCY', 0.9, 0.95),
    Edge('n02', 'n01', 'DEPENDENCY', 0.85, 0.9),
    Edge('n08', 'n01', 'BUFFER', 0.7, 0.6),
    Edge('n05', 'n03', 'DEPENDENCY', 0.8, 0.85),
    Edge('n04', 'n02', 'DEPENDENCY', 0.85, 0.9),
    Edge('n07', 'n01', 'DEPENDENCY', 0.7, 0.8),
    
    # 재무 ↔ 신체
    Edge('n03', 'n15', 'AMPLIFY', 0.75, 0.8),
    Edge('n05', 'n15', 'AMPLIFY', 0.7, 0.75),
    Edge('n01', 'n09', 'DEPENDENCY', 0.5, 0.4),
    Edge('n15', 'n10', 'AMPLIFY', 0.8, 0.85),
    Edge('n09', 'n15', 'BUFFER', 0.6, 0.5),
    
    # 신체 ↔ 업무
    Edge('n15', 'n20', 'AMPLIFY', 0.65, 0.7),
    Edge('n10', 'n21', 'DEPENDENCY', 0.55, 0.6),
    Edge('n12', 'n20', 'AMPLIFY', 0.7, 0.75),
    Edge('n09', 'n19', 'DEPENDENCY', 0.6, 0.65),
    Edge('n13', 'n12', 'BUFFER', 0.5, 0.55),
    
    # 업무 ↔ 고객
    Edge('n20', 'n25', 'DEPENDENCY', 0.7, 0.75),
    Edge('n17', 'n26', 'DEPENDENCY', 0.65, 0.7),
    Edge('n16', 'n27', 'DEPENDENCY', 0.6, 0.65),
    Edge('n25', 'n04', 'AMPLIFY', 0.8, 0.85),
    Edge('n30', 'n04', 'AMPLIFY', 0.75, 0.8),
    
    # 외부 → 전체
    Edge('n31', 'n06', 'DEPENDENCY', 0.6, 0.65),
    Edge('n32', 'n05', 'DEPENDENCY', 0.5, 0.55),
    Edge('n33', 'n22', 'DEPENDENCY', 0.7, 0.75),
    Edge('n35', 'n04', 'AMPLIFY', 0.6, 0.65),
    Edge('n36', 'n03', 'AMPLIFY', 0.85, 0.9),
    
    # 대체/완충
    Edge('n06', 'n01', 'SUBSTITUTION', 0.5, 0.4),
    Edge('n29', 'n28', 'SUBSTITUTION', 0.6, 0.5),
    Edge('n34', 'n36', 'BUFFER', 0.55, 0.5),
]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 ERT → 노드 매핑
# ═══════════════════════════════════════════════════════════════════════════════

ENTITY_NODE_MAP: Dict[Entity, List[str]] = {
    'CASH': ['n01', 'n02', 'n03', 'n05', 'n07', 'n08', 'n28', 'n29'],
    'PEOPLE': ['n24', 'n26', 'n30'],
    'KNOWLEDGE': ['n19', 'n20'],
    'TIME': ['n03', 'n12', 'n16', 'n17', 'n19', 'n21'],
    'ENERGY': ['n09', 'n11', 'n12', 'n13', 'n15'],
    'ASSET': ['n06', 'n18', 'n22', 'n33'],
    'HEALTH': ['n09', 'n10', 'n14', 'n15'],
    'RELATION': ['n25', 'n26', 'n30'],
    'MARKET': ['n04', 'n24', 'n25', 'n27', 'n28', 'n29', 'n31', 'n35'],
    'RISK': ['n23', 'n30', 'n31', 'n32', 'n33', 'n34', 'n36'],
    'SPACE': ['n22'],
    'DATA': ['n19', 'n20'],
}

RELATION_AFFINITY: Dict[Relation, Dict[str, float]] = {
    'OWN': {'auto': 0.9, 'parallel': 0.3, 'delete': 0.2},
    'DEPEND': {'auto': 0.8, 'parallel': 0.4, 'delete': 0.5},
    'EXCHANGE': {'auto': 0.95, 'parallel': 0.6, 'delete': 0.3},
    'COOPERATE': {'auto': 0.4, 'parallel': 0.9, 'delete': 0.2},
    'COMPETE': {'auto': 0.5, 'parallel': 0.7, 'delete': 0.4},
    'INFLUENCE': {'auto': 0.3, 'parallel': 0.5, 'delete': 0.6},
}

TIME_AFFINITY: Dict[TimeType, Dict[str, float]] = {
    'POINT': {'auto': 0.7, 'parallel': 0.3, 'delete': 0.4},
    'DURATION': {'auto': 0.5, 'parallel': 0.9, 'delete': 0.3},
    'FREQUENCY': {'auto': 0.95, 'parallel': 0.4, 'delete': 0.6},
    'SEQUENCE': {'auto': 0.85, 'parallel': 0.3, 'delete': 0.5},
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Work:
    """업무 정의"""
    id: str
    title: str
    
    # ERT 분류
    entity: Entity
    relation: Relation
    time: TimeType
    
    # 사용자 변수
    pressure: float = 0.5
    mass: float = 1.0
    entropy: float = 0.3
    weight: float = 0.5
    
    # 상태
    status: str = 'pending'  # pending, proposed, accepted, executed
    strategy: Optional[WorkStrategy] = None


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 전략 결정 결과
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class NodeImpact:
    """노드 영향"""
    node_id: str
    delta: float


@dataclass
class DecisionResult:
    """전략 결정 결과"""
    strategy: WorkStrategy
    confidence: float
    reasons: List[str]
    node_impact: List[NodeImpact]
    time_saved: int
    energy_saved: float


@dataclass
class ProcessedWork:
    """처리된 업무"""
    work: Work
    strategy: WorkStrategy
    confidence: float
    node_impact: List[NodeImpact]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 경고 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TopAlert:
    """Top-1 경고"""
    node_id: str
    pressure: float
    state: NodeState
    message: str


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통계
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AutusStats:
    """통계"""
    cycle_count: int = 0
    works_processed: int = 0
    deleted: int = 0
    automated: int = 0
    parallelized: int = 0
    humanized: int = 0
    time_saved: int = 0
    energy_saved: float = 0.0


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통합 상태
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class AutusState:
    """AUTUS 통합 상태"""
    nodes: Dict[str, Node]
    work_queue: List[Work]
    processed: List[ProcessedWork]
    top_alert: Optional[TopAlert]
    stats: AutusStats
    last_update: datetime


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 헬퍼 함수
# ═══════════════════════════════════════════════════════════════════════════════

def get_state_from_pressure(p: float) -> NodeState:
    """압력에서 상태 결정"""
    if p >= 0.9:
        return 'CRITICAL'
    elif p >= 0.78:
        return 'IRREVERSIBLE'
    elif p >= 0.5:
        return 'PRESSURING'
    elif p >= 0.3:
        return 'MONITORING'
    return 'STABLE'


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 상태 생성
# ═══════════════════════════════════════════════════════════════════════════════

def create_state(initial_pressures: Optional[Dict[str, float]] = None) -> AutusState:
    """초기 상태 생성"""
    nodes = copy.deepcopy(NODES)
    
    # 초기 압력 적용
    if initial_pressures:
        for node_id, p in initial_pressures.items():
            if node_id in nodes:
                nodes[node_id].pressure = p
                nodes[node_id].state = get_state_from_pressure(p)
    
    return AutusState(
        nodes=nodes,
        work_queue=[],
        processed=[],
        top_alert=None,
        stats=AutusStats(),
        last_update=datetime.now(),
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 추가
# ═══════════════════════════════════════════════════════════════════════════════

_work_counter = 0


def add_work(
    state: AutusState,
    title: str,
    entity: Entity,
    relation: Relation,
    time: TimeType,
    pressure: float = 0.5,
    mass: float = 1.0,
    entropy: float = 0.3,
    weight: float = 0.5,
) -> AutusState:
    """업무 추가"""
    global _work_counter
    _work_counter += 1
    
    work = Work(
        id=f'w{_work_counter}',
        title=title,
        entity=entity,
        relation=relation,
        time=time,
        pressure=pressure,
        mass=mass,
        entropy=entropy,
        weight=weight,
    )
    
    new_state = copy.deepcopy(state)
    new_state.work_queue.append(work)
    return new_state


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 전략 결정
# ═══════════════════════════════════════════════════════════════════════════════

def decide_strategy(work: Work, nodes: Dict[str, Node]) -> DecisionResult:
    """업무 전략 결정"""
    r = RELATION_AFFINITY[work.relation]
    t = TIME_AFFINITY[work.time]
    
    # 점수 계산
    auto_score = (r['auto'] + t['auto']) / 2
    parallel_score = (r['parallel'] + t['parallel']) / 2
    delete_score = (r['delete'] + t['delete']) / 2
    human_score = 1 - max(auto_score, delete_score) * 0.8
    
    reasons: List[str] = []
    
    # 사용자 변수 기반 조정
    if work.weight <= 0.2:
        delete_score *= 1.5
        reasons.append(f'연결 약함(W={work.weight:.2f}) → 삭제 권장')
    if work.pressure <= 0.1:
        delete_score *= 1.3
        reasons.append(f'압력 낮음(P={work.pressure:.2f}) → 불필요')
    if work.entropy >= 0.5:
        auto_score *= 1.4
        reasons.append(f'엔트로피 높음(ε={work.entropy:.2f}) → 자동화 필요')
    if work.mass >= 2.0:
        parallel_score *= 1.3
        reasons.append(f'질량 높음(M={work.mass:.2f}) → 분산 필요')
    
    # 관련 노드 압력 확인
    related_nodes = ENTITY_NODE_MAP.get(work.entity, [])
    if related_nodes:
        avg_pressure = sum(nodes[nid].pressure for nid in related_nodes if nid in nodes) / len(related_nodes)
        if avg_pressure >= 0.6:
            auto_score *= 1.3
            reasons.append(f'관련 노드 압력 높음({avg_pressure*100:.0f}%) → 자동화 우선')
    
    # 최종 전략 결정
    scores = {
        'DELETE': delete_score,
        'AUTOMATE': auto_score,
        'PARALLELIZE': parallel_score,
        'HUMANIZE': human_score,
    }
    
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    strategy = sorted_scores[0][0]
    max_score = sorted_scores[0][1]
    
    # 신뢰도
    confidence = min(max_score / (sorted_scores[1][1] + 0.1), 1.0)
    
    # 노드 영향 계산
    node_impact = []
    for node_id in related_nodes:
        if node_id in nodes:
            delta = -0.05 if strategy == 'DELETE' else \
                    -0.03 if strategy == 'AUTOMATE' else \
                    -0.02 if strategy == 'PARALLELIZE' else 0.01
            node_impact.append(NodeImpact(node_id=node_id, delta=delta))
    
    # 시간/에너지 절약
    time_saved = {'DELETE': 60, 'AUTOMATE': 45, 'PARALLELIZE': 30, 'HUMANIZE': 10}[strategy]
    energy_saved = {'DELETE': 0.05, 'AUTOMATE': 0.03, 'PARALLELIZE': 0.02, 'HUMANIZE': 0.01}[strategy]
    
    if not reasons:
        reasons.append(f'ERT 기본 전략: {work.entity} × {work.relation} × {work.time}')
    
    return DecisionResult(
        strategy=strategy,
        confidence=confidence,
        reasons=reasons,
        node_impact=node_impact,
        time_saved=time_saved,
        energy_saved=energy_saved,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 처리
# ═══════════════════════════════════════════════════════════════════════════════

def process_work(state: AutusState, work_id: str) -> AutusState:
    """단일 업무 처리"""
    work = next((w for w in state.work_queue if w.id == work_id), None)
    if not work:
        return state
    
    new_state = copy.deepcopy(state)
    decision = decide_strategy(work, new_state.nodes)
    
    # 노드 영향 적용
    for impact in decision.node_impact:
        if impact.node_id in new_state.nodes:
            node = new_state.nodes[impact.node_id]
            new_p = max(0, min(1, node.pressure + impact.delta))
            node.pressure = new_p
            node.state = get_state_from_pressure(new_p)
    
    # 업무 상태 업데이트
    work.status = 'executed'
    work.strategy = decision.strategy
    
    # 큐에서 제거 및 처리 기록 추가
    new_state.work_queue = [w for w in new_state.work_queue if w.id != work_id]
    new_state.processed.append(ProcessedWork(
        work=work,
        strategy=decision.strategy,
        confidence=decision.confidence,
        node_impact=decision.node_impact,
    ))
    
    # 통계 업데이트
    new_state.stats.works_processed += 1
    new_state.stats.time_saved += decision.time_saved
    new_state.stats.energy_saved += decision.energy_saved
    
    if decision.strategy == 'DELETE':
        new_state.stats.deleted += 1
    elif decision.strategy == 'AUTOMATE':
        new_state.stats.automated += 1
    elif decision.strategy == 'PARALLELIZE':
        new_state.stats.parallelized += 1
    elif decision.strategy == 'HUMANIZE':
        new_state.stats.humanized += 1
    
    new_state.last_update = datetime.now()
    return new_state


def process_all_works(state: AutusState) -> AutusState:
    """모든 대기 업무 처리"""
    current = copy.deepcopy(state)
    
    while current.work_queue:
        work = current.work_queue[0]
        current = process_work(current, work.id)
    
    return current


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 압력 전파 사이클
# ═══════════════════════════════════════════════════════════════════════════════

def run_cycle(state: AutusState) -> AutusState:
    """압력 전파 사이클"""
    new_state = copy.deepcopy(state)
    nodes = new_state.nodes
    deltas: Dict[str, float] = {nid: 0.0 for nid in nodes}
    
    # 엣지별 압력 전파
    for edge in EDGES:
        from_node = nodes.get(edge.from_node)
        to_node = nodes.get(edge.to_node)
        if not from_node or not to_node:
            continue
        
        from_p = from_node.pressure
        to_p = to_node.pressure
        
        delta = 0.0
        if edge.edge_type == 'DEPENDENCY':
            delta = edge.weight * edge.conductivity * (from_p - to_p)
        elif edge.edge_type == 'BUFFER':
            delta = -min(to_p, 0.3) * edge.weight * edge.conductivity
        elif edge.edge_type == 'SUBSTITUTION':
            delta = -max(0, 1 - from_p) * to_p * edge.weight * 0.5
        elif edge.edge_type == 'AMPLIFY':
            delta = edge.weight * edge.conductivity * from_p * to_p
        
        deltas[edge.to_node] += delta
    
    # 엔트로피 자연 증가
    for node in nodes.values():
        deltas[node.id] += node.entropy_rate
    
    # 새 압력 적용
    for node_id, node in nodes.items():
        new_p = max(0, min(1, node.pressure + deltas[node_id]))
        node.pressure = new_p
        node.state = get_state_from_pressure(new_p)
    
    # Top-1 경고 갱신
    sorted_nodes = sorted(nodes.values(), key=lambda n: n.pressure, reverse=True)
    top = sorted_nodes[0]
    
    if top.pressure >= 0.5:
        new_state.top_alert = TopAlert(
            node_id=top.id,
            pressure=top.pressure,
            state=top.state,
            message=_generate_alert_message(top),
        )
    else:
        new_state.top_alert = None
    
    new_state.stats.cycle_count += 1
    new_state.last_update = datetime.now()
    return new_state


def _generate_alert_message(node: Node) -> str:
    """경고 메시지 생성"""
    p = node.pressure * 100
    if node.state == 'CRITICAL':
        return f'⚠️ {node.name_ko} 긴급 ({p:.0f}%) - 즉시 조치'
    elif node.state == 'IRREVERSIBLE':
        return f'⚠️ {node.name_ko} 위험 ({p:.0f}%) - 비가역적'
    return f'{node.name_ko} 압력 ({p:.0f}%)'


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 자동 사이클
# ═══════════════════════════════════════════════════════════════════════════════

def run_autonomous_cycle(state: AutusState) -> AutusState:
    """자동 사이클 (업무 처리 + 압력 전파)"""
    # 1. 모든 대기 업무 처리
    current = process_all_works(state)
    
    # 2. 압력 전파
    current = run_cycle(current)
    
    return current


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 출력 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_output(state: AutusState) -> str:
    """출력 생성"""
    nodes = state.nodes
    stats = state.stats
    top_alert = state.top_alert
    
    # 계층별 평균
    layers: Dict[NodeLayer, List[float]] = {
        'FINANCIAL': [], 'BIOMETRIC': [], 'OPERATIONAL': [], 'CUSTOMER': [], 'EXTERNAL': []
    }
    for node in nodes.values():
        layers[node.layer].append(node.pressure)
    
    layer_avg: Dict[NodeLayer, float] = {}
    for layer, pressures in layers.items():
        layer_avg[layer] = sum(pressures) / len(pressures) if pressures else 0
    
    # 상태 카운트
    stable = warning = danger = 0
    for node in nodes.values():
        if node.state in ['STABLE', 'MONITORING']:
            stable += 1
        elif node.state == 'PRESSURING':
            warning += 1
        else:
            danger += 1
    
    def bar(v: float) -> str:
        w = 20
        f = int(v * w)
        c = '█' if v >= 0.78 else '▓' if v >= 0.5 else '▒' if v >= 0.3 else '░'
        return c * f + '░' * (w - f)
    
    health = '🔴 CRITICAL' if danger > 0 else \
             '🟠 DANGER' if warning > 3 else \
             '🟡 WARNING' if warning > 0 else '🟢 HEALTHY'
    
    output = f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 AUTUS v3.0 Unified Engine                                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 시스템: {health:20}  사이클: {stats.cycle_count:>5}                                   ║
║                                                                               ║
║ 36노드: 안정 {stable:>2}개 | 경고 {warning:>2}개 | 위험 {danger:>2}개                                     ║
╠───────────────────────────────────────────────────────────────────────────────╣
║ 계층별 압력                                                                   ║
║   FINANCIAL   [{bar(layer_avg['FINANCIAL'])}] {layer_avg['FINANCIAL']*100:>3.0f}%                      ║
║   BIOMETRIC   [{bar(layer_avg['BIOMETRIC'])}] {layer_avg['BIOMETRIC']*100:>3.0f}%                      ║
║   OPERATIONAL [{bar(layer_avg['OPERATIONAL'])}] {layer_avg['OPERATIONAL']*100:>3.0f}%                      ║
║   CUSTOMER    [{bar(layer_avg['CUSTOMER'])}] {layer_avg['CUSTOMER']*100:>3.0f}%                      ║
║   EXTERNAL    [{bar(layer_avg['EXTERNAL'])}] {layer_avg['EXTERNAL']*100:>3.0f}%                      ║"""

    if top_alert:
        output += f"""
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚠️  TOP-1 경고: {top_alert.message:55}  ║"""

    output += f"""
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 📊 업무 처리 통계                                                             ║
║   처리: {stats.works_processed:>3}개  삭제: {stats.deleted:>3}개  자동화: {stats.automated:>3}개  병렬: {stats.parallelized:>3}개  인간: {stats.humanized:>3}개            ║
║   시간 절약: {stats.time_saved:>4}분  에너지 보존: {stats.energy_saved*100:>5.1f}%                                        ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."        ║
╚═══════════════════════════════════════════════════════════════════════════════╝"""

    return output


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 예시 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_example() -> str:
    """예시 실행"""
    # 초기 상태 (현금 위기 시뮬레이션)
    state = create_state({
        'n01': 0.8,   # 현금 위기
        'n03': 0.7,   # 런웨이 압박
        'n15': 0.5,   # 스트레스 상승
    })
    
    # 업무 추가
    state = add_work(state, '일일 잔고 확인', 'CASH', 'OWN', 'FREQUENCY', weight=0.1, pressure=0.1)
    state = add_work(state, '청구서 처리', 'CASH', 'EXCHANGE', 'SEQUENCE', entropy=0.4)
    state = add_work(state, '팀 프로젝트', 'PEOPLE', 'COOPERATE', 'DURATION', mass=2.5)
    state = add_work(state, '투자자 미팅', 'PEOPLE', 'INFLUENCE', 'POINT', pressure=0.8)
    state = add_work(state, '경쟁사 분석', 'MARKET', 'COMPETE', 'FREQUENCY', entropy=0.3)
    
    # 3 사이클 실행
    for _ in range(3):
        state = run_autonomous_cycle(state)
    
    return generate_output(state)
