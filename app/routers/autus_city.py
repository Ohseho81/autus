from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict
import sys
sys.path.insert(0, '.')

from packs.city_pack.schema import CityEvent, InfraEvent
from packs.city_pack.adapter import CityPackAdapter
from packs.city_pack.scenarios import SCENARIOS, INFRA_SCENARIOS

# Core import 수정
try:
    from core.autus.compute import compute_slots
    from core.autus.grove import update_grove_state, GroveState
except ImportError:
    from core.compute import compute_slots
    from core.grove import update_grove_state, GroveState

router = APIRouter(prefix="/autus/city", tags=["autus-city"])

adapter = CityPackAdapter()
city_states = {}

class CreateCityRequest(BaseModel):
    city_id: str
    districts: Optional[List[str]] = None
    with_infra: bool = True

class ApplyEventRequest(BaseModel):
    city_id: str
    event: CityEvent

class ApplyInfraEventRequest(BaseModel):
    city_id: str
    district_id: str
    event: InfraEvent

class RunScenarioRequest(BaseModel):
    city_id: str
    scenario: str = "default"

class RunInfraScenarioRequest(BaseModel):
    city_id: str
    district_id: str
    scenario: str = "storm_rush"

@router.post("/create")
def create_city(req: CreateCityRequest):
    city = adapter.create_city(req.city_id)
    city_states[city["id"]] = {
        "slots": {},
        "grove_state": GroveState.NORMAL,
        "events": [],
        "districts": [],
        "type": "city"
    }
    
    districts = []
    for dist_id in (req.districts or ["CENTRAL"]):
        dist = adapter.create_district(req.city_id, dist_id)
        dist_gmu_id = dist["id"]
        city_states[dist_gmu_id] = {
            "slots": {},
            "grove_state": GroveState.NORMAL,
            "events": [],
            "parent": city["id"],
            "infra": {},
            "type": "district"
        }
        
        if req.with_infra:
            for infra_type in ["traffic", "safety", "energy"]:
                infra = adapter.create_infra(req.city_id, dist_id, infra_type)
                city_states[infra["id"]] = {
                    "slots": {},
                    "grove_state": GroveState.NORMAL,
                    "events": [],
                    "parent": dist_gmu_id,
                    "type": infra_type
                }
                city_states[dist_gmu_id]["infra"][infra_type] = infra["id"]
        
        districts.append(dist_gmu_id)
        city_states[city["id"]]["districts"].append(dist_gmu_id)
    
    return {"city": city["id"], "districts": districts, "infra_enabled": req.with_infra}

@router.post("/event")
def apply_event(req: ApplyEventRequest):
    gmu_id = f"CITY_{req.city_id}"
    if gmu_id not in city_states:
        return {"error": "City not found"}
    
    state = city_states[gmu_id]
    tasks, pressure, resource_eff = adapter.map_event(req.event)
    slots = compute_slots(tasks)
    
    new_grove = update_grove_state(
        current_state=state["grove_state"],
        pressure=pressure,
        resource_efficiency=resource_eff,
        slots=slots
    )
    
    state["slots"] = slots
    state["grove_state"] = new_grove
    return {"city_id": req.city_id, "slots": slots, "grove_state": new_grove.value}

@router.get("/{city_id}")
def get_city(city_id: str):
    gmu_id = f"CITY_{city_id}"
    if gmu_id not in city_states:
        return {"error": "City not found"}
    state = city_states[gmu_id]
    return {
        "city_id": city_id,
        "slots": state["slots"],
        "grove_state": state["grove_state"].value if hasattr(state["grove_state"], 'value') else state["grove_state"]
    }

@router.get("/scenarios/list")
def list_scenarios():
    return {"city": list(SCENARIOS.keys()), "infra": list(INFRA_SCENARIOS.keys())}
