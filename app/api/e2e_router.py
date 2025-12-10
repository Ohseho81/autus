"""
AUTUS E2E Pipeline Router
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from engines.e2e_pipeline import E2EPipeline, JOURNEY_TEMPLATES

router = APIRouter(prefix="/e2e", tags=["e2e-pipeline"])

# Pipeline 인스턴스 캐시
_pipelines: Dict[str, E2EPipeline] = {}


def get_pipeline(route_code: str = "PH-KR") -> E2EPipeline:
    if route_code not in _pipelines:
        _pipelines[route_code] = E2EPipeline(route_code)
    return _pipelines[route_code]


# === Request Models ===
class CreateJourneyRequest(BaseModel):
    entity_id: str
    route_code: str = "PH-KR"
    entity_type: str = "HUM"


class ProcessEventRequest(BaseModel):
    entity_id: str
    event_code: str
    route_code: str = "PH-KR"


class ProcessJourneyRequest(BaseModel):
    entity_id: str
    events: List[str]
    route_code: str = "PH-KR"


class CompareRequest(BaseModel):
    route_code: str = "PH-KR"
    scenarios: Optional[Dict[str, List[str]]] = None


# === Endpoints ===
@router.get("/templates")
def list_templates():
    """사전 정의 여정 템플릿"""
    return {
        "templates": {name: len(events) for name, events in JOURNEY_TEMPLATES.items()},
        "detail": JOURNEY_TEMPLATES,
    }


@router.post("/journey/create")
def create_journey(req: CreateJourneyRequest):
    """새 여정 생성"""
    pipeline = get_pipeline(req.route_code)
    state = pipeline.create_journey(req.entity_id, req.entity_type)
    return {
        "status": "created",
        "entity_id": state.entity_id,
        "route_code": state.route_code,
        "j_score": state.j_score,
    }


@router.post("/journey/event")
def process_event(req: ProcessEventRequest):
    """단일 이벤트 처리"""
    pipeline = get_pipeline(req.route_code)
    return pipeline.process_event(req.entity_id, req.event_code)


@router.post("/journey/process")
def process_journey(req: ProcessJourneyRequest):
    """전체 여정 처리"""
    pipeline = get_pipeline(req.route_code)
    return pipeline.process_journey(req.entity_id, req.events)


@router.post("/journey/template/{template_name}")
def process_template(template_name: str, entity_id: str, route_code: str = "PH-KR"):
    """템플릿 기반 여정 실행"""
    if template_name not in JOURNEY_TEMPLATES:
        return {"error": f"Unknown template: {template_name}"}
    
    pipeline = get_pipeline(route_code)
    pipeline.create_journey(entity_id)
    return pipeline.process_journey(entity_id, JOURNEY_TEMPLATES[template_name])


@router.post("/compare")
def compare_scenarios(req: CompareRequest):
    """시나리오 비교"""
    pipeline = get_pipeline(req.route_code)
    scenarios = req.scenarios or JOURNEY_TEMPLATES
    return pipeline.compare_scenarios("compare", scenarios)


@router.get("/journey/{entity_id}")
def get_journey(entity_id: str, route_code: str = "PH-KR"):
    """여정 상태 조회"""
    pipeline = get_pipeline(route_code)
    state = pipeline.get_state(entity_id)
    if not state:
        return {"error": f"Journey not found: {entity_id}"}
    return {
        "entity_id": state.entity_id,
        "route_code": state.route_code,
        "j_score": state.j_score,
        "risk": round(state.risk, 3),
        "success": round(state.success, 3),
        "phase": state.phase,
        "events_processed": state.events_processed,
    }
