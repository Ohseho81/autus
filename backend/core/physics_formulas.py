"""
AUTUS Unified Physics Formulas
==============================

아우투스 통합 물리 공식

- 중력 기반 가치
- 볼츠만 엔트로피
- 섀넌 엔트로피
- 에너지 보존
- 관성 (모멘텀)
- 양자 중첩 가치

Version: 3.0.0
"""

from typing import List, Dict, Tuple
import math


class UnifiedPhysicsFormulas:
    """
    아우투스 통합 물리 공식
    
    모든 물리 기반 계산을 통합
    """
    
    # 시스템 상수
    G = 1.0   # 중력 상수
    K = 1.0   # 볼츠만 상수
    C = 1.0   # 시너지 상수
    
    # ============================================================
    # GRAVITY (중력)
    # ============================================================
    
    @classmethod
    def gravity_value(
        cls,
        masses: List[float],
        distances: List[List[float]]
    ) -> float:
        """
        중력 기반 가치 공식
        
        V = G × Σ (m_i × m_j) / r_ij²
        
        두 노드 간 중력은 질량에 비례, 거리 제곱에 반비례
        전체 시스템 가치 = 모든 쌍의 중력 합
        
        Args:
            masses: 각 노드의 질량 (영향력)
            distances: 노드 간 거리 매트릭스
        
        Returns:
            총 중력 가치
        """
        n = len(masses)
        total_value = 0.0
        
        for i in range(n):
            for j in range(i + 1, n):
                r = distances[i][j] if distances[i][j] > 0 else 0.1
                value = (masses[i] * masses[j]) / (r ** 2)
                total_value += value
        
        return cls.G * total_value
    
    @classmethod
    def gravitational_force(
        cls,
        mass_1: float,
        mass_2: float,
        distance: float
    ) -> float:
        """
        두 노드 간 중력
        
        F = G × m₁ × m₂ / r²
        """
        if distance <= 0:
            distance = 0.1
        
        return cls.G * (mass_1 * mass_2) / (distance ** 2)
    
    @classmethod
    def escape_velocity(cls, mass: float, radius: float) -> float:
        """
        탈출 속도
        
        v = √(2GM/r)
        
        노드가 시스템을 벗어나기 위해 필요한 최소 속도
        """
        if radius <= 0:
            radius = 0.1
        
        return math.sqrt(2 * cls.G * mass / radius)
    
    # ============================================================
    # ENTROPY (엔트로피)
    # ============================================================
    
    @classmethod
    def boltzmann_entropy(cls, W: int) -> float:
        """
        볼츠만 엔트로피
        
        S = k × ln(W)
        
        W: 가능한 미시 상태 수 (무질서도)
        
        Args:
            W: 가능한 상태 수
        
        Returns:
            엔트로피 값
        """
        if W <= 0:
            return 0.0
        
        return cls.K * math.log(W)
    
    @classmethod
    def shannon_entropy(cls, probabilities: List[float]) -> float:
        """
        섀넌 정보 엔트로피
        
        H = -Σ p_i × log₂(p_i)
        
        확률 분포의 불확실성 측정
        
        Args:
            probabilities: 확률 분포 (합 = 1)
        
        Returns:
            섀넌 엔트로피 (비트)
        """
        entropy = 0.0
        
        for p in probabilities:
            if p > 0:
                entropy -= p * math.log2(p)
        
        return entropy
    
    @classmethod
    def autus_entropy(
        cls,
        conflict_count: int,
        mismatch_count: int,
        churn_count: int,
        inefficient_count: int
    ) -> float:
        """
        아우투스 전용 엔트로피
        
        S = ln(W_conflict × W_mismatch × W_churn × W_inefficient)
        
        시스템의 무질서도 = 갈등 × 미스매치 × 이탈 × 비효율
        
        Args:
            conflict_count: 갈등 관계 수
            mismatch_count: 역할 미스매치 수
            churn_count: 이탈 위험 수
            inefficient_count: 비효율 노드 수
        
        Returns:
            AUTUS 엔트로피
        """
        W = (
            (conflict_count + 1) *
            (mismatch_count + 1) *
            (churn_count + 1) *
            (inefficient_count + 1)
        )
        
        return math.log(W)
    
    @classmethod
    def money_efficiency_from_entropy(cls, entropy: float) -> float:
        """
        엔트로피 기반 돈 생산 효율
        
        효율 = e^(-S/5)
        
        엔트로피 0 → 효율 100%
        엔트로피 5 → 효율 37%
        엔트로피 10 → 효율 14%
        """
        return math.exp(-entropy / 5)
    
    # ============================================================
    # ENERGY (에너지)
    # ============================================================
    
    @classmethod
    def energy_flow(cls, Q_input: float, W_output: float) -> float:
        """
        에너지 보존 (가치 흐름)
        
        ΔE = Q - W
        
        Q: 들어온 가치 (수익)
        W: 나간 가치 (비용)
        
        Returns:
            순 에너지 변화
        """
        return Q_input - W_output
    
    @classmethod
    def kinetic_energy(cls, mass: float, velocity: float) -> float:
        """
        운동 에너지
        
        KE = ½ × m × v²
        """
        return 0.5 * mass * (velocity ** 2)
    
    @classmethod
    def potential_energy(cls, mass: float, height: float) -> float:
        """
        위치 에너지
        
        PE = m × g × h
        
        height: 시너지 축 높이
        """
        return mass * cls.G * height
    
    # ============================================================
    # MOMENTUM (관성)
    # ============================================================
    
    @classmethod
    def momentum(cls, mass: float, velocity: float) -> float:
        """
        관성 (지속 수익)
        
        p = m × v
        
        높은 관성 = 안정적인 수익 흐름
        """
        return mass * velocity
    
    @classmethod
    def impulse(cls, force: float, time: float) -> float:
        """
        충격량
        
        J = F × Δt
        
        관성 변화량 = 힘 × 시간
        """
        return force * time
    
    # ============================================================
    # SYNERGY (시너지)
    # ============================================================
    
    @classmethod
    def synergy_strength(
        cls,
        fitness: float,
        density: float,
        frequency: float,
        penalty: float
    ) -> float:
        """
        시너지 강도 계산 (tanh 활성화)
        
        z = tanh(0.35×fitness×2 + 0.25×density×2 + 0.20×frequency×2 - 0.20×penalty×3)
        
        Returns:
            시너지 강도 (-1 ~ +1)
        """
        raw = (
            fitness * 0.35 * 2 +
            density * 0.25 * 2 +
            frequency * 0.20 * 2 -
            penalty * 0.20 * 3
        )
        
        return math.tanh(raw)
    
    @classmethod
    def cluster_synergy(cls, node_synergies: List[float]) -> float:
        """
        클러스터 시너지 (평균)
        
        클러스터 내 모든 노드의 평균 시너지
        """
        if not node_synergies:
            return 0.0
        
        return sum(node_synergies) / len(node_synergies)
    
    # ============================================================
    # UNIFIED VALUE (통합 가치)
    # ============================================================
    
    @classmethod
    def unified_value(
        cls,
        gravity_value: float,
        entropy: float,
        momentum: float
    ) -> float:
        """
        통합 가치 공식
        
        V_total = G_value × e^(-S/5) × (1 + p)
        
        중력 가치 × 엔트로피 효율 × 관성 보너스
        """
        entropy_factor = cls.money_efficiency_from_entropy(entropy)
        
        return gravity_value * entropy_factor * (1 + momentum)
    
    @classmethod
    def quantum_superposition_value(
        cls,
        scenarios: List[Tuple[float, float]]  # [(확률, 가치), ...]
    ) -> float:
        """
        양자 중첩 가치 (모든 시나리오 동시 고려)
        
        V_quantum = Σ p_i × V_i
        
        각 시나리오의 기대 가치 합
        """
        return sum(prob * value for prob, value in scenarios)
    
    @classmethod
    def combined_value(
        cls,
        classical_value: float,
        quantum_value: float,
        quantum_weight: float = 0.5
    ) -> float:
        """
        고전 + 양자 결합 가치
        
        V_combined = (1 - w) × V_classical + w × V_quantum
        """
        return (1 - quantum_weight) * classical_value + quantum_weight * quantum_value
    
    # ============================================================
    # DISTANCE CALCULATIONS
    # ============================================================
    
    @classmethod
    def euclidean_distance_3d(
        cls,
        point_1: Tuple[float, float, float],
        point_2: Tuple[float, float, float]
    ) -> float:
        """
        3D 유클리드 거리
        
        d = √((x₁-x₂)² + (y₁-y₂)² + (z₁-z₂)²)
        """
        return math.sqrt(
            (point_1[0] - point_2[0]) ** 2 +
            (point_1[1] - point_2[1]) ** 2 +
            (point_1[2] - point_2[2]) ** 2
        )
    
    @classmethod
    def calculate_distance_matrix(
        cls,
        positions: List[Tuple[float, float, float]]
    ) -> List[List[float]]:
        """
        거리 매트릭스 계산
        
        모든 노드 쌍 간의 거리
        """
        n = len(positions)
        matrix = [[0.0] * n for _ in range(n)]
        
        for i in range(n):
            for j in range(i + 1, n):
                dist = cls.euclidean_distance_3d(positions[i], positions[j])
                matrix[i][j] = dist
                matrix[j][i] = dist
        
        return matrix
    
    # ============================================================
    # NETWORK EFFECT
    # ============================================================
    
    @classmethod
    def metcalfe_value(cls, n: int) -> float:
        """
        메칼프의 법칙 (n²)
        
        V = n × (n - 1) / 2
        """
        return n * (n - 1) / 2
    
    @classmethod
    def autus_network_value(cls, n: int, synergy_factor: float = 1.0) -> float:
        """
        AUTUS 네트워크 가치 (n³)
        
        V = n³ × synergy_factor
        """
        return (n ** 3) * synergy_factor
    
    @classmethod
    def network_value_comparison(cls, n: int) -> Dict[str, float]:
        """
        네트워크 가치 비교
        
        선형, 메칼프, AUTUS 비교
        """
        return {
            "linear": n,
            "metcalfe": cls.metcalfe_value(n),
            "autus": cls.autus_network_value(n),
            "ratio_metcalfe_to_linear": cls.metcalfe_value(n) / n if n > 0 else 0,
            "ratio_autus_to_metcalfe": cls.autus_network_value(n) / cls.metcalfe_value(n) if n > 1 else 0,
        }


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Unified Physics Formulas Test")
    print("=" * 60)
    
    # 1. 중력 가치
    print("\n[1. Gravity Value]")
    masses = [1.0, 0.8, 0.6, 0.4]
    positions = [(0, 0, 0), (1, 0, 0), (0, 1, 0), (1, 1, 0)]
    distances = UnifiedPhysicsFormulas.calculate_distance_matrix(positions)
    
    g_value = UnifiedPhysicsFormulas.gravity_value(masses, distances)
    print(f"  Masses: {masses}")
    print(f"  Gravity Value: {g_value:.4f}")
    
    # 2. 엔트로피
    print("\n[2. Entropy]")
    b_entropy = UnifiedPhysicsFormulas.boltzmann_entropy(100)
    print(f"  Boltzmann (W=100): {b_entropy:.4f}")
    
    probs = [0.4, 0.3, 0.2, 0.1]
    s_entropy = UnifiedPhysicsFormulas.shannon_entropy(probs)
    print(f"  Shannon {probs}: {s_entropy:.4f} bits")
    
    a_entropy = UnifiedPhysicsFormulas.autus_entropy(3, 2, 1, 2)
    print(f"  AUTUS (3 conflicts, 2 mismatches, 1 churn, 2 inefficient): {a_entropy:.4f}")
    
    efficiency = UnifiedPhysicsFormulas.money_efficiency_from_entropy(a_entropy)
    print(f"  Money Efficiency: {efficiency:.1%}")
    
    # 3. 시너지
    print("\n[3. Synergy]")
    synergy = UnifiedPhysicsFormulas.synergy_strength(
        fitness=0.8,
        density=0.7,
        frequency=0.6,
        penalty=0.1
    )
    print(f"  Synergy (high): {synergy:.4f}")
    
    synergy_low = UnifiedPhysicsFormulas.synergy_strength(
        fitness=0.3,
        density=0.2,
        frequency=0.2,
        penalty=0.5
    )
    print(f"  Synergy (low): {synergy_low:.4f}")
    
    # 4. 통합 가치
    print("\n[4. Unified Value]")
    unified = UnifiedPhysicsFormulas.unified_value(
        gravity_value=10.0,
        entropy=2.0,
        momentum=0.5
    )
    print(f"  Unified Value: {unified:.4f}")
    
    # 5. 양자 가치
    print("\n[5. Quantum Superposition Value]")
    scenarios = [(0.3, 100), (0.5, 70), (0.2, 30)]
    q_value = UnifiedPhysicsFormulas.quantum_superposition_value(scenarios)
    print(f"  Scenarios: {scenarios}")
    print(f"  Quantum Value: {q_value:.2f}")
    
    # 6. 네트워크 가치
    print("\n[6. Network Value]")
    n = 42
    comparison = UnifiedPhysicsFormulas.network_value_comparison(n)
    print(f"  n = {n}")
    print(f"  Linear: {comparison['linear']}")
    print(f"  Metcalfe: {comparison['metcalfe']}")
    print(f"  AUTUS: {comparison['autus']}")
    
    print("\n" + "=" * 60)
    print("✅ Physics Formulas Test Complete")

