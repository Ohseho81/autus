"""
AUTUS 자가발전 피드백 시스템 API
- 제출(Submit): +1.0 강화 학습
- 수정(Edit): +0.5 미세 조정 학습  
- 폐기(Discard): -1.0 네거티브 학습
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/feedback", tags=["Feedback Learning"])

# ============================================
# Models
# ============================================

class SubmitFeedback(BaseModel):
    task_id: str
    task_type: str
    content: str
    score: float = 1.0  # 강화 학습

class EditFeedback(BaseModel):
    task_id: str
    original: str
    modified: str
    score: float = 0.5  # 미세 조정

class DiscardFeedback(BaseModel):
    task_id: str
    reason: Optional[str] = None
    score: float = -1.0  # 네거티브 학습

class AutoModeRequest(BaseModel):
    task_id: str
    task_type: str

class FeedbackResponse(BaseModel):
    success: bool
    message: str
    learning_score: float
    trust_level: float
    insights: Optional[Dict[str, Any]] = None

# ============================================
# In-Memory Storage (실제로는 Supabase)
# ============================================

class LearningStore:
    def __init__(self):
        self.gold_standards: List[Dict] = []  # 제출된 우수 사례
        self.user_preferences: Dict[str, Any] = {}  # 사용자 선호도
        self.negative_patterns: List[Dict] = []  # 차단된 패턴
        self.task_streaks: Dict[str, int] = {}  # 연속 성공 횟수
        self.auto_tasks: List[str] = []  # 자동화 승격된 태스크
        self.total_score: float = 0.0
        self.trust_level: float = 50.0

store = LearningStore()

# ============================================
# 1. Submit - 강화 학습 (+1.0)
# ============================================

@router.post("/submit", response_model=FeedbackResponse)
async def submit_feedback(feedback: SubmitFeedback):
    """
    제출/보고 - 결과물을 골드 스탠다드로 저장
    - 해당 패턴을 우수 사례로 학습
    - 연속 성공시 자동화 승격 제안
    """
    try:
        # 1. 골드 스탠다드로 저장
        store.gold_standards.append({
            "task_id": feedback.task_id,
            "task_type": feedback.task_type,
            "content": feedback.content,
            "timestamp": datetime.now().isoformat(),
            "score": feedback.score
        })
        
        # 2. 연속 성공 체크 (졸업 시스템)
        task_type = feedback.task_type
        store.task_streaks[task_type] = store.task_streaks.get(task_type, 0) + 1
        streak = store.task_streaks[task_type]
        
        # 3. 점수 업데이트
        store.total_score += feedback.score * 10
        store.trust_level = min(100, store.trust_level + 2)
        
        # 4. 인사이트 생성
        insights = {
            "streak": streak,
            "eligible_for_auto": streak >= 3,
            "pattern_learned": f"Task type '{task_type}' reinforced"
        }
        
        message = f"골드 스탠다드로 학습됨 (연속 {streak}회)"
        if streak >= 3:
            message += " - 자동화 승격 가능!"
        
        logger.info(f"Submit feedback: {feedback.task_id}, streak: {streak}")
        
        return FeedbackResponse(
            success=True,
            message=message,
            learning_score=store.total_score,
            trust_level=store.trust_level,
            insights=insights
        )
        
    except Exception as e:
        logger.error(f"Submit feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 2. Edit - 미세 조정 학습 (+0.5)
# ============================================

@router.post("/edit", response_model=FeedbackResponse)
async def edit_feedback(feedback: EditFeedback):
    """
    수정 - Diff 분석으로 사용자 선호도 학습
    - Before vs After 비교
    - 톤앤매너, 포맷 등 패턴 추출
    """
    try:
        # 1. Diff 분석 (간단한 버전)
        original_words = set(feedback.original.split())
        modified_words = set(feedback.modified.split())
        
        added = modified_words - original_words
        removed = original_words - modified_words
        
        # 2. 선호도 패턴 추출
        preferences_learned = []
        
        # 톤앤매너 분석
        formal_markers = ['님', '드립니다', '감사합니다', '부탁드립니다']
        informal_markers = ['요', '네', '야']
        
        for word in added:
            if any(m in word for m in formal_markers):
                preferences_learned.append("formal_tone")
            if any(m in word for m in informal_markers):
                preferences_learned.append("casual_tone")
        
        # 3. 사용자 선호도 저장
        if "formal_tone" in preferences_learned:
            store.user_preferences["tone"] = "formal"
        elif "casual_tone" in preferences_learned:
            store.user_preferences["tone"] = "casual"
        
        store.user_preferences["last_edit"] = {
            "added": list(added)[:10],
            "removed": list(removed)[:10],
            "timestamp": datetime.now().isoformat()
        }
        
        # 4. 점수 업데이트
        store.total_score += feedback.score * 10
        store.trust_level = min(100, store.trust_level + 1)
        
        insights = {
            "patterns_detected": preferences_learned,
            "words_added": len(added),
            "words_removed": len(removed),
            "user_tone": store.user_preferences.get("tone", "unknown")
        }
        
        logger.info(f"Edit feedback: {feedback.task_id}, patterns: {preferences_learned}")
        
        return FeedbackResponse(
            success=True,
            message=f"선호도 학습 완료 - {len(preferences_learned)}개 패턴 감지",
            learning_score=store.total_score,
            trust_level=store.trust_level,
            insights=insights
        )
        
    except Exception as e:
        logger.error(f"Edit feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 3. Discard - 네거티브 학습 (-1.0)
# ============================================

@router.post("/discard", response_model=FeedbackResponse)
async def discard_feedback(feedback: DiscardFeedback):
    """
    폐기 - 해당 패턴을 네거티브로 저장
    - 비슷한 제안 차단
    - 오답 노트 기록
    """
    try:
        # 1. 네거티브 패턴 저장
        store.negative_patterns.append({
            "task_id": feedback.task_id,
            "reason": feedback.reason,
            "timestamp": datetime.now().isoformat(),
            "score": feedback.score
        })
        
        # 2. 점수 업데이트
        store.total_score += feedback.score * 10
        store.trust_level = max(0, store.trust_level - 1)
        
        insights = {
            "pattern_blocked": True,
            "total_blocked": len(store.negative_patterns),
            "reason": feedback.reason or "User discarded"
        }
        
        logger.info(f"Discard feedback: {feedback.task_id}, reason: {feedback.reason}")
        
        return FeedbackResponse(
            success=True,
            message="패턴 차단됨 - 비슷한 제안을 하지 않습니다",
            learning_score=store.total_score,
            trust_level=store.trust_level,
            insights=insights
        )
        
    except Exception as e:
        logger.error(f"Discard feedback error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 4. Auto Mode - 졸업 시스템
# ============================================

@router.post("/auto-mode", response_model=FeedbackResponse)
async def enable_auto_mode(request: AutoModeRequest):
    """
    자동화 승격 - 3연속 성공시 완전 자동화
    """
    try:
        # 1. 자동화 태스크로 등록
        store.auto_tasks.append(request.task_id)
        
        # 2. 점수 대폭 상승
        store.total_score += 20
        store.trust_level = min(100, store.trust_level + 5)
        
        # 3. 연속 기록 초기화 (새로운 시작)
        store.task_streaks[request.task_type] = 0
        
        insights = {
            "auto_enabled": True,
            "total_auto_tasks": len(store.auto_tasks),
            "task_type": request.task_type
        }
        
        logger.info(f"Auto mode enabled: {request.task_id}")
        
        return FeedbackResponse(
            success=True,
            message="🤖 자동화 승격 완료! 이 작업은 AUTUS가 자동 처리합니다.",
            learning_score=store.total_score,
            trust_level=store.trust_level,
            insights=insights
        )
        
    except Exception as e:
        logger.error(f"Auto mode error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# 조회 API
# ============================================

@router.get("/stats")
async def get_learning_stats():
    """학습 통계 조회"""
    return {
        "total_score": store.total_score,
        "trust_level": store.trust_level,
        "gold_standards_count": len(store.gold_standards),
        "negative_patterns_count": len(store.negative_patterns),
        "auto_tasks_count": len(store.auto_tasks),
        "user_preferences": store.user_preferences,
        "task_streaks": store.task_streaks
    }

@router.get("/preferences")
async def get_user_preferences():
    """사용자 선호도 조회"""
    return {
        "preferences": store.user_preferences,
        "system_prompt_additions": generate_system_prompt_additions()
    }

def generate_system_prompt_additions() -> List[str]:
    """학습된 선호도를 System Prompt로 변환"""
    additions = []
    
    if store.user_preferences.get("tone") == "formal":
        additions.append("User prefers formal, professional tone. Use honorifics.")
    elif store.user_preferences.get("tone") == "casual":
        additions.append("User prefers casual, friendly tone.")
    
    if store.negative_patterns:
        additions.append(f"Avoid patterns similar to {len(store.negative_patterns)} blocked items.")
    
    return additions
