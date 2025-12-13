from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional
import sys
sys.path.insert(0, '.')

from packs.city_pack.schema import CityEvent
from packs.city_pack.adapter import CityPackAdapter
from packs.city_pack.scenarios import SCENARIOS
from core.autus.compute import compute_slots
from core.autus.grove import update_grove_state, GroveState

router = APIRouter(prefix="/autus/city", tags=["autus-city"])

# City Pack Adapter
adapter = CityPackAdapter()

# In-memory city states
city_states = {}

class CreateCityRequest(BaseModel):
    city_id: str
    districts: Optional[List[str]] = None

class ApplyEventRequest(BaseModel):
    city_id: str
    event: CityEvent

class RunScenarioRequest(BaseModel):
    city_id: str
    scenario: str = "default"

@router.post("/create")
def create_city(req: CreateCityRequest):
    """도시 + 구역 GMU 생성"""
    city = adapter.create_city(req.city_id)
    city_states[city["id"]] = {
        "slots": {},
        "grove_state": GroveState.NORMAL,
        "events": [],
        "districts": []
    }
    
    districts = []
    for dist_id in (req.districts or []):
        dist = adapter.create_district(req.city_id, dist_id)
        city_states[dist["id"]] = {
            "slots": {},
            "grove_state": GroveState.NORMAL,
            "events": [],
            "parent": city["id"]
        }
        districts.append(dist)
        city_states[city["id"]]["districts"].append(dist["id"])
    
    return {
        "city": city,
        "districts": districts,
        "message": f"City {req.city_id} created with {len(districts)} districts"
    }

@router.post("/event")
def apply_event(req: ApplyEventRequest):
    """이벤트 적용"""
    gmu_id = f"CITY_{req.city_id}"
    
    if gmu_id not in city_states:
        return {"error": "City not found"}
    
    state = city_states[gmu_id]
    
    # 이벤트 → Autus 입력 변환
    tasks, pressure, resource_eff = adapter.map_event(req.event)
    
    # Slot 계산
    slots = compute_slots(tasks)
    
    # Grove 상태 전이
    new_grove = update_grove_state(
        current_state=state["grove_state"],
        pressure=pressure,
        resource_efficiency=resource_eff,
        slots=slots
    )
    
    # 상태 업데이트
    state["slots"] = slots
    state["grove_state"] = new_grove
    state["events"].append({
        "event": req.event.dict(),
        "pressure": pressure,
        "resource_eff": resource_eff
    })
    
    # 설명 생성
    explanation = adapter.explain_impact(req.event, {
        "slots": slots,
        "grove_state": new_grove.value
    })
    
    return {
        "city_id": req.city_id,
        "slots": slots,
        "grove_state": new_grove.value,
        "explanation": explanation,
        "event_count": len(state["events"])
    }

@router.post("/scenario")
def run_scenario(req: RunScenarioRequest):
    """시나리오 실행"""
    if req.scenario not in SCENARIOS:
        return {"error": f"Unknown scenario: {req.scenario}"}
    
    events = SCENARIOS[req.scenario]
    results = []
    
    for event in events:
        result = apply_event(ApplyEventRequest(
            city_id=req.city_id,
            event=event
        ))
        results.append(result)
    
    return {
        "city_id": req.city_id,
        "scenario": req.scenario,
        "steps": len(results),
        "final_state": results[-1] if results else None,
        "history": results
    }

@router.get("/{city_id}")
def get_city(city_id: str):
    """도시 상태 조회"""
    gmu_id = f"CITY_{city_id}"
    if gmu_id not in city_states:
        return {"error": "City not found"}
    
    state = city_states[gmu_id]
    return {
        "city_id": city_id,
        "slots": state["slots"],
        "grove_state": state["grove_state"].value if hasattr(state["grove_state"], 'value') else state["grove_state"],
        "event_count": len(state["events"]),
        "districts": state.get("districts", [])
    }

@router.get("/scenarios/list")
def list_scenarios():
    """사용 가능한 시나리오 목록"""
    return {
        "scenarios": list(SCENARIOS.keys()),
        "description": {
            "default": "투자 → 사고 → 정책",
            "crisis": "연속 재난 + 긴급 정책",
            "growth": "연속 투자 + 완화 정책"
        }
    }
