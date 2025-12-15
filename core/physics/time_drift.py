"""Time Drift (TΔ) = (|ΔState| / Δt) × (1 + Pressure)"""

def time_drift(delta_state_magnitude: float, dt: float, pressure: float) -> float:
    """미래 변화 속도 = 상태 변화량 × 압력 보정"""
    if dt <= 0:
        return 0.0
    return (delta_state_magnitude / dt) * (1.0 + pressure)
