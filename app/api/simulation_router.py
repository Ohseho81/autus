"""Simulation API Router"""
from fastapi import APIRouter
from typing import List, Optional
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from simulation.simulator import Simulator
from simulation.scenario import list_scenarios, get_scenario

router = APIRouter(prefix="/sim", tags=["simulation"])
simulator = Simulator()

@router.get("/scenarios")
def get_scenarios():
    """사용 가능한 시나리오 목록"""
    scenarios = []
    for sid in list_scenarios():
        s = get_scenario(sid)
        scenarios.append({
            "id": s.id,
            "name": s.name,
            "description": s.description,
            "events_count": len(s.events)
        })
    return {"scenarios": scenarios}

@router.post("/run/{scenario_id}")
def run_scenario(scenario_id: str, entity_id: Optional[str] = None):
    """시나리오 실행"""
    return simulator.run_scenario(scenario_id, entity_id)

@router.post("/batch")
def run_batch(scenario_ids: List[str] = ["ph_kr_success", "ph_kr_visa_fail"], runs: int = 5):
    """배치 시뮬레이션"""
    return simulator.run_batch(scenario_ids, runs)

@router.get("/world")
def get_world():
    """현재 월드 상태"""
    return simulator.world.get_snapshot()

@router.get("/training-data")
def get_training_data():
    """학습 데이터 추출"""
    data = simulator.get_training_data()
    return {"count": len(data), "data": data[:100]}  # 최대 100개

@router.post("/reset")
def reset_simulator():
    """시뮬레이터 초기화"""
    global simulator
    simulator = Simulator()
    return {"status": "reset"}
