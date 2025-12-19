"""
Traffic Adapter - 교통 데이터 → Autus 입력
Read-Only, 예측/추천 없음
"""
from .base import AutusInput, clamp01, neutral

def map_traffic(data: dict) -> AutusInput:
    """
    교통 데이터 변환
    
    Expected fields:
    - volume: 교통량 (0~10000+)
    - avg_speed: 평균 속도 (0~60+ km/h)
    - congestion: 혼잡도 (0~1)
    """
    try:
        volume = data.get("volume", 0)
        speed = data.get("avg_speed", 30)
        congestion = data.get("congestion", 0)
        
        # Tasks: 교통량 → Work
        tasks = {
            "Work": clamp01(volume / 10000),
            "People": clamp01(congestion * 0.5)
        }
        
        # Pressure: 혼잡도
        pressure = clamp01(congestion)
        
        # Resource: 속도 기반 흡수 효율
        resource = clamp01(speed / 60)
        
        return AutusInput(tasks, pressure, resource)
    except Exception:
        return neutral()

def fetch_traffic_mock() -> dict:
    """Mock 데이터 (실제 API 연결 전)"""
    import random
    return {
        "volume": random.randint(3000, 8000),
        "avg_speed": random.randint(15, 50),
        "congestion": random.uniform(0.2, 0.8)
    }
