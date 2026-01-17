"""
AUTUS Turnkey Solution API Router
턴키 솔루션 REST API
"""

from fastapi import APIRouter, HTTPException, Query, Path
from pydantic import BaseModel, Field
from typing import Any, Optional
from datetime import datetime

from backend.turnkey.models import TriggerType
from backend.turnkey.templates import (
    INDUSTRY_TEMPLATES,
    create_education_turnkey,
    create_medical_turnkey,
    create_logistics_turnkey,
)
from backend.turnkey.executor import TurnkeyExecutor, get_executor


router = APIRouter(
    prefix="/turnkey",
    tags=["Turnkey Solutions"],
    responses={404: {"description": "Not found"}}
)


# =============================================================================
# Request/Response Models
# =============================================================================

class TriggerRequest(BaseModel):
    trigger_type: str = Field(..., description="트리거 유형 (결제, 수업, 예약 등)")
    payload: dict = Field(default_factory=dict, description="트리거 페이로드")


class TriggerResponse(BaseModel):
    chain_id: str
    trigger_type: str
    success: bool
    eliminated_count: int
    outputs: dict
    duration_ms: float
    timestamp: str


class SolutionSummary(BaseModel):
    solution_id: str
    solution_name: str
    industry: str
    trigger_count: int
    eliminated_count: int
    annual_savings: float


# =============================================================================
# 글로벌 상태
# =============================================================================

# 산업별 실행기 캐시
_executors: dict[str, TurnkeyExecutor] = {}


def get_industry_executor(industry: str) -> TurnkeyExecutor:
    """산업별 실행기 가져오기"""
    if industry not in _executors:
        if industry == "교육":
            framework = create_education_turnkey()
        elif industry == "의료":
            framework = create_medical_turnkey()
        elif industry == "물류":
            framework = create_logistics_turnkey()
        else:
            raise HTTPException(404, f"Industry not found: {industry}")
        
        executor = TurnkeyExecutor()
        for chain in framework.trigger_chains:
            executor.register_chain(chain)
        _executors[industry] = executor
    
    return _executors[industry]


# =============================================================================
# API Endpoints
# =============================================================================

@router.get("/industries")
async def list_industries():
    """지원 산업 목록"""
    return {
        "industries": [
            {
                "id": industry,
                "name": industry,
                "core_triggers": template["core_triggers"],
                "eliminated_count": template["eliminated_count"],
                "description": template["description"]
            }
            for industry, template in INDUSTRY_TEMPLATES.items()
        ]
    }


@router.get("/industries/{industry}")
async def get_industry_detail(industry: str = Path(..., description="산업")):
    """산업별 상세 정보"""
    if industry not in INDUSTRY_TEMPLATES:
        raise HTTPException(404, f"Industry not found: {industry}")
    
    template = INDUSTRY_TEMPLATES[industry]
    
    # 프레임워크 로드
    if industry == "교육":
        framework = create_education_turnkey()
    elif industry == "의료":
        framework = create_medical_turnkey()
    elif industry == "물류":
        framework = create_logistics_turnkey()
    else:
        framework = None
    
    result = {
        "industry": industry,
        "core_triggers": template["core_triggers"],
        "description": template["description"],
        "departments": template.get("departments", []),
    }
    
    if framework:
        result.update({
            "legacy_tasks_count": len(framework.legacy_tasks),
            "eliminated_tasks_count": len(framework.eliminated_tasks),
            "elimination_rate": framework.elimination_rate,
            "savings": {
                "annual_cost": framework.savings_cost,
                "time_per_task_minutes": framework.savings_time
            },
            "final_outputs": framework.final_outputs,
            "added_value": framework.added_value,
            "trigger_chains": [
                {
                    "trigger_type": chain.trigger_type.value,
                    "trigger_name": chain.trigger_name,
                    "action_count": len(chain.actions),
                    "absorbed_tasks": chain.total_absorbed_tasks
                }
                for chain in framework.trigger_chains
            ]
        })
    
    return result


@router.get("/industries/{industry}/chains")
async def get_industry_chains(industry: str):
    """산업별 트리거 체인 목록"""
    executor = get_industry_executor(industry)
    return {"chains": executor.get_all_chains()}


@router.get("/industries/{industry}/chains/{trigger_type}")
async def get_chain_detail(industry: str, trigger_type: str):
    """트리거 체인 상세"""
    executor = get_industry_executor(industry)
    
    # 트리거 타입 변환
    try:
        tt = TriggerType(trigger_type)
    except ValueError:
        # 한글 매핑 시도
        mapping = {
            "결제": TriggerType.PAYMENT,
            "수업": TriggerType.SERVICE,
            "서비스": TriggerType.SERVICE,
            "예약": TriggerType.RESERVATION,
            "진료": TriggerType.SERVICE,
            "주문": TriggerType.ORDER,
            "배송": TriggerType.DELIVERY,
        }
        tt = mapping.get(trigger_type)
        if not tt:
            raise HTTPException(404, f"Trigger type not found: {trigger_type}")
    
    chain_info = executor.get_chain_info(tt)
    if not chain_info:
        raise HTTPException(404, f"Chain not found for trigger: {trigger_type}")
    
    return chain_info


@router.post("/industries/{industry}/trigger")
async def execute_trigger(industry: str, request: TriggerRequest):
    """트리거 실행"""
    executor = get_industry_executor(industry)
    
    # 트리거 타입 변환
    mapping = {
        "결제": TriggerType.PAYMENT,
        "수업": TriggerType.SERVICE,
        "서비스": TriggerType.SERVICE,
        "예약": TriggerType.RESERVATION,
        "진료": TriggerType.SERVICE,
        "주문": TriggerType.ORDER,
        "배송": TriggerType.DELIVERY,
        "체크인": TriggerType.CHECKIN,
        "계약": TriggerType.CONTRACT,
    }
    
    tt = mapping.get(request.trigger_type)
    if not tt:
        try:
            tt = TriggerType(request.trigger_type)
        except ValueError:
            raise HTTPException(400, f"Invalid trigger type: {request.trigger_type}")
    
    result = await executor.trigger(tt, request.payload)
    
    return TriggerResponse(
        chain_id=result.chain_id,
        trigger_type=result.trigger_type.value,
        success=result.success,
        eliminated_count=result.eliminated_task_count,
        outputs=result.outputs,
        duration_ms=result.total_duration_ms,
        timestamp=result.timestamp.isoformat()
    )


@router.get("/industries/{industry}/stats")
async def get_industry_stats(industry: str):
    """산업별 실행 통계"""
    executor = get_industry_executor(industry)
    return executor.get_execution_stats()


@router.get("/industries/{industry}/executions")
async def get_recent_executions(
    industry: str,
    limit: int = Query(10, ge=1, le=100)
):
    """최근 실행 이력"""
    executor = get_industry_executor(industry)
    return {"executions": executor.get_recent_executions(limit)}


# =============================================================================
# Demo Endpoints
# =============================================================================

@router.post("/demo/education/payment")
async def demo_education_payment(
    student_name: str = "김학생",
    course_name: str = "영어회화",
    amount: int = 300000
):
    """
    교육 서비스 데모: 결제 트리거
    
    결제 한 번으로 전체 등록 프로세스 자동 완료:
    - 수납/증빙 발행
    - 시간표 생성
    - 출석부 생성
    - 생활기록부 초기화
    - 학부모 앱 연동
    - CRM 업데이트
    - 만족도 조사 예약
    """
    executor = get_industry_executor("교육")
    
    result = await executor.trigger(
        TriggerType.PAYMENT,
        {
            "student_name": student_name,
            "course_name": course_name,
            "amount": amount,
            "payment_method": "card",
            "timestamp": datetime.now().isoformat()
        }
    )
    
    return {
        "demo": "교육 서비스 - 결제 트리거",
        "before": "6명 담당자 → 15개 업무 → 180분 소요",
        "after": "0명 담당자 → 0개 업무 → 즉시 완료",
        "result": {
            "chain_id": result.chain_id,
            "success": result.success,
            "eliminated_tasks": result.eliminated_task_count,
            "duration_ms": result.total_duration_ms,
            "outputs": list(result.outputs.keys())
        }
    }


@router.post("/demo/education/class")
async def demo_education_class(
    class_name: str = "영어회화 A반",
    teacher_name: str = "김선생",
    student_count: int = 15
):
    """
    교육 서비스 데모: 수업 트리거
    
    수업 시작으로 전체 기록/분석 자동 완료:
    - 출석 자동 체크
    - 수업일지 자동 생성
    - 학습데이터 자동 수집
    - 발달기록 자동 갱신
    - 학부모 리포트 자동 발송
    - AI 학습 분석
    """
    executor = get_industry_executor("교육")
    
    result = await executor.trigger(
        TriggerType.SERVICE,
        {
            "class_name": class_name,
            "teacher_name": teacher_name,
            "student_count": student_count,
            "start_time": datetime.now().isoformat()
        }
    )
    
    return {
        "demo": "교육 서비스 - 수업 트리거",
        "before": "교사 → 13개 수동 작업 → 수업당 48분 추가",
        "after": "교사 → 0개 수동 작업 → 수업에만 집중",
        "result": {
            "chain_id": result.chain_id,
            "success": result.success,
            "eliminated_tasks": result.eliminated_task_count,
            "duration_ms": result.total_duration_ms,
            "outputs": list(result.outputs.keys())
        }
    }


@router.get("/concept")
async def get_turnkey_concept():
    """턴키 솔루션 핵심 개념"""
    return {
        "title": "AUTUS Turnkey Solution",
        "subtitle": "트리거 → 전체 체인 자동 완료 → 업무 자연소멸",
        "philosophy": {
            "before": "파편화된 업무들이 릴레이/중복 실행",
            "after": "단일 트리거가 모든 연쇄 작업을 완료",
            "elimination": "삭제 = 자동화조차 필요 없는 상태 (로직에 흡수)"
        },
        "example": {
            "industry": "교육 서비스업",
            "before": {
                "process": "결제담당 → 수납담당 → 스케줄담당 → 출석담당 → 기록담당 → CS담당",
                "people": 6,
                "tasks": 40,
                "time": "180분/건"
            },
            "after": {
                "process": "결제 + 수업 = 전체 결과물 자동 생성",
                "people": 0,
                "tasks": 0,
                "triggers": 2
            }
        },
        "4_stage_framework": [
            {"stage": 1, "name": "수집 (Collection)", "description": "기존 파편화된 업무 전체 파악"},
            {"stage": 2, "name": "재정의 (Redesign)", "description": "트리거-체인 구조로 통합"},
            {"stage": 3, "name": "자동화 (Automate)", "description": "체인 액션 구현"},
            {"stage": 4, "name": "삭제화 (Eliminate)", "description": "개별 업무 자연소멸"}
        ],
        "industries": list(INDUSTRY_TEMPLATES.keys())
    }
