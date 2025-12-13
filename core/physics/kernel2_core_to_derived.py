"""
Kernel 2 - Core → Derived (S, μ, Δ)
판단/추천 없음, 순수 물리 계산
"""
from typing import Dict, List

def compute_S(slots: Dict[str, float]) -> float:
    """안정성 지표"""
    base = slots.get("Base", 0.5)
    core = slots.get("Core", 0.5)
    return (base * 0.6 + core * 0.4)

def compute_mu(history: List[float]) -> float:
    """평균 (이동평균)"""
    if not history:
        return 0.5
    return sum(history) / len(history)

def compute_delta(current: float, previous: float) -> float:
    """변화량"""
    return current - previous

def kernel2(slots: Dict[str, float], history: List[Dict] = None) -> Dict[str, float]:
    """Kernel 2 실행"""
    history = history or []
    
    S = compute_S(slots)
    
    # 히스토리에서 S 추출
    s_history = [h.get("S", 0.5) for h in history[-10:]]
    mu = compute_mu(s_history)
    
    prev_s = s_history[-1] if s_history else S
    delta = compute_delta(S, prev_s)
    
    return {
        "S": round(S, 4),
        "mu": round(mu, 4),
        "delta": round(delta, 4)
    }
