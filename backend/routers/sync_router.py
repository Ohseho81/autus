"""
AUTUS Sync Router v14.0
========================
자동 동기화 및 AI 분석 API
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import logging

from integrations.auto_sync import get_sync_engine, SyncResult
from integrations.ai_analyzer import get_analyzer
from integrations.oauth_manager import OAuthProvider

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sync", tags=["Auto-Sync"])

# ============================================
# Models
# ============================================

class SyncRequest(BaseModel):
    user_id: str = "default"
    provider: Optional[str] = None

# ============================================
# Sync Engine Endpoints
# ============================================

@router.post("/start")
async def start_sync_engine():
    """
    자동 동기화 엔진 시작
    """
    engine = get_sync_engine()
    await engine.start()
    
    return {
        "success": True,
        "message": "자동 동기화 엔진이 시작되었습니다",
        "status": engine.get_status()
    }

@router.post("/stop")
async def stop_sync_engine():
    """
    자동 동기화 엔진 중지
    """
    engine = get_sync_engine()
    await engine.stop()
    
    return {
        "success": True,
        "message": "자동 동기화 엔진이 중지되었습니다"
    }

@router.get("/status")
async def get_sync_status(user_id: Optional[str] = None):
    """
    동기화 상태 조회
    """
    engine = get_sync_engine()
    return engine.get_status(user_id)

@router.get("/stats")
async def get_sync_stats():
    """
    동기화 통계
    """
    engine = get_sync_engine()
    return engine.get_stats()

@router.post("/register")
async def register_user(request: SyncRequest):
    """
    사용자를 자동 동기화에 등록
    """
    engine = get_sync_engine()
    count = engine.register_user(request.user_id)
    
    return {
        "success": True,
        "user_id": request.user_id,
        "registered_jobs": count,
        "message": f"{count}개 서비스가 자동 동기화에 등록되었습니다"
    }

@router.post("/now")
async def sync_now(request: SyncRequest):
    """
    즉시 동기화 실행
    """
    engine = get_sync_engine()
    
    provider = None
    if request.provider:
        try:
            provider = OAuthProvider(request.provider)
        except ValueError:
            raise HTTPException(400, f"Unknown provider: {request.provider}")
    
    results = await engine.sync_now(request.user_id, provider)
    
    return {
        "success": all(r.success for r in results),
        "results": [
            {
                "provider": r.provider.value,
                "success": r.success,
                "items_synced": r.items_synced,
                "duration_ms": r.duration_ms,
                "error": r.error
            }
            for r in results
        ]
    }

# ============================================
# AI Analysis Endpoints
# ============================================

@router.get("/analyze/{user_id}")
async def analyze_data(user_id: str = "default"):
    """
    수집된 데이터 AI 분석
    """
    analyzer = get_analyzer()
    results = await analyzer.analyze_all(user_id)
    
    # 결과 직렬화
    serialized = {}
    for key, analysis_list in results.items():
        serialized[key] = [
            {
                "type": a.type.value,
                "result": a.result,
                "confidence": a.confidence,
                "timestamp": a.timestamp.isoformat()
            }
            for a in analysis_list
        ]
    
    return {
        "user_id": user_id,
        "analysis": serialized
    }

@router.get("/brief/{user_id}")
async def get_daily_brief(user_id: str = "default"):
    """
    일일 브리핑 생성
    """
    analyzer = get_analyzer()
    brief = await analyzer.generate_daily_brief(user_id)
    
    return {
        "user_id": user_id,
        "brief": brief
    }

@router.get("/emails/priority/{user_id}")
async def get_email_priority(user_id: str = "default"):
    """
    이메일 우선순위 분석
    """
    analyzer = get_analyzer()
    results = await analyzer.analyze_emails(user_id)
    
    priority_result = next(
        (r for r in results if r.type.value == "priority"),
        None
    )
    
    if not priority_result:
        return {"message": "이메일 데이터가 없습니다"}
    
    return {
        "user_id": user_id,
        "priority": priority_result.result,
        "confidence": priority_result.confidence
    }

@router.get("/calendar/optimize/{user_id}")
async def optimize_calendar(user_id: str = "default"):
    """
    캘린더 최적화 제안
    """
    analyzer = get_analyzer()
    results = await analyzer.analyze_calendar(user_id)
    
    if not results:
        return {"message": "캘린더 데이터가 없습니다"}
    
    return {
        "user_id": user_id,
        "recommendations": [
            {
                "type": r.type.value,
                "result": r.result,
                "confidence": r.confidence
            }
            for r in results
        ]
    }

@router.get("/sentiment/{user_id}")
async def get_sentiment(user_id: str = "default"):
    """
    메시지 감성 분석
    """
    analyzer = get_analyzer()
    results = await analyzer.analyze_messages(user_id)
    
    sentiment_result = next(
        (r for r in results if r.type.value == "sentiment"),
        None
    )
    
    if not sentiment_result:
        return {"message": "메시지 데이터가 없습니다"}
    
    return {
        "user_id": user_id,
        "sentiment": sentiment_result.result,
        "confidence": sentiment_result.confidence
    }
