#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }




















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }










#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Field API
현장 직원용 API (태블릿, CID, POS 연동)

Routes:
- POST /field/lookup: 고객 조회 → 블랙박스 지침 반환
- POST /field/feedback: 응대 결과 피드백
- POST /field/quest: 일일 퀘스트 조회
- POST /hook/cid: CID 전화 수신 훅
- POST /hook/pos: POS 결제 훅
"""

from datetime import datetime
from typing import Optional, Dict, Any, List

from fastapi import APIRouter, Body, HTTPException, status, Query
from pydantic import BaseModel, Field

# 내부 모듈
import sys
sys.path.insert(0, '..')
from utils.sanitizer import PhoneSanitizer
from services.fusion_engine import get_fusion_engine
from services.blackbox import BlackBoxProtocol
from services.quest_engine import QuestEngine, QuestType
from models.customer import CustomerArchetype
from models.staff import StaffProfile


router = APIRouter()

# 글로벌 인스턴스
blackbox = BlackBoxProtocol()
quest_engine = QuestEngine()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LookupRequest(BaseModel):
    """고객 조회 요청"""
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field(..., description="직원 ID")
    biz_type: str = Field("restaurant", description="사업 유형")


class FeedbackRequest(BaseModel):
    """응대 피드백 요청"""
    staff_id: str
    customer_phone: str
    result_type: str = Field(..., description="SUCCESS, FAIL, CROSS_SELL")
    notes: str = ""


class CIDHookRequest(BaseModel):
    """CID 전화 수신 훅"""
    phone: str = Field(..., description="발신자 전화번호")
    line_number: str = Field(..., description="수신 전화번호/라인")
    biz_id: str = Field(..., description="사업장 ID")


class POSHookRequest(BaseModel):
    """POS 결제 훅"""
    phone: str
    amount: int
    biz_id: str
    staff_id: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 현장 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 고객 조회
    
    직원이 전화번호를 입력하면:
    1. 고객 프로필 조회
    2. 블랙박스로 변환
    3. 태블릿용 지침 반환
    
    VIP 고객 조회 시 직원 시너지 점수 가산
    """
    fusion = get_fusion_engine()
    
    # 전화번호 정규화
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 고객 조회
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "found": False,
            "guide": blackbox.get_new_customer_instruction().to_dict()
        }
    
    # 블랙박스 지침 생성
    instruction = blackbox.get_instruction(customer, request.biz_type)
    
    # VIP 고객 조회 시 시너지 로깅
    if customer.archetype in [CustomerArchetype.PATRON, CustomerArchetype.TYCOON]:
        # 직원 퀘스트 진행
        quest_engine.update_progress(request.staff_id, QuestType.FIND_VIP, 1)
    
    return {
        "found": True,
        "customer_id": customer.phone,
        "guide": instruction.to_dict(),
        "multi_biz": customer.is_multi_biz_user,
        "biz_count": len(customer.biz_records),
    }


@router.post("/field/feedback")
async def field_feedback(request: FeedbackRequest):
    """
    [현장] 응대 피드백
    
    직원이 응대 완료 후 결과 입력
    - SUCCESS: 일반 성공
    - FAIL: 문제 발생
    - CROSS_SELL: 시너지 연결 성공 (타 매장 언급)
    """
    # 시너지 점수 계산
    points = 0
    quest_type = None
    
    if request.result_type == "CROSS_SELL":
        points = 20
        quest_type = QuestType.CROSS_LINK
    elif request.result_type == "SUCCESS":
        points = 2
        quest_type = QuestType.SATISFACTION
    elif request.result_type == "DEFEND":
        points = 10
        quest_type = QuestType.DEFEND_WARN
    
    # 퀘스트 진행
    if quest_type:
        quest_engine.update_progress(request.staff_id, quest_type, 1)
    
    return {
        "status": "recorded",
        "points_earned": points,
        "quest_type": quest_type.value if quest_type else None,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/field/quest/{staff_id}")
async def get_daily_quests(
    staff_id: str,
    biz_type: str = Query("restaurant", description="사업 유형")
):
    """
    [현장] 일일 퀘스트 조회
    """
    quests = quest_engine.get_daily_quests(staff_id, biz_type)
    
    # 진행 상태 포함
    progress = quest_engine.get_progress(staff_id)
    
    return {
        "staff_id": staff_id,
        "date": datetime.now().date().isoformat(),
        "quests": [q.to_dict() for q in quests],
        "progress": {k: v.to_dict() for k, v in progress.items()},
        "streak": quest_engine.get_streak(staff_id),
    }


@router.post("/field/quest/{staff_id}/start/{quest_type}")
async def start_quest(staff_id: str, quest_type: str):
    """
    퀘스트 시작
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    progress = quest_engine.start_quest(staff_id, qt)
    return progress.to_dict()


@router.post("/field/quest/{staff_id}/claim/{quest_type}")
async def claim_quest_reward(staff_id: str, quest_type: str):
    """
    퀘스트 보상 수령
    """
    try:
        qt = QuestType(quest_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid quest type: {quest_type}")
    
    reward = quest_engine.claim_reward(staff_id, qt)
    
    if not reward:
        raise HTTPException(
            status_code=400, 
            detail="퀘스트가 완료되지 않았거나 이미 보상을 수령했습니다."
        )
    
    return reward


@router.get("/field/leaderboard")
async def get_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """
    리더보드 조회
    """
    return {
        "leaderboard": quest_engine.get_leaderboard(limit),
        "updated_at": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 외부 훅 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/hook/cid")
async def handle_cid_call(request: CIDHookRequest):
    """
    [외부 훅] CID 전화 수신
    
    유선 전화기의 CID 단말기에서 호출
    전화벨이 울리기 전에 고객 정보를 파악
    
    Returns:
        alert_level: 팝업 우선순위 (urgent, caution, normal, none)
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if not customer:
        return {
            "status": "new_customer",
            "alert_level": "normal",
            "display": {
                "name": "신규 고객",
                "message": "첫 전화입니다. 친절히 응대하세요.",
                "color": "WHITE"
            }
        }
    
    # 중요 고객인 경우 알림
    if customer.archetype == CustomerArchetype.PATRON:
        alert_level = "urgent"
        message = "🚨 VIP 전화 수신! 최우선 응대하세요."
    elif customer.archetype == CustomerArchetype.TYCOON:
        alert_level = "caution"
        message = "⚡ 중요 고객입니다. 신속하게 응대하세요."
    elif customer.archetype == CustomerArchetype.VAMPIRE:
        alert_level = "caution"
        message = "⚠️ 주의 고객입니다. 규정대로만 응대하세요."
    else:
        alert_level = "normal"
        message = f"{customer.name} 고객님 전화입니다."
    
    return {
        "status": "alert_sent",
        "alert_level": alert_level,
        "customer_archetype": customer.archetype.value,
        "display": {
            "name": f"{customer.name} 고객님",
            "message": message,
            "color": customer.archetype.color,
            "emoji": customer.archetype.emoji
        }
    }


@router.post("/hook/pos")
async def handle_pos_payment(request: POSHookRequest):
    """
    [외부 훅] POS 결제
    
    POS기에서 결제 완료 시 호출
    고객 프로필 업데이트 + 직원 점수 반영
    """
    fusion = get_fusion_engine()
    
    phone = PhoneSanitizer.normalize(request.phone)
    if not phone:
        return {"status": "ignored", "reason": "invalid_phone"}
    
    customer = fusion.get_customer(phone)
    
    if customer:
        # 기존 고객: 결제 정보 업데이트
        # (실제로는 fusion_engine에서 처리)
        action = "updated"
    else:
        # 신규 고객: 등록
        action = "registered"
    
    # 직원 시너지 로깅
    if request.staff_id:
        quest_engine.update_progress(request.staff_id, QuestType.SATISFACTION, 1)
    
    return {
        "status": "recorded",
        "action": action,
        "customer_phone": phone,
        "amount": request.amount,
        "timestamp": datetime.now().isoformat()
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 관리 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.get("/field/stats")
async def get_field_stats():
    """
    현장 통계
    """
    fusion = get_fusion_engine()
    stats = fusion.get_stats()
    
    return {
        "fusion": stats,
        "leaderboard_top3": quest_engine.get_leaderboard(3),
    }


@router.post("/field/search")
async def search_customers(
    name: str = Body(None),
    archetype: str = Body(None),
    biz_type: str = Body(None),
    limit: int = Body(50)
):
    """
    고객 검색
    """
    fusion = get_fusion_engine()
    
    archetype_enum = None
    if archetype:
        try:
            archetype_enum = CustomerArchetype(archetype)
        except ValueError:
            pass
    
    results = fusion.search_customers(
        name=name,
        archetype=archetype_enum,
        biz_type=biz_type,
        limit=limit
    )
    
    return {
        "count": len(results),
        "customers": [c.to_dict() for c in results]
    }

























