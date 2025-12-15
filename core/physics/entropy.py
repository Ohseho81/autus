"""Entropy (S) = |ΔState| / Δt"""

def entropy(delta_state: float, dt: float = 1.0) -> float:
    """변화량 기반 엔트로피 계산"""
    if dt <= 0:
        return 0.0
    return abs(delta_state) / dt
