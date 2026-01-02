#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-PRIME: Actions API
자동화 액션 생성 및 관리

Routes:
- GET /: 생성된 액션 목록
- POST /draft: 클러스터별 액션 초안 생성
- POST /draft/payment: 수납 알림 일괄 생성
- POST /draft/custom: 커스텀 액션 생성
- GET /{action_id}: 액션 상세
- POST /{action_id}/execute: 액션 실행 기록
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Query
from pydantic import BaseModel, Field

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.action_drafter import (
    ActionDrafter,
    ActionType,
    ActionResult,
    ActionCategory,
    ActionPriority,
    LEGAL_DISCLAIMER,
)


router = APIRouter(prefix="/actions", tags=["actions"])


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ActionResponse(BaseModel):
    """액션 응답"""
    action_id: str
    student_id: int
    student_name: str
    action_type: str
    category: str
    priority: str
    message: str
    intent_uri: str
    target_phone: Optional[str]
    reason: str
    expected_impact: str
    created_at: datetime
    executed: bool


class DraftRequest(BaseModel):
    """액션 초안 요청"""
    cluster: str = Field(..., description="클러스터 타입 (golden_core, high_potential, stable_orbit, friction_zone, entropy_sink)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class PaymentDraftRequest(BaseModel):
    """수납 알림 요청"""
    due_date: str = Field(..., description="납부 기한 (예: 2025년 1월 10일)")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")
    student_ids: Optional[List[int]] = Field(None, description="특정 학생만 (None이면 전체)")


class CustomDraftRequest(BaseModel):
    """커스텀 액션 요청"""
    student_id: int
    message: str
    action_type: str = Field(default="sms", description="sms, kakao, call, email")
    academy_name: str = Field(default="AUTUS 학원", description="학원명")


class ExecuteRequest(BaseModel):
    """액션 실행 기록 요청"""
    executed_at: Optional[datetime] = None
    result: str = Field(default="success", description="success, failed, skipped")
    notes: Optional[str] = None


class ActionListResponse(BaseModel):
    """액션 목록 응답"""
    total: int
    items: List[ActionResponse]
    by_category: Dict[str, int]
    by_priority: Dict[str, int]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 저장소 (MVP용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

_actions_store: Dict[str, ActionResult] = {}


def _get_demo_students() -> List[dict]:
    """데모 학생 데이터 가져오기"""
    from api.students import _demo_students, _init_demo_data
    _init_demo_data()
    return _demo_students


def _action_to_response(action: ActionResult) -> ActionResponse:
    """ActionResult를 응답 모델로 변환"""
    return ActionResponse(
        action_id=action.action_id,
        student_id=action.student_id,
        student_name=action.student_name,
        action_type=action.action_type.value,
        category=action.category.value,
        priority=action.priority.value,
        message=action.message,
        intent_uri=action.intent_uri,
        target_phone=action.target_phone,
        reason=action.reason,
        expected_impact=action.expected_impact,
        created_at=action.created_at,
        executed=action.executed,
    )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API Endpoints
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/", response_model=ActionListResponse)
async def list_actions(
    category: Optional[str] = Query(None, description="카테고리 필터"),
    priority: Optional[str] = Query(None, description="우선순위 필터"),
    executed: Optional[bool] = Query(None, description="실행 여부 필터"),
    limit: int = Query(50, ge=1, le=200, description="최대 개수"),
):
    """
    생성된 액션 목록 조회
    
    필터링 옵션:
    - category: payment, attendance, grade, retention, upsell, thank_you, custom
    - priority: urgent, high, normal, low
    - executed: true/false
    """
    actions = list(_actions_store.values())
    
    # 필터링
    if category:
        actions = [a for a in actions if a.category.value == category]
    if priority:
        actions = [a for a in actions if a.priority.value == priority]
    if executed is not None:
        actions = [a for a in actions if a.executed == executed]
    
    # 정렬 (최신순)
    actions.sort(key=lambda x: x.created_at, reverse=True)
    
    # 제한
    actions = actions[:limit]
    
    # 카테고리별 집계
    by_category = {}
    by_priority = {}
    for a in _actions_store.values():
        cat = a.category.value
        pri = a.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category=by_category,
        by_priority=by_priority,
    )


@router.post("/draft", response_model=ActionListResponse)
async def draft_cluster_actions(request: DraftRequest):
    """
    클러스터별 자동 액션 초안 생성
    
    - golden_core: VIP 감사 + 추가 과목 제안
    - high_potential: 격려 메시지
    - friction_zone: 이탈 방지 연락
    - entropy_sink: 긴급 상담 요청
    """
    students = _get_demo_students()
    
    # 클러스터 필터링
    cluster_students = [s for s in students if s.get("cluster") == request.cluster]
    
    if not cluster_students:
        return ActionListResponse(
            total=0,
            items=[],
            by_category={},
            by_priority={},
        )
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_actions_for_cluster(cluster_students, request.cluster)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={request.cluster: len(actions)},
        by_priority={a.priority.value: 1 for a in actions},
    )


@router.post("/draft/payment", response_model=ActionListResponse)
async def draft_payment_actions(request: PaymentDraftRequest):
    """
    수납 알림 일괄 생성
    
    - 전체 학생 또는 특정 학생에게 수납 알림 생성
    """
    students = _get_demo_students()
    
    if request.student_ids:
        students = [s for s in students if s.get("id") in request.student_ids]
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    actions = drafter.generate_batch_payment_reminders(students, request.due_date)
    
    # 저장
    for action in actions:
        _actions_store[action.action_id] = action
    
    return ActionListResponse(
        total=len(actions),
        items=[_action_to_response(a) for a in actions],
        by_category={"payment": len(actions)},
        by_priority={"high": len(actions)},
    )


@router.post("/draft/custom", response_model=ActionResponse)
async def draft_custom_action(request: CustomDraftRequest):
    """
    커스텀 액션 생성
    
    - 사용자 정의 메시지로 액션 생성
    """
    students = _get_demo_students()
    student = next((s for s in students if s.get("id") == request.student_id), None)
    
    if not student:
        raise HTTPException(status_code=404, detail=f"Student {request.student_id} not found")
    
    phone = student.get("parent_phone") or student.get("phone", "")
    if not phone:
        raise HTTPException(status_code=400, detail="Student has no phone number")
    
    # 액션 타입 변환
    try:
        action_type = ActionType(request.action_type)
    except ValueError:
        action_type = ActionType.SMS
    
    drafter = ActionDrafter(academy_name=request.academy_name)
    action = drafter.create_custom_action(
        student_id=request.student_id,
        student_name=student.get("name", ""),
        phone=phone,
        message=request.message,
        action_type=action_type,
    )
    
    # 저장
    _actions_store[action.action_id] = action
    
    return _action_to_response(action)


@router.get("/disclaimer")
async def get_legal_disclaimer():
    """법적 면책 조항 조회"""
    return {
        "disclaimer": LEGAL_DISCLAIMER,
        "summary": {
            "ko": "본 시스템은 메시지 초안만 생성합니다. 실제 발송은 사용자가 직접 실행합니다.",
            "en": "This system only generates message drafts. Actual sending is done by the user."
        },
        "responsibilities": [
            "메시지 발송의 법적 책임은 사용자에게 있습니다.",
            "스팸 방지법(정보통신망법 제50조) 준수는 사용자의 책임입니다.",
            "수신자의 동의 없이 메시지를 발송하면 안 됩니다.",
        ]
    }


@router.get("/{action_id}", response_model=ActionResponse)
async def get_action(action_id: str):
    """액션 상세 조회"""
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    return _action_to_response(action)


@router.post("/{action_id}/execute")
async def execute_action(action_id: str, request: ExecuteRequest):
    """
    액션 실행 기록
    
    - 클라이언트에서 액션 실행 후 결과 기록
    """
    action = _actions_store.get(action_id)
    
    if not action:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    action.executed = True
    action.executed_at = request.executed_at or datetime.utcnow()
    
    _actions_store[action_id] = action
    
    return {
        "success": True,
        "action_id": action_id,
        "executed_at": action.executed_at.isoformat(),
        "result": request.result,
        "notes": request.notes,
    }


@router.delete("/{action_id}")
async def delete_action(action_id: str):
    """액션 삭제"""
    if action_id not in _actions_store:
        raise HTTPException(status_code=404, detail=f"Action {action_id} not found")
    
    del _actions_store[action_id]
    
    return {"success": True, "deleted": action_id}


@router.post("/clear")
async def clear_all_actions():
    """모든 액션 삭제 (개발용)"""
    count = len(_actions_store)
    _actions_store.clear()
    
    return {"success": True, "cleared": count}


@router.get("/stats/summary")
async def get_action_stats():
    """액션 통계 요약"""
    actions = list(_actions_store.values())
    
    if not actions:
        return {
            "total_actions": 0,
            "pending": 0,
            "executed": 0,
            "by_category": {},
            "by_priority": {},
        }
    
    pending = sum(1 for a in actions if not a.executed)
    executed = sum(1 for a in actions if a.executed)
    
    by_category = {}
    by_priority = {}
    
    for action in actions:
        cat = action.category.value
        pri = action.priority.value
        by_category[cat] = by_category.get(cat, 0) + 1
        by_priority[pri] = by_priority.get(pri, 0) + 1
    
    return {
        "total_actions": len(actions),
        "pending": pending,
        "executed": executed,
        "execution_rate": round(executed / len(actions) * 100, 1) if actions else 0,
        "by_category": by_category,
        "by_priority": by_priority,
    }

























