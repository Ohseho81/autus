"""
═══════════════════════════════════════════════════════════════════════════════
🌌 AUTUS v2.1 - Core Algorithms
═══════════════════════════════════════════════════════════════════════════════

압력 계산, 상태 결정, 통계, 회로값, 영향 전파 알고리즘
"""

import numpy as np
from typing import Dict, List, Tuple, Optional, Set
from datetime import datetime
from copy import deepcopy

from .types import (
    Node, NodeSpec, NodeState, NodeHistory, 
    Circuit, CircuitId, SystemStats,
    SimulationResult, SimulationScenario, NodeImpact, CircuitImpact,
    DataSource
)
from .nodes import ALL_NODES, DEFAULT_NODE_VALUES
from .circuits import CIRCUITS, INFLUENCE_MATRIX, get_outgoing_influences

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 압력 계산 (Pressure Calculation)
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_pressure(value: float, spec: NodeSpec) -> float:
    """
    노드 압력 계산
    pressure = (value - ideal) / (danger - ideal), clamped to [0, 1]
    """
    ideal = spec.ideal
    danger = spec.danger
    inverse = spec.inverse
    
    if inverse:
        # 낮을수록 위험 (예: 현금, 수면, 런웨이)
        if ideal == danger:
            return 0.5
        pressure = (ideal - value) / (ideal - danger)
    else:
        # 높을수록 위험 (예: 부채, 지출, 이탈률)
        if danger == ideal:
            return 0.5
        pressure = (value - ideal) / (danger - ideal)
    
    return float(np.clip(pressure, 0.0, 1.0))

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 상태 결정 (State Determination)
# ═══════════════════════════════════════════════════════════════════════════════

def determine_state(pressure: float) -> NodeState:
    """압력 기반 상태 결정"""
    if pressure >= 0.7:
        return NodeState.IRREVERSIBLE
    if pressure >= 0.3:
        return NodeState.PRESSURING
    return NodeState.IGNORABLE

def get_state_color(state: NodeState) -> str:
    """상태별 색상"""
    colors = {
        NodeState.IGNORABLE: "#00d46a",
        NodeState.PRESSURING: "#ffa500",
        NodeState.IRREVERSIBLE: "#ff3b3b",
    }
    return colors[state]

def get_pressure_color(pressure: float) -> str:
    """압력값 기반 색상"""
    if pressure >= 0.7:
        return "#ff3b3b"
    if pressure >= 0.5:
        return "#ff6b00"
    if pressure >= 0.3:
        return "#ffa500"
    if pressure >= 0.15:
        return "#c4e000"
    return "#00d46a"

def get_state_weight(state: NodeState) -> float:
    """상태 가중치 (Top-1 계산용)"""
    weights = {
        NodeState.IRREVERSIBLE: 1.5,
        NodeState.PRESSURING: 1.0,
        NodeState.IGNORABLE: 0.5,
    }
    return weights[state]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 노드 생성 및 업데이트
# ═══════════════════════════════════════════════════════════════════════════════

def create_node(spec: NodeSpec, value: Optional[float] = None) -> Node:
    """노드 스펙에서 Node 객체 생성"""
    node_value = value if value is not None else DEFAULT_NODE_VALUES.get(spec.id, spec.ideal)
    pressure = calculate_pressure(node_value, spec)
    state = determine_state(pressure)
    
    return Node(
        spec=spec,
        active=True,
        value=node_value,
        pressure=pressure,
        state=state,
        trend=0.0,
        last_updated=datetime.now(),
        history=[]
    )

def update_node_value(
    node: Node,
    new_value: float,
    source: DataSource = DataSource.MANUAL
) -> Node:
    """노드 값 업데이트"""
    spec = node.spec
    pressure = calculate_pressure(new_value, spec)
    state = determine_state(pressure)
    
    # 히스토리 추가
    history_entry = NodeHistory(
        timestamp=datetime.now(),
        value=new_value,
        pressure=pressure,
        state=state,
        source=source
    )
    
    # 최근 7일 히스토리만 유지
    history = node.history + [history_entry]
    history = history[-168:]  # 7일 × 24시간
    
    # 트렌드 계산
    trend = calculate_trend(history)
    
    return Node(
        spec=spec,
        active=node.active,
        value=new_value,
        pressure=pressure,
        state=state,
        trend=trend,
        last_updated=datetime.now(),
        history=history
    )

def calculate_trend(history: List[NodeHistory]) -> float:
    """트렌드 계산 (선형 회귀 기울기)"""
    if len(history) < 2:
        return 0.0
    
    # 최근 7일 데이터만 사용
    recent = history[-168:]
    n = len(recent)
    
    # 간단한 선형 회귀
    sum_x = sum(range(n))
    sum_y = sum(h.pressure for h in recent)
    sum_xy = sum(i * h.pressure for i, h in enumerate(recent))
    sum_x2 = sum(i * i for i in range(n))
    
    denominator = n * sum_x2 - sum_x * sum_x
    if abs(denominator) < 1e-10:
        return 0.0
    
    slope = (n * sum_xy - sum_x * sum_y) / denominator
    
    # 정규화 (-1 ~ +1)
    return float(np.clip(slope * 10, -1.0, 1.0))

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Top-1 추출
# ═══════════════════════════════════════════════════════════════════════════════

def get_top1_node(nodes: Dict[str, Node]) -> Optional[Node]:
    """가장 높은 압력의 노드 반환 (Top-1)"""
    active_nodes = [n for n in nodes.values() if n.active]
    if not active_nodes:
        return None
    
    return max(
        active_nodes,
        key=lambda n: n.pressure * get_state_weight(n.state)
    )

def get_top_n_nodes(nodes: Dict[str, Node], n: int = 5) -> List[Node]:
    """압력 순 정렬 (Top-N)"""
    active_nodes = [node for node in nodes.values() if node.active]
    sorted_nodes = sorted(
        active_nodes,
        key=lambda x: x.pressure * get_state_weight(x.state),
        reverse=True
    )
    return sorted_nodes[:n]

def get_danger_nodes(nodes: Dict[str, Node]) -> List[Node]:
    """위험 노드만 필터"""
    return [
        n for n in nodes.values()
        if n.active and n.state != NodeState.IGNORABLE
    ]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 통계 계산 (System Stats)
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_equilibrium(nodes: Dict[str, Node]) -> float:
    """평형점 계산 (활성 노드들의 평균 압력)"""
    active_nodes = [n for n in nodes.values() if n.active]
    if not active_nodes:
        return 0.0
    return sum(n.pressure for n in active_nodes) / len(active_nodes)

def calculate_stability(nodes: Dict[str, Node]) -> float:
    """안정성 계산 (1 - 위험 노드 비율)"""
    active_nodes = [n for n in nodes.values() if n.active]
    if not active_nodes:
        return 1.0
    
    danger_count = sum(1 for n in active_nodes if n.state != NodeState.IGNORABLE)
    return 1 - (danger_count / len(active_nodes))

def calculate_system_stats(
    nodes: Dict[str, Node],
    missions: List = None
) -> SystemStats:
    """시스템 통계 계산"""
    if missions is None:
        missions = []
    
    active_nodes = [n for n in nodes.values() if n.active]
    danger_count = sum(1 for n in active_nodes if n.state != NodeState.IGNORABLE)
    active_missions = sum(1 for m in missions if getattr(m, 'status', '') == 'active')
    
    return SystemStats(
        equilibrium=calculate_equilibrium(nodes),
        stability=calculate_stability(nodes),
        danger_count=danger_count,
        active_missions=active_missions,
        last_calculated=datetime.now()
    )

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 회로값 계산 (Circuit Value)
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_circuit_value(nodes: Dict[str, Node], circuit_spec) -> float:
    """단일 회로값 계산"""
    circuit_nodes = [
        nodes[nid] for nid in circuit_spec.node_ids
        if nid in nodes and nodes[nid].active
    ]
    
    if not circuit_nodes:
        return 0.0
    
    # 가중 평균 (체인 앞쪽 노드에 더 높은 가중치)
    weighted_sum = 0.0
    total_weight = 0.0
    
    for i, node in enumerate(circuit_nodes):
        weight = len(circuit_nodes) - i
        weighted_sum += node.pressure * weight
        total_weight += weight
    
    return weighted_sum / total_weight if total_weight > 0 else 0.0

def calculate_all_circuits(nodes: Dict[str, Node]) -> Dict[CircuitId, Circuit]:
    """모든 회로 계산"""
    result = {}
    
    for circuit_id, spec in CIRCUITS.items():
        value = calculate_circuit_value(nodes, spec)
        result[circuit_id] = Circuit(
            spec=spec,
            value=value,
            state=determine_state(value)
        )
    
    return result

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 영향 전파 (Influence Propagation)
# ═══════════════════════════════════════════════════════════════════════════════

def propagate_influence(
    nodes: Dict[str, Node],
    changed_node_id: str,
    delta: float,
    depth: int = 3,
    decay_factor: float = 0.5,
    visited: Set[str] = None
) -> Dict[str, Node]:
    """노드 변경 시 영향 전파"""
    if visited is None:
        visited = set()
    
    if depth <= 0 or changed_node_id in visited:
        return nodes
    
    visited.add(changed_node_id)
    updated_nodes = dict(nodes)
    
    # 나가는 영향 조회
    outgoing_links = get_outgoing_influences(changed_node_id)
    
    for link in outgoing_links:
        target_node = updated_nodes.get(link.target)
        if not target_node or not target_node.active:
            continue
        
        # 영향량 계산
        influence = delta * link.weight * decay_factor
        
        # 타겟 노드 압력 조정
        new_pressure = float(np.clip(target_node.pressure + influence, 0.0, 1.0))
        new_state = determine_state(new_pressure)
        
        # 업데이트
        updated_node = Node(
            spec=target_node.spec,
            active=target_node.active,
            value=target_node.value,
            pressure=new_pressure,
            state=new_state,
            trend=target_node.trend,
            last_updated=target_node.last_updated,
            history=target_node.history
        )
        updated_nodes[link.target] = updated_node
        
        # 재귀적 전파
        if abs(influence) > 0.01:
            updated_nodes = propagate_influence(
                updated_nodes,
                link.target,
                influence,
                depth - 1,
                decay_factor,
                visited
            )
    
    return updated_nodes

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 시뮬레이션 (What-If)
# ═══════════════════════════════════════════════════════════════════════════════

def run_simulation(
    nodes: Dict[str, Node],
    scenario: SimulationScenario
) -> SimulationResult:
    """What-If 시뮬레이션 실행"""
    # 원본 상태 저장
    original_nodes = dict(nodes)
    simulated_nodes = dict(nodes)
    
    # 변경 적용
    for change in scenario.changes:
        node = simulated_nodes.get(change.node_id)
        if not node:
            continue
        
        if change.change_type == "absolute":
            new_value = change.value
        elif change.change_type == "relative":
            new_value = node.value + change.value
        else:  # percent
            new_value = node.value * (1 + change.value / 100)
        
        # 노드 업데이트
        spec = ALL_NODES.get(change.node_id)
        if not spec:
            continue
        
        new_pressure = calculate_pressure(new_value, spec)
        old_pressure = node.pressure
        
        updated_node = Node(
            spec=node.spec,
            active=node.active,
            value=new_value,
            pressure=new_pressure,
            state=determine_state(new_pressure),
            trend=node.trend,
            last_updated=node.last_updated,
            history=node.history
        )
        simulated_nodes[change.node_id] = updated_node
        
        # 영향 전파
        delta = new_pressure - old_pressure
        simulated_nodes = propagate_influence(
            simulated_nodes, change.node_id, delta
        )
    
    # 영향 계산
    impacts = []
    for node_id in scenario.observe:
        original = original_nodes.get(node_id)
        simulated = simulated_nodes.get(node_id)
        
        if not original or not simulated:
            continue
        
        impacts.append(NodeImpact(
            node_id=node_id,
            original_pressure=original.pressure,
            new_pressure=simulated.pressure,
            original_state=original.state,
            new_state=simulated.state,
            propagation_depth=0 if any(c.node_id == node_id for c in scenario.changes) else 1
        ))
    
    # 회로 영향 계산
    original_circuits = calculate_all_circuits(original_nodes)
    simulated_circuits = calculate_all_circuits(simulated_nodes)
    
    circuit_impacts = []
    for circuit_id in CIRCUITS:
        original_circuit = original_circuits.get(circuit_id)
        simulated_circuit = simulated_circuits.get(circuit_id)
        
        if original_circuit and simulated_circuit:
            circuit_impacts.append(CircuitImpact(
                circuit_id=circuit_id,
                original_value=original_circuit.value,
                new_value=simulated_circuit.value,
                original_state=original_circuit.state,
                new_state=simulated_circuit.state
            ))
    
    # 경고 생성
    warnings = []
    
    for impact in impacts:
        if impact.original_state != NodeState.IRREVERSIBLE and impact.new_state == NodeState.IRREVERSIBLE:
            spec = ALL_NODES.get(impact.node_id)
            if spec:
                warnings.append(f"⚠️ {spec.icon} {spec.name}이(가) 비가역적 위험 상태로 전환됩니다")
    
    for impact in circuit_impacts:
        if impact.original_state != NodeState.IRREVERSIBLE and impact.new_state == NodeState.IRREVERSIBLE:
            circuit = CIRCUITS.get(impact.circuit_id)
            if circuit:
                warnings.append(f"🔴 {circuit.icon} {circuit.name_kr}이(가) 위험 상태로 전환됩니다")
    
    return SimulationResult(
        scenario=scenario,
        impacts=impacts,
        circuit_impacts=circuit_impacts,
        warnings=warnings
    )

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 발화 감지 (Fire Detection)
# ═══════════════════════════════════════════════════════════════════════════════

def detect_fire(node: Node) -> bool:
    """발화 감지 (급격한 위험 상승)"""
    if node.pressure < 0.7:
        return False
    return node.trend > 0.05

def get_fire_nodes(nodes: Dict[str, Node]) -> List[Node]:
    """발화 노드 목록"""
    return [n for n in nodes.values() if n.active and detect_fire(n)]

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 노드 초기화
# ═══════════════════════════════════════════════════════════════════════════════

def initialize_all_nodes() -> Dict[str, Node]:
    """모든 노드 초기화"""
    nodes = {}
    for spec in ALL_NODES.values():
        nodes[spec.id] = create_node(spec)
    return nodes
