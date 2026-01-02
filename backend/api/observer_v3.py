#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AUTUS-TRINITY: Observer API v3
화면 데이터 수신, DB 저장, 실시간 브로드캐스트 통합

Features:
- OCR 텍스트 파싱
- PostgreSQL/Supabase DB 저장
- WebSocket 실시간 브로드캐스트
- 고객 프로필 자동 업데이트
"""

import re
import hashlib
from datetime import datetime
from typing import Dict, List, Optional, Any
from collections import deque

from fastapi import APIRouter, Body, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

# 내부 모듈 (Optional Import)
try:
    from ..utils.sanitizer import PhoneSanitizer
    SANITIZER_AVAILABLE = True
except ImportError:
    SANITIZER_AVAILABLE = False

try:
    from ..services.fusion_engine import get_fusion_engine
    from ..services.blackbox import BlackBoxProtocol
    FUSION_AVAILABLE = True
except ImportError:
    FUSION_AVAILABLE = False

try:
    from .websocket_hub import get_ws_manager
    WEBSOCKET_AVAILABLE = True
except ImportError:
    WEBSOCKET_AVAILABLE = False

try:
    from ..models.bridge_models import BridgeDBService, BridgeCustomer, BridgeEvent
    from ..database import get_db
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False


router = APIRouter()

# 메모리 로그 (DB 없을 때 폴백)
_recent_logs: deque = deque(maxlen=100)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════════════════════════

class IngestRequest(BaseModel):
    raw_text: str = Field(..., description="OCR로 추출된 원본 텍스트")
    biz_type: str = Field(..., description="업장 유형")
    station_id: str = Field(..., description="스테이션 ID")


class GuideResponse(BaseModel):
    display_name: str = ""
    message: str = ""
    bg_color: str = "WHITE"
    tags: List[Dict[str, str]] = []
    alert_level: str = "normal"


class IngestResponse(BaseModel):
    status: str
    phone: Optional[str] = None
    name: Optional[str] = None
    extracted: Dict[str, Any] = {}
    guide: Optional[Dict[str, Any]] = None
    db_saved: bool = False
    broadcast_sent: bool = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 파서
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ScreenDataParser:
    """화면 OCR 데이터 파서"""
    
    RISK_KEYWORDS = ["환불", "불만", "컴플레인", "진상", "민원", "클레임"]
    VIP_KEYWORDS = ["VIP", "VVIP", "프리미엄", "우수", "단골"]
    ACADEMY_KEYWORDS = ["성적하락", "퇴원", "재등록", "상담", "숙제", "수업료"]
    RESTAURANT_KEYWORDS = ["와인", "스테이크", "코스", "예약", "단체", "기념일"]
    SPORTS_KEYWORDS = ["PT", "락커", "연장", "휴회", "재등록", "트레이너"]
    
    @classmethod
    def normalize_phone(cls, raw_phone: str) -> str:
        if SANITIZER_AVAILABLE:
            return PhoneSanitizer.normalize(raw_phone)
        digits = re.sub(r'[^0-9]', '', raw_phone)
        if digits.startswith('82'):
            digits = '0' + digits[2:]
        return digits
    
    @classmethod
    def extract_phone(cls, text: str) -> Optional[str]:
        patterns = [r'010[-.\s]?\d{4}[-.\s]?\d{4}', r'010\d{8}']
        for pattern in patterns:
            if match := re.search(pattern, text):
                return cls.normalize_phone(match.group())
        return None
    
    @classmethod
    def extract_name(cls, text: str) -> Optional[str]:
        patterns = [
            r'([가-힣]{2,4})\s*(회원|님|고객|학생|학부모)',
            r'(회원|이름|성명)[:\s]*([가-힣]{2,4})',
            r'([가-힣]{2,4})\s*\(',
        ]
        for pattern in patterns:
            if match := re.search(pattern, text):
                name = match.group(2) if match.lastindex >= 2 else match.group(1)
                if name not in ['회원', '이름', '성명', '님', '고객']:
                    return name
        return None
    
    @classmethod
    def parse_academy(cls, text: str) -> Dict[str, Any]:
        data = {"school": None, "grade": None, "consult_keywords": [], "risk_detected": False}
        if school_match := re.search(r'([가-힣]+)(초등학교|중학교|고등학교|초|중|고)', text):
            data["school"] = school_match.group(1) + school_match.group(2)
        if grade_match := re.search(r'([초중고][1-6]|[1-6]학년)', text):
            data["grade"] = grade_match.group(1)
        for keyword in cls.ACADEMY_KEYWORDS + cls.RISK_KEYWORDS:
            if keyword in text:
                data["consult_keywords"].append(keyword)
                if keyword in cls.RISK_KEYWORDS:
                    data["risk_detected"] = True
        return data
    
    @classmethod
    def parse_restaurant(cls, text: str) -> Dict[str, Any]:
        data = {"amount": None, "table": None, "menu_tags": [], "is_vip": False}
        if amount_match := re.search(r'(\d{1,3}(,\d{3})*)\s*원', text):
            try:
                data["amount"] = int(amount_match.group(1).replace(',', ''))
            except:
                pass
        if table_match := re.search(r'(테이블|Table|T)\s*[#:\s]*(\d+)', text, re.IGNORECASE):
            data["table"] = table_match.group(2)
        for keyword in cls.RESTAURANT_KEYWORDS:
            if keyword in text:
                data["menu_tags"].append(keyword)
        for keyword in cls.VIP_KEYWORDS:
            if keyword in text:
                data["is_vip"] = True
                break
        return data
    
    @classmethod
    def parse_sports(cls, text: str) -> Dict[str, Any]:
        data = {"locker": None, "trainer": None, "expiry": None, "injury": [], "car_no": None}
        if locker_match := re.search(r'(락커|사물함|Locker)\s*[#:\s]*(\d+)', text, re.IGNORECASE):
            data["locker"] = locker_match.group(2)
        if trainer_match := re.search(r'(트레이너|담당|코치)[:\s]*([가-힣]{2,4})', text):
            data["trainer"] = trainer_match.group(2)
        if expiry_match := re.search(r'(만료|종료|~)\s*(\d{4}[-./]\d{1,2}[-./]\d{1,2})', text):
            data["expiry"] = expiry_match.group(2)
        injury_keywords = ["디스크", "허리", "무릎", "재활", "수술", "당뇨", "혈압"]
        for keyword in injury_keywords:
            if keyword in text:
                data["injury"].append(keyword)
        if car_match := re.search(r'\d{2,3}[가-힣]\s*\d{4}', text):
            data["car_no"] = car_match.group()
        return data
    
    @classmethod
    def parse(cls, text: str, biz_type: str) -> Dict[str, Any]:
        result = {
            "phone": cls.extract_phone(text),
            "name": cls.extract_name(text),
            "biz_specific": {},
        }
        if biz_type == "ACADEMY":
            result["biz_specific"] = cls.parse_academy(text)
        elif biz_type == "RESTAURANT":
            result["biz_specific"] = cls.parse_restaurant(text)
        elif biz_type == "SPORTS":
            result["biz_specific"] = cls.parse_sports(text)
        else:
            result["biz_specific"] = {
                "keywords": [k for k in cls.RISK_KEYWORDS + cls.VIP_KEYWORDS if k in text]
            }
        return result


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 지침 생성기
# ═══════════════════════════════════════════════════════════════════════════════════════════

class GuideGenerator:
    """현장 지침 생성"""
    
    @classmethod
    def generate(cls, phone: str, name: str, biz_type: str, extracted: Dict,
                 db_customer: Any = None) -> Dict[str, Any]:
        guide = {
            "display_name": f"{name or '고객'}님",
            "message": "표준 응대",
            "bg_color": "WHITE",
            "tags": [],
            "alert_level": "normal",
        }
        
        biz_data = extracted.get("biz_specific", {})
        
        # DB에 저장된 고객 정보 활용
        if db_customer:
            if db_customer.archetype == 'PATRON':
                guide["bg_color"] = "GOLD"
                guide["message"] = "👑 VIP 고객입니다. 최상의 서비스를 제공하세요."
                guide["tags"].append({"emoji": "👑", "label": "VIP"})
                guide["alert_level"] = "urgent"
                return guide
            elif db_customer.archetype == 'VAMPIRE':
                guide["bg_color"] = "GREY"
                guide["message"] = "⚠️ 주의 고객입니다. 규정대로 응대하세요."
                guide["tags"].append({"emoji": "🔇", "label": "주의"})
                guide["alert_level"] = "caution"
                return guide
            elif db_customer.archetype == 'FAN':
                guide["bg_color"] = "PINK"
                guide["message"] = "💖 단골 고객입니다. 친근하게 인사하세요."
                guide["tags"].append({"emoji": "💖", "label": "단골"})
        
        # 조회 횟수 기반
        if db_customer and db_customer.lookup_count >= 10:
            guide["tags"].append({"emoji": "🔄", "label": f"{db_customer.lookup_count}회 방문"})
        
        # 업장별 파싱 데이터 기반
        if biz_data.get("is_vip"):
            guide["bg_color"] = "GOLD"
            guide["message"] = "VIP 고객입니다. 프리미엄 서비스를 제공하세요."
            guide["tags"].append({"emoji": "👑", "label": "VIP"})
            guide["alert_level"] = "urgent"
            return guide
        
        if biz_data.get("risk_detected"):
            guide["bg_color"] = "GREY"
            guide["message"] = "⚠️ 주의 고객입니다. 규정대로 응대하세요."
            guide["tags"].append({"emoji": "🔇", "label": "주의"})
            guide["alert_level"] = "caution"
            return guide
        
        # 학원
        if biz_type == "ACADEMY":
            keywords = biz_data.get("consult_keywords", [])
            if "환불" in keywords or "퇴원" in keywords:
                guide["bg_color"] = "GREY"
                guide["message"] = "환불/퇴원 문의 이력. 신중하게 상담하세요."
                guide["alert_level"] = "caution"
            elif "재등록" in keywords:
                guide["message"] = "재등록 관심 고객. 할인 혜택을 안내하세요."
                guide["tags"].append({"emoji": "🎯", "label": "재등록"})
        
        # 식당
        elif biz_type == "RESTAURANT":
            amount = biz_data.get("amount", 0)
            if amount and amount >= 100000:
                guide["bg_color"] = "PINK"
                guide["message"] = "고객단가 고객. 추가 서비스를 제공하세요."
                guide["tags"].append({"emoji": "💎", "label": "고객단가"})
            menu_tags = biz_data.get("menu_tags", [])
            if "와인" in menu_tags or "코스" in menu_tags:
                guide["message"] = "프리미엄 메뉴 선호 고객입니다."
        
        # 스포츠
        elif biz_type == "SPORTS":
            injuries = biz_data.get("injury", [])
            if injuries:
                guide["bg_color"] = "PINK"
                guide["message"] = f"주의: {', '.join(injuries)} 이력. 운동 강도 조절 필요."
                guide["tags"].append({"emoji": "⚕️", "label": "건강주의"})
        
        return guide


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════════════════

@router.post("/observer/ingest", response_model=IngestResponse)
async def ingest_screen_data(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
):
    """
    [Observer v3] 화면 OCR 데이터 수신 및 처리
    
    1. 텍스트 파싱
    2. DB 저장 (선택적)
    3. 지침 생성
    4. WebSocket 브로드캐스트 (선택적)
    """
    raw_text = request.raw_text
    biz_type = request.biz_type.upper()
    station_id = request.station_id
    
    # 1. 데이터 파싱
    parsed = ScreenDataParser.parse(raw_text, biz_type)
    phone = parsed.get("phone")
    name = parsed.get("name")
    
    if not phone:
        _recent_logs.append({
            "timestamp": datetime.now().isoformat(),
            "station_id": station_id,
            "status": "ignored",
            "reason": "no_phone"
        })
        return IngestResponse(status="ignored", extracted={"reason": "전화번호 없음"})
    
    db_saved = False
    db_customer = None
    
    # 2. DB 저장 (선택적)
    if DB_AVAILABLE:
        try:
            # 고객 정보 upsert
            db_service = BridgeDBService(get_db)
            db_customer = db_service.upsert_customer(
                phone=phone,
                name=name,
                biz_type=biz_type,
                station_id=station_id,
                extracted_data=parsed["biz_specific"]
            )
            db_saved = True
        except Exception as e:
            print(f"[DB Error] {e}")
    
    # 3. 지침 생성
    guide = GuideGenerator.generate(phone, name, biz_type, parsed, db_customer)
    
    # 4. 이벤트 로그 저장
    if DB_AVAILABLE and db_saved:
        try:
            db_service.log_event(
                event_type="lookup",
                station_id=station_id,
                biz_type=biz_type,
                phone=phone,
                name=name,
                extracted_data=parsed["biz_specific"],
                alert_level=guide.get("alert_level"),
                guide_message=guide.get("message"),
                guide_data=guide
            )
            
            # VIP/주의 알림 저장
            if guide.get("alert_level") in ["urgent", "caution"]:
                db_service.create_alert(
                    alert_level=guide["alert_level"],
                    phone=phone,
                    name=name or "Unknown",
                    station_id=station_id,
                    biz_type=biz_type,
                    message=guide.get("message", "")
                )
        except Exception as e:
            print(f"[DB Log Error] {e}")
    
    # 5. WebSocket 브로드캐스트 (비동기)
    broadcast_sent = False
    if WEBSOCKET_AVAILABLE:
        try:
            ws_manager = get_ws_manager()
            background_tasks.add_task(
                ws_manager.emit_customer_lookup,
                phone, name, biz_type, station_id, guide
            )
            broadcast_sent = True
        except Exception as e:
            print(f"[WebSocket Error] {e}")
    
    # 메모리 로그
    _recent_logs.append({
        "timestamp": datetime.now().isoformat(),
        "station_id": station_id,
        "biz_type": biz_type,
        "phone": phone[-4:],
        "name": name,
        "alert_level": guide.get("alert_level"),
        "status": "success"
    })
    
    return IngestResponse(
        status="success",
        phone=phone,
        name=name,
        extracted=parsed["biz_specific"],
        guide=guide,
        db_saved=db_saved,
        broadcast_sent=broadcast_sent
    )


@router.get("/observer/status")
async def get_observer_status():
    """옵저버 상태 확인"""
    return {
        "status": "online",
        "version": "3.0",
        "features": {
            "db_available": DB_AVAILABLE,
            "websocket_available": WEBSOCKET_AVAILABLE,
            "fusion_available": FUSION_AVAILABLE,
        },
        "recent_logs_count": len(_recent_logs),
        "last_activity": _recent_logs[-1]["timestamp"] if _recent_logs else None,
    }


@router.get("/observer/logs")
async def get_observer_logs(limit: int = 20, station_id: str = None):
    """최근 수신 로그 조회"""
    logs = list(_recent_logs)
    if station_id:
        logs = [log for log in logs if log.get("station_id") == station_id]
    return {
        "count": len(logs[-limit:]),
        "logs": list(reversed(logs[-limit:]))
    }


@router.get("/observer/stats")
async def get_observer_stats():
    """통계 조회"""
    if DB_AVAILABLE:
        try:
            db_service = BridgeDBService(get_db)
            return db_service.get_stats()
        except Exception as e:
            print(f"[Stats Error] {e}")
    
    # 메모리 기반 통계
    logs = list(_recent_logs)
    return {
        "total_events": len(logs),
        "vip_alerts": sum(1 for l in logs if l.get("alert_level") == "urgent"),
        "caution_alerts": sum(1 for l in logs if l.get("alert_level") == "caution"),
        "active_stations": len(set(l.get("station_id") for l in logs)),
    }


@router.delete("/observer/logs")
async def clear_observer_logs():
    """로그 초기화"""
    _recent_logs.clear()
    return {"status": "cleared"}
