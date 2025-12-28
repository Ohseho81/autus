"""
AUTUS Grand Equation Aggregator (Bezos Edition)
================================================

가치 폭발 & 네트워크 효과 엔진

기능:
1. Grand Equation - 성공 상관관계 수식 집계
2. Federated Formula Update - 분산 학습
3. Cross-Node Synergy - 노드 간 시너지 추적
4. Singularity Alert - 임계질량 감지

스케일링 법칙:
- n² (Metcalfe): 노드 연결 기반
- n³ (AUTUS): 공유 물리 법칙 기반
- Kaplan Scaling: 데이터↑ → 오판율 ↓ (Power-law)

Version: 2.0.0
Status: LOCKED
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from datetime import datetime, timedelta
from enum import Enum
import math
import json
import hashlib
import random


# ================================================================
# ENUMS
# ================================================================

class ScalingPhase(str, Enum):
    INDIVIDUAL = "INDIVIDUAL"
    PATTERN = "PATTERN"
    EXPLOSION = "EXPLOSION"
    SINGULARITY = "SINGULARITY"


class FormulaType(str, Enum):
    CHURN_PREDICTION = "CHURN_PREDICTION"
    ENGAGEMENT_BOOST = "ENGAGEMENT_BOOST"
    REVENUE_OPTIMIZE = "REVENUE_OPTIMIZE"
    TIMING_PATTERN = "TIMING_PATTERN"
    CROSS_SELL = "CROSS_SELL"


class ClusterType(str, Enum):
    ELEMENTARY = "ELEMENTARY"
    MIDDLE = "MIDDLE"
    HIGH = "HIGH"
    ADULT = "ADULT"
    MIXED = "MIXED"


# ================================================================
# DATA STRUCTURES
# ================================================================

@dataclass
class SuccessVector:
    """성공 벡터"""
    source_id: str
    cluster_id: str
    timestamp: datetime
    energy_delta: float
    momentum_delta: float
    engagement_delta: float
    revenue_delta: float
    action_type: str
    time_of_day: int
    day_of_week: int
    noise_added: float = 0.0


@dataclass
class GrandEquation:
    """성공 상관관계 대수식"""
    id: str
    formula_type: FormulaType
    coefficients: Dict[str, float]
    created_at: datetime
    updated_at: datetime
    contributing_vectors: int
    accuracy: float
    confidence: float
    applicable_clusters: List[str]
    
    def predict(self, input_vector: Dict[str, float]) -> float:
        result = self.coefficients.get("intercept", 0)
        for key, coef in self.coefficients.items():
            if key in input_vector:
                result += coef * input_vector[key]
        return max(0, min(1, result))


@dataclass
class ClusterProfile:
    """클러스터 프로필"""
    cluster_id: str
    cluster_type: ClusterType
    location: str
    total_nodes: int
    active_nodes: int
    avg_engagement: float
    avg_retention: float
    avg_revenue_per_node: float
    vectors_contributed: int
    equations_applied: List[str]


@dataclass
class SynergyEvent:
    """시너지 이벤트"""
    id: str
    source_cluster: str
    target_cluster: str
    pattern_type: FormulaType
    pattern_description: str
    accuracy_improvement: float
    timestamp: datetime


@dataclass
class SystemEntropy:
    """시스템 엔트로피"""
    timestamp: datetime
    total_nodes: int
    active_equations: int
    avg_prediction_accuracy: float
    cross_cluster_synergies: int
    self_sustaining_growth: bool


# ================================================================
# CONSTANTS
# ================================================================

SCALING_THRESHOLDS = {
    ScalingPhase.INDIVIDUAL: 100,
    ScalingPhase.PATTERN: 1000,
    ScalingPhase.EXPLOSION: 10000,
    ScalingPhase.SINGULARITY: float('inf'),
}

DIFFERENTIAL_PRIVACY = {
    "epsilon": 1.0,
    "delta": 1e-5,
    "sensitivity": 1.0,
}


# ================================================================
# DIFFERENTIAL PRIVACY
# ================================================================

class DifferentialPrivacyModule:
    """Differential Privacy 모듈"""
    
    def __init__(self, epsilon: float = 1.0, sensitivity: float = 1.0):
        self.epsilon = epsilon
        self.sensitivity = sensitivity
    
    def add_noise(self, value: float) -> Tuple[float, float]:
        scale = self.sensitivity / self.epsilon
        noise = random.gauss(0, scale)
        return value + noise, abs(noise)
    
    def add_noise_to_vector(self, vector: Dict[str, float]) -> Dict[str, float]:
        noisy_vector = {}
        for key, value in vector.items():
            noisy_value, _ = self.add_noise(value)
            noisy_vector[key] = noisy_value
        return noisy_vector


# ================================================================
# GRAND EQUATION AGGREGATOR
# ================================================================

class GrandEquationAggregator:
    """대수식 집계기"""
    
    def __init__(self):
        self.equations: Dict[str, GrandEquation] = {}
        self.privacy = DifferentialPrivacyModule(
            epsilon=DIFFERENTIAL_PRIVACY["epsilon"],
            sensitivity=DIFFERENTIAL_PRIVACY["sensitivity"]
        )
        self._initialize_equations()
    
    def _initialize_equations(self):
        base_equations = [
            {
                "type": FormulaType.CHURN_PREDICTION,
                "coefficients": {
                    "intercept": 0.5,
                    "energy_level": -0.3,
                    "engagement_rate": -0.25,
                    "days_since_contact": 0.02,
                    "competitor_interest": 0.2,
                }
            },
            {
                "type": FormulaType.ENGAGEMENT_BOOST,
                "coefficients": {
                    "intercept": 0.3,
                    "personalized_content": 0.25,
                    "timing_score": 0.2,
                    "previous_response": 0.15,
                    "milestone_proximity": 0.1,
                }
            },
            {
                "type": FormulaType.TIMING_PATTERN,
                "coefficients": {
                    "intercept": 0.4,
                    "hour_9_12": 0.15,
                    "hour_18_21": 0.2,
                    "weekend_factor": -0.1,
                    "after_exercise": 0.25,
                }
            },
            {
                "type": FormulaType.REVENUE_OPTIMIZE,
                "coefficients": {
                    "intercept": 0.2,
                    "trust_score": 0.3,
                    "usage_intensity": 0.2,
                    "referral_made": 0.15,
                    "premium_interest_signal": 0.35,
                }
            },
        ]
        
        for eq_data in base_equations:
            eq_id = f"EQ_{eq_data['type'].value}"
            self.equations[eq_id] = GrandEquation(
                id=eq_id,
                formula_type=eq_data["type"],
                coefficients=eq_data["coefficients"],
                created_at=datetime.now(),
                updated_at=datetime.now(),
                contributing_vectors=0,
                accuracy=0.6,
                confidence=0.5,
                applicable_clusters=[]
            )
    
    def federated_update(
        self,
        vectors: List[SuccessVector],
        cluster_id: str,
        learning_rate: float = 0.01
    ) -> Dict:
        if not vectors:
            return {"updated": 0, "equations": []}
        
        updated_equations = []
        
        for eq_id, equation in self.equations.items():
            relevant_vectors = self._filter_relevant_vectors(vectors, equation.formula_type)
            
            if not relevant_vectors:
                continue
            
            noisy_gradients = self._calculate_noisy_gradients(relevant_vectors, equation)
            
            for key in equation.coefficients:
                if key in noisy_gradients:
                    equation.coefficients[key] += learning_rate * noisy_gradients[key]
            
            equation.updated_at = datetime.now()
            equation.contributing_vectors += len(relevant_vectors)
            
            if cluster_id not in equation.applicable_clusters:
                equation.applicable_clusters.append(cluster_id)
            
            updated_equations.append(eq_id)
        
        return {
            "updated": len(updated_equations),
            "equations": updated_equations,
            "vectors_processed": len(vectors),
            "privacy_preserved": True
        }
    
    def _filter_relevant_vectors(
        self,
        vectors: List[SuccessVector],
        formula_type: FormulaType
    ) -> List[SuccessVector]:
        type_action_map = {
            FormulaType.CHURN_PREDICTION: ["retention", "churn", "engagement"],
            FormulaType.ENGAGEMENT_BOOST: ["open", "click", "response"],
            FormulaType.TIMING_PATTERN: ["send", "notify", "report"],
            FormulaType.REVENUE_OPTIMIZE: ["purchase", "upgrade", "referral"],
        }
        
        relevant_actions = type_action_map.get(formula_type, [])
        return [v for v in vectors if any(a in v.action_type.lower() for a in relevant_actions)]
    
    def _calculate_noisy_gradients(
        self,
        vectors: List[SuccessVector],
        equation: GrandEquation
    ) -> Dict[str, float]:
        gradients = {}
        
        for key in equation.coefficients:
            if key == "intercept":
                continue
            
            deltas = []
            for v in vectors:
                if hasattr(v, key.replace("_", "")):
                    deltas.append(getattr(v, key.replace("_", ""), 0))
            
            if deltas:
                avg_delta = sum(deltas) / len(deltas)
                noisy_delta, _ = self.privacy.add_noise(avg_delta)
                gradients[key] = noisy_delta
        
        return gradients
    
    def get_equation(self, formula_type: FormulaType) -> Optional[GrandEquation]:
        eq_id = f"EQ_{formula_type.value}"
        return self.equations.get(eq_id)
    
    def predict(
        self,
        formula_type: FormulaType,
        input_data: Dict[str, float]
    ) -> Dict:
        equation = self.get_equation(formula_type)
        
        if not equation:
            return {"success": False, "error": "Equation not found"}
        
        prediction = equation.predict(input_data)
        
        return {
            "success": True,
            "formula_type": formula_type.value,
            "prediction": prediction,
            "confidence": equation.confidence,
            "contributing_data_points": equation.contributing_vectors
        }


# ================================================================
# CROSS-NODE SYNERGY TRACKER
# ================================================================

class CrossNodeSynergyTracker:
    """크로스 노드 시너지 추적기"""
    
    def __init__(self, aggregator: GrandEquationAggregator):
        self.aggregator = aggregator
        self.clusters: Dict[str, ClusterProfile] = {}
        self.synergy_events: List[SynergyEvent] = []
    
    def register_cluster(
        self,
        cluster_id: str,
        cluster_type: ClusterType,
        location: str
    ) -> ClusterProfile:
        profile = ClusterProfile(
            cluster_id=cluster_id,
            cluster_type=cluster_type,
            location=location,
            total_nodes=0,
            active_nodes=0,
            avg_engagement=0.5,
            avg_retention=0.9,
            avg_revenue_per_node=500000,
            vectors_contributed=0,
            equations_applied=[]
        )
        
        self.clusters[cluster_id] = profile
        return profile
    
    def track_synergy(
        self,
        source_cluster: str,
        target_cluster: str,
        pattern_type: FormulaType,
        accuracy_before: float,
        accuracy_after: float
    ) -> Optional[SynergyEvent]:
        improvement = accuracy_after - accuracy_before
        
        if improvement <= 0:
            return None
        
        event = SynergyEvent(
            id=f"SYN_{datetime.now().timestamp():.0f}",
            source_cluster=source_cluster,
            target_cluster=target_cluster,
            pattern_type=pattern_type,
            pattern_description=f"{source_cluster}의 {pattern_type.value} 패턴이 {target_cluster}에 적용",
            accuracy_improvement=improvement,
            timestamp=datetime.now()
        )
        
        self.synergy_events.append(event)
        return event
    
    def calculate_network_effect(self) -> Dict:
        n = sum(c.active_nodes for c in self.clusters.values())
        
        if n == 0:
            return {"n": 0, "effect_type": "none", "value": 0}
        
        simple_connections = n * (n - 1) / 2
        synergy_count = len(self.synergy_events)
        cluster_count = len(self.clusters)
        
        synergy_ratio = synergy_count / max(cluster_count * (cluster_count - 1), 1)
        scaling_exponent = 2.0 + min(synergy_ratio, 1.0)
        network_value = n ** scaling_exponent
        
        return {
            "n": n,
            "simple_connections": simple_connections,
            "synergy_count": synergy_count,
            "scaling_exponent": scaling_exponent,
            "network_value": network_value,
            "effect_type": "n³" if scaling_exponent >= 2.5 else "n²",
        }


# ================================================================
# SINGULARITY DETECTOR
# ================================================================

class SingularityDetector:
    """임계질량 감지기"""
    
    def __init__(
        self,
        aggregator: GrandEquationAggregator,
        synergy_tracker: CrossNodeSynergyTracker
    ):
        self.aggregator = aggregator
        self.synergy_tracker = synergy_tracker
        self.entropy_history: List[SystemEntropy] = []
    
    def measure_entropy(self) -> SystemEntropy:
        total_nodes = sum(
            c.active_nodes for c in self.synergy_tracker.clusters.values()
        )
        
        active_equations = len([
            eq for eq in self.aggregator.equations.values()
            if eq.contributing_vectors > 10
        ])
        
        avg_accuracy = sum(
            eq.accuracy for eq in self.aggregator.equations.values()
        ) / max(len(self.aggregator.equations), 1)
        
        cross_synergies = len(self.synergy_tracker.synergy_events)
        
        self_sustaining = (
            avg_accuracy >= 0.8 and
            cross_synergies >= 10 and
            total_nodes >= 100
        )
        
        entropy = SystemEntropy(
            timestamp=datetime.now(),
            total_nodes=total_nodes,
            active_equations=active_equations,
            avg_prediction_accuracy=avg_accuracy,
            cross_cluster_synergies=cross_synergies,
            self_sustaining_growth=self_sustaining
        )
        
        self.entropy_history.append(entropy)
        return entropy
    
    def get_current_phase(self) -> ScalingPhase:
        if not self.entropy_history:
            return ScalingPhase.INDIVIDUAL
        
        latest = self.entropy_history[-1]
        n = latest.total_nodes
        
        if latest.self_sustaining_growth:
            return ScalingPhase.SINGULARITY
        elif n >= SCALING_THRESHOLDS[ScalingPhase.PATTERN]:
            return ScalingPhase.EXPLOSION
        elif n >= SCALING_THRESHOLDS[ScalingPhase.INDIVIDUAL]:
            return ScalingPhase.PATTERN
        else:
            return ScalingPhase.INDIVIDUAL
    
    def get_scaling_report(self) -> Dict:
        phase = self.get_current_phase()
        network_effect = self.synergy_tracker.calculate_network_effect()
        
        phase_descriptions = {
            ScalingPhase.INDIVIDUAL: "개별 최적화 단계",
            ScalingPhase.PATTERN: "패턴 인식 단계",
            ScalingPhase.EXPLOSION: "가치 폭발 단계",
            ScalingPhase.SINGULARITY: "임계질량 돌파",
        }
        
        return {
            "current_phase": phase.value,
            "phase_description": phase_descriptions[phase],
            "network_effect": network_effect,
            "equations_active": len(self.aggregator.equations),
            "clusters_connected": len(self.synergy_tracker.clusters),
            "total_synergies": len(self.synergy_tracker.synergy_events),
        }


# ================================================================
# INTEGRATED ENGINE
# ================================================================

class NetworkEffectEngine:
    """네트워크 효과 통합 엔진"""
    
    def __init__(self):
        self.aggregator = GrandEquationAggregator()
        self.synergy_tracker = CrossNodeSynergyTracker(self.aggregator)
        self.singularity_detector = SingularityDetector(self.aggregator, self.synergy_tracker)
    
    def process_local_vectors(
        self,
        cluster_id: str,
        vectors: List[SuccessVector]
    ) -> Dict:
        update_result = self.aggregator.federated_update(vectors, cluster_id)
        
        if cluster_id in self.synergy_tracker.clusters:
            self.synergy_tracker.clusters[cluster_id].vectors_contributed += len(vectors)
        
        entropy = self.singularity_detector.measure_entropy()
        
        return {
            "update_result": update_result,
            "current_phase": self.singularity_detector.get_current_phase().value,
            "entropy": {
                "total_nodes": entropy.total_nodes,
                "accuracy": entropy.avg_prediction_accuracy,
                "self_sustaining": entropy.self_sustaining_growth,
            }
        }
    
    def get_full_report(self) -> Dict:
        return {
            "scaling": self.singularity_detector.get_scaling_report(),
            "network_effect": self.synergy_tracker.calculate_network_effect(),
        }


# ================================================================
# TEST
# ================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("AUTUS Grand Equation & Network Effect Test")
    print("=" * 70)
    
    engine = NetworkEffectEngine()
    
    profile = engine.synergy_tracker.register_cluster("GANGNAM_01", ClusterType.HIGH, "강남")
    profile.active_nodes = 50
    print(f"\n[클러스터] {profile.cluster_id}: {profile.active_nodes} nodes")
    
    test_input = {
        "energy_level": 0.4,
        "engagement_rate": 0.6,
        "days_since_contact": 14,
        "competitor_interest": 0.3,
    }
    
    prediction = engine.aggregator.predict(FormulaType.CHURN_PREDICTION, test_input)
    print(f"\n[예측] Churn Probability: {prediction['prediction']:.2%}")
    
    report = engine.singularity_detector.get_scaling_report()
    print(f"\n[스케일링] Phase: {report['current_phase']}")
    
    print("\n" + "=" * 70)
    print("✅ Grand Equation Test Complete")
