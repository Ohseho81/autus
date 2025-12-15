"""Gravity (G) = Influence × Trust"""

def gravity(influence: float, trust: float) -> float:
    """영향력 × 신뢰도 기반 중력 계산"""
    return max(0.0, min(1.0, influence * trust))
