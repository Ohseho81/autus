"""
AUTUS Kernel Router
CORE Packs 통합 API
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# CORE Packs import
from packs.core.vector_pack import VectorPack
from packs.core.event_pack import EventPack
from packs.core.phase_pack import PhasePack
from packs.core.jscore_pack import JScorePack
from packs.core.risk_pack import RiskPack
from packs.core.scenario_pack import ScenarioPack
from packs.core.projection_pack import ProjectionPack

router = APIRouter(prefix="/kernel", tags=["kernel"])

# Pack 인스턴스 (싱글톤)
_packs = {
    "vector": VectorPack(),
    "event": EventPack(),
    "phase": PhasePack(),
    "jscore": JScorePack(),
    "risk": RiskPack(),
    "scenario": ScenarioPack(),
    "projection": ProjectionPack(),
}


# === Request Models ===
class CreateEntityRequest(BaseModel):
    entity_id: str
    entity_type: str = "HUM"
    domain: str = "LIME"
    initial_vector: Optional[Dict[str, float]] = None


class ProcessEventRequest(BaseModel):
    entity_id: str
    event_code: str
    domain: str = "LIME"


class BatchEventsRequest(BaseModel):
    entity_id: str
    events: List[str]
    domain: str = "LIME"


class AssessmentRequest(BaseModel):
    entity_id: str
    vector: Optional[Dict[str, float]] = None


# === Endpoints ===
@router.get("/status")
def kernel_status():
    """커널 상태 확인"""
    return {
        "status": "active",
        "packs_loaded": list(_packs.keys()),
        "version": "1.0.0",
    }


@router.post("/entity/create")
def create_entity(req: CreateEntityRequest):
    """새 엔티티 생성 (Vector + Phase 초기화)"""
    # Vector 생성
    vector_result = _packs["vector"].execute({
        "action": "create",
        "entity_id": req.entity_id,
        "entity_type": req.entity_type,
        "domain": req.domain,
        "vector": req.initial_vector,
    })
    
    # Phase 초기화
    phase_result = _packs["phase"].execute({
        "action": "initialize",
        "entity_id": req.entity_id,
        "j_score": vector_result.get("state", {}).get("j_score", 50) / 100,
    })
    
    return {
        "status": "success",
        "entity_id": req.entity_id,
        "vector": vector_result.get("state"),
        "phase": phase_result.get("state"),
    }


@router.post("/event/process")
def process_event(req: ProcessEventRequest):
    """단일 이벤트 처리 (Event → Delta → Vector → Phase)"""
    # 1. 이벤트 처리 → Delta 획득
    event_result = _packs["event"].execute({
        "action": "process",
        "event_code": req.event_code,
        "entity_id": req.entity_id,
        "domain": req.domain,
    })
    
    delta = event_result.get("delta", {})
    
    # 2. Delta → Vector 적용
    vector_result = _packs["vector"].execute({
        "action": "apply_delta",
        "entity_id": req.entity_id,
        "delta": delta,
    })
    
    # 3. Phase 이벤트 기록
    phase_result = _packs["phase"].execute({
        "action": "record_event",
        "entity_id": req.entity_id,
        "event_code": req.event_code,
    })
    
    # 4. J-Score 업데이트
    new_j = vector_result.get("new_j", 50)
    _packs["phase"].execute({
        "action": "update_j_score",
        "entity_id": req.entity_id,
        "j_score": new_j / 100,
    })
    
    return {
        "status": "success",
        "event": event_result.get("event"),
        "delta": delta,
        "vector_change": {
            "before": vector_result.get("old_j"),
            "after": vector_result.get("new_j"),
        },
        "phase": {
            "can_transition": phase_result.get("can_transition"),
            "next": phase_result.get("next"),
        },
    }


@router.post("/event/batch")
def process_batch_events(req: BatchEventsRequest):
    """여러 이벤트 일괄 처리"""
    results = []
    
    for event_code in req.events:
        result = process_event(ProcessEventRequest(
            entity_id=req.entity_id,
            event_code=event_code,
            domain=req.domain,
        ))
        results.append({
            "event": event_code,
            "j_score": result["vector_change"]["after"],
            "can_transition": result["phase"]["can_transition"],
        })
    
    return {
        "status": "success",
        "entity_id": req.entity_id,
        "events_processed": len(results),
        "results": results,
        "final_j_score": results[-1]["j_score"] if results else None,
    }


@router.get("/entity/{entity_id}")
def get_entity(entity_id: str):
    """엔티티 상태 조회"""
    vector_result = _packs["vector"].execute({
        "action": "get_state",
        "entity_id": entity_id,
    })
    
    phase_result = _packs["phase"].execute({
        "action": "get_progress",
        "entity_id": entity_id,
    })
    
    return {
        "entity_id": entity_id,
        "vector": vector_result.get("state"),
        "phase": phase_result,
    }


@router.post("/assess")
def full_assessment(req: AssessmentRequest):
    """전체 상태 평가 (J-Score, Risk, Projection, Scenario)"""
    # 벡터 가져오기
    if req.vector:
        vector = req.vector
    else:
        v_result = _packs["vector"].execute({
            "action": "get_state",
            "entity_id": req.entity_id,
        })
        vector = v_result.get("state", {}).get("vector", {})
    
    # J-Score
    jscore_result = _packs["jscore"].execute({
        "action": "calculate",
        "vector": vector,
    })
    
    # Risk
    risk_result = _packs["risk"].execute({
        "action": "assess",
        "entity_id": req.entity_id,
        "vector": vector,
    })
    
    # Projection (30일)
    proj_result = _packs["projection"].execute({
        "action": "project",
        "state": {"j_score": jscore_result.get("result", {}).get("j_score", 50) / 100, **vector},
        "days_ahead": 30,
    })
    
    # Scenario 비교
    scenario_result = _packs["scenario"].execute({
        "action": "compare",
        "state": {"j_score": jscore_result.get("result", {}).get("j_score", 50) / 100},
    })
    
    return {
        "entity_id": req.entity_id,
        "assessment": {
            "j_score": jscore_result.get("result"),
            "risk": {
                "score": risk_result.get("risk_score"),
                "level": risk_result.get("level"),
            },
            "projection_30d": proj_result.get("projection"),
            "scenarios": scenario_result.get("scenarios"),
        },
    }


@router.post("/phase/transition")
def phase_transition(entity_id: str, target_phase: str, force: bool = False):
    """Phase 전이 실행"""
    return _packs["phase"].execute({
        "action": "transition",
        "entity_id": entity_id,
        "target_phase": target_phase,
        "force": force,
    })
