from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict
import sys
sys.path.insert(0, '.')

from adapters.scheduler import collect_and_map
from adapters.traffic_adapter import map_traffic, fetch_traffic_mock
from adapters.energy_adapter import map_energy, fetch_energy_mock
from adapters.safety_adapter import map_safety, fetch_safety_mock

try:
    from core.autus.compute import compute_slots
    from core.autus.grove import update_grove_state, GroveState
except ImportError:
    from core.compute import compute_slots
    from core.grove import update_grove_state, GroveState

router = APIRouter(prefix="/autus/ingest", tags=["autus-ingest"])

ingest_states = {}

class ManualIngestRequest(BaseModel):
    gmu_id: str
    traffic: Optional[Dict] = None
    energy: Optional[Dict] = None
    safety: Optional[Dict] = None

def commit_to_gmu(gmu_id: str, tasks: dict, pressure: float, resource: float):
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

@router.get("/test")
def test_collect():
    raw, tasks, pressure, resource = collect_and_map()
    return {"raw_data": raw, "autus_input": {"tasks": tasks, "pressure": round(pressure, 3), "resource": round(resource, 3)}}

@router.post("/manual")
def manual_ingest(req: ManualIngestRequest):
    from adapters.scheduler import aggregate
    from adapters.base import AutusInput
    
    mapped = []
    if req.traffic:
        mapped.append(map_traffic(req.traffic))
    if req.energy:
        mapped.append(map_energy(req.energy))
    if req.safety:
        mapped.append(map_safety(req.safety))
    
    if not mapped:
        return {"error": "No data"}
    
    tasks, pressure, resource = aggregate(mapped)
    commit_to_gmu(req.gmu_id, tasks, pressure, resource)
    
    return {
        "gmu_id": req.gmu_id,
        "tasks": tasks,
        "pressure": round(pressure, 3),
        "resource": round(resource, 3)
    }

@router.get("/{gmu_id}")
def get_ingest_state(gmu_id: str):
    if gmu_id not in ingest_states:
        return {"error": "GMU not found"}
    state = ingest_states[gmu_id]
    return {
        "gmu_id": gmu_id,
        "slots": state["slots"],
        "grove_state": state["grove_state"].value,
        "commits": state["commits"]
    }
