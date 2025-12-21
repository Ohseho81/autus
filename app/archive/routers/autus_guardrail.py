from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
import sys
sys.path.insert(0, '.')

from core.autus.guardrail.state import get_guardrail
from core.autus.compute.rules import evaluate_rules

router = APIRouter(prefix="/autus/guardrail", tags=["autus-guardrail"])

class CheckRequest(BaseModel):
    pressure: float
    slots: Dict[str, float]

class RuleCheckRequest(BaseModel):
    intent: str = ""
    competitors: int = 0

@router.post("/check")
def check_guardrail(req: CheckRequest):
    guardrail = get_guardrail()
    return guardrail.check_and_act(req.pressure, req.slots)

@router.get("/status")
def guardrail_status():
    guardrail = get_guardrail()
    return {
        "can_commit": guardrail.can_commit(),
        "is_blocked": guardrail.executor.is_blocked()
    }

@router.post("/rules")
def check_rules(req: RuleCheckRequest):
    return evaluate_rules({"intent": req.intent, "competitors": req.competitors})

# Elon Reflex API
from core.guardrail.loop import guardrail_tick, observe_queue

@router.get("/reflex")
def get_reflex():
    """실시간 Guardrail 반사 상태"""
    return guardrail_tick(base=0.5)

@router.post("/reflex/observe")
def observe(queue_len: int = 10):
    """큐 길이 관측"""
    observe_queue(queue_len)
    return guardrail_tick(base=0.5)
