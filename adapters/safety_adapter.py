"""
Safety Adapter - 안전/사건 데이터 → Autus 입력
Read-Only, 예측/추천 없음
"""
from .base import AutusInput, clamp01, neutral

def map_safety(data: dict) -> AutusInput:
    """
    안전 데이터 변환
    
    Expected fields:
    - incidents: 사건 수
    - calls: 신고 건수
    - response_time: 평균 대응 시간 (분)
    """
    try:
        incidents = data.get("incidents", 0)
        calls = data.get("calls", 0)
        response_time = data.get("response_time", 5)
        
        # Pressure: 사건 + 신고 기반
        pressure = clamp01((incidents + calls * 0.2) / 100)
        
        # Tasks
        tasks = {
            "People": clamp01(1 - incidents / 50),
            "Policy": clamp01(1 - calls / 200)
        }
        
        # Resource: 대응 효율
        resource = clamp01(1 - response_time / 30)
        
        return AutusInput(tasks, pressure, resource)
    except Exception:
        return neutral()

def fetch_safety_mock() -> dict:
    """Mock 데이터"""
    import random
    return {
        "incidents": random.randint(0, 20),
        "calls": random.randint(10, 100),
        "response_time": random.randint(3, 15)
    }
