"""
Outcome-based Pricing Engine v1.0
성과 기반 과금 - 고정
"""
from dataclasses import dataclass, field
from typing import Dict, Optional
import time
import hashlib

# ============================================================
# 4.1 Billable KPIs
# ============================================================
@dataclass
class Snapshot:
    entropy: float = 0.0
    pressure: float = 0.0
    alignment: float = 0.5
    ts: float = field(default_factory=time.time)
    
    def hash(self) -> str:
        data = f"{self.entropy:.4f}:{self.pressure:.4f}:{self.alignment:.4f}:{self.ts}"
        return hashlib.sha256(data.encode()).hexdigest()[:12]

@dataclass
class Delta:
    entropy: float = 0.0    # 양수 = 개선 (감소)
    pressure: float = 0.0   # 양수 = 개선 (감소)
    alignment: float = 0.0  # 양수 = 개선 (증가)

# ============================================================
# 6. 가격 수식 (v0)
# ============================================================
OUTCOME_WEIGHTS = {
    "entropy": 0.45,
    "pressure": 0.35,
    "alignment": 0.20
}

DOMAIN_PRICING = {
    "ORG": {"price_unit": 3000000, "scope": 1.0},
    "CITY": {"price_unit": 6000000, "scope": 1.5},
    "NATION": {"price_unit": 12000000, "scope": 2.0},
    "EDUCATION": {"price_unit": 2000000, "scope": 0.8},
    "FACILITY": {"price_unit": 2500000, "scope": 0.9},
}

CAP_MULTIPLIER = 1.2  # 월 최대 120%

def calc_delta(baseline: Snapshot, current: Snapshot) -> Delta:
    """
    ΔEntropy = BaselineEntropy - CurrentEntropy (감소가 양수)
    ΔPressure = BaselinePressure - CurrentPressure (감소가 양수)
    ΔAlignment = CurrentAlignment - BaselineAlignment (증가가 양수)
    """
    return Delta(
        entropy=max(0, baseline.entropy - current.entropy),
        pressure=max(0, baseline.pressure - current.pressure),
        alignment=max(0, current.alignment - baseline.alignment)
    )

def normalize_delta(delta: Delta) -> Delta:
    """정규화 (0~1)"""
    return Delta(
        entropy=min(1.0, delta.entropy),
        pressure=min(1.0, delta.pressure),
        alignment=min(1.0, delta.alignment)
    )

def calc_outcome_value(delta: Delta) -> float:
    """
    OutcomeValue = a*ΔEntropy + b*ΔPressure + c*ΔAlignment
    """
    norm = normalize_delta(delta)
    return (
        OUTCOME_WEIGHTS["entropy"] * norm.entropy +
        OUTCOME_WEIGHTS["pressure"] * norm.pressure +
        OUTCOME_WEIGHTS["alignment"] * norm.alignment
    )

def calc_billable(outcome_value: float, domain: str = "ORG") -> Dict:
    """
    Billable = PriceUnit × OutcomeValue × Scope
    """
    pricing = DOMAIN_PRICING.get(domain, DOMAIN_PRICING["ORG"])
    price_unit = pricing["price_unit"]
    scope = pricing["scope"]
    
    raw_amount = price_unit * outcome_value * scope
    cap = price_unit * CAP_MULTIPLIER
    
    cap_applied = raw_amount > cap
    final_amount = min(raw_amount, cap)
    
    return {
        "price_unit": price_unit,
        "scope": scope,
        "outcome_value": round(outcome_value, 4),
        "raw_amount": round(raw_amount),
        "cap": cap,
        "cap_applied": cap_applied,
        "billable": round(final_amount)
    }

# ============================================================
# 통합 Quote/Invoice
# ============================================================
@dataclass
class PricingQuote:
    baseline: Snapshot
    current: Snapshot
    delta: Delta
    outcome_value: float
    billable: int
    domain: str
    price_unit: int
    scope: float
    cap_applied: bool
    baseline_hash: str
    current_hash: str

def generate_quote(baseline: Snapshot, current: Snapshot, domain: str = "ORG") -> PricingQuote:
    """견적 생성"""
    delta = calc_delta(baseline, current)
    outcome = calc_outcome_value(delta)
    billing = calc_billable(outcome, domain)
    
    return PricingQuote(
        baseline=baseline,
        current=current,
        delta=delta,
        outcome_value=outcome,
        billable=billing["billable"],
        domain=domain,
        price_unit=billing["price_unit"],
        scope=billing["scope"],
        cap_applied=billing["cap_applied"],
        baseline_hash=baseline.hash(),
        current_hash=current.hash()
    )

def quote_to_dict(q: PricingQuote) -> Dict:
    return {
        "baseline": {"entropy": q.baseline.entropy, "pressure": q.baseline.pressure, "alignment": q.baseline.alignment},
        "current": {"entropy": q.current.entropy, "pressure": q.current.pressure, "alignment": q.current.alignment},
        "delta": {"entropy": round(q.delta.entropy, 4), "pressure": round(q.delta.pressure, 4), "alignment": round(q.delta.alignment, 4)},
        "outcome_value": round(q.outcome_value, 4),
        "price_unit": q.price_unit,
        "scope": q.scope,
        "billable": q.billable,
        "cap_applied": q.cap_applied,
        "hashes": {"baseline": q.baseline_hash, "current": q.current_hash}
    }

# ============================================================
# 테스트
# ============================================================
if __name__ == "__main__":
    baseline = Snapshot(entropy=0.31, pressure=0.42, alignment=0.58)
    current = Snapshot(entropy=0.24, pressure=0.29, alignment=0.66)
    
    quote = generate_quote(baseline, current, "ORG")
    print(quote_to_dict(quote))
