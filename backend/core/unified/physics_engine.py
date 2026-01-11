"""
═══════════════════════════════════════════════════════════════════════════════
⚛️ AUTUS v3.0 - Physics Engine (물리 엔진)
═══════════════════════════════════════════════════════════════════════════════

물리 법칙 전산화:

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│   1. 엔트로피 증가 법칙: dS/dt ≥ 0                                          │
│      → 방치하면 압력이 자연 증가 (악화)                                     │
│                                                                             │
│   2. 압력 전파 법칙: ΔP = k × w × (Pj - Pi)                                 │
│      → 연결된 노드로 압력이 전파                                            │
│                                                                             │
│   3. 관성 법칙: F = m × a → a = ΔP / m                                      │
│      → 질량이 크면 변화에 저항                                              │
│                                                                             │
│   4. 에너지 보존 법칙: E_in = E_out                                         │
│      → 시스템 총 에너지 불변                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional, Tuple
from datetime import datetime
import math


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리 상수
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PhysicsConstants:
    """물리 상수 (조정 가능)"""
    
    # 시간 상수
    DT: float = 1.0                    # 시간 단위 (1 사이클)
    
    # 엔트로피 상수
    BASE_ENTROPY_RATE: float = 0.01   # 기본 엔트로피 증가율
    MAX_ENTROPY_RATE: float = 0.05    # 최대 엔트로피 증가율
    
    # 전파 상수
    BASE_CONDUCTIVITY: float = 0.5    # 기본 전도율
    AMPLIFY_FACTOR: float = 1.5       # 증폭 계수
    BUFFER_CAPACITY: float = 0.3      # 버퍼 용량
    
    # 관성 상수
    MIN_MASS: float = 0.1             # 최소 질량
    MAX_MASS: float = 5.0             # 최대 질량
    
    # 경계 조건
    PRESSURE_MIN: float = 0.0         # 최소 압력
    PRESSURE_MAX: float = 1.0         # 최대 압력


CONSTANTS = PhysicsConstants()


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 엣지 타입별 전파 공식
# ═══════════════════════════════════════════════════════════════════════════════

EdgeType = Literal['DEPENDENCY', 'BUFFER', 'SUBSTITUTION', 'AMPLIFY']


class PropagationFormulas:
    """
    엣지 타입별 전파 공식
    
    ┌─────────────────────────────────────────────────────────────────────────┐
    │  타입          │  물리 비유      │  공식                                │
    ├─────────────────────────────────────────────────────────────────────────┤
    │  DEPENDENCY    │  열전도         │  ΔP = +k × w × (Pj - Pi)            │
    │  BUFFER        │  댐퍼          │  ΔP = -min(P, cap) × k × w          │
    │  SUBSTITUTION  │  병렬회로       │  ΔP = -ratio × Pi                   │
    │  AMPLIFY       │  피드백루프     │  ΔP = +k × w × Pi × Pj              │
    └─────────────────────────────────────────────────────────────────────────┘
    """
    
    @staticmethod
    def dependency(
        from_pressure: float,
        to_pressure: float,
        weight: float,
        conductivity: float
    ) -> float:
        """
        DEPENDENCY (열전도)
        
        높은 곳에서 낮은 곳으로 흐름
        ΔP = k × w × (Pj - Pi)
        """
        return conductivity * weight * (from_pressure - to_pressure)
    
    @staticmethod
    def buffer(
        to_pressure: float,
        weight: float,
        conductivity: float,
        capacity: float = CONSTANTS.BUFFER_CAPACITY
    ) -> float:
        """
        BUFFER (댐퍼)
        
        압력을 흡수하여 감소시킴
        ΔP = -min(P, cap) × k × w
        """
        absorbed = min(to_pressure, capacity)
        return -absorbed * conductivity * weight
    
    @staticmethod
    def substitution(
        from_pressure: float,
        to_pressure: float,
        weight: float,
        ratio: float = 0.5
    ) -> float:
        """
        SUBSTITUTION (병렬회로)
        
        대체재가 있으면 압력 분산
        ΔP = -ratio × (1 - Pj) × Pi × w
        """
        # from_pressure가 낮을수록 (여유가 있을수록) 대체 효과 큼
        substitute_effect = max(0, 1 - from_pressure)
        return -ratio * substitute_effect * to_pressure * weight
    
    @staticmethod
    def amplify(
        from_pressure: float,
        to_pressure: float,
        weight: float,
        conductivity: float,
        factor: float = CONSTANTS.AMPLIFY_FACTOR
    ) -> float:
        """
        AMPLIFY (피드백루프)
        
        압력이 높을수록 더 증가 (악순환)
        ΔP = k × w × Pi × Pj × factor
        """
        return conductivity * weight * from_pressure * to_pressure * factor


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 노드 물리 모델
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class NodePhysics:
    """노드의 물리적 속성"""
    node_id: str
    pressure: float = 0.2           # 현재 압력 (0~1)
    mass: float = 1.0               # 질량 (관성)
    entropy_rate: float = 0.01      # 엔트로피 증가율
    velocity: float = 0.0           # 변화 속도
    
    def apply_entropy(self, dt: float = CONSTANTS.DT) -> float:
        """
        엔트로피 증가 법칙 적용
        
        dS/dt ≥ 0
        방치하면 압력이 자연 증가
        """
        # 엔트로피 증가 (현재 압력에 비례하여 가속)
        entropy_delta = self.entropy_rate * (1 + self.pressure * 0.5) * dt
        return entropy_delta
    
    def apply_force(self, force: float) -> float:
        """
        관성 법칙 적용
        
        F = m × a
        a = F / m
        
        질량이 크면 변화에 저항
        """
        acceleration = force / max(self.mass, CONSTANTS.MIN_MASS)
        return acceleration
    
    def update_pressure(self, delta: float) -> float:
        """압력 업데이트 (경계 조건 적용)"""
        self.pressure = max(
            CONSTANTS.PRESSURE_MIN,
            min(CONSTANTS.PRESSURE_MAX, self.pressure + delta)
        )
        return self.pressure


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 엣지 물리 모델
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EdgePhysics:
    """엣지의 물리적 속성"""
    from_node: str
    to_node: str
    edge_type: EdgeType
    weight: float = 0.5             # 연결 강도
    conductivity: float = 0.5       # 전도율
    activation_count: int = 0       # 활성화 횟수
    
    def calculate_delta(
        self,
        from_pressure: float,
        to_pressure: float
    ) -> float:
        """전파 델타 계산"""
        if self.edge_type == 'DEPENDENCY':
            delta = PropagationFormulas.dependency(
                from_pressure, to_pressure, 
                self.weight, self.conductivity
            )
        elif self.edge_type == 'BUFFER':
            delta = PropagationFormulas.buffer(
                to_pressure, self.weight, self.conductivity
            )
        elif self.edge_type == 'SUBSTITUTION':
            delta = PropagationFormulas.substitution(
                from_pressure, to_pressure, self.weight
            )
        elif self.edge_type == 'AMPLIFY':
            delta = PropagationFormulas.amplify(
                from_pressure, to_pressure,
                self.weight, self.conductivity
            )
        else:
            delta = 0.0
        
        # 활성화 기록
        if abs(delta) > 0.001:
            self.activation_count += 1
        
        return delta


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 물리 엔진
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PropagationResult:
    """전파 결과"""
    node_id: str
    old_pressure: float
    new_pressure: float
    delta: float
    sources: List[str]           # 델타 기여 소스


@dataclass
class CycleResult:
    """사이클 결과"""
    cycle_number: int
    propagations: List[PropagationResult]
    total_entropy_added: float
    total_propagation: float
    energy_before: float
    energy_after: float
    timestamp: datetime = field(default_factory=datetime.now)


class PhysicsEngine:
    """
    물리 엔진
    
    핵심 원칙:
    1. 엔트로피 증가: 방치하면 악화
    2. 압력 전파: 연결된 노드로 전파
    3. 관성: 질량이 크면 변화에 저항
    4. 에너지 보존: 총량 불변 (검증용)
    """
    
    def __init__(self):
        self.nodes: Dict[str, NodePhysics] = {}
        self.edges: List[EdgePhysics] = []
        self.cycle_count: int = 0
        self.history: List[CycleResult] = []
    
    def initialize_node(
        self,
        node_id: str,
        pressure: float = 0.2,
        mass: float = 1.0,
        entropy_rate: float = 0.01
    ) -> NodePhysics:
        """노드 초기화"""
        node = NodePhysics(
            node_id=node_id,
            pressure=pressure,
            mass=mass,
            entropy_rate=entropy_rate,
        )
        self.nodes[node_id] = node
        return node
    
    def add_edge(
        self,
        from_node: str,
        to_node: str,
        edge_type: EdgeType,
        weight: float = 0.5,
        conductivity: float = 0.5
    ) -> EdgePhysics:
        """엣지 추가"""
        edge = EdgePhysics(
            from_node=from_node,
            to_node=to_node,
            edge_type=edge_type,
            weight=weight,
            conductivity=conductivity,
        )
        self.edges.append(edge)
        return edge
    
    def calculate_total_energy(self) -> float:
        """총 에너지 계산 (보존 법칙 검증용)"""
        return sum(n.pressure * n.mass for n in self.nodes.values())
    
    def run_cycle(self) -> CycleResult:
        """
        물리 사이클 실행
        
        순서:
        1. 에너지 측정 (before)
        2. 엔트로피 증가 적용
        3. 엣지별 전파 계산
        4. 관성 적용하여 델타 조정
        5. 압력 업데이트
        6. 에너지 측정 (after)
        """
        self.cycle_count += 1
        energy_before = self.calculate_total_energy()
        
        # 노드별 델타 누적
        deltas: Dict[str, float] = {nid: 0.0 for nid in self.nodes}
        delta_sources: Dict[str, List[str]] = {nid: [] for nid in self.nodes}
        
        total_entropy = 0.0
        
        # 1. 엔트로피 증가
        for node_id, node in self.nodes.items():
            entropy_delta = node.apply_entropy()
            deltas[node_id] += entropy_delta
            delta_sources[node_id].append(f'entropy:{entropy_delta:.4f}')
            total_entropy += entropy_delta
        
        # 2. 엣지별 전파
        total_propagation = 0.0
        
        for edge in self.edges:
            from_node = self.nodes.get(edge.from_node)
            to_node = self.nodes.get(edge.to_node)
            
            if not from_node or not to_node:
                continue
            
            delta = edge.calculate_delta(from_node.pressure, to_node.pressure)
            
            # 관성 적용
            adjusted_delta = to_node.apply_force(delta)
            
            deltas[edge.to_node] += adjusted_delta
            delta_sources[edge.to_node].append(
                f'{edge.edge_type}:{edge.from_node}:{adjusted_delta:.4f}'
            )
            total_propagation += abs(adjusted_delta)
        
        # 3. 압력 업데이트
        propagations = []
        
        for node_id, node in self.nodes.items():
            old_pressure = node.pressure
            new_pressure = node.update_pressure(deltas[node_id])
            
            propagations.append(PropagationResult(
                node_id=node_id,
                old_pressure=old_pressure,
                new_pressure=new_pressure,
                delta=deltas[node_id],
                sources=delta_sources[node_id],
            ))
        
        energy_after = self.calculate_total_energy()
        
        result = CycleResult(
            cycle_number=self.cycle_count,
            propagations=propagations,
            total_entropy_added=total_entropy,
            total_propagation=total_propagation,
            energy_before=energy_before,
            energy_after=energy_after,
        )
        
        self.history.append(result)
        return result
    
    def get_node_pressures(self) -> Dict[str, float]:
        """현재 노드 압력"""
        return {nid: n.pressure for nid, n in self.nodes.items()}
    
    def get_edge_activations(self) -> Dict[str, int]:
        """엣지 활성화 횟수"""
        return {
            f'{e.from_node}→{e.to_node}': e.activation_count 
            for e in self.edges
        }
    
    def describe_laws(self) -> str:
        """물리 법칙 설명"""
        return """
╔═══════════════════════════════════════════════════════════════════════════════╗
║ ⚛️ AUTUS 물리 법칙                                                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   1. 엔트로피 증가 법칙                                                       ║
║      ┌─────────────────────────────────────────────────────────────────────┐ ║
║      │  dS/dt ≥ 0                                                          │ ║
║      │  ΔP_entropy = ε × (1 + P × 0.5) × dt                               │ ║
║      │                                                                     │ ║
║      │  → 방치하면 압력이 자연 증가 (악화)                                 │ ║
║      │  → 현재 압력이 높을수록 더 빨리 악화                                │ ║
║      └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
║   2. 압력 전파 법칙 (4가지 엣지)                                              ║
║      ┌─────────────────────────────────────────────────────────────────────┐ ║
║      │  DEPENDENCY: ΔP = +k × w × (Pj - Pi)     [열전도]                   │ ║
║      │  BUFFER:     ΔP = -min(P, cap) × k × w   [댐퍼]                     │ ║
║      │  SUBSTITUTION: ΔP = -ratio × (1-Pj) × Pi × w  [병렬회로]            │ ║
║      │  AMPLIFY:    ΔP = +k × w × Pi × Pj × f   [피드백]                   │ ║
║      └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
║   3. 관성 법칙                                                                ║
║      ┌─────────────────────────────────────────────────────────────────────┐ ║
║      │  F = m × a                                                          │ ║
║      │  a = ΔP / m                                                         │ ║
║      │                                                                     │ ║
║      │  → 질량(m)이 크면 변화에 저항                                       │ ║
║      │  → 급격한 변화를 완충                                               │ ║
║      └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
║   4. 에너지 보존 법칙                                                         ║
║      ┌─────────────────────────────────────────────────────────────────────┐ ║
║      │  E = Σ(P × m)                                                       │ ║
║      │  E_in ≈ E_out (검증용)                                              │ ║
║      │                                                                     │ ║
║      │  → 시스템 총 에너지는 대체로 보존                                   │ ║
║      │  → 엔트로피에 의해 약간 증가 가능                                   │ ║
║      └─────────────────────────────────────────────────────────────────────┘ ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
"""
