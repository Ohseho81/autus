"""
신호 정규화 - 다양한 입력을 Pressure/Resource로 변환
"""
from typing import Dict, Any

def normalize_signal(raw: Dict[str, Any]) -> Dict[str, float]:
    """원시 신호 → 정규화된 압력/자원"""
    pressure = 0.0
    resource = 0.0
    
    # 다양한 필드 처리
    if "load" in raw:
        pressure = max(pressure, min(1.0, raw["load"] / 100))
    if "error_rate" in raw:
        pressure = max(pressure, raw["error_rate"])
    if "latency" in raw:
        pressure = max(pressure, min(1.0, raw["latency"] / 1000))
    
    if "capacity" in raw:
        resource = max(resource, raw["capacity"])
    if "availability" in raw:
        resource = max(resource, raw["availability"])
    
    return {
        "pressure": round(pressure, 4),
        "resource": round(resource, 4),
        "normalized": True
    }
