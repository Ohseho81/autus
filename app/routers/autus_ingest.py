from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict
import sys
sys.path.insert(0, '.')

from adapters.scheduler import schedule_commit, collect_and_map
from adapters.traffic_adapter import map_traffic, fetch_traffic_mock
from adapters.energy_adapter import map_energy, fetch_energy_mock
from adapters.safety_adapter import map_safety, fetch_safety_mock
from core.autus.compute import compute_slots
from core.autus.grove import update_grove_state, GroveState

router = APIRouter(prefix="/autus/ingest", tags=["autus-ingest"])

# In-memory state (실제로는 GMU 연결)
ingest_states = {}

class ManualIngestRequest(BaseModel):
    gmu_id: str
    traffic: Optional[Dict] = None
    energy: Optional[Dict] = None
    safety: Optional[Dict] = None

def commit_to_gmu(gmu_id: str, tasks: dict, pressure: float, resource: float):
    """GMU에 Commit"""
    slots = compute_slots(tasks)
    
    if gmu_id not in ingest_states:
        ingest_states[gmu_id] = {
            "slots": {},
            "grove_state": GroveState.NORMAL,
            "commits": 0
        }
    
    state = ingest_states[gmu_id]
    new_grove = update_grove_state(
        current_state=state["grove_state"],
        pressure=pressure,
        resource_efficiency=resource,
        slots=slots
    )
    
    state["slots"] = slots
    state["grove_state"] = new_grove
    state["commits"] += 1
    state["last_input"] = {"tasks": tasks, "pressure": pressure, "resource": resource}

@router.post("/auto/{gmu_id}")
def auto_ingest(gmu_id: str, bg: BackgroundTasks):
    """자동 수집 + Commit (Mock 데이터)"""
    fetchers = {
        "traffic": fetch_traffic_mock,
        "energy": fetch_energy_mock,
        "safety": fetch_safety_mock,
    }
    schedule_commit(bg, gmu_id, fetchers, commit_to_gmu)
    return {"status": "scheduled", "gmu_id": gmu_id}

@router.post("/manual")
def manual_ingest(req: ManualIngestRequest):
    """수동 데이터 Ingest"""
    from adapters.base import AutusInput
    
    mapped = []
    if req.traffic:
        mapped.append(map_traffic(req.traffic))
    if req.energy:
        mapped.append(map_energy(req.energy))
    if req.safety:
        mapped.append(map_safety(req.safety))
    
    if not mapped:
        return {"error": "No data provided"}
    
    from adapters.scheduler import aggregate
    tasks, pressure, resource = aggregate(mapped)
    
    commit_to_gmu(req.gmu_id, tasks, pressure, resource)
    
    return {
        "gmu_id": req.gmu_id,
        "tasks": tasks,
        "pressure": round(pressure, 3),
        "resource": round(resource, 3),
        "state": {
            "slots": ingest_states[req.gmu_id]["slots"],
            "grove_state": ingest_states[req.gmu_id]["grove_state"].value
        }
    }

@router.get("/test")
def test_collect():
    """테스트: Mock 데이터 수집 + 변환 결과"""
    raw, tasks, pressure, resource = collect_and_map()
    return {
        "raw_data": raw,
        "autus_input": {
            "tasks": tasks,
            "pressure": round(pressure, 3),
            "resource": round(resource, 3)
        }
    }

@router.get("/{gmu_id}")
def get_ingest_state(gmu_id: str):
    """Ingest 상태 조회"""
    if gmu_id not in ingest_states:
        return {"error": "GMU not found"}
    
    state = ingest_states[gmu_id]
    return {
        "gmu_id": gmu_id,
        "slots": state["slots"],
        "grove_state": state["grove_state"].value,
        "commits": state["commits"],
        "last_input": state.get("last_input")
    }
