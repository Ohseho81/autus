"""
═══════════════════════════════════════════════════════════════════════════════
🤖 AUTUS Automation Router — 업무 자동화 API
═══════════════════════════════════════════════════════════════════════════════

MVP v0.1 기능 세트:
1. POST /automation/prioritize   - 할 일 우선순위 자동 정렬
2. POST /automation/meeting      - 회의록 핵심 결정 추출
3. POST /automation/report       - 일일 보고서 자동 생성

원칙: 설명하지 않고 결과만 남긴다

═══════════════════════════════════════════════════════════════════════════════
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
import logging
from datetime import datetime

logger = logging.getLogger("autus.automation")

router = APIRouter(prefix="/automation", tags=["Automation MVP"])


# ═══════════════════════════════════════════════════════════════════════════════
# Request/Response Models
# ═══════════════════════════════════════════════════════════════════════════════

class PrioritizeRequest(BaseModel):
    tasks: List[str] = Field(
        ...,
        min_length=1,
        max_length=50,
        description="할 일 목록 (문자열 리스트)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "tasks": [
                    "프로젝트 제안서 작성 (오늘 마감)",
                    "팀 미팅 준비",
                    "클라이언트 이메일 답장 - 긴급",
                    "점심 약속"
                ]
            }
        }


class MeetingRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=10,
        max_length=10000,
        description="회의록 텍스트"
    )
    max_decisions: int = Field(
        5,
        ge=1,
        le=10,
        description="최대 추출 개수"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "text": "오늘 팀 회의에서 Q1 프로젝트 일정을 논의했습니다. 김대리가 디자인 시안을 다음 주 수요일까지 완료하기로 했고, 박팀장님이 클라이언트 미팅을 금요일로 확정했습니다.",
                "max_decisions": 5
            }
        }


class ReportRequest(BaseModel):
    completed: List[str] = Field(
        ...,
        min_length=1,
        description="완료된 작업 목록"
    )
    tomorrow: Optional[List[str]] = Field(
        None,
        description="내일 계획 (선택)"
    )
    issues: Optional[List[str]] = Field(
        None,
        description="이슈 사항 (선택)"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "completed": [
                    "프로젝트 제안서 초안 완성 (3h)",
                    "클라이언트 피드백 반영 (1.5h)",
                    "팀 미팅 참석 및 정리 (1h)"
                ],
                "tomorrow": [
                    "제안서 최종 검토 및 제출",
                    "디자인팀 협업 미팅"
                ]
            }
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

@router.post("/prioritize")
async def prioritize_tasks(req: PrioritizeRequest):
    """
    📋 할 일 우선순위 자동 정렬
    
    Eisenhower Matrix 기반:
    - Q1: 🔴 긴급 + 중요 → 즉시
    - Q2: 🟢 중요 (비긴급) → 계획
    - Q3: 🟡 긴급 (비중요) → 위임
    - Q4: ⚪ 비긴급 + 비중요 → 제거
    
    V 영향도는 내부적으로 계산되며 사용자에게 노출되지 않습니다.
    """
    try:
        from automation.prioritizer import prioritize_tasks as do_prioritize
        
        start = datetime.now()
        result = do_prioritize(req.tasks)
        elapsed = (datetime.now() - start).total_seconds() * 1000
        
        # V 관련 정보 제거 (사용자에게 숨김)
        for task in result["prioritized"]:
            task.pop("v_impact", None)
        result["summary"].pop("v_total", None)
        
        return {
            "success": True,
            "data": result,
            "meta": {
                "processing_time_ms": round(elapsed, 2),
                "task_count": len(req.tasks)
            }
        }
        
    except Exception as e:
        logger.error(f"우선순위 정렬 실패: {e}")
        raise HTTPException(500, str(e))


@router.post("/meeting")
async def extract_meeting_decisions(req: MeetingRequest):
    """
    📝 회의록 핵심 결정 추출
    
    회의 내용에서 자동으로 추출:
    - 결정 사항
    - 담당자
    - 기한
    
    할 일에 바로 추가 가능한 형태로 반환됩니다.
    """
    try:
        from automation.meeting_extractor import extract_decisions
        
        start = datetime.now()
        result = extract_decisions(req.text, req.max_decisions)
        elapsed = (datetime.now() - start).total_seconds() * 1000
        
        # V 관련 정보 제거
        for decision in result["decisions"]:
            decision.pop("v_impact", None)
        
        return {
            "success": True,
            "data": result,
            "meta": {
                "processing_time_ms": round(elapsed, 2),
                "text_length": len(req.text)
            }
        }
        
    except Exception as e:
        logger.error(f"회의록 추출 실패: {e}")
        raise HTTPException(500, str(e))


@router.post("/report")
async def generate_report(req: ReportRequest):
    """
    📊 일일 보고서 자동 생성
    
    완료된 작업 목록에서 자동으로:
    - 카테고리화
    - 시간 추정
    - 보고서 텍스트 생성
    
    복사해서 바로 사용 가능한 형태로 반환됩니다.
    """
    try:
        from automation.report_generator import generate_daily_report
        
        start = datetime.now()
        result = generate_daily_report(
            req.completed,
            req.tomorrow,
            req.issues
        )
        elapsed = (datetime.now() - start).total_seconds() * 1000
        
        # V 관련 정보 제거
        result.pop("v_total", None)
        for task in result["completed_tasks"]:
            task.pop("v_contribution", None)
        
        return {
            "success": True,
            "data": result,
            "meta": {
                "processing_time_ms": round(elapsed, 2),
                "task_count": len(req.completed)
            }
        }
        
    except Exception as e:
        logger.error(f"보고서 생성 실패: {e}")
        raise HTTPException(500, str(e))


@router.get("/status")
async def get_automation_status():
    """
    자동화 엔진 상태 확인
    """
    return {
        "success": True,
        "version": "0.1.0",
        "features": {
            "prioritize": {
                "status": "active",
                "description": "할 일 우선순위 자동 정렬"
            },
            "meeting": {
                "status": "active",
                "description": "회의록 핵심 결정 추출"
            },
            "report": {
                "status": "active",
                "description": "일일 보고서 자동 생성"
            }
        },
        "principle": "설명하지 않고 결과만 남긴다"
    }
