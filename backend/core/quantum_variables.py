"""
AUTUS Quantum-Inspired Variables
================================

양자 영감 변수 시스템

- Superposition (중첩): 여러 역할 동시 가능성
- Entanglement (얽힘): 비국소적 시너지
- Uncertainty (불확실성): 예측 한계 정량화

Version: 3.0.0
"""

from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple
import math
import random


# ================================================================
# QUANTUM STATE (SUPERPOSITION)
# ================================================================

@dataclass
class QuantumState:
    """
    양자 영감 상태 벡터
    
    중첩(Superposition): 여러 역할 확률 동시 보유
    측정 전까지 모든 가능성이 공존
    """
    node_id: str
    
    # 역할 확률 벡터 (합 = 1)
    role_probabilities: Dict[str, float] = field(default_factory=dict)
    
    # 측정 전 상태 (True = 중첩, False = 붕괴)
    is_superposition: bool = True
    
    # 측정된 역할 (붕괴 후)
    collapsed_role: Optional[str] = None
    
    def measure(self) -> str:
        """
        상태 측정 (붕괴)
        
        확률에 따라 역할 결정 - 측정 후 중첩 상태 종료
        """
        if not self.is_superposition:
            return self.collapsed_role
        
        # 확률적 선택
        roles = list(self.role_probabilities.keys())
        probs = list(self.role_probabilities.values())
        
        r = random.random()
        cumulative = 0.0
        
        for role, prob in zip(roles, probs):
            cumulative += prob
            if r <= cumulative:
                self.collapsed_role = role
                self.is_superposition = False
                return role
        
        # 기본값
        self.collapsed_role = roles[-1] if roles else "unknown"
        self.is_superposition = False
        return self.collapsed_role
    
    def get_expected_value(self, role_values: Dict[str, float]) -> float:
        """
        기대값 계산 (측정 없이)
        
        E[V] = Σ p_i × v_i
        
        측정 전에도 기대 가치 계산 가능
        """
        if not self.is_superposition:
            return role_values.get(self.collapsed_role, 0)
        
        return sum(
            prob * role_values.get(role, 0)
            for role, prob in self.role_probabilities.items()
        )
    
    def get_entropy(self) -> float:
        """
        상태 엔트로피 (섀넌)
        
        H = -Σ p_i × log₂(p_i)
        
        확률이 균등할수록 엔트로피 높음 = 불확실성 높음
        """
        entropy = 0.0
        for prob in self.role_probabilities.values():
            if prob > 0:
                entropy -= prob * math.log2(prob)
        return entropy
    
    def reset(self):
        """중첩 상태로 리셋"""
        self.is_superposition = True
        self.collapsed_role = None
    
    def to_dict(self) -> Dict:
        """딕셔너리 변환"""
        return {
            "node_id": self.node_id,
            "role_probabilities": self.role_probabilities,
            "is_superposition": self.is_superposition,
            "collapsed_role": self.collapsed_role,
            "entropy": self.get_entropy(),
        }


# ================================================================
# ENTANGLEMENT (얽힘)
# ================================================================

@dataclass
class Entanglement:
    """
    양자 얽힘 (비국소적 시너지)
    
    두 노드가 얽히면 한 쪽 변화가 즉시 다른 쪽에 영향
    물리적 거리와 무관한 상관관계
    """
    node_a: str
    node_b: str
    
    # 얽힘 강도 (0-1)
    intensity: float = 0.0
    
    # 얽힘 유형
    entanglement_type: str = "synergy"  # synergy, conflict, neutral
    
    # 상관 계수 (-1 ~ +1)
    # +1: 양의 상관 (함께 상승/하락)
    # -1: 음의 상관 (반대로 움직임)
    correlation: float = 0.0
    
    def propagate_change(
        self,
        source_node: str,
        change_magnitude: float
    ) -> Tuple[str, float]:
        """
        변화 전파
        
        한 쪽 노드의 변화가 다른 쪽에 즉시 영향
        
        전파량 = 원래 변화 × 얽힘 강도 × 상관 계수
        """
        target_node = self.node_b if source_node == self.node_a else self.node_a
        
        # 전파되는 변화량
        propagated_change = change_magnitude * self.intensity * self.correlation
        
        return target_node, propagated_change
    
    def get_coupling_strength(self) -> float:
        """
        결합 강도 계산
        
        |intensity × correlation|
        """
        return abs(self.intensity * self.correlation)
    
    def to_dict(self) -> Dict:
        """딕셔너리 변환"""
        return {
            "node_a": self.node_a,
            "node_b": self.node_b,
            "intensity": self.intensity,
            "entanglement_type": self.entanglement_type,
            "correlation": self.correlation,
            "coupling_strength": self.get_coupling_strength(),
        }


# ================================================================
# UNCERTAINTY PRINCIPLE (불확실성 원리)
# ================================================================

class UncertaintyPrinciple:
    """
    하이젠베르크 불확실성 원리 영감
    
    Δ돈 × Δ시간 ≥ ℏ (아우투스 플랑크 상수)
    
    원리:
    - 돈 예측 정확도 높이면 → 시간 예측 불확실 ↑
    - 시간 예측 정확도 높이면 → 돈 예측 불확실 ↑
    - 둘 다 완벽히 예측하는 것은 불가능
    """
    
    # 아우투스 플랑크 상수 (튜닝 가능)
    AUTUS_PLANCK = 0.1
    
    @classmethod
    def calculate_uncertainty(
        cls,
        money_precision: float,
        time_precision: float
    ) -> Tuple[float, float, bool]:
        """
        불확실성 계산
        
        Args:
            money_precision: 돈 예측 정확도 (0-1)
            time_precision: 시간 예측 정확도 (0-1)
        
        Returns:
            (조정된_돈_정확도, 조정된_시간_정확도, 원리_위반_여부)
        """
        product = money_precision * time_precision
        
        if product < cls.AUTUS_PLANCK:
            # 불확실성 원리 위반 → 균형점으로 재분배
            sqrt_h = math.sqrt(cls.AUTUS_PLANCK)
            return sqrt_h, sqrt_h, True
        
        return money_precision, time_precision, False
    
    @classmethod
    def get_prediction_confidence(
        cls,
        money_variance: float,
        time_variance: float
    ) -> float:
        """
        예측 신뢰도 계산
        
        불확실성 높을수록 신뢰도 낮음
        
        신뢰도 = 1 / (1 + variance)
        """
        total_variance = money_variance + time_variance
        
        confidence = 1 / (1 + total_variance)
        
        return confidence
    
    @classmethod
    def get_uncertainty_relation(
        cls,
        delta_money: float,
        delta_time: float
    ) -> Dict:
        """
        불확실성 관계 분석
        
        Returns:
            딕셔너리: product, satisfies_principle, adjustment_needed
        """
        product = delta_money * delta_time
        satisfies = product >= cls.AUTUS_PLANCK
        
        adjustment_needed = 0.0
        if not satisfies:
            adjustment_needed = cls.AUTUS_PLANCK - product
        
        return {
            "delta_money": delta_money,
            "delta_time": delta_time,
            "product": product,
            "planck_constant": cls.AUTUS_PLANCK,
            "satisfies_principle": satisfies,
            "adjustment_needed": adjustment_needed,
        }


# ================================================================
# QUANTUM SYSTEM UTILITIES
# ================================================================

class QuantumSystem:
    """
    양자 시스템 유틸리티
    
    여러 양자 상태와 얽힘을 관리
    """
    
    def __init__(self):
        self.states: Dict[str, QuantumState] = {}
        self.entanglements: Dict[Tuple[str, str], Entanglement] = {}
    
    def add_state(self, node_id: str, role_probabilities: Dict[str, float]) -> QuantumState:
        """양자 상태 추가"""
        state = QuantumState(
            node_id=node_id,
            role_probabilities=role_probabilities
        )
        self.states[node_id] = state
        return state
    
    def add_entanglement(
        self,
        node_a: str,
        node_b: str,
        intensity: float = 0.5,
        correlation: float = 0.8
    ) -> Entanglement:
        """얽힘 추가"""
        key = (min(node_a, node_b), max(node_a, node_b))
        
        ent = Entanglement(
            node_a=node_a,
            node_b=node_b,
            intensity=intensity,
            correlation=correlation,
        )
        self.entanglements[key] = ent
        return ent
    
    def measure_all(self) -> Dict[str, str]:
        """모든 상태 측정"""
        return {
            node_id: state.measure()
            for node_id, state in self.states.items()
        }
    
    def get_system_entropy(self) -> float:
        """시스템 전체 엔트로피"""
        return sum(
            state.get_entropy()
            for state in self.states.values()
            if state.is_superposition
        )
    
    def get_total_coupling_strength(self) -> float:
        """총 결합 강도"""
        return sum(
            ent.get_coupling_strength()
            for ent in self.entanglements.values()
        )
    
    def propagate(self, source_node: str, change: float) -> Dict[str, float]:
        """
        변화 전파 (모든 얽힘 경로)
        
        Returns:
            {node_id: propagated_change}
        """
        propagated = {}
        
        for key, ent in self.entanglements.items():
            if source_node in key:
                target, delta = ent.propagate_change(source_node, change)
                propagated[target] = propagated.get(target, 0) + delta
        
        return propagated
    
    def get_stats(self) -> Dict:
        """시스템 통계"""
        superposition_count = sum(
            1 for s in self.states.values() if s.is_superposition
        )
        
        return {
            "total_states": len(self.states),
            "superpositions": superposition_count,
            "collapsed": len(self.states) - superposition_count,
            "entanglements": len(self.entanglements),
            "system_entropy": self.get_system_entropy(),
            "total_coupling": self.get_total_coupling_strength(),
        }


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Quantum Variables Test")
    print("=" * 60)
    
    # 1. 양자 상태 테스트
    print("\n[1. Quantum State Test]")
    
    state = QuantumState(
        node_id="person_001",
        role_probabilities={
            "leader": 0.3,
            "executor": 0.5,
            "observer": 0.2,
        }
    )
    
    print(f"  Is superposition: {state.is_superposition}")
    print(f"  Entropy: {state.get_entropy():.3f}")
    
    role_values = {"leader": 100, "executor": 70, "observer": 30}
    print(f"  Expected value: {state.get_expected_value(role_values):.1f}")
    
    measured_role = state.measure()
    print(f"  Measured role: {measured_role}")
    print(f"  Is superposition after measure: {state.is_superposition}")
    
    # 2. 얽힘 테스트
    print("\n[2. Entanglement Test]")
    
    ent = Entanglement(
        node_a="person_001",
        node_b="person_002",
        intensity=0.8,
        correlation=0.9,
    )
    
    target, propagated = ent.propagate_change("person_001", 0.5)
    print(f"  Source: person_001, Change: 0.5")
    print(f"  Target: {target}, Propagated: {propagated:.3f}")
    print(f"  Coupling strength: {ent.get_coupling_strength():.3f}")
    
    # 3. 불확실성 원리 테스트
    print("\n[3. Uncertainty Principle Test]")
    
    money_prec = 0.05
    time_prec = 0.05
    
    adjusted_m, adjusted_t, violated = UncertaintyPrinciple.calculate_uncertainty(
        money_prec, time_prec
    )
    
    print(f"  Original: Δmoney={money_prec}, Δtime={time_prec}")
    print(f"  Product: {money_prec * time_prec}")
    print(f"  Planck constant: {UncertaintyPrinciple.AUTUS_PLANCK}")
    print(f"  Violated: {violated}")
    print(f"  Adjusted: Δmoney={adjusted_m:.3f}, Δtime={adjusted_t:.3f}")
    
    # 4. 시스템 테스트
    print("\n[4. Quantum System Test]")
    
    system = QuantumSystem()
    
    for i in range(10):
        system.add_state(
            f"node_{i}",
            {"leader": 0.3, "executor": 0.5, "observer": 0.2}
        )
    
    for i in range(5):
        system.add_entanglement(
            f"node_{i}",
            f"node_{i+5}",
            intensity=0.7,
            correlation=0.85,
        )
    
    stats = system.get_stats()
    print(f"  Stats: {stats}")
    
    propagated = system.propagate("node_0", 1.0)
    print(f"  Propagated from node_0: {propagated}")
    
    print("\n" + "=" * 60)
    print("✅ Quantum Variables Test Complete")

