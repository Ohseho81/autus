"""
AUTUS Reliance API
==================

No Addiction, Guaranteed Dependence

Endpoints:
- GET  /reliance/principles       - 핵심 원칙
- GET  /reliance/mechanisms       - 금지/허용 메커니즘
- POST /reliance/validate         - 메시지 검증
- POST /reliance/intervene        - 안전한 개입 생성
- GET  /reliance/trust/{user_id}  - 신뢰 상태
- POST /reliance/prediction       - 예측 기록
- POST /reliance/outcome          - 결과 기록
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from reliance import (
    CORE_PRINCIPLES,
    FORBIDDEN_MECHANISMS,
    ALLOWED_MECHANISMS,
    GUARDRAILS,
    INTERVENTION_LIMITS,
    MessageValidator,
    SafeFeedbackGenerator,
    ViolationDetector,
    RelianceEngine,
)
from reliance.architecture import get_reliance_engine


# ============================================
# Router
# ============================================

router = APIRouter(prefix="/reliance", tags=["Reliance Architecture"])


# ============================================
# Request Models
# ============================================

class ValidateRequest(BaseModel):
    message: str


class InterveneRequest(BaseModel):
    intervention_type: str  # critical_alert, warning, suggestion, completion_feedback
    content: str
    context: Optional[Dict[str, Any]] = None


class PredictionRequest(BaseModel):
    prediction_id: str
    prediction: str
    confidence: float
    was_shown: bool = False


class OutcomeRequest(BaseModel):
    prediction_id: str
    was_correct: bool


class FeedbackRequest(BaseModel):
    feedback_type: str  # completion, efficacy, deadline, loss
    task_name: Optional[str] = None
    action: Optional[str] = None
    prevented_loss: Optional[str] = None
    deadline: Optional[str] = None
    remaining: Optional[str] = None
    loss_type: Optional[str] = None
    amount: Optional[str] = None


# ============================================
# Principles Endpoints
# ============================================

@router.get("/principles")
async def get_principles():
    """핵심 원칙"""
    return {
        "principles": CORE_PRINCIPLES.strip().split("\n"),
        "summary": "중독을 설계하지 않고 의존을 만든다",
    }


@router.get("/mechanisms")
async def get_mechanisms():
    """금지/허용 메커니즘"""
    forbidden = []
    for name, mech in FORBIDDEN_MECHANISMS.items():
        forbidden.append({
            "name": mech.name,
            "name_ko": mech.name_ko,
            "description": mech.description,
            "constraints": mech.constraints,
        })
    
    allowed = []
    for name, mech in ALLOWED_MECHANISMS.items():
        allowed.append({
            "name": mech.name,
            "name_ko": mech.name_ko,
            "type": mech.mechanism_type.value,
            "description": mech.description,
            "constraints": mech.constraints,
        })
    
    return {
        "forbidden": {
            "count": len(forbidden),
            "mechanisms": forbidden,
        },
        "allowed": {
            "count": len(allowed),
            "mechanisms": allowed,
        },
    }


@router.get("/guardrails")
async def get_guardrails():
    """개입 가드레일"""
    return {
        "guardrails": [
            {
                "name": g.name,
                "rule": g.rule,
                "violation_action": g.violation_action,
            }
            for g in GUARDRAILS
        ],
    }


@router.get("/limits")
async def get_intervention_limits():
    """개입 빈도 제한"""
    return {
        "limits": {
            name: {
                "max_per_day": limit.max_per_day,
                "min_interval_hours": limit.min_interval_hours,
                "cooldown_after_action": limit.cooldown_after_action,
            }
            for name, limit in INTERVENTION_LIMITS.items()
        },
    }


# ============================================
# Validation Endpoints
# ============================================

@router.post("/validate")
async def validate_message(request: ValidateRequest):
    """
    메시지 검증
    
    금지 패턴, 과잉 이모지, 과잉 느낌표 검사
    """
    result = MessageValidator.validate(request.message)
    
    return {
        "original": request.message,
        "valid": result["valid"],
        "violations": result["violations"],
        "sanitized": result["sanitized"],
    }


@router.post("/check-request")
async def check_request(request: ValidateRequest):
    """
    요청 검증
    
    위반 신호 감지
    """
    result = ViolationDetector.check_request(request.message)
    
    return {
        "request": request.message,
        "has_violations": result["has_violations"],
        "violations": result["violations"],
        "action": result["action"],
    }


# ============================================
# Intervention Endpoints
# ============================================

@router.post("/intervene/{user_id}")
async def create_intervention(user_id: str, request: InterveneRequest):
    """
    안전한 개입 생성
    
    모든 가드레일을 통과한 경우에만 생성
    """
    engine = get_reliance_engine(user_id)
    
    message = engine.create_message(
        request.intervention_type,
        request.content,
        request.context,
    )
    
    if message:
        return {
            "success": True,
            "user_id": user_id,
            "intervention_type": request.intervention_type,
            "message": message,
            "timestamp": datetime.now().isoformat(),
        }
    else:
        return {
            "success": False,
            "reason": "개입 제한 초과 또는 가드레일 위반",
            "remaining": engine.intervention_manager.get_remaining_interventions(),
        }


@router.get("/can-intervene/{user_id}/{intervention_type}")
async def can_intervene(user_id: str, intervention_type: str):
    """개입 가능 여부 확인"""
    engine = get_reliance_engine(user_id)
    
    can = engine.intervention_manager.can_intervene(intervention_type)
    remaining = engine.intervention_manager.get_remaining_interventions()
    
    return {
        "user_id": user_id,
        "intervention_type": intervention_type,
        "can_intervene": can,
        "remaining_today": remaining.get(intervention_type, 0),
    }


# ============================================
# Trust Endpoints
# ============================================

@router.get("/trust/{user_id}")
async def get_trust_status(user_id: str):
    """신뢰 상태"""
    engine = get_reliance_engine(user_id)
    
    return {
        "user_id": user_id,
        "trust": engine.get_trust_status(),
    }


@router.post("/prediction/{user_id}")
async def record_prediction(user_id: str, request: PredictionRequest):
    """예측 기록"""
    engine = get_reliance_engine(user_id)
    
    engine.record_prediction(
        request.prediction_id,
        request.prediction,
        request.confidence,
        request.was_shown,
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "prediction_id": request.prediction_id,
        "recorded": True,
    }


@router.post("/outcome/{user_id}")
async def record_outcome(user_id: str, request: OutcomeRequest):
    """결과 기록"""
    engine = get_reliance_engine(user_id)
    
    engine.record_outcome(
        request.prediction_id,
        request.was_correct,
    )
    
    return {
        "success": True,
        "user_id": user_id,
        "prediction_id": request.prediction_id,
        "was_correct": request.was_correct,
        "trust_status": engine.get_trust_status(),
    }


# ============================================
# Safe Feedback Endpoints
# ============================================

@router.post("/feedback")
async def generate_safe_feedback(request: FeedbackRequest):
    """안전한 피드백 생성"""
    feedback = None
    
    if request.feedback_type == "completion" and request.task_name:
        feedback = SafeFeedbackGenerator.completion_feedback(request.task_name)
    
    elif request.feedback_type == "efficacy" and request.action and request.prevented_loss:
        feedback = SafeFeedbackGenerator.efficacy_feedback(
            request.action, request.prevented_loss
        )
    
    elif request.feedback_type == "deadline" and request.deadline and request.remaining:
        feedback = SafeFeedbackGenerator.deadline_warning(
            request.deadline, request.remaining
        )
    
    elif request.feedback_type == "loss" and request.loss_type and request.amount:
        feedback = SafeFeedbackGenerator.loss_awareness(
            request.loss_type, request.amount
        )
    
    if feedback:
        return {
            "feedback_type": request.feedback_type,
            "feedback": feedback,
        }
    else:
        raise HTTPException(
            status_code=400,
            detail=f"필수 파라미터 누락: {request.feedback_type}"
        )


# ============================================
# Status Endpoint
# ============================================

@router.get("/status/{user_id}")
async def get_reliance_status(user_id: str):
    """전체 상태"""
    engine = get_reliance_engine(user_id)
    
    return engine.get_status()
