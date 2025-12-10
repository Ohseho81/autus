"""
National Meaning Layer OS v1
/gov/national API 라우터
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# 상대 import 대신 절대 경로 사용
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from engines.national import (
    NationalVector,
    NationalKernelService,
    NationalScenario,
    NationalScenarioEngine,
)

router = APIRouter(prefix="/gov/national", tags=["gov-national"])


# === Request Models ===
class SimulateRequest(BaseModel):
    route_code: str = "PH-KR"
    events: List[str]
    initial_vector: Optional[Dict[str, float]] = None


class ScenarioCompareRequest(BaseModel):
    route_code: str = "PH-KR"
    scenarios: List[List[str]]  # 여러 이벤트 시퀀스
    names: Optional[List[str]] = None


class PresetCompareRequest(BaseModel):
    scenario_ids: List[str]
    initial_vector: Optional[Dict[str, float]] = None


# === Endpoints ===
@router.get("/routes")
def list_routes():
    """사용 가능한 루트 목록"""
    return {"routes": NationalKernelService.list_routes()}


@router.get("/events")
def list_events():
    """사용 가능한 이벤트 목록"""
    return {"events": NationalKernelService.list_events()}


@router.get("/scenarios")
def list_scenarios():
    """사전 정의 시나리오 목록"""
    engine = NationalScenarioEngine()
    return {"scenarios": engine.list_presets()}


@router.post("/simulate")
def simulate(req: SimulateRequest) -> Dict[str, Any]:
    """이벤트 시퀀스 시뮬레이션"""
    v0 = NationalVector.from_dict(req.initial_vector) if req.initial_vector else NationalVector()
    kernel = NationalKernelService(route_code=req.route_code)
    result = kernel.apply_events(v0, req.events)
    return result


@router.post("/scenario/compare")
def compare_scenarios(req: ScenarioCompareRequest) -> Dict[str, Any]:
    """커스텀 시나리오 비교"""
    engine = NationalScenarioEngine()
    
    scenarios = []
    for i, events in enumerate(req.scenarios):
        name = req.names[i] if req.names and i < len(req.names) else f"scenario_{i}"
        scenarios.append(NationalScenario(
            id=f"custom_{i}",
            name=name,
            route_code=req.route_code,
            events=events,
        ))
    
    return engine.compare(scenarios)


@router.post("/scenario/preset")
def compare_presets(req: PresetCompareRequest) -> Dict[str, Any]:
    """사전 정의 시나리오 비교"""
    engine = NationalScenarioEngine()
    v0 = NationalVector.from_dict(req.initial_vector) if req.initial_vector else None
    return engine.compare_presets(req.scenario_ids, v0)


@router.get("/scenario/{scenario_id}")
def run_preset(scenario_id: str) -> Dict[str, Any]:
    """단일 사전 정의 시나리오 실행"""
    engine = NationalScenarioEngine()
    return engine.run_preset(scenario_id)


if __name__ == "__main__":
    # 테스트용
    print("Gov National API 라우터 로드 완료")
    print(f"Routes: {NationalKernelService.list_routes()}")
