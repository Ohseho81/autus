"""Failure Horizon (FH) = (Threshold - Risk) / Risk_Rate"""

def failure_horizon(risk: float, risk_rate: float, threshold: float = 1.0) -> float:
    """실패까지 남은 틱 수 예측"""
    if risk_rate <= 0:
        return float('inf')
    if risk >= threshold:
        return 0.0
    return (threshold - risk) / risk_rate
