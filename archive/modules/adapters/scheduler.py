"""
Scheduler - 배치 수집 및 Commit
실패 격리, 중립값 폴백
"""
from typing import Dict, Callable, List
from fastapi import BackgroundTasks
from .base import AutusInput, neutral
from .traffic_adapter import map_traffic
from .energy_adapter import map_energy
from .safety_adapter import map_safety

def batch_collect(fetchers: Dict[str, Callable]) -> dict:
    """여러 소스에서 데이터 수집 (실패 격리)"""
    out = {}
    for key, fn in fetchers.items():
        try:
            out[key] = fn()
        except Exception:
            out[key] = {}
    return out

def aggregate(inputs: List[AutusInput]) -> tuple:
    """여러 입력을 하나로 집계"""
    tasks = {}
    pressure = 0.0
    resource = 0.0
    
    for inp in inputs:
        # Tasks 병합 (최대값)
        for k, v in inp.tasks.items():
            tasks[k] = max(tasks.get(k, 0), v)
        # Pressure: 최대값
        pressure = max(pressure, inp.pressure)
        # Resource: 평균
        resource = max(resource, inp.resource)
    
    return tasks, pressure, resource

def schedule_commit(
    bg: BackgroundTasks,
    gmu_id: str,
    fetchers: Dict[str, Callable],
    commit_fn: Callable
):
    """비동기 배치 Commit 스케줄링"""
    def job():
        try:
            # 1. 데이터 수집
            raw = batch_collect(fetchers)
            
            # 2. 변환
            mapped = [
                map_traffic(raw.get("traffic", {})),
                map_energy(raw.get("energy", {})),
                map_safety(raw.get("safety", {})),
            ]
            
            # 3. 집계
            tasks, pressure, resource = aggregate(mapped)
            
            # 4. Commit
            commit_fn(gmu_id, tasks, pressure, resource)
        except Exception:
            pass  # 실패 격리
    
    bg.add_task(job)

def collect_and_map() -> tuple:
    """동기 수집 + 변환 (테스트용)"""
    from .traffic_adapter import fetch_traffic_mock
    from .energy_adapter import fetch_energy_mock
    from .safety_adapter import fetch_safety_mock
    
    raw = {
        "traffic": fetch_traffic_mock(),
        "energy": fetch_energy_mock(),
        "safety": fetch_safety_mock()
    }
    
    mapped = [
        map_traffic(raw["traffic"]),
        map_energy(raw["energy"]),
        map_safety(raw["safety"]),
    ]
    
    tasks, pressure, resource = aggregate(mapped)
    return raw, tasks, pressure, resource
