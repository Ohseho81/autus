"""
Energy Adapter - 에너지 데이터 → Autus 입력
Read-Only, 예측/추천 없음
"""
from .base import AutusInput, clamp01, neutral

def map_energy(data: dict) -> AutusInput:
    """
    에너지 데이터 변환
    
    Expected fields:
    - demand: 수요 (MW)
    - supply: 공급 (MW)
    - reserve: 예비전력 (MW)
    """
    try:
        demand = data.get("demand", 0)
        supply = data.get("supply", 0)
        reserve = data.get("reserve", 0)
        
        # 수급 균형
        balance = supply - demand
        
        # Pressure: 수요 > 공급일 때 증가
        pressure = clamp01(max(0, -balance) / max(1, demand))
        
        # Resource: 예비전력 + 여유분
        resource = clamp01((reserve + max(balance, 0)) / max(1, supply))
        
        # Tasks
        tasks = {
            "Money": clamp01(supply / 10000),
            "Work": clamp01(demand / 10000)
        }
        
        return AutusInput(tasks, pressure, resource)
    except Exception:
        return neutral()

def fetch_energy_mock() -> dict:
    """Mock 데이터"""
    import random
    supply = random.randint(8000, 10000)
    demand = random.randint(7000, 9500)
    return {
        "demand": demand,
        "supply": supply,
        "reserve": random.randint(500, 1500)
    }
