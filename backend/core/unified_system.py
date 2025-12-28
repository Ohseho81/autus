"""
AUTUS Unified System Engine (Bezos Edition)
============================================

모든 모듈 통합 + 양자 영감 변수 + 실시간 최적화

통합 모듈:
- Physics Map 3D (좌표계, 클러스터링)
- Entropy Calculator (엔트로피, 효율)
- Multi-Orbit Strategy (3대 궤도)
- Quantum Variables (중첩, 얽힘, 불확실성)

Version: 3.0.0
Status: PRODUCTION
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Set, Any, Callable
from datetime import datetime, timedelta
from enum import Enum
import math
import json
import random

from .quantum_variables import QuantumState, Entanglement, UncertaintyPrinciple, QuantumSystem
from .physics_formulas import UnifiedPhysicsFormulas


# ================================================================
# ENUMS
# ================================================================

class ClusterType(str, Enum):
    GOLDEN = "GOLDEN"
    EFFICIENCY = "EFFICIENCY"
    HIGH_ENERGY = "HIGH_ENERGY"
    STABLE = "STABLE"
    REMOVAL = "REMOVAL"


class OrbitType(str, Enum):
    SAFETY = "SAFETY"
    ACQUISITION = "ACQUISITION"
    REVENUE = "REVENUE"
    EJECT = "EJECT"


# ================================================================
# UNIFIED NODE
# ================================================================

@dataclass
class UnifiedNode:
    """
    통합 노드 (모든 속성 포함)
    
    3D 좌표계:
    - x: 돈 축 (순수익)
    - y: 시간 축 (소모 시간)
    - z: 시너지 축 (-1 ~ +1)
    """
    id: str
    name: str
    
    # 기본 속성
    revenue: float = 0.0              # 순수익
    time_spent: float = 0.0           # 소모 시간 (hours)
    
    # 물리 좌표 (3D)
    x: float = 0.0                    # 돈 축 (정규화)
    y: float = 0.0                    # 시간 축 (정규화)
    z: float = 0.0                    # 시너지 축
    
    # 시너지 구성요소
    fitness: float = 0.5              # 역할 적합도 (0-1)
    density: float = 0.5              # 상호작용 밀도 (0-1)
    frequency: float = 0.5            # 접촉 빈도 (0-1)
    penalty: float = 0.0              # 갈등 패널티 (0-1)
    
    # 상태
    cluster: ClusterType = ClusterType.STABLE
    orbit: OrbitType = OrbitType.SAFETY
    
    # 양자 변수
    quantum_state: Optional[QuantumState] = None
    entanglements: List[str] = field(default_factory=list)  # 얽힌 노드 ID들
    
    # 메타
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    
    def calculate_synergy(self) -> float:
        """시너지 강도 계산 (tanh)"""
        return UnifiedPhysicsFormulas.synergy_strength(
            self.fitness,
            self.density,
            self.frequency,
            self.penalty
        )
    
    def calculate_mass(self) -> float:
        """질량 계산 (영향력)"""
        return max(0.1, self.fitness + self.calculate_synergy() + 1) / 2
    
    def calculate_velocity(self) -> float:
        """속도 계산 (결과 밀도)"""
        if self.time_spent <= 0:
            return 0.0
        return min(1.0, self.revenue / (self.time_spent * 100000 + 1))
    
    def get_momentum(self) -> float:
        """관성 계산"""
        return UnifiedPhysicsFormulas.momentum(
            self.calculate_mass(),
            self.calculate_velocity()
        )
    
    def get_kinetic_energy(self) -> float:
        """운동 에너지"""
        return UnifiedPhysicsFormulas.kinetic_energy(
            self.calculate_mass(),
            self.calculate_velocity()
        )
    
    def get_position(self) -> Tuple[float, float, float]:
        """3D 위치"""
        return (self.x, self.y, self.z)
    
    def to_dict(self) -> Dict:
        """딕셔너리 변환"""
        return {
            "id": self.id,
            "name": self.name,
            "revenue": self.revenue,
            "time_spent": self.time_spent,
            "x": self.x,
            "y": self.y,
            "z": self.z,
            "synergy": self.calculate_synergy(),
            "cluster": self.cluster.value if isinstance(self.cluster, ClusterType) else self.cluster,
            "orbit": self.orbit.value if isinstance(self.orbit, OrbitType) else self.orbit,
            "mass": self.calculate_mass(),
            "velocity": self.calculate_velocity(),
            "momentum": self.get_momentum(),
            "fitness": self.fitness,
            "density": self.density,
            "frequency": self.frequency,
            "penalty": self.penalty,
            "tags": self.tags,
            "entanglements": self.entanglements,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# ================================================================
# SYSTEM STATE
# ================================================================

@dataclass
class SystemState:
    """시스템 전체 상태 스냅샷"""
    timestamp: datetime
    
    # 노드 통계
    total_nodes: int
    cluster_distribution: Dict[str, int]
    orbit_distribution: Dict[str, int]
    
    # 물리량
    total_value: float
    entropy: float
    money_efficiency: float
    
    # 양자 통계
    superposition_count: int
    entanglement_count: int
    uncertainty_level: float
    
    # 예측
    projected_value: float
    value_multiplier: float
    
    # 액션
    pending_actions: int
    executed_actions: int
    
    def to_dict(self) -> Dict:
        """딕셔너리 변환"""
        return {
            "timestamp": self.timestamp.isoformat(),
            "total_nodes": self.total_nodes,
            "clusters": self.cluster_distribution,
            "orbits": self.orbit_distribution,
            "total_value": self.total_value,
            "entropy": self.entropy,
            "money_efficiency": self.money_efficiency,
            "quantum": {
                "superpositions": self.superposition_count,
                "entanglements": self.entanglement_count,
                "uncertainty": self.uncertainty_level,
            },
            "projection": {
                "value": self.projected_value,
                "multiplier": self.value_multiplier,
            },
            "actions": {
                "pending": self.pending_actions,
                "executed": self.executed_actions,
            }
        }


# ================================================================
# UNIFIED SYSTEM ENGINE
# ================================================================

class UnifiedSystemEngine:
    """
    아우투스 통합 시스템 엔진
    
    모든 모듈을 통합하여 단일 인터페이스 제공
    
    Features:
    - 노드 관리 (CRUD)
    - 3D 좌표 계산
    - 클러스터링
    - 궤도 분류
    - 양자 상태 관리
    - 얽힘 전파
    - 자동 최적화
    - 실시간 이벤트
    """
    
    # 좌표 정규화 상수
    MAX_REVENUE = 10_000_000
    MAX_TIME = 200
    
    def __init__(self):
        # 노드 저장소
        self.nodes: Dict[str, UnifiedNode] = {}
        
        # 얽힘 저장소
        self.entanglements: Dict[Tuple[str, str], Entanglement] = {}
        
        # 양자 상태 저장소
        self.quantum_states: Dict[str, QuantumState] = {}
        
        # 실행 대기 액션
        self.pending_actions: List[Dict] = []
        
        # 실행 완료 액션
        self.executed_actions: List[Dict] = []
        
        # 시스템 히스토리
        self.state_history: List[SystemState] = []
        
        # 이벤트 핸들러
        self.event_handlers: Dict[str, List[Callable]] = {}
    
    # ============================================================
    # NODE MANAGEMENT
    # ============================================================
    
    def add_node(
        self,
        id: str,
        name: str,
        revenue: float = 0.0,
        time_spent: float = 0.0,
        fitness: float = 0.5,
        density: float = 0.5,
        frequency: float = 0.5,
        penalty: float = 0.0,
        role_probabilities: Dict[str, float] = None,
        tags: List[str] = None,
        metadata: Dict[str, Any] = None
    ) -> UnifiedNode:
        """노드 추가"""
        node = UnifiedNode(
            id=id,
            name=name,
            revenue=revenue,
            time_spent=time_spent,
            fitness=fitness,
            density=density,
            frequency=frequency,
            penalty=penalty,
            tags=tags or [],
            metadata=metadata or {},
        )
        
        # 3D 좌표 계산
        node.z = node.calculate_synergy()
        node.x = self._normalize_revenue(revenue)
        node.y = self._normalize_time(time_spent)
        
        # 클러스터 분류
        node.cluster = self._classify_cluster(node)
        
        # 궤도 분류
        node.orbit = self._classify_orbit(node)
        
        # 양자 상태 초기화
        if role_probabilities:
            node.quantum_state = QuantumState(
                node_id=id,
                role_probabilities=role_probabilities
            )
            self.quantum_states[id] = node.quantum_state
        
        self.nodes[id] = node
        
        # 이벤트 발생
        self._emit_event("node_added", {"node": node.to_dict()})
        
        return node
    
    def update_node(self, id: str, **kwargs) -> Optional[UnifiedNode]:
        """노드 업데이트"""
        if id not in self.nodes:
            return None
        
        node = self.nodes[id]
        
        for key, value in kwargs.items():
            if hasattr(node, key):
                setattr(node, key, value)
        
        # 좌표 재계산
        node.z = node.calculate_synergy()
        node.x = self._normalize_revenue(node.revenue)
        node.y = self._normalize_time(node.time_spent)
        
        # 클러스터 재분류
        node.cluster = self._classify_cluster(node)
        node.orbit = self._classify_orbit(node)
        
        node.updated_at = datetime.now()
        
        # 얽힘 전파
        self._propagate_entanglement(id)
        
        # 이벤트 발생
        self._emit_event("node_updated", {"node": node.to_dict()})
        
        return node
    
    def remove_node(self, id: str) -> bool:
        """노드 제거"""
        if id not in self.nodes:
            return False
        
        # 얽힘 제거
        to_remove = [
            key for key in self.entanglements
            if id in key
        ]
        for key in to_remove:
            del self.entanglements[key]
        
        # 양자 상태 제거
        if id in self.quantum_states:
            del self.quantum_states[id]
        
        del self.nodes[id]
        
        self._emit_event("node_removed", {"node_id": id})
        
        return True
    
    def get_node(self, id: str) -> Optional[UnifiedNode]:
        """노드 조회"""
        return self.nodes.get(id)
    
    def get_all_nodes(self) -> List[UnifiedNode]:
        """모든 노드 조회"""
        return list(self.nodes.values())
    
    # ============================================================
    # ENTANGLEMENT MANAGEMENT
    # ============================================================
    
    def create_entanglement(
        self,
        node_a: str,
        node_b: str,
        intensity: float = 0.5,
        correlation: float = 0.8,
        entanglement_type: str = "synergy"
    ) -> Optional[Entanglement]:
        """얽힘 생성"""
        if node_a not in self.nodes or node_b not in self.nodes:
            return None
        
        key = (min(node_a, node_b), max(node_a, node_b))
        
        entanglement = Entanglement(
            node_a=node_a,
            node_b=node_b,
            intensity=intensity,
            correlation=correlation,
            entanglement_type=entanglement_type,
        )
        
        self.entanglements[key] = entanglement
        
        # 노드에 얽힘 기록
        if node_b not in self.nodes[node_a].entanglements:
            self.nodes[node_a].entanglements.append(node_b)
        if node_a not in self.nodes[node_b].entanglements:
            self.nodes[node_b].entanglements.append(node_a)
        
        self._emit_event("entanglement_created", {
            "entanglement": entanglement.to_dict()
        })
        
        return entanglement
    
    def remove_entanglement(self, node_a: str, node_b: str) -> bool:
        """얽힘 제거"""
        key = (min(node_a, node_b), max(node_a, node_b))
        
        if key not in self.entanglements:
            return False
        
        del self.entanglements[key]
        
        # 노드에서 얽힘 제거
        if node_a in self.nodes and node_b in self.nodes[node_a].entanglements:
            self.nodes[node_a].entanglements.remove(node_b)
        if node_b in self.nodes and node_a in self.nodes[node_b].entanglements:
            self.nodes[node_b].entanglements.remove(node_a)
        
        return True
    
    def _propagate_entanglement(self, source_id: str):
        """얽힘 변화 전파"""
        source_node = self.nodes.get(source_id)
        if not source_node:
            return
        
        for target_id in source_node.entanglements:
            key = (min(source_id, target_id), max(source_id, target_id))
            entanglement = self.entanglements.get(key)
            
            if entanglement:
                # 변화 전파
                change = source_node.calculate_synergy() * 0.1
                _, propagated = entanglement.propagate_change(source_id, change)
                
                # 타겟 노드 업데이트 (재귀 방지 - 직접 수정)
                if target_id in self.nodes:
                    target = self.nodes[target_id]
                    target.z = min(1.0, max(-1.0, target.z + propagated))
    
    # ============================================================
    # COORDINATE CALCULATIONS
    # ============================================================
    
    def _normalize_revenue(self, revenue: float) -> float:
        """수익 정규화 (x축)"""
        if revenue >= 0:
            return min(1.0, revenue / self.MAX_REVENUE)
        else:
            return max(-1.0, revenue / self.MAX_REVENUE)
    
    def _normalize_time(self, time_spent: float) -> float:
        """시간 정규화 (y축)"""
        return min(1.0, max(0.0, time_spent / self.MAX_TIME))
    
    def _classify_cluster(self, node: UnifiedNode) -> ClusterType:
        """클러스터 분류"""
        x, y, z = node.x, node.y, node.z
        
        # Removal: 음의 수익 또는 매우 낮은 시너지
        if x < 0.2 or z < -0.5:
            return ClusterType.REMOVAL
        
        # Golden: 고수익 + 고시너지
        if x >= 0.7 and z >= 0.7:
            return ClusterType.GOLDEN
        
        # Efficiency: 적정 수익 + 저시간
        if x >= 0.4 and y <= 0.3:
            return ClusterType.EFFICIENCY
        
        # High Energy: 고수익 + 저시너지 (잠재력)
        if x >= 0.6 and z < 0:
            return ClusterType.HIGH_ENERGY
        
        return ClusterType.STABLE
    
    def _classify_orbit(self, node: UnifiedNode) -> OrbitType:
        """궤도 분류"""
        cluster = node.cluster
        
        if cluster == ClusterType.GOLDEN:
            return OrbitType.REVENUE
        elif cluster == ClusterType.REMOVAL:
            return OrbitType.EJECT
        elif cluster in [ClusterType.EFFICIENCY, ClusterType.HIGH_ENERGY]:
            return OrbitType.ACQUISITION
        else:
            return OrbitType.SAFETY
    
    # ============================================================
    # SYSTEM CALCULATIONS
    # ============================================================
    
    def calculate_system_value(self) -> float:
        """시스템 전체 가치 계산"""
        nodes = list(self.nodes.values())
        n = len(nodes)
        
        if n == 0:
            return 0.0
        
        # 질량 리스트
        masses = [node.calculate_mass() for node in nodes]
        
        # 위치 리스트
        positions = [node.get_position() for node in nodes]
        
        # 거리 매트릭스 계산
        distances = UnifiedPhysicsFormulas.calculate_distance_matrix(positions)
        
        # 거리 0 방지
        for i in range(len(distances)):
            for j in range(len(distances[i])):
                if distances[i][j] == 0 and i != j:
                    distances[i][j] = 0.1
        
        # 중력 가치
        gravity_value = UnifiedPhysicsFormulas.gravity_value(masses, distances)
        
        # 엔트로피
        entropy = self.calculate_entropy()
        
        # 평균 관성
        avg_momentum = sum(node.get_momentum() for node in nodes) / n
        
        # 통합 가치
        return UnifiedPhysicsFormulas.unified_value(
            gravity_value,
            entropy,
            avg_momentum
        )
    
    def calculate_entropy(self) -> float:
        """시스템 엔트로피 계산"""
        nodes = list(self.nodes.values())
        
        if not nodes:
            return 0.0
        
        # 갈등 수 (시너지 < -0.3)
        conflict_count = sum(1 for n in nodes if n.calculate_synergy() < -0.3)
        
        # 미스매치 수 (적합도 < 0.4)
        mismatch_count = sum(1 for n in nodes if n.fitness < 0.4)
        
        # 이탈 위험 수 (시너지 < 0.3 and 빈도 < 0.3)
        churn_count = sum(
            1 for n in nodes
            if n.calculate_synergy() < 0.3 and n.frequency < 0.3
        )
        
        # 비효율 수 (밀도 < 0.2)
        inefficient_count = sum(1 for n in nodes if n.density < 0.2)
        
        return UnifiedPhysicsFormulas.autus_entropy(
            conflict_count,
            mismatch_count,
            churn_count,
            inefficient_count
        )
    
    def calculate_money_efficiency(self) -> float:
        """돈 생산 효율"""
        entropy = self.calculate_entropy()
        return UnifiedPhysicsFormulas.money_efficiency_from_entropy(entropy)
    
    def get_entropy_components(self) -> Dict[str, int]:
        """엔트로피 구성요소"""
        nodes = list(self.nodes.values())
        
        return {
            "conflict_count": sum(1 for n in nodes if n.calculate_synergy() < -0.3),
            "mismatch_count": sum(1 for n in nodes if n.fitness < 0.4),
            "churn_count": sum(1 for n in nodes if n.calculate_synergy() < 0.3 and n.frequency < 0.3),
            "inefficient_count": sum(1 for n in nodes if n.density < 0.2),
        }
    
    # ============================================================
    # QUANTUM CALCULATIONS
    # ============================================================
    
    def calculate_quantum_value(self) -> float:
        """양자 중첩 가치 (모든 시나리오)"""
        scenarios = []
        
        for node in self.nodes.values():
            if node.quantum_state and node.quantum_state.is_superposition:
                # 각 역할별 가치 시나리오
                role_values = {
                    "leader": node.revenue * 1.5,
                    "executor": node.revenue * 1.2,
                    "observer": node.revenue * 0.8,
                }
                
                for role, prob in node.quantum_state.role_probabilities.items():
                    value = role_values.get(role, node.revenue)
                    scenarios.append((prob / len(self.nodes), value))
        
        if not scenarios:
            return self.calculate_system_value()
        
        quantum_value = UnifiedPhysicsFormulas.quantum_superposition_value(scenarios)
        classical_value = self.calculate_system_value()
        
        # 양자 + 고전 결합
        return UnifiedPhysicsFormulas.combined_value(
            classical_value,
            quantum_value,
            quantum_weight=0.3
        )
    
    def get_uncertainty_metrics(self) -> Dict:
        """불확실성 메트릭"""
        nodes = list(self.nodes.values())
        
        if not nodes:
            return {"money_variance": 0, "time_variance": 0, "confidence": 1.0}
        
        # 수익 분산
        revenues = [n.revenue for n in nodes]
        avg_rev = sum(revenues) / len(revenues)
        max_rev = max(abs(r) for r in revenues) if revenues else 1
        money_variance = sum((r - avg_rev) ** 2 for r in revenues) / len(revenues)
        money_variance = money_variance / (max_rev ** 2 + 1)  # 정규화
        
        # 시간 분산
        times = [n.time_spent for n in nodes]
        avg_time = sum(times) / len(times)
        max_time = max(times) if times else 1
        time_variance = sum((t - avg_time) ** 2 for t in times) / len(times)
        time_variance = time_variance / (max_time ** 2 + 1)
        
        # 예측 신뢰도
        confidence = UncertaintyPrinciple.get_prediction_confidence(
            money_variance,
            time_variance
        )
        
        return {
            "money_variance": money_variance,
            "time_variance": time_variance,
            "confidence": confidence,
        }
    
    def measure_quantum_state(self, node_id: str) -> Optional[str]:
        """양자 상태 측정 (붕괴)"""
        if node_id not in self.quantum_states:
            return None
        
        qs = self.quantum_states[node_id]
        return qs.measure()
    
    # ============================================================
    # ACTION MANAGEMENT
    # ============================================================
    
    def queue_action(
        self,
        action_type: str,
        target_id: str,
        params: Dict = None,
        priority: int = 0
    ) -> Dict:
        """액션 대기열 추가"""
        action = {
            "id": f"action_{len(self.pending_actions)}_{datetime.now().timestamp():.0f}",
            "type": action_type,
            "target_id": target_id,
            "params": params or {},
            "priority": priority,
            "created_at": datetime.now().isoformat(),
            "status": "pending",
        }
        
        self.pending_actions.append(action)
        
        # 우선순위 정렬
        self.pending_actions.sort(key=lambda x: x["priority"], reverse=True)
        
        return action
    
    def execute_pending_actions(self) -> List[Dict]:
        """대기 액션 실행"""
        executed = []
        
        while self.pending_actions:
            action = self.pending_actions.pop(0)
            
            result = self._execute_action(action)
            
            action["status"] = "executed"
            action["result"] = result
            action["executed_at"] = datetime.now().isoformat()
            
            self.executed_actions.append(action)
            executed.append(action)
        
        return executed
    
    def _execute_action(self, action: Dict) -> Dict:
        """액션 실행"""
        action_type = action["type"]
        target_id = action["target_id"]
        params = action["params"]
        
        if target_id not in self.nodes and action_type != "broadcast":
            return {"error": "node_not_found"}
        
        if action_type == "amplify":
            node = self.nodes[target_id]
            self.update_node(
                target_id,
                fitness=min(1.0, node.fitness + params.get("amount", 0.1)),
                density=min(1.0, node.density + params.get("amount", 0.1)),
            )
            return {"effect": "synergy_boosted"}
        
        elif action_type == "reduce":
            node = self.nodes[target_id]
            self.update_node(
                target_id,
                frequency=max(0.0, node.frequency - params.get("amount", 0.2)),
            )
            return {"effect": "frequency_reduced"}
        
        elif action_type == "eject":
            self.remove_node(target_id)
            return {"effect": "node_removed"}
        
        elif action_type == "boost_synergy":
            node = self.nodes[target_id]
            self.update_node(
                target_id,
                penalty=max(0.0, node.penalty - params.get("amount", 0.1)),
            )
            return {"effect": "penalty_reduced"}
        
        elif action_type == "create_entanglement":
            other_id = params.get("other_id")
            if other_id:
                self.create_entanglement(
                    target_id,
                    other_id,
                    intensity=params.get("intensity", 0.5),
                    correlation=params.get("correlation", 0.8),
                )
            return {"effect": "entanglement_created"}
        
        return {"effect": "unknown_action"}
    
    # ============================================================
    # AUTO OPTIMIZATION
    # ============================================================
    
    def run_auto_optimization(self) -> Dict:
        """자동 최적화 실행"""
        nodes = list(self.nodes.values())
        
        if not nodes:
            return {"status": "no_nodes", "actions_queued": 0}
        
        actions_queued = 0
        
        for node in nodes:
            synergy = node.calculate_synergy()
            
            # 고시너지 → 증폭
            if synergy > 0.7:
                self.queue_action("amplify", node.id, priority=1)
                actions_queued += 1
            
            # 저시너지 → 축소 또는 이탈
            elif synergy < -0.5:
                if node.revenue < 0:
                    self.queue_action("eject", node.id, priority=2)
                else:
                    self.queue_action("reduce", node.id, priority=1)
                actions_queued += 1
            
            # 중간 시너지 + 고효율 → 시너지 부스트
            elif node.cluster == ClusterType.EFFICIENCY:
                self.queue_action("boost_synergy", node.id, priority=0)
                actions_queued += 1
        
        return {
            "status": "optimization_queued",
            "actions_queued": actions_queued,
        }
    
    def get_optimization_recommendations(self) -> List[Dict]:
        """최적화 추천 목록"""
        nodes = list(self.nodes.values())
        recommendations = []
        
        for node in nodes:
            synergy = node.calculate_synergy()
            
            if synergy > 0.7:
                recommendations.append({
                    "id": f"rec_{node.id}",
                    "type": "amplify",
                    "target_id": node.id,
                    "target_name": node.name,
                    "reason": f"시너지 강도 {synergy:.2f} - 고효율 노드",
                    "suggested_action": "증폭 및 자원 집중",
                    "priority": "HIGH",
                })
            elif synergy < -0.5:
                recommendations.append({
                    "id": f"rec_{node.id}",
                    "type": "block" if node.revenue < 0 else "reduce",
                    "target_id": node.id,
                    "target_name": node.name,
                    "reason": f"시너지 강도 {synergy:.2f} - 엔트로피 생성",
                    "suggested_action": "차단" if node.revenue < 0 else "연결 축소",
                    "priority": "URGENT",
                })
            elif node.cluster == ClusterType.EFFICIENCY:
                recommendations.append({
                    "id": f"rec_{node.id}",
                    "type": "boost",
                    "target_id": node.id,
                    "target_name": node.name,
                    "reason": "고효율 지대 - 골든 진입 가능",
                    "suggested_action": "시너지 부스트",
                    "priority": "MEDIUM",
                })
        
        return recommendations
    
    # ============================================================
    # STATE SNAPSHOT
    # ============================================================
    
    def get_system_state(self) -> SystemState:
        """시스템 상태 스냅샷"""
        nodes = list(self.nodes.values())
        
        # 클러스터 분포
        cluster_dist = {}
        for node in nodes:
            cluster = node.cluster.value if isinstance(node.cluster, ClusterType) else node.cluster
            cluster_dist[cluster] = cluster_dist.get(cluster, 0) + 1
        
        # 궤도 분포
        orbit_dist = {}
        for node in nodes:
            orbit = node.orbit.value if isinstance(node.orbit, OrbitType) else node.orbit
            orbit_dist[orbit] = orbit_dist.get(orbit, 0) + 1
        
        # 양자 통계
        superposition_count = sum(
            1 for qs in self.quantum_states.values()
            if qs.is_superposition
        )
        
        # 불확실성
        uncertainty = self.get_uncertainty_metrics()
        
        # 가치
        current_value = self.calculate_system_value()
        quantum_value = self.calculate_quantum_value()
        
        state = SystemState(
            timestamp=datetime.now(),
            total_nodes=len(nodes),
            cluster_distribution=cluster_dist,
            orbit_distribution=orbit_dist,
            total_value=current_value,
            entropy=self.calculate_entropy(),
            money_efficiency=self.calculate_money_efficiency(),
            superposition_count=superposition_count,
            entanglement_count=len(self.entanglements),
            uncertainty_level=1 - uncertainty["confidence"],
            projected_value=quantum_value,
            value_multiplier=quantum_value / current_value if current_value > 0 else 1.0,
            pending_actions=len(self.pending_actions),
            executed_actions=len(self.executed_actions),
        )
        
        self.state_history.append(state)
        
        return state
    
    # ============================================================
    # EVENT SYSTEM
    # ============================================================
    
    def on(self, event: str, handler: Callable):
        """이벤트 핸들러 등록"""
        if event not in self.event_handlers:
            self.event_handlers[event] = []
        self.event_handlers[event].append(handler)
    
    def off(self, event: str, handler: Callable):
        """이벤트 핸들러 제거"""
        if event in self.event_handlers and handler in self.event_handlers[event]:
            self.event_handlers[event].remove(handler)
    
    def _emit_event(self, event: str, data: Dict):
        """이벤트 발생"""
        if event in self.event_handlers:
            for handler in self.event_handlers[event]:
                try:
                    handler(data)
                except Exception as e:
                    print(f"Event handler error: {e}")
    
    # ============================================================
    # EXPORT
    # ============================================================
    
    def export_graph_data(self) -> Dict:
        """프론트엔드용 그래프 데이터 내보내기"""
        nodes_data = [
            {
                **node.to_dict(),
                "quantum": {
                    "is_superposition": node.quantum_state.is_superposition if node.quantum_state else False,
                    "entanglements": node.entanglements,
                }
            }
            for node in self.nodes.values()
        ]
        
        links_data = [
            {
                "source": ent.node_a,
                "target": ent.node_b,
                "strength": ent.intensity * ent.correlation,
                "type": ent.entanglement_type,
            }
            for ent in self.entanglements.values()
        ]
        
        return {
            "nodes": nodes_data,
            "links": links_data,
        }
    
    def export_state_json(self) -> str:
        """상태 JSON 내보내기"""
        state = self.get_system_state()
        return json.dumps(state.to_dict(), indent=2, ensure_ascii=False)
    
    def import_nodes(self, nodes_data: List[Dict]) -> int:
        """노드 일괄 임포트"""
        imported = 0
        
        for data in nodes_data:
            try:
                self.add_node(
                    id=data.get("id", f"node_{imported}"),
                    name=data.get("name", f"Node {imported}"),
                    revenue=data.get("revenue", 0),
                    time_spent=data.get("time_spent", 0),
                    fitness=data.get("fitness", 0.5),
                    density=data.get("density", 0.5),
                    frequency=data.get("frequency", 0.5),
                    penalty=data.get("penalty", 0),
                    role_probabilities=data.get("role_probabilities"),
                    tags=data.get("tags", []),
                    metadata=data.get("metadata", {}),
                )
                imported += 1
            except Exception as e:
                print(f"Import error: {e}")
        
        return imported


# ================================================================
# FACTORY FUNCTION
# ================================================================

def create_engine() -> UnifiedSystemEngine:
    """엔진 팩토리"""
    return UnifiedSystemEngine()


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS Unified System Engine Test")
    print("=" * 70)
    
    engine = UnifiedSystemEngine()
    
    # 이벤트 핸들러 등록
    engine.on("node_added", lambda d: print(f"  [EVENT] Node added: {d['node']['name']}"))
    
    # 노드 생성
    print("\n[1. Creating 50 nodes...]")
    
    for i in range(50):
        role_probs = {
            "leader": random.uniform(0.1, 0.4),
            "executor": random.uniform(0.3, 0.5),
            "observer": 0.0,
        }
        role_probs["observer"] = 1.0 - role_probs["leader"] - role_probs["executor"]
        
        engine.add_node(
            id=f"node_{i:03d}",
            name=f"Person_{i}",
            revenue=random.randint(-500000, 5000000),
            time_spent=random.randint(10, 180),
            fitness=random.uniform(0.2, 1.0),
            density=random.uniform(0.1, 0.9),
            frequency=random.uniform(0.2, 0.9),
            penalty=random.uniform(0, 0.5),
            role_probabilities=role_probs,
        )
    
    print(f"  Total nodes: {len(engine.nodes)}")
    
    # 얽힘 생성
    print("\n[2. Creating entanglements...]")
    
    for i in range(20):
        a = f"node_{random.randint(0, 49):03d}"
        b = f"node_{random.randint(0, 49):03d}"
        if a != b:
            engine.create_entanglement(a, b, intensity=0.7, correlation=0.85)
    
    print(f"  Entanglements: {len(engine.entanglements)}")
    
    # 시스템 상태
    print("\n[3. System State]")
    state = engine.get_system_state()
    
    print(f"  Total Value: {state.total_value:,.2f}")
    print(f"  Entropy: {state.entropy:.3f}")
    print(f"  Money Efficiency: {state.money_efficiency:.1%}")
    print(f"  Projected Value: {state.projected_value:,.2f}")
    
    print(f"\n  Clusters: {state.cluster_distribution}")
    print(f"  Orbits: {state.orbit_distribution}")
    
    # 자동 최적화
    print("\n[4. Auto Optimization]")
    opt_result = engine.run_auto_optimization()
    print(f"  Actions queued: {opt_result['actions_queued']}")
    
    executed = engine.execute_pending_actions()
    print(f"  Actions executed: {len(executed)}")
    
    # 최적화 후
    print("\n[5. After Optimization]")
    state_after = engine.get_system_state()
    print(f"  Value: {state.total_value:,.2f} → {state_after.total_value:,.2f}")
    print(f"  Efficiency: {state.money_efficiency:.1%} → {state_after.money_efficiency:.1%}")
    
    print("\n" + "=" * 70)
    print("✅ Unified System Engine Test Complete")

