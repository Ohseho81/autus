from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict
import sys
sys.path.insert(0, '.')

from packs.city_pack.schema import CityEvent, InfraEvent
from packs.city_pack.adapter import CityPackAdapter
from packs.city_pack.scenarios import SCENARIOS, INFRA_SCENARIOS
from core.autus.compute import compute_slots
from core.autus.grove import update_grove_state, GroveState

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
    """도시 + 구역 + 인프라 GMU 생성"""
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
        
        # 인프라 GMU 생성
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
    
    return {
        "city": city["id"],
        "districts": districts,
        "infra_enabled": req.with_infra,
        "message": f"City {req.city_id} created"
    }

@router.post("/event")
def apply_event(req: ApplyEventRequest):
    """City 이벤트 적용"""
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
    state["events"].append(req.event.dict())
    
    explanation = adapter.explain_impact(req.event, {"slots": slots, "grove_state": new_grove.value})
    
    return {
        "city_id": req.city_id,
        "slots": slots,
        "grove_state": new_grove.value,
        "explanation": explanation
    }

@router.post("/infra/event")
def apply_infra_event(req: ApplyInfraEventRequest):
    """인프라 이벤트 적용"""
    infra_id = f"CITY_{req.city_id}_DIST_{req.district_id}_{req.event.domain.upper()}"
    
    if infra_id not in city_states:
        return {"error": f"Infra {infra_id} not found"}
    
    state = city_states[infra_id]
    tasks, pressure, resource_eff = adapter.map_infra_event(req.event)
    slots = compute_slots(tasks)
    
    new_grove = update_grove_state(
        current_state=state["grove_state"],
        pressure=pressure,
        resource_efficiency=resource_eff,
        slots=slots
    )
    
    state["slots"] = slots
    state["grove_state"] = new_grove
    state["events"].append(req.event.dict())
    
    explanation = adapter.explain_impact(
        req.event, 
        {"slots": slots, "grove_state": new_grove.value},
        domain=req.event.domain
    )
    
    return {
        "infra_id": infra_id,
        "domain": req.event.domain,
        "slots": slots,
        "grove_state": new_grove.value,
        "explanation": explanation
    }

@router.post("/infra/scenario")
def run_infra_scenario(req: RunInfraScenarioRequest):
    """인프라 시나리오 실행"""
    if req.scenario not in INFRA_SCENARIOS:
        return {"error": f"Unknown scenario: {req.scenario}", "available": list(INFRA_SCENARIOS.keys())}
    
    events = INFRA_SCENARIOS[req.scenario]
    results = []
    
    for event in events:
        result = apply_infra_event(ApplyInfraEventRequest(
            city_id=req.city_id,
            district_id=req.district_id,
            event=event
        ))
        results.append(result)
    
    # 붕괴 순서 분석
    district_id = f"CITY_{req.city_id}_DIST_{req.district_id}"
    infra_states = {}
    if district_id in city_states:
        for infra_type, infra_id in city_states[district_id].get("infra", {}).items():
            if infra_id in city_states:
                infra_states[infra_id] = city_states[infra_id]
    
    collapse_analysis = adapter.analyze_collapse_order(infra_states)
    
    return {
        "city_id": req.city_id,
        "district_id": req.district_id,
        "scenario": req.scenario,
        "steps": len(results),
        "results": results,
        "collapse_order": collapse_analysis,
        "question": "어느 인프라가 먼저 붕괴했는가?"
    }

@router.get("/{city_id}/analysis")
def analyze_city(city_id: str):
    """도시 전체 분석"""
    gmu_id = f"CITY_{city_id}"
    if gmu_id not in city_states:
        return {"error": "City not found"}
    
    city = city_states[gmu_id]
    districts_analysis = []
    
    for dist_id in city.get("districts", []):
        if dist_id not in city_states:
            continue
        
        district = city_states[dist_id]
        infra_states = {}
        
        for infra_type, infra_id in district.get("infra", {}).items():
            if infra_id in city_states:
                infra_states[infra_id] = city_states[infra_id]
        
        collapse_order = adapter.analyze_collapse_order(infra_states)
        
        districts_analysis.append({
            "district": dist_id,
            "grove_state": district["grove_state"].value if hasattr(district["grove_state"], 'value') else district["grove_state"],
            "vulnerability_ranking": collapse_order
        })
    
    return {
        "city_id": city_id,
        "city_grove": city["grove_state"].value if hasattr(city["grove_state"], 'value') else city["grove_state"],
        "districts": districts_analysis,
        "insight": "가장 취약한 인프라를 확인하세요"
    }

@router.get("/scenarios/infra")
def list_infra_scenarios():
    """인프라 시나리오 목록"""
    return {
        "scenarios": list(INFRA_SCENARIOS.keys()),
        "description": {
            "storm_rush": "폭우 + 퇴근시간: Traffic↑, Safety↑, Energy↑",
            "storm_after_invest": "에너지 투자 후 동일 폭우",
            "blackout": "연쇄 정전: Energy→Traffic→Safety"
        }
    }
