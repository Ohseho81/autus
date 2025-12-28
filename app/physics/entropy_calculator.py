"""
AUTUS Entropy Calculator (Bezos Edition)
=========================================

엔트로피 계산: 시스템 무질서도 정량화

수식:
1. Boltzmann: S = k ln W
2. Shannon: H = -Σ p_i log₂ p_i  
3. AUTUS: S = Shannon + λ × (갈등 + 미스매치)

원리:
- 엔트로피 ↑ → 돈 생산 효율 ↓
- 엔트로피 ↓ → 시스템 안정 → 수익 극대화
- 목표: S_AUTUS → 0에 수렴

Version: 2.0.0
Status: LOCKED
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime
from enum import Enum
import math


# ================================================================
# CONSTANTS
# ================================================================

K_BOLTZMANN = 1.0
LAMBDA_CONFLICT = 0.5
LAMBDA_MISMATCH = 0.5
LAMBDA_CHURN = 0.3
LAMBDA_ISOLATION = 0.2

ENTROPY_THRESHOLDS = {
    "CRITICAL": 10.0,
    "HIGH": 5.0,
    "MEDIUM": 2.0,
    "LOW": 1.0,
    "OPTIMAL": 0.5,
}


# ================================================================
# ENUMS
# ================================================================

class NodeState(str, Enum):
    STABLE = "STABLE"
    AT_RISK = "AT_RISK"
    CHURNING = "CHURNING"
    SYNERGY = "SYNERGY"
    CONFLICT = "CONFLICT"
    ISOLATED = "ISOLATED"


class EntropyLevel(str, Enum):
    OPTIMAL = "OPTIMAL"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RelationType(str, Enum):
    SYNERGY = "SYNERGY"
    NEUTRAL = "NEUTRAL"
    FRICTION = "FRICTION"
    CONFLICT = "CONFLICT"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class NodeProbability:
    node_id: str
    probabilities: Dict[NodeState, float]
    
    def validate(self) -> bool:
        total = sum(self.probabilities.values())
        return abs(total - 1.0) < 0.001


@dataclass
class RelationEdge:
    from_node: str
    to_node: str
    relation_type: RelationType
    strength: float = 0.5
    
    @property
    def is_conflict(self) -> bool:
        return self.relation_type in [RelationType.FRICTION, RelationType.CONFLICT]


@dataclass
class RoleMismatch:
    node_id: str
    assigned_role: str
    optimal_role: str
    mismatch_score: float = 0.5


@dataclass
class EntropyComponents:
    shannon_entropy: float
    conflict_penalty: float
    mismatch_penalty: float
    churn_penalty: float
    isolation_penalty: float
    
    @property
    def total(self) -> float:
        return (
            self.shannon_entropy +
            self.conflict_penalty +
            self.mismatch_penalty +
            self.churn_penalty +
            self.isolation_penalty
        )


@dataclass
class EntropyReport:
    timestamp: datetime
    total_nodes: int
    total_entropy: float
    entropy_level: EntropyLevel
    components: EntropyComponents
    conflict_count: int
    mismatch_count: int
    churn_risk_count: int
    isolated_count: int
    recommendations: List[str]
    previous_entropy: Optional[float] = None
    entropy_delta: Optional[float] = None


@dataclass
class EntropyTarget:
    node_id: str
    contribution: float
    issue_type: str
    fix_action: str
    expected_reduction: float


# ================================================================
# BOLTZMANN ENTROPY
# ================================================================

class BoltzmannEntropy:
    """볼츠만 엔트로피: S = k ln W"""
    
    @staticmethod
    def calculate(num_microstates: int, k: float = K_BOLTZMANN) -> float:
        if num_microstates <= 0:
            return 0.0
        return k * math.log(num_microstates)
    
    @staticmethod
    def from_node_states(nodes: int, states_per_node: int) -> float:
        if nodes <= 0 or states_per_node <= 0:
            return 0.0
        return K_BOLTZMANN * nodes * math.log(states_per_node)


# ================================================================
# SHANNON ENTROPY
# ================================================================

class ShannonEntropy:
    """섀넌 엔트로피: H = -Σ p_i log₂ p_i"""
    
    @staticmethod
    def calculate(probabilities: List[float]) -> float:
        entropy = 0.0
        for p in probabilities:
            if p > 0:
                entropy -= p * math.log2(p)
        return entropy
    
    @staticmethod
    def calculate_from_counts(counts: List[int]) -> float:
        total = sum(counts)
        if total == 0:
            return 0.0
        probabilities = [c / total for c in counts]
        return ShannonEntropy.calculate(probabilities)
    
    @staticmethod
    def calculate_from_node_states(node_probabilities: List[NodeProbability]) -> float:
        if not node_probabilities:
            return 0.0
        
        total_entropy = 0.0
        for node_prob in node_probabilities:
            probs = list(node_prob.probabilities.values())
            total_entropy += ShannonEntropy.calculate(probs)
        
        return total_entropy / len(node_probabilities)
    
    @staticmethod
    def max_entropy(num_states: int) -> float:
        if num_states <= 0:
            return 0.0
        return math.log2(num_states)


# ================================================================
# AUTUS ENTROPY CALCULATOR
# ================================================================

class AutusEntropyCalculator:
    """
    AUTUS 전용 엔트로피 계산기
    S_AUTUS = Shannon + λ₁×갈등 + λ₂×미스매치 + λ₃×이탈 + λ₄×고립
    """
    
    def __init__(
        self,
        lambda_conflict: float = LAMBDA_CONFLICT,
        lambda_mismatch: float = LAMBDA_MISMATCH,
        lambda_churn: float = LAMBDA_CHURN,
        lambda_isolation: float = LAMBDA_ISOLATION
    ):
        self.lambda_conflict = lambda_conflict
        self.lambda_mismatch = lambda_mismatch
        self.lambda_churn = lambda_churn
        self.lambda_isolation = lambda_isolation
        self.history: List[EntropyReport] = []
    
    def calculate(
        self,
        node_probabilities: List[NodeProbability],
        relations: List[RelationEdge],
        mismatches: List[RoleMismatch]
    ) -> EntropyReport:
        """AUTUS 엔트로피 계산"""
        
        # 1. 섀넌 엔트로피
        shannon = ShannonEntropy.calculate_from_node_states(node_probabilities)
        
        # 2. 갈등 패널티
        conflict_count = sum(1 for r in relations if r.is_conflict)
        conflict_penalty = self.lambda_conflict * conflict_count
        
        # 3. 역할 미스매치 패널티
        mismatch_count = len(mismatches)
        mismatch_penalty = self.lambda_mismatch * mismatch_count
        
        # 4. 이탈 위험 패널티
        churn_risk_count = sum(
            1 for np in node_probabilities
            if np.probabilities.get(NodeState.CHURNING, 0) > 0.3 or
               np.probabilities.get(NodeState.AT_RISK, 0) > 0.5
        )
        churn_penalty = self.lambda_churn * churn_risk_count
        
        # 5. 고립 패널티
        connected_nodes = set()
        for r in relations:
            connected_nodes.add(r.from_node)
            connected_nodes.add(r.to_node)
        
        all_nodes = {np.node_id for np in node_probabilities}
        isolated_nodes = all_nodes - connected_nodes
        isolated_count = len(isolated_nodes)
        isolation_penalty = self.lambda_isolation * isolated_count
        
        components = EntropyComponents(
            shannon_entropy=shannon,
            conflict_penalty=conflict_penalty,
            mismatch_penalty=mismatch_penalty,
            churn_penalty=churn_penalty,
            isolation_penalty=isolation_penalty,
        )
        
        total = components.total
        level = self._determine_level(total)
        recommendations = self._generate_recommendations(
            components, conflict_count, mismatch_count, churn_risk_count, isolated_count
        )
        
        previous = self.history[-1].total_entropy if self.history else None
        delta = total - previous if previous is not None else None
        
        report = EntropyReport(
            timestamp=datetime.now(),
            total_nodes=len(node_probabilities),
            total_entropy=total,
            entropy_level=level,
            components=components,
            conflict_count=conflict_count,
            mismatch_count=mismatch_count,
            churn_risk_count=churn_risk_count,
            isolated_count=isolated_count,
            recommendations=recommendations,
            previous_entropy=previous,
            entropy_delta=delta,
        )
        
        self.history.append(report)
        return report
    
    def _determine_level(self, entropy: float) -> EntropyLevel:
        if entropy >= ENTROPY_THRESHOLDS["CRITICAL"]:
            return EntropyLevel.CRITICAL
        elif entropy >= ENTROPY_THRESHOLDS["HIGH"]:
            return EntropyLevel.HIGH
        elif entropy >= ENTROPY_THRESHOLDS["MEDIUM"]:
            return EntropyLevel.MEDIUM
        elif entropy >= ENTROPY_THRESHOLDS["LOW"]:
            return EntropyLevel.LOW
        else:
            return EntropyLevel.OPTIMAL
    
    def _generate_recommendations(
        self,
        components: EntropyComponents,
        conflicts: int,
        mismatches: int,
        churns: int,
        isolated: int
    ) -> List[str]:
        recs = []
        
        issues = [
            ("갈등", components.conflict_penalty, conflicts,
             f"🔥 {conflicts}개 갈등 관계 해소 필요"),
            ("미스매치", components.mismatch_penalty, mismatches,
             f"⚙️ {mismatches}명 역할 최적화 필요"),
            ("이탈", components.churn_penalty, churns,
             f"⚠️ {churns}명 이탈 위험"),
            ("고립", components.isolation_penalty, isolated,
             f"🔗 {isolated}명 고립 상태"),
        ]
        
        issues.sort(key=lambda x: x[1], reverse=True)
        
        for name, penalty, count, rec in issues:
            if count > 0:
                recs.append(rec)
        
        if not recs:
            recs.append("✅ 시스템 최적 상태")
        
        return recs
    
    def calculate_money_production_efficiency(
        self,
        entropy: float,
        base_efficiency: float = 1.0
    ) -> float:
        """효율 = base × e^(-entropy/5)"""
        return base_efficiency * math.exp(-entropy / 5)
    
    def simulate_entropy_reduction(
        self,
        current_report: EntropyReport,
        actions: List[Dict]
    ) -> Tuple[float, float]:
        reduction = 0.0
        
        for action in actions:
            action_type = action.get("type")
            count = action.get("count", 1)
            
            if action_type == "resolve_conflict":
                reduction += self.lambda_conflict * count * 0.8
            elif action_type == "fix_mismatch":
                reduction += self.lambda_mismatch * count * 0.9
            elif action_type == "prevent_churn":
                reduction += self.lambda_churn * count * 0.7
            elif action_type == "connect_isolated":
                reduction += self.lambda_isolation * count * 0.6
        
        expected_entropy = max(0, current_report.total_entropy - reduction)
        return reduction, expected_entropy


# ================================================================
# ENTROPY VISUALIZER
# ================================================================

class EntropyVisualizer:
    @staticmethod
    def generate_gauge(entropy: float, max_entropy: float = 15.0) -> str:
        ratio = min(entropy / max_entropy, 1.0)
        filled = int(ratio * 20)
        empty = 20 - filled
        
        if ratio < 0.33:
            color = "🟢"
        elif ratio < 0.66:
            color = "🟡"
        else:
            color = "🔴"
        
        bar = "█" * filled + "░" * empty
        return f"{color} [{bar}] {entropy:.2f}"
    
    @staticmethod
    def generate_efficiency_meter(entropy: float) -> str:
        efficiency = math.exp(-entropy / 5) * 100
        return f"💰 돈 생산 효율: {efficiency:.1f}%"


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS Entropy Calculator Test")
    print("=" * 70)
    
    calculator = AutusEntropyCalculator()
    
    # 섀넌 엔트로피 테스트
    print("\n[1. 섀넌 엔트로피 테스트]")
    probs = [0.8, 0.2]
    h = ShannonEntropy.calculate(probs)
    print(f"  유지 80%, 이탈 20%: H = {h:.3f} 비트")
    
    # 볼츠만 엔트로피 테스트
    print("\n[2. 볼츠만 엔트로피 테스트]")
    s = BoltzmannEntropy.calculate(8)
    print(f"  동전 3개 (W=8): S = {s:.3f}")
    
    # AUTUS 엔트로피 계산
    print("\n[3. AUTUS 엔트로피 계산]")
    
    node_probs = []
    for i in range(42):
        node_probs.append(NodeProbability(
            node_id=f"person_{i:02d}",
            probabilities={
                NodeState.STABLE: 0.70,
                NodeState.AT_RISK: 0.20,
                NodeState.CONFLICT: 0.10,
            }
        ))
    
    relations = [
        RelationEdge("person_01", "person_05", RelationType.CONFLICT, 0.8),
        RelationEdge("person_02", "person_08", RelationType.CONFLICT, 0.8),
    ]
    
    mismatches = [
        RoleMismatch(f"person_{i:02d}", "current", "optimal", 0.7)
        for i in range(5, 12)
    ]
    
    report = calculator.calculate(node_probs, relations, mismatches)
    
    print(f"  총 엔트로피: {report.total_entropy:.2f}")
    print(f"  레벨: {report.entropy_level.value}")
    print(f"  권장 사항: {report.recommendations}")
    
    # 돈 생산 효율
    print("\n[4. 돈 생산 효율]")
    efficiency = calculator.calculate_money_production_efficiency(report.total_entropy)
    print(f"  현재 효율: {efficiency:.1%}")
    
    # 시각화
    print("\n[5. 시각화]")
    print(f"  {EntropyVisualizer.generate_gauge(report.total_entropy)}")
    print(f"  {EntropyVisualizer.generate_efficiency_meter(report.total_entropy)}")
    
    print("\n" + "=" * 70)
    print("✅ Entropy Calculator Test Complete")
