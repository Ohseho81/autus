"""
AlignmentFactor Engine v1.0
4축 정렬도 수식 - 고정
"""
from dataclasses import dataclass
from typing import Dict, Optional

# ============================================================
# 6.1 4축 정의 (0~1)
# ============================================================
@dataclass
class AlignmentAxes:
    """4축 정렬도"""
    goal: float = 0.5      # GA: 목표 일치도
    time: float = 0.5      # TA: 일정/속도 정렬도
    incentive: float = 0.5 # IA: 보상/동기 정렬도
    risk: float = 0.5      # RA: 리스크 인식/분담 정렬도
    
    def clamp(self):
        self.goal = max(0, min(1, self.goal))
        self.time = max(0, min(1, self.time))
        self.incentive = max(0, min(1, self.incentive))
        self.risk = max(0, min(1, self.risk))
        return self

# ============================================================
# 6.2 기본 가중치 (Universe 공통)
# ============================================================
DEFAULT_WEIGHTS = {
    "goal": 0.35,
    "time": 0.20,
    "incentive": 0.25,
    "risk": 0.20
}

# 도메인별 프리셋
DOMAIN_WEIGHTS = {
    "ORG": {"goal": 0.35, "time": 0.20, "incentive": 0.25, "risk": 0.20},
    "CITY": {"goal": 0.30, "time": 0.25, "incentive": 0.20, "risk": 0.25},
    "NATION": {"goal": 0.25, "time": 0.20, "incentive": 0.20, "risk": 0.35},
    "EDUCATION": {"goal": 0.40, "time": 0.25, "incentive": 0.20, "risk": 0.15},
    "FACILITY": {"goal": 0.30, "time": 0.30, "incentive": 0.15, "risk": 0.25},
}

# ============================================================
# 6.3 Alignment 수식 (고정)
# ============================================================
def calc_alignment(axes: AlignmentAxes, weights: Dict[str, float] = None) -> float:
    """
    Alignment = clamp(GA*w.GA + TA*w.TA + IA*w.IA + RA*w.RA, 0.0, 1.0)
    """
    w = weights or DEFAULT_WEIGHTS
    
    alignment = (
        axes.goal * w["goal"] +
        axes.time * w["time"] +
        axes.incentive * w["incentive"] +
        axes.risk * w["risk"]
    )
    
    return max(0.0, min(1.0, alignment))

def get_weights_for_domain(domain: str) -> Dict[str, float]:
    """도메인별 가중치 반환"""
    return DOMAIN_WEIGHTS.get(domain, DEFAULT_WEIGHTS)

# ============================================================
# 7.1 ExternalPressure 감쇠
# ============================================================
def calc_effective_external_pressure(external_pressure: float, alignment: float) -> float:
    """
    EffectiveExternalPressure = ExternalPressure * (1 - Alignment)
    Alignment 0.7 → 외부 압력 30%만 유효
    """
    return external_pressure * (1 - alignment)

# ============================================================
# 7.2 ContractEntropy 누적 억제
# ============================================================
def calc_contract_entropy_gain(unresolved_contracts: float, alignment: float) -> float:
    """
    ContractEntropyGain = UnresolvedContracts * (1 - Alignment)
    """
    return unresolved_contracts * (1 - alignment)

# ============================================================
# 7.3 UniverseRisk 계산
# ============================================================
def calc_universe_risk(external_pressure: float, entropy: float, alignment: float) -> float:
    """
    UniverseRisk = (ExternalPressure + Entropy) * (1 - Alignment)
    """
    return (external_pressure + entropy) * (1 - alignment)

# ============================================================
# 통합 계산
# ============================================================
@dataclass
class AlignmentResult:
    """정렬도 계산 결과"""
    alignment: float
    effective_pressure: float
    contract_entropy_gain: float
    risk: float
    axes: AlignmentAxes
    weights: Dict[str, float]

def process_alignment(
    axes: AlignmentAxes,
    external_pressure: float,
    unresolved_contracts: float,
    entropy: float,
    domain: str = None
) -> AlignmentResult:
    """전체 Alignment 처리"""
    weights = get_weights_for_domain(domain) if domain else DEFAULT_WEIGHTS
    alignment = calc_alignment(axes, weights)
    
    return AlignmentResult(
        alignment=round(alignment, 4),
        effective_pressure=round(calc_effective_external_pressure(external_pressure, alignment), 4),
        contract_entropy_gain=round(calc_contract_entropy_gain(unresolved_contracts, alignment), 4),
        risk=round(calc_universe_risk(external_pressure, entropy, alignment), 4),
        axes=axes,
        weights=weights
    )

# ============================================================
# 테스트
# ============================================================
if __name__ == "__main__":
    axes = AlignmentAxes(goal=0.78, time=0.62, incentive=0.71, risk=0.66)
    result = process_alignment(
        axes=axes,
        external_pressure=0.30,
        unresolved_contracts=0.10,
        entropy=0.20,
        domain="ORG"
    )
    
    print(f"Alignment: {result.alignment}")
    print(f"Effective Pressure: {result.effective_pressure}")
    print(f"Contract Entropy Gain: {result.contract_entropy_gain}")
    print(f"Risk: {result.risk}")
