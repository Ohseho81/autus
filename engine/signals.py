"""
ExternalSolar Signals Engine v1.0
4신호 표준 - 고정
"""
from dataclasses import dataclass
from typing import Dict, List
import statistics

# ============================================================
# 6.1 공통 signals (0~1)
# ============================================================
@dataclass
class ExternalSignals:
    """4신호 표준"""
    regulation: float = 0.0   # R: 규제/감사/법적 압력
    budget: float = 0.0       # B: 재정 제약/예산 변동성
    sentiment: float = 0.0    # S: 민원/여론/평판 압력
    market: float = 0.0       # M: 경쟁/수요/가격 압력
    
    def clamp(self):
        self.regulation = max(0, min(1, self.regulation))
        self.budget = max(0, min(1, self.budget))
        self.sentiment = max(0, min(1, self.sentiment))
        self.market = max(0, min(1, self.market))
        return self
    
    def to_list(self) -> List[float]:
        return [self.regulation, self.budget, self.sentiment, self.market]
    
    def to_dict(self) -> Dict[str, float]:
        return {"R": self.regulation, "B": self.budget, "S": self.sentiment, "M": self.market}

# ============================================================
# 6.2 도메인별 가중치 프리셋
# ============================================================
SIGNAL_WEIGHTS = {
    "ORG": {"regulation": 0.30, "budget": 0.25, "sentiment": 0.15, "market": 0.30},
    "CITY": {"regulation": 0.35, "budget": 0.20, "sentiment": 0.30, "market": 0.15},
    "NATION": {"regulation": 0.45, "budget": 0.20, "sentiment": 0.20, "market": 0.15},
    "EDUCATION": {"regulation": 0.35, "budget": 0.30, "sentiment": 0.20, "market": 0.15},
    "FACILITY": {"regulation": 0.40, "budget": 0.25, "sentiment": 0.25, "market": 0.10},
}

DEFAULT_SIGNAL_WEIGHTS = {"regulation": 0.25, "budget": 0.25, "sentiment": 0.25, "market": 0.25}

def get_signal_weights(domain: str) -> Dict[str, float]:
    return SIGNAL_WEIGHTS.get(domain, DEFAULT_SIGNAL_WEIGHTS)

# ============================================================
# 7.1 ExternalPressure 합성
# ============================================================
def calc_external_pressure(signals: ExternalSignals, domain: str = None) -> float:
    """
    ExternalPressure = R*wR + B*wB + S*wS + M*wM
    """
    w = get_signal_weights(domain) if domain else DEFAULT_SIGNAL_WEIGHTS
    
    pressure = (
        signals.regulation * w["regulation"] +
        signals.budget * w["budget"] +
        signals.sentiment * w["sentiment"] +
        signals.market * w["market"]
    )
    
    return max(0, min(1, pressure))

# ============================================================
# 7.2 CoordinationEntropy (조정 실패)
# ============================================================
def calc_coordination_entropy(signals: ExternalSignals, alignment: float) -> float:
    """
    CoordinationEntropy = variance([R, B, S, M]) * (1 - Alignment)
    신호 간 불균형이 클수록, 정렬도가 낮을수록 혼란 증가
    """
    values = signals.to_list()
    if len(values) < 2:
        return 0.0
    
    variance = statistics.variance(values)
    return variance * (1 - alignment)

# ============================================================
# 7.3 Effective Pressure (Alignment 적용)
# ============================================================
def calc_effective_pressure(external_pressure: float, alignment: float) -> float:
    """
    EffectivePressure = ExternalPressure * (1 - Alignment)
    """
    return external_pressure * (1 - alignment)

# ============================================================
# 통합 계산
# ============================================================
@dataclass
class SignalResult:
    """신호 처리 결과"""
    signals: ExternalSignals
    external_pressure: float
    coordination_entropy: float
    effective_pressure: float
    domain: str
    weights: Dict[str, float]

def process_signals(
    signals: ExternalSignals,
    alignment: float,
    domain: str = None
) -> SignalResult:
    """전체 신호 처리"""
    weights = get_signal_weights(domain) if domain else DEFAULT_SIGNAL_WEIGHTS
    ext_pressure = calc_external_pressure(signals, domain)
    coord_entropy = calc_coordination_entropy(signals, alignment)
    eff_pressure = calc_effective_pressure(ext_pressure, alignment)
    
    return SignalResult(
        signals=signals,
        external_pressure=round(ext_pressure, 4),
        coordination_entropy=round(coord_entropy, 4),
        effective_pressure=round(eff_pressure, 4),
        domain=domain or "DEFAULT",
        weights=weights
    )

# ============================================================
# 테스트
# ============================================================
if __name__ == "__main__":
    signals = ExternalSignals(regulation=0.42, budget=0.28, sentiment=0.55, market=0.21)
    result = process_signals(signals=signals, alignment=0.62, domain="CITY")
    
    print(f"Signals: {signals.to_dict()}")
    print(f"External Pressure: {result.external_pressure}")
    print(f"Coordination Entropy: {result.coordination_entropy}")
    print(f"Effective Pressure: {result.effective_pressure}")
