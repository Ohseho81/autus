"""
Kernel 3 - Dynamics (VOL, TREND)
"""
from typing import List, Dict
import math

def compute_vol(history: List[float]) -> float:
    """변동성"""
    if len(history) < 2:
        return 0.0
    mu = sum(history) / len(history)
    variance = sum((x - mu) ** 2 for x in history) / len(history)
    return min(1.0, math.sqrt(variance))

def compute_trend(history: List[float]) -> str:
    """추세 (방향만, 예측 아님)"""
    if len(history) < 3:
        return "STABLE"
    recent = history[-3:]
    if all(recent[i] < recent[i+1] for i in range(len(recent)-1)):
        return "UP"
    if all(recent[i] > recent[i+1] for i in range(len(recent)-1)):
        return "DOWN"
    return "STABLE"

def kernel3(derived: Dict[str, float], s_history: List[float]) -> Dict[str, any]:
    """Kernel 3 실행"""
    vol = compute_vol(s_history)
    trend = compute_trend(s_history)
    
    return {
        **derived,
        "vol": round(vol, 4),
        "trend": trend
    }
