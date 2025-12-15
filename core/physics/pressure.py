"""Pressure (P) = Demand / (Energy × Stability)"""

def pressure(demand: float, energy: float, stability: float) -> float:
    """수요 대비 용량 압력 계산"""
    capacity = energy * stability
    if capacity <= 0:
        return float('inf') if demand > 0 else 0.0
    return min(1.0, demand / capacity)
