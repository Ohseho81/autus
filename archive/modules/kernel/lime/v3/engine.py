"""
Lime Kernel v3.0 - Advanced Mathematical Engine
================================================
15가지 고도화 요소 통합:

1. 실제 데이터 피드백 (Ground Truth Calibration)
2. 시계열 패턴 학습 (Sequence Modeling)
3. 외부 변수 통합 (Exogenous Factors)
4. 불확실성 정량화 (Uncertainty Quantification)
5. 인과관계 모델링 (Causal Inference)
6. 개인별 학습률 (Personalized Learning Rate)
7. 이벤트 간 상호작용 (Event Interaction)
8. 포화 효과 (Saturation / Diminishing Returns)
9. 임계점 / 상전이 (Phase Transition)
10. 네트워크 효과 (Social/Network Effects)
11. 히스테리시스 (Path Dependency)
12. 멀티스케일 시간 역학 (Multi-scale Temporal)
13. 역방향 전파 (Backward Propagation)
14. 리스크 상관관계 (Correlated Risk)
15. 레짐 전환 (Regime Switching)

Version: 3.0.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
import math
import random

# ============================================================
# CONSTANTS & CONFIGURATIONS
# ============================================================

AXES = ["DIR", "FOR", "GAP", "UNC", "TEM", "INT"]

# Base calibrated matrix (from v2)
BASE_MATRIX: Dict[str, Dict[str, float]] = {
    "HUM": {"DIR": 0.15, "FOR": 0.25, "GAP": -0.10, "UNC": -0.15, "TEM": 0.10, "INT": 0.20},
    "EDU": {"DIR": 0.20, "FOR": 0.15, "GAP": -0.25, "UNC": -0.20, "TEM": 0.15, "INT": 0.25},
    "EMP": {"DIR": 0.25, "FOR": 0.30, "GAP": -0.20, "UNC": -0.15, "TEM": 0.10, "INT": 0.30},
    "GOV": {"DIR": 0.30, "FOR": 0.20, "GAP": -0.15, "UNC": -0.30, "TEM": 0.20, "INT": 0.25},
    "FIN": {"DIR": 0.20, "FOR": 0.35, "GAP": -0.30, "UNC": -0.25, "TEM": 0.15, "INT": 0.20},
    "SOC": {"DIR": 0.15, "FOR": 0.20, "GAP": -0.15, "UNC": -0.20, "TEM": 0.25, "INT": 0.35},
}

# Cross-axis correlations
CROSS_AXIS: Dict[str, Dict[str, float]] = {
    "DIR": {"FOR": 0.15, "UNC": -0.20, "INT": 0.10},
    "FOR": {"DIR": 0.10, "GAP": -0.15, "TEM": 0.05},
    "GAP": {"UNC": 0.25, "INT": -0.20, "FOR": -0.10},
    "UNC": {"DIR": -0.15, "INT": -0.25, "TEM": -0.10},
    "TEM": {"FOR": 0.10, "INT": 0.15},
    "INT": {"UNC": -0.20, "GAP": -0.15, "DIR": 0.10},
}

# Event interaction synergies (Event A + Event B = bonus)
EVENT_SYNERGIES: Dict[Tuple[str, str], Dict[str, float]] = {
    ("EDU:Completed", "EMP:Matched"): {"DIR": 0.10, "INT": 0.15, "UNC": -0.10},
    ("GOV:VisaApproved", "EMP:Started"): {"FOR": 0.15, "GAP": -0.15, "INT": 0.10},
    ("EDU:Certified", "GOV:VisaApproved"): {"DIR": 0.12, "UNC": -0.15},
    ("EMP:Promoted", "FIN:SalaryIncrease"): {"FOR": 0.20, "INT": 0.10},
    ("SOC:CommunityJoined", "INT:LanguagePassed"): {"GAP": -0.20, "INT": 0.15},
}

# Phase transition thresholds
PHASE_THRESHOLDS: Dict[str, Dict[str, float]] = {
    "breakthrough": {"DIR": 0.75, "UNC": 0.25, "INT": 0.70},  # 급성장 조건
    "crisis": {"UNC": 0.80, "GAP": 0.75},  # 위기 진입 조건
    "stability": {"DIR": 0.60, "FOR": 0.60, "UNC": 0.35},  # 안정 상태 조건
}

# Phase transition bonuses/penalties
PHASE_EFFECTS: Dict[str, Dict[str, float]] = {
    "breakthrough": {"DIR": 0.15, "FOR": 0.10, "INT": 0.12, "UNC": -0.10},
    "crisis": {"FOR": -0.20, "UNC": 0.15, "INT": -0.10},
    "stability": {"TEM": 0.10, "INT": 0.08},
}

# Multi-scale temporal decay rates
TEMPORAL_SCALES = {
    "short": {"tau": 7, "weight": 0.5},    # 7일, 단기 효과
    "mid": {"tau": 30, "weight": 0.35},    # 30일, 중기 효과
    "long": {"tau": 90, "weight": 0.15},   # 90일, 장기 효과
}

# Event duration classification
EVENT_DURATION: Dict[str, str] = {
    "HUM:Registered": "long",
    "EDU:Enrolled": "long",
    "EDU:Completed": "long",
    "EDU:Certified": "long",
    "EMP:Matched": "mid",
    "EMP:Started": "long",
    "EMP:Promoted": "long",
    "GOV:VisaApproved": "mid",
    "GOV:VisaIssue": "short",
    "FIN:SalaryIncrease": "mid",
    "SOC:CommunityJoined": "long",
}

# Regime definitions
REGIMES = {
    "normal": {"volatility_threshold": 0.3, "weight_multiplier": 1.0},
    "growth": {"volatility_threshold": 0.2, "weight_multiplier": 1.3},
    "crisis": {"volatility_threshold": 0.5, "weight_multiplier": 0.7},
}

# Risk correlation matrix
RISK_CORRELATION: Dict[Tuple[str, str], float] = {
    ("GAP", "UNC"): 0.65,
    ("UNC", "INT"): -0.55,
    ("DIR", "FOR"): 0.45,
    ("GAP", "INT"): -0.50,
    ("FOR", "TEM"): 0.35,
}


# ============================================================
# DATA CLASSES
# ============================================================

@dataclass
class HumProfile:
    """개인 프로파일 (개인별 학습률 포함)"""
    hum_id: str
    sensitivity: Dict[str, float] = field(default_factory=lambda: {axis: 1.0 for axis in AXES})
    experience_level: float = 0.0  # 0.0 (신입) ~ 1.0 (경력)
    risk_tolerance: float = 0.5   # 0.0 (보수적) ~ 1.0 (적극적)
    historical_max: Dict[str, float] = field(default_factory=dict)
    historical_min: Dict[str, float] = field(default_factory=dict)
    event_history: List[str] = field(default_factory=list)
    peers: List[str] = field(default_factory=list)  # 네트워크 연결


@dataclass
class ExternalContext:
    """외부 환경 변수"""
    economic_index: float = 0.5      # 0.0 (불황) ~ 1.0 (호황)
    policy_stability: float = 0.7    # 정책 안정성
    season_factor: float = 1.0       # 계절성 (채용 시즌 등)
    market_demand: float = 0.5       # 시장 수요


@dataclass
class UncertaintyEstimate:
    """불확실성 정량화 결과"""
    mean: float
    std: float
    ci_lower: float  # 95% CI 하한
    ci_upper: float  # 95% CI 상한
    confidence: float  # 추정 신뢰도


@dataclass
class VectorUpdateV3:
    """v3 벡터 업데이트 결과"""
    old_vector: Dict[str, float]
    new_vector: Dict[str, float]
    delta: Dict[str, float]
    
    # 고도화 요소별 기여
    base_effect: Dict[str, float]
    saturation_effect: Dict[str, float]
    cross_axis_effect: Dict[str, float]
    synergy_effect: Dict[str, float]
    phase_transition_effect: Dict[str, float]
    temporal_decay: Dict[str, float]
    network_effect: Dict[str, float]
    hysteresis_effect: Dict[str, float]
    regime_adjustment: Dict[str, float]
    external_effect: Dict[str, float]
    personal_modifier: Dict[str, float]
    
    # 메타 정보
    regime: str
    phase_triggered: Optional[str]
    uncertainty: Dict[str, UncertaintyEstimate]
    risk_score: float
    correlated_risk: float
    timestamp: str


@dataclass
class BackwardPlan:
    """역방향 전파 결과 - 목표 달성을 위한 계획"""
    target_state: Dict[str, float]
    current_state: Dict[str, float]
    gap_analysis: Dict[str, float]
    recommended_events: List[Dict[str, Any]]
    estimated_duration_days: int
    success_probability: float
    critical_path: List[str]


# ============================================================
# MAIN ENGINE CLASS
# ============================================================

class LimeKernelV3:
    """
    Lime Kernel v3.0 - 15가지 고도화 요소 통합 엔진
    """
    
    def __init__(
        self,
        country: str = "KR",
        industry: str = "general"
    ):
        self.country = country
        self.industry = industry
        self.alpha = self._get_country_multiplier(country)
        self.beta = self._get_industry_multiplier(industry)
        
        # 학습된 가중치 저장소 (Ground Truth Calibration용)
        self.learned_weights: Dict[str, float] = {}
        self.calibration_data: List[Dict] = []
        
        # 피어 네트워크 저장소
        self.peer_network: Dict[str, Dict[str, float]] = {}
        
    def _get_country_multiplier(self, country: str) -> float:
        return {"KR": 1.0, "PH": 0.95, "VN": 0.90, "JP": 1.05, "US": 1.02}.get(country, 0.85)
    
    def _get_industry_multiplier(self, industry: str) -> float:
        return {"education": 1.10, "manufacturing": 1.05, "tech": 1.15, "service": 1.00}.get(industry, 1.00)
    
    # ============================================================
    # 1. GROUND TRUTH CALIBRATION
    # ============================================================
    
    def add_calibration_data(self, case: Dict[str, Any]):
        """실제 케이스 데이터 추가 (피드백 학습용)"""
        self.calibration_data.append(case)
        if len(self.calibration_data) >= 10:
            self._recalibrate_weights()
    
    def _recalibrate_weights(self):
        """실제 데이터 기반 가중치 재보정"""
        if len(self.calibration_data) < 10:
            return
        
        # 간단한 선형 회귀 기반 보정
        for source in BASE_MATRIX.keys():
            for axis in AXES:
                errors = []
                for case in self.calibration_data[-100:]:
                    if case.get("source") == source:
                        predicted = case.get("predicted_success", 0.5)
                        actual = case.get("actual_success", 0.5)
                        errors.append(actual - predicted)
                
                if errors:
                    avg_error = sum(errors) / len(errors)
                    key = f"{source}:{axis}"
                    current = self.learned_weights.get(key, BASE_MATRIX[source][axis])
                    # 학습률 0.1로 점진적 조정
                    self.learned_weights[key] = current + 0.1 * avg_error
    
    def get_calibrated_weight(self, source: str, axis: str) -> float:
        """보정된 가중치 반환"""
        key = f"{source}:{axis}"
        if key in self.learned_weights:
            return self.learned_weights[key]
        return BASE_MATRIX.get(source, BASE_MATRIX["HUM"]).get(axis, 0.1)
    
    # ============================================================
    # 2. SEQUENCE MODELING
    # ============================================================
    
    def calculate_sequence_bonus(self, event_history: List[str], new_event: str) -> Dict[str, float]:
        """이벤트 시퀀스에 따른 보너스 계산"""
        bonus = {axis: 0.0 for axis in AXES}
        
        if not event_history:
            return bonus
        
        # 최근 3개 이벤트와의 시퀀스 패턴 분석
        recent = event_history[-3:]
        
        # 이상적인 시퀀스 패턴
        ideal_sequences = {
            ("EDU:Enrolled", "EDU:Completed", "EMP:Matched"): {"DIR": 0.08, "INT": 0.10},
            ("EMP:Matched", "GOV:VisaApproved", "EMP:Started"): {"FOR": 0.10, "UNC": -0.12},
            ("EDU:Certified", "EMP:Matched", "GOV:VisaApproved"): {"DIR": 0.12, "GAP": -0.08},
        }
        
        for seq, effect in ideal_sequences.items():
            if len(recent) >= len(seq) - 1:
                check_seq = tuple(recent[-(len(seq)-1):]) + (new_event,)
                if check_seq == seq:
                    for axis, val in effect.items():
                        bonus[axis] += val
        
        # 반복 이벤트 페널티
        if new_event in recent:
            bonus["FOR"] -= 0.05  # 같은 이벤트 반복 시 동력 감소
        
        return bonus
    
    # ============================================================
    # 3. EXTERNAL FACTORS
    # ============================================================
    
    def apply_external_context(
        self,
        delta: Dict[str, float],
        context: ExternalContext
    ) -> Dict[str, float]:
        """외부 환경 변수 적용"""
        adjusted = delta.copy()
        
        # 경제 지표 영향
        econ_factor = 0.8 + (context.economic_index * 0.4)  # 0.8 ~ 1.2
        adjusted["FOR"] = adjusted.get("FOR", 0) * econ_factor
        adjusted["GAP"] = adjusted.get("GAP", 0) * (2 - econ_factor)  # 역방향
        
        # 정책 안정성 영향
        policy_factor = 0.7 + (context.policy_stability * 0.6)  # 0.7 ~ 1.3
        adjusted["UNC"] = adjusted.get("UNC", 0) * (2 - policy_factor)
        adjusted["DIR"] = adjusted.get("DIR", 0) * policy_factor
        
        # 계절성 영향
        adjusted["TEM"] = adjusted.get("TEM", 0) * context.season_factor
        
        # 시장 수요 영향
        market_factor = 0.85 + (context.market_demand * 0.3)
        adjusted["EMP"] = adjusted.get("INT", 0) * market_factor
        
        return adjusted
    
    # ============================================================
    # 4. UNCERTAINTY QUANTIFICATION
    # ============================================================
    
    def quantify_uncertainty(
        self,
        vector: Dict[str, float],
        n_samples: int = 1000
    ) -> Dict[str, UncertaintyEstimate]:
        """불확실성 정량화 (Monte Carlo 시뮬레이션)"""
        results = {}
        
        for axis in AXES:
            value = vector.get(axis, 0.5)
            
            # 값에 따른 불확실성 (극단값은 더 확실)
            base_std = 0.1 * (1 - abs(value - 0.5) * 2)
            
            # 샘플링
            samples = [max(0, min(1, random.gauss(value, base_std))) for _ in range(n_samples)]
            
            mean = sum(samples) / len(samples)
            variance = sum((s - mean) ** 2 for s in samples) / len(samples)
            std = math.sqrt(variance)
            
            # 95% CI
            sorted_samples = sorted(samples)
            ci_lower = sorted_samples[int(n_samples * 0.025)]
            ci_upper = sorted_samples[int(n_samples * 0.975)]
            
            # 신뢰도 (데이터가 많을수록, 분산이 작을수록 높음)
            confidence = max(0.5, min(0.99, 1 - std * 2))
            
            results[axis] = UncertaintyEstimate(
                mean=round(mean, 4),
                std=round(std, 4),
                ci_lower=round(ci_lower, 4),
                ci_upper=round(ci_upper, 4),
                confidence=round(confidence, 4)
            )
        
        return results
    
    # ============================================================
    # 5. CAUSAL INFERENCE (Simplified)
    # ============================================================
    
    def estimate_causal_effect(
        self,
        event_code: str,
        vector: Dict[str, float]
    ) -> Dict[str, float]:
        """인과 효과 추정 (do-calculus 단순화 버전)"""
        # 관찰된 효과 vs 개입 효과의 차이를 모델링
        
        causal_multipliers = {
            # 이벤트: {축: 인과 강도}
            "EDU:Completed": {"DIR": 1.3, "GAP": 1.2},  # 교육 완료는 실제로 더 큰 인과 효과
            "GOV:VisaApproved": {"UNC": 1.5, "FOR": 1.2},  # 비자 승인은 불확실성에 강한 인과
            "EMP:Started": {"INT": 1.4, "FOR": 1.3},  # 취업 시작은 통합에 강한 인과
        }
        
        base_effect = BASE_MATRIX.get(event_code.split(":")[0], BASE_MATRIX["HUM"])
        causal_effect = base_effect.copy()
        
        if event_code in causal_multipliers:
            for axis, multiplier in causal_multipliers[event_code].items():
                if axis in causal_effect:
                    causal_effect[axis] *= multiplier
        
        return causal_effect
    
    # ============================================================
    # 6. PERSONALIZED LEARNING RATE
    # ============================================================
    
    def apply_personal_sensitivity(
        self,
        delta: Dict[str, float],
        profile: HumProfile
    ) -> Dict[str, float]:
        """개인별 민감도 적용"""
        adjusted = {}
        
        for axis, value in delta.items():
            base_sensitivity = profile.sensitivity.get(axis, 1.0)
            
            # 경력자는 교육 효과 감소, 실무 효과 증가
            if axis in ["DIR", "FOR"] and profile.experience_level > 0.5:
                exp_modifier = 1 + (profile.experience_level - 0.5) * 0.3
            elif axis == "GAP" and profile.experience_level > 0.5:
                exp_modifier = 1 - (profile.experience_level - 0.5) * 0.2  # GAP은 덜 줄어듦
            else:
                exp_modifier = 1.0
            
            # 리스크 성향에 따른 조정
            if axis == "UNC":
                risk_modifier = 1 + (0.5 - profile.risk_tolerance) * 0.3
            else:
                risk_modifier = 1.0
            
            adjusted[axis] = value * base_sensitivity * exp_modifier * risk_modifier
        
        return adjusted
    
    # ============================================================
    # 7. EVENT INTERACTION (Synergy)
    # ============================================================
    
    def calculate_synergy(
        self,
        event_history: List[str],
        new_event: str
    ) -> Dict[str, float]:
        """이벤트 간 상호작용 시너지 계산"""
        synergy = {axis: 0.0 for axis in AXES}
        
        # 최근 이벤트들과의 시너지 체크
        for past_event in event_history[-5:]:
            key = (past_event, new_event)
            reverse_key = (new_event, past_event)
            
            if key in EVENT_SYNERGIES:
                for axis, val in EVENT_SYNERGIES[key].items():
                    synergy[axis] += val
            elif reverse_key in EVENT_SYNERGIES:
                for axis, val in EVENT_SYNERGIES[reverse_key].items():
                    synergy[axis] += val * 0.7  # 순서 반대면 70% 효과
        
        return synergy
    
    # ============================================================
    # 8. SATURATION EFFECT
    # ============================================================
    
    def apply_saturation(
        self,
        current_value: float,
        delta: float,
        gamma: float = 1.5
    ) -> float:
        """포화 효과 적용 (한계 체감)"""
        if delta > 0:
            # 증가 시: 현재 값이 높을수록 효과 감소
            saturation_factor = (1 - current_value) ** gamma
        else:
            # 감소 시: 현재 값이 낮을수록 효과 감소
            saturation_factor = current_value ** gamma
        
        return delta * saturation_factor
    
    # ============================================================
    # 9. PHASE TRANSITION
    # ============================================================
    
    def check_phase_transition(
        self,
        vector: Dict[str, float]
    ) -> Tuple[Optional[str], Dict[str, float]]:
        """상전이 체크 및 효과 반환"""
        
        for phase_name, thresholds in PHASE_THRESHOLDS.items():
            triggered = True
            
            for axis, threshold in thresholds.items():
                value = vector.get(axis, 0.5)
                
                if axis == "UNC" or axis == "GAP":
                    # 낮아야 하는 축
                    if phase_name in ["breakthrough", "stability"]:
                        if value > threshold:
                            triggered = False
                            break
                    else:  # crisis
                        if value < threshold:
                            triggered = False
                            break
                else:
                    # 높아야 하는 축
                    if value < threshold:
                        triggered = False
                        break
            
            if triggered:
                return phase_name, PHASE_EFFECTS.get(phase_name, {})
        
        return None, {}
    
    # ============================================================
    # 10. NETWORK EFFECT
    # ============================================================
    
    def calculate_network_effect(
        self,
        profile: HumProfile,
        all_vectors: Dict[str, Dict[str, float]]
    ) -> Dict[str, float]:
        """네트워크 효과 계산"""
        effect = {axis: 0.0 for axis in AXES}
        
        if not profile.peers:
            return effect
        
        peer_count = 0
        for peer_id in profile.peers:
            if peer_id in all_vectors:
                peer_vector = all_vectors[peer_id]
                peer_count += 1
                
                for axis in AXES:
                    # 피어의 상태가 나에게 영향 (10% 전파)
                    peer_influence = (peer_vector.get(axis, 0.5) - 0.5) * 0.1
                    effect[axis] += peer_influence
        
        # 평균화
        if peer_count > 0:
            for axis in AXES:
                effect[axis] /= peer_count
        
        return effect
    
    # ============================================================
    # 11. HYSTERESIS (Path Dependency)
    # ============================================================
    
    def apply_hysteresis(
        self,
        vector: Dict[str, float],
        profile: HumProfile
    ) -> Dict[str, float]:
        """히스테리시스 효과 적용"""
        effect = {axis: 0.0 for axis in AXES}
        
        for axis in AXES:
            current = vector.get(axis, 0.5)
            hist_max = profile.historical_max.get(axis, current)
            hist_min = profile.historical_min.get(axis, current)
            
            # 최고점 대비 하락 시 트라우마 효과
            if axis in ["DIR", "FOR", "INT"]:
                if hist_max > 0.7 and current < hist_max - 0.2:
                    effect[axis] = -0.03  # 회복 저항
            
            # 최저점 대비 회복 시 탄력성 효과
            if axis in ["GAP", "UNC"]:
                if hist_min < 0.3 and current > hist_min + 0.2:
                    effect[axis] = 0.02  # 빠른 회복
            
            # 히스토리 업데이트
            profile.historical_max[axis] = max(hist_max, current)
            profile.historical_min[axis] = min(hist_min, current)
        
        return effect
    
    # ============================================================
    # 12. MULTI-SCALE TEMPORAL DYNAMICS
    # ============================================================
    
    def calculate_temporal_decay(
        self,
        days_since_event: int,
        event_code: str,
        original_delta: Dict[str, float]
    ) -> Dict[str, float]:
        """멀티스케일 시간 감쇠 계산"""
        duration_type = EVENT_DURATION.get(event_code, "mid")
        
        decayed = {}
        for axis, value in original_delta.items():
            total_decay = 0.0
            
            for scale_name, config in TEMPORAL_SCALES.items():
                tau = config["tau"]
                weight = config["weight"]
                
                # 이벤트 타입에 따른 스케일 가중치 조정
                if duration_type == "short" and scale_name == "short":
                    weight *= 1.5
                elif duration_type == "long" and scale_name == "long":
                    weight *= 1.5
                
                decay = math.exp(-days_since_event / tau) * weight
                total_decay += decay
            
            decayed[axis] = value * total_decay
        
        return decayed
    
    # ============================================================
    # 13. BACKWARD PROPAGATION
    # ============================================================
    
    def plan_backward(
        self,
        current_vector: Dict[str, float],
        target_vector: Dict[str, float],
        time_budget_days: int = 90,
        profile: Optional[HumProfile] = None
    ) -> BackwardPlan:
        """역방향 전파 - 목표 달성 계획 수립"""
        
        # Gap 분석
        gap = {axis: target_vector.get(axis, 0.5) - current_vector.get(axis, 0.5) 
               for axis in AXES}
        
        # 필요한 이벤트 추천
        recommended = []
        
        # 각 축별로 필요한 이벤트 매핑
        event_effects = {
            "DIR": ["EDU:Enrolled", "EDU:Completed", "GOV:VisaApproved"],
            "FOR": ["EMP:Matched", "EMP:Started", "FIN:SalaryIncrease"],
            "GAP": ["EDU:Completed", "SOC:CommunityJoined"],  # 감소시키는 이벤트
            "UNC": ["GOV:VisaApproved", "EMP:Started"],  # 감소시키는 이벤트
            "TEM": ["EDU:Certified", "EMP:Promoted"],
            "INT": ["SOC:CommunityJoined", "EMP:Started"],
        }
        
        priority_axes = sorted(gap.keys(), key=lambda x: abs(gap[x]), reverse=True)
        
        for axis in priority_axes[:3]:
            axis_gap = gap[axis]
            if abs(axis_gap) > 0.1:
                events = event_effects.get(axis, [])
                for event in events:
                    effect = BASE_MATRIX.get(event.split(":")[0], {}).get(axis, 0)
                    if (axis_gap > 0 and effect > 0) or (axis_gap < 0 and effect < 0):
                        recommended.append({
                            "event": event,
                            "target_axis": axis,
                            "expected_effect": effect,
                            "priority": abs(axis_gap)
                        })
        
        # 중복 제거 및 정렬
        seen = set()
        unique_recommended = []
        for r in sorted(recommended, key=lambda x: x["priority"], reverse=True):
            if r["event"] not in seen:
                seen.add(r["event"])
                unique_recommended.append(r)
        
        # 예상 소요 시간 계산
        total_gap = sum(abs(g) for g in gap.values())
        avg_effect_per_event = 0.15
        estimated_events = int(total_gap / avg_effect_per_event) + 1
        estimated_days = min(time_budget_days, estimated_events * 14)
        
        # 성공 확률 계산
        coverage = len(unique_recommended) / max(1, len([g for g in gap.values() if abs(g) > 0.1]))
        time_factor = min(1.0, time_budget_days / estimated_days)
        success_prob = min(0.95, coverage * time_factor * 0.8)
        
        # 크리티컬 패스
        critical = [r["event"] for r in unique_recommended[:5]]
        
        return BackwardPlan(
            target_state=target_vector,
            current_state=current_vector,
            gap_analysis=gap,
            recommended_events=unique_recommended[:10],
            estimated_duration_days=estimated_days,
            success_probability=round(success_prob, 2),
            critical_path=critical
        )
    
    # ============================================================
    # 14. CORRELATED RISK
    # ============================================================
    
    def calculate_correlated_risk(self, vector: Dict[str, float]) -> float:
        """상관 리스크 계산"""
        
        # 기본 리스크 (GAP, UNC 기반)
        base_risk = 0.3 * vector.get("GAP", 0.5) + 0.4 * vector.get("UNC", 0.5) + \
                    0.3 * (1 - vector.get("INT", 0.5))
        
        # 상관 리스크 추가
        corr_risk = 0.0
        for (axis1, axis2), corr in RISK_CORRELATION.items():
            v1 = vector.get(axis1, 0.5)
            v2 = vector.get(axis2, 0.5)
            
            # 양의 상관: 둘 다 높거나 낮으면 리스크 증가
            # 음의 상관: 반대 방향이면 리스크 감소
            if corr > 0:
                agreement = 1 - abs(v1 - v2)
                corr_risk += corr * agreement * 0.1
            else:
                disagreement = abs(v1 - v2)
                corr_risk += abs(corr) * (1 - disagreement) * 0.1
        
        total_risk = base_risk + corr_risk
        return round(max(0, min(1, total_risk)), 4)
    
    # ============================================================
    # 15. REGIME SWITCHING
    # ============================================================
    
    def detect_regime(
        self,
        vector: Dict[str, float],
        recent_deltas: List[Dict[str, float]]
    ) -> str:
        """현재 레짐 감지"""
        
        # 최근 변동성 계산
        if len(recent_deltas) < 3:
            return "normal"
        
        volatility = 0.0
        for delta in recent_deltas[-5:]:
            volatility += sum(abs(v) for v in delta.values())
        volatility /= len(recent_deltas[-5:])
        
        # 성장 지표
        growth_score = vector.get("DIR", 0.5) + vector.get("FOR", 0.5) - \
                       vector.get("UNC", 0.5)
        
        # 레짐 판정
        if volatility > REGIMES["crisis"]["volatility_threshold"] or \
           vector.get("UNC", 0.5) > 0.7:
            return "crisis"
        elif growth_score > 1.0 and volatility < REGIMES["growth"]["volatility_threshold"]:
            return "growth"
        else:
            return "normal"
    
    def apply_regime_adjustment(
        self,
        delta: Dict[str, float],
        regime: str
    ) -> Dict[str, float]:
        """레짐에 따른 가중치 조정"""
        multiplier = REGIMES.get(regime, REGIMES["normal"])["weight_multiplier"]
        
        adjusted = {}
        for axis, value in delta.items():
            if regime == "crisis":
                # 위기 시 부정적 효과 증폭, 긍정적 효과 감소
                if value < 0:
                    adjusted[axis] = value * 1.3
                else:
                    adjusted[axis] = value * 0.7
            elif regime == "growth":
                # 성장기 시 긍정적 효과 증폭
                if value > 0:
                    adjusted[axis] = value * 1.3
                else:
                    adjusted[axis] = value * 0.9
            else:
                adjusted[axis] = value * multiplier
        
        return adjusted
    
    # ============================================================
    # MAIN EVENT APPLICATION
    # ============================================================
    
    def apply_event(
        self,
        current_vector: Dict[str, float],
        source: str,
        event_delta: Dict[str, float],
        event_code: str = "UNKNOWN",
        profile: Optional[HumProfile] = None,
        context: Optional[ExternalContext] = None,
        days_since_last: int = 0,
        all_peer_vectors: Optional[Dict[str, Dict[str, float]]] = None,
        recent_deltas: Optional[List[Dict[str, float]]] = None
    ) -> VectorUpdateV3:
        """
        이벤트 적용 - 15가지 고도화 요소 통합
        """
        
        # 기본값 설정
        if profile is None:
            profile = HumProfile(hum_id="default")
        if context is None:
            context = ExternalContext()
        if all_peer_vectors is None:
            all_peer_vectors = {}
        if recent_deltas is None:
            recent_deltas = []
        
        old_vector = current_vector.copy()
        new_vector = current_vector.copy()
        
        # 효과 추적용
        effects = {
            "base": {axis: 0.0 for axis in AXES},
            "saturation": {axis: 0.0 for axis in AXES},
            "cross_axis": {axis: 0.0 for axis in AXES},
            "synergy": {axis: 0.0 for axis in AXES},
            "phase_transition": {axis: 0.0 for axis in AXES},
            "temporal": {axis: 0.0 for axis in AXES},
            "network": {axis: 0.0 for axis in AXES},
            "hysteresis": {axis: 0.0 for axis in AXES},
            "regime": {axis: 0.0 for axis in AXES},
            "external": {axis: 0.0 for axis in AXES},
            "personal": {axis: 0.0 for axis in AXES},
        }
        
        # 15. 레짐 감지
        regime = self.detect_regime(current_vector, recent_deltas)
        
        # 1. 기본 가중치 (Ground Truth 보정 포함)
        base_effect = {}
        for axis, delta in event_delta.items():
            weight = self.get_calibrated_weight(source, axis)
            base_effect[axis] = delta * weight * self.alpha * self.beta
        effects["base"] = base_effect.copy()
        
        # 5. 인과 효과 적용
        causal_effect = self.estimate_causal_effect(event_code, current_vector)
        for axis in base_effect:
            if axis in causal_effect:
                base_effect[axis] *= causal_effect.get(axis, 1.0) / BASE_MATRIX.get(source, {}).get(axis, 1.0) if BASE_MATRIX.get(source, {}).get(axis, 0) != 0 else 1.0
        
        # 6. 개인별 민감도
        personal_effect = self.apply_personal_sensitivity(base_effect, profile)
        effects["personal"] = {axis: personal_effect.get(axis, 0) - base_effect.get(axis, 0) for axis in AXES}
        
        # 3. 외부 환경 적용
        external_effect = self.apply_external_context(personal_effect, context)
        effects["external"] = {axis: external_effect.get(axis, 0) - personal_effect.get(axis, 0) for axis in AXES}
        
        # 15. 레짐 조정
        regime_effect = self.apply_regime_adjustment(external_effect, regime)
        effects["regime"] = {axis: regime_effect.get(axis, 0) - external_effect.get(axis, 0) for axis in AXES}
        
        # 8. 포화 효과
        saturated_effect = {}
        for axis, delta in regime_effect.items():
            current_val = new_vector.get(axis, 0.5)
            saturated = self.apply_saturation(current_val, delta)
            saturated_effect[axis] = saturated
            effects["saturation"][axis] = saturated - delta
        
        # 적용
        for axis, delta in saturated_effect.items():
            new_vector[axis] = self._clamp(new_vector.get(axis, 0.5) + delta)
        
        # 7. 이벤트 시너지
        synergy = self.calculate_synergy(profile.event_history, event_code)
        for axis, val in synergy.items():
            effects["synergy"][axis] = val
            new_vector[axis] = self._clamp(new_vector.get(axis, 0.5) + val)
        
        # 2. 시퀀스 보너스
        seq_bonus = self.calculate_sequence_bonus(profile.event_history, event_code)
        for axis, val in seq_bonus.items():
            new_vector[axis] = self._clamp(new_vector.get(axis, 0.5) + val)
        
        # Cross-axis effects
        for src_axis, delta in saturated_effect.items():
            if src_axis in CROSS_AXIS and abs(delta) > 0.01:
                for tgt_axis, corr in CROSS_AXIS[src_axis].items():
                    cross_effect = delta * corr
                    effects["cross_axis"][tgt_axis] += cross_effect
                    new_vector[tgt_axis] = self._clamp(new_vector.get(tgt_axis, 0.5) + cross_effect)
        
        # 9. 상전이 체크
        phase_triggered, phase_effect = self.check_phase_transition(new_vector)
        if phase_effect:
            for axis, val in phase_effect.items():
                effects["phase_transition"][axis] = val
                new_vector[axis] = self._clamp(new_vector.get(axis, 0.5) + val)
        
        # 10. 네트워크 효과
        network_effect = self.calculate_network_effect(profile, all_peer_vectors)
        for axis, val in network_effect.items():
            effects["network"][axis] = val
            new_vector[axis] = self._clamp(new_vector.get(axis, 0.5) + val)
        
        # 11. 히스테리시스
        hysteresis_effect = self.apply_hysteresis(new_vector, profile)
        for axis, val in hysteresis_effect.items():
            effects["hysteresis"][axis] = val
            new_vector[axis] = self._clamp(new_vector.get(axis, 0.5) + val)
        
        # 12. 시간 감쇠 (이전 이벤트 효과)
        if days_since_last > 0:
            decay = self.calculate_temporal_decay(days_since_last, event_code, saturated_effect)
            for axis in AXES:
                decay_diff = decay.get(axis, 0) - saturated_effect.get(axis, 0)
                effects["temporal"][axis] = decay_diff
        
        # 이벤트 히스토리 업데이트
        profile.event_history.append(event_code)
        
        # 최종 클램핑
        for axis in AXES:
            new_vector[axis] = self._clamp(new_vector.get(axis, 0.5))
        
        # 4. 불확실성 정량화
        uncertainty = self.quantify_uncertainty(new_vector)
        
        # 14. 상관 리스크
        risk_score = 0.3 * new_vector.get("GAP", 0.5) + 0.4 * new_vector.get("UNC", 0.5) + \
                     0.3 * (1 - new_vector.get("INT", 0.5))
        correlated_risk = self.calculate_correlated_risk(new_vector)
        
        # 총 델타
        total_delta = {axis: new_vector[axis] - old_vector[axis] for axis in AXES}
        
        return VectorUpdateV3(
            old_vector=old_vector,
            new_vector=new_vector,
            delta=total_delta,
            base_effect=effects["base"],
            saturation_effect=effects["saturation"],
            cross_axis_effect=effects["cross_axis"],
            synergy_effect=effects["synergy"],
            phase_transition_effect=effects["phase_transition"],
            temporal_decay=effects["temporal"],
            network_effect=effects["network"],
            hysteresis_effect=effects["hysteresis"],
            regime_adjustment=effects["regime"],
            external_effect=effects["external"],
            personal_modifier=effects["personal"],
            regime=regime,
            phase_triggered=phase_triggered,
            uncertainty=uncertainty,
            risk_score=round(risk_score, 4),
            correlated_risk=correlated_risk,
            timestamp=datetime.now().isoformat()
        )
    
    def _clamp(self, value: float, min_val: float = 0.0, max_val: float = 1.0) -> float:
        return round(max(min_val, min(max_val, value)), 4)
    
    # ============================================================
    # UTILITY METHODS
    # ============================================================
    
    def create_initial_vector(self, profile_type: str = "standard") -> Dict[str, float]:
        """초기 벡터 생성"""
        profiles = {
            "standard": {"DIR": 0.30, "FOR": 0.40, "GAP": 0.70, "UNC": 0.60, "TEM": 0.50, "INT": 0.25},
            "optimistic": {"DIR": 0.45, "FOR": 0.55, "GAP": 0.55, "UNC": 0.45, "TEM": 0.60, "INT": 0.40},
            "challenging": {"DIR": 0.20, "FOR": 0.30, "GAP": 0.80, "UNC": 0.75, "TEM": 0.40, "INT": 0.15},
            "experienced": {"DIR": 0.50, "FOR": 0.60, "GAP": 0.50, "UNC": 0.40, "TEM": 0.65, "INT": 0.45},
        }
        return profiles.get(profile_type, profiles["standard"]).copy()
    
    def calculate_success_probability(
        self,
        vector: Dict[str, float],
        include_uncertainty: bool = True
    ) -> Dict[str, Any]:
        """성공 확률 계산 (불확실성 포함)"""
        
        # 기본 점수
        score = (
            vector.get("DIR", 0.5) * 0.20 +
            vector.get("FOR", 0.5) * 0.15 +
            (1 - vector.get("GAP", 0.5)) * 0.20 +
            (1 - vector.get("UNC", 0.5)) * 0.20 +
            vector.get("TEM", 0.5) * 0.10 +
            vector.get("INT", 0.5) * 0.15
        )
        
        # 시그모이드 변환
        probability = 1 / (1 + math.exp(-10 * (score - 0.5)))
        
        result = {
            "probability": round(probability * 100, 1),
            "score": round(score * 100, 1)
        }
        
        if include_uncertainty:
            uncertainty = self.quantify_uncertainty(vector)
            
            # 불확실성 반영 CI
            std_factor = sum(u.std for u in uncertainty.values()) / len(AXES)
            result["ci_lower"] = round(max(0, (probability - std_factor * 2) * 100), 1)
            result["ci_upper"] = round(min(100, (probability + std_factor * 2) * 100), 1)
            result["confidence"] = round(sum(u.confidence for u in uncertainty.values()) / len(AXES), 2)
        
        return result
    
    def check_settlement(self, vector: Dict[str, float]) -> Dict[str, Any]:
        """정착 조건 체크"""
        criteria = {
            "DIR >= 0.70": vector.get("DIR", 0) >= 0.70,
            "GAP <= 0.30": vector.get("GAP", 1) <= 0.30,
            "UNC <= 0.25": vector.get("UNC", 1) <= 0.25,
            "INT >= 0.75": vector.get("INT", 0) >= 0.75,
        }
        
        success = self.calculate_success_probability(vector)
        settled = all(criteria.values())
        
        return {
            "settled": settled,
            "criteria": criteria,
            "success_probability": success["probability"],
            "confidence_interval": f"{success.get('ci_lower', 0)}% - {success.get('ci_upper', 100)}%",
            "message": "✅ Settlement achieved!" if settled else f"⏳ Remaining: {[k for k,v in criteria.items() if not v]}"
        }


# ============================================================
# EXPORT
# ============================================================

__version__ = "3.0.0"
__all__ = [
    "LimeKernelV3",
    "HumProfile",
    "ExternalContext",
    "UncertaintyEstimate",
    "VectorUpdateV3",
    "BackwardPlan",
    "AXES",
    "BASE_MATRIX",
    "CROSS_AXIS",
    "EVENT_SYNERGIES",
    "PHASE_THRESHOLDS",
    "TEMPORAL_SCALES",
    "REGIMES",
]
