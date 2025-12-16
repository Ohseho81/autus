"""
AUTUS Succession API
제12법칙: 영속 - 승계 및 이양 API

수호자 관리, 권한 이양, 승계 상태
"""
from fastapi import APIRouter, HTTPException
from typing import Dict, Any, Optional, List
from pydantic import BaseModel
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from succession.guardian import get_guardian
from succession.handover import get_handover

router = APIRouter(prefix="/succession", tags=["Succession"])

_guardian = get_guardian()
_handover = get_handover()


# ============ Models ============

class AddGuardianRequest(BaseModel):
    name: str
    level: int  # 1, 2, 3
    public_key: Optional[str] = None
    contact: Optional[str] = None

class AddTriggerRequest(BaseModel):
    trigger_type: str  # inactivity, manual, vote
    condition: Dict[str, Any]

class InitiateHandoverRequest(BaseModel):
    from_entity: str
    to_entity: str
    permissions: List[str]
    reason: str = ""

class ApproveHandoverRequest(BaseModel):
    approver: str
    signature: Optional[str] = None


# ============ Guardian ============

@router.get("/guardians")
async def list_guardians(level: Optional[int] = None):
    """수호자 목록"""
    return {"guardians": _guardian.get_guardians(level)}

@router.post("/guardians")
async def add_guardian(request: AddGuardianRequest):
    """수호자 추가"""
    if request.level not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="Level must be 1, 2, or 3")
    
    guardian = _guardian.add_guardian(
        name=request.name,
        level=request.level,
        public_key=request.public_key,
        contact=request.contact
    )
    return {"success": True, "guardian": guardian}

@router.delete("/guardians/{guardian_id}")
async def remove_guardian(guardian_id: str):
    """수호자 제거"""
    if _guardian.remove_guardian(guardian_id):
        return {"success": True, "removed": guardian_id}
    raise HTTPException(status_code=404, detail="Guardian not found")


# ============ Triggers ============

@router.get("/triggers")
async def list_triggers():
    """승계 트리거 목록"""
    return {"triggers": _guardian.succession_triggers}

@router.post("/triggers")
async def add_trigger(request: AddTriggerRequest):
    """승계 트리거 추가"""
    trigger = _guardian.add_trigger(
        trigger_type=request.trigger_type,
        condition=request.condition
    )
    return {"success": True, "trigger": trigger}

@router.post("/triggers/check")
async def check_triggers(context: Optional[Dict[str, Any]] = None):
    """트리거 확인"""
    triggered = _guardian.check_triggers(context or {})
    return {
        "checked": len(_guardian.succession_triggers),
        "triggered": len(triggered),
        "triggers": triggered
    }


# ============ Handover ============

@router.get("/handover/status")
async def handover_status():
    """이양 상태"""
    return _handover.get_status()

@router.get("/handover/history")
async def handover_history():
    """이양 기록"""
    return {"history": _handover.get_history()}

@router.get("/handover/pending")
async def pending_handovers():
    """대기 중인 이양"""
    return {"pending": list(_handover.pending_handovers.values())}

@router.post("/handover/initiate")
async def initiate_handover(request: InitiateHandoverRequest):
    """이양 시작"""
    handover = _handover.initiate_handover(
        from_entity=request.from_entity,
        to_entity=request.to_entity,
        permissions=request.permissions,
        reason=request.reason
    )
    return {"success": True, "handover": handover}

@router.post("/handover/{handover_id}/approve")
async def approve_handover(handover_id: str, request: ApproveHandoverRequest):
    """이양 승인"""
    result = _handover.approve_handover(
        handover_id=handover_id,
        approver=request.approver,
        signature=request.signature
    )
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@router.post("/handover/{handover_id}/reject")
async def reject_handover(handover_id: str, reason: str = ""):
    """이양 거부"""
    result = _handover.reject_handover(handover_id, reason)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


# ============ Status ============

@router.get("/status")
async def succession_status():
    """승계 종합 상태"""
    guardian_status = _guardian.get_succession_status()
    handover_status = _handover.get_status()
    
    return {
        "succession": {
            "guardians": guardian_status,
            "handover": handover_status
        },
        "readiness": {
            "has_guardians": guardian_status["total_guardians"] >= 2,
            "has_triggers": guardian_status["active_triggers"] >= 1,
            "stage": handover_status["current_stage"]
        },
        "principle": "Seho 없이도 AUTUS는 존속한다"
    }
