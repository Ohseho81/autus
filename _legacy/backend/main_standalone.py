#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██████╗ ██████╗ ██╗███╗   ███╗███████╗  ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██╔══██╗██╔══██╗██║████╗ ████║██╔════╝  ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██████╔╝██████╔╝██║██╔████╔██║█████╗    ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██╔═══╝ ██╔══██╗██║██║╚██╔╝██║██╔══╝    ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ██║     ██║  ██║██║██║ ╚═╝ ██║███████╗  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝    ╚═╝     ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚══════╝  ║
║                                                                                           ║
║                      AUTUS-PRIME: Standalone Server v3.1                                  ║
║                      독립 실행 가능 - 최소 의존성                                           ║
║                                                                                           ║
╠═══════════════════════════════════════════════════════════════════════════════════════════╣
║  Requirements: fastapi, uvicorn, pydantic                                                 ║
║  pip install fastapi uvicorn pydantic                                                     ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import re
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Optional, Dict, Any, List
from collections import deque
from enum import Enum

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 환경 변수
# ═══════════════════════════════════════════════════════════════════════════════════════════

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
PORT = int(os.getenv("PORT", 8000))


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 인메모리 데이터 저장소
# ═══════════════════════════════════════════════════════════════════════════════════════════

_recent_logs: deque = deque(maxlen=100)
_customers: Dict[str, Dict] = {}  # phone -> customer data


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 고객 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerArchetype(str, Enum):
    PATRON = "PATRON"       # 👑 후원자
    TYCOON = "TYCOON"       # 💼 권력자
    FAN = "FAN"             # 💖 찐팬
    VAMPIRE = "VAMPIRE"     # 🔇 주의
    COMMON = "COMMON"       # 👤 일반


ARCHETYPE_INFO = {
    "PATRON": {"emoji": "👑", "name_kr": "후원자", "color": "GOLD", "message": "사장님 지인급 대우. 최상의 서비스 제공."},
    "TYCOON": {"emoji": "💼", "name_kr": "권력자", "color": "NAVY", "message": "신속하게 처리. 잡담 없이 결과 보고."},
    "FAN": {"emoji": "💖", "name_kr": "찐팬", "color": "PINK", "message": "친근하게 인사. 음료 서비스 제공."},
    "VAMPIRE": {"emoji": "🔇", "name_kr": "주의", "color": "GREY", "message": "정중하되 규정대로만. 추가 서비스 금지."},
    "COMMON": {"emoji": "👤", "name_kr": "일반", "color": "WHITE", "message": "표준 응대"},
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class IngestRequest(BaseModel):
    raw_text: str = Field(..., description="OCR로 추출된 원본 텍스트")
    biz_type: str = Field(..., description="업장 유형 (ACADEMY, RESTAURANT, SPORTS)")
    station_id: str = Field(..., description="스테이션 ID")


class CustomerCreate(BaseModel):
    phone: str = Field(..., description="전화번호")
    name: str = Field(..., description="이름")
    biz_type: str = Field("ACADEMY", description="사업장 유형")
    monthly_fee: int = Field(0, description="월 수강료/결제액")
    consult_count: int = Field(0, description="상담 횟수")
    complain_count: int = Field(0, description="컴플레인 횟수")


class LookupRequest(BaseModel):
    phone: str = Field(..., description="전화번호")
    staff_id: str = Field("STAFF_001", description="직원 ID")
    biz_type: str = Field("RESTAURANT", description="사업 유형")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def normalize_phone(raw_phone: str) -> str:
    """전화번호 정규화"""
    digits = re.sub(r'[^0-9]', '', str(raw_phone))
    if digits.startswith('82'):
        digits = '0' + digits[2:]
    if digits.startswith('10') and len(digits) == 10:
        digits = '0' + digits
    return digits if len(digits) >= 10 else ""


def extract_phone(text: str) -> Optional[str]:
    """텍스트에서 전화번호 추출"""
    patterns = [
        r'010[-.\s]?\d{4}[-.\s]?\d{4}',
        r'010\d{8}',
        r'01[0-9][-.\s]?\d{3,4}[-.\s]?\d{4}',
    ]
    for pattern in patterns:
        if match := re.search(pattern, text):
            return normalize_phone(match.group())
    return None


def extract_name(text: str) -> Optional[str]:
    """텍스트에서 이름 추출"""
    patterns = [
        r'([가-힣]{2,4})\s*(회원|님|고객|학생|학부모)',
        r'(이름|성명|회원)[:\s]*([가-힣]{2,4})',
        r'이름[:\s]*([가-힣]{2,4})',
    ]
    for pattern in patterns:
        if match := re.search(pattern, text):
            name = match.group(2) if match.lastindex >= 2 else match.group(1)
            if name not in ['회원', '이름', '성명', '님', '고객']:
                return name
    return None


def detect_vip(text: str) -> bool:
    """VIP 감지"""
    vip_keywords = ["VIP", "VVIP", "프리미엄", "우수", "단골", "골드", "플래티넘"]
    for kw in vip_keywords:
        if kw in text.upper():
            return True
    # 금액 기반 감지
    if amount_match := re.search(r'(\d{1,3}(,\d{3})*)\s*원', text):
        try:
            amount = int(amount_match.group(1).replace(',', ''))
            if amount >= 1000000:
                return True
        except:
            pass
    return False


def detect_risk(text: str) -> bool:
    """위험 고객 감지"""
    risk_keywords = ["환불", "불만", "컴플레인", "진상", "민원", "클레임", "항의"]
    for kw in risk_keywords:
        if kw in text:
            return True
    return False


def calculate_sq(customer: Dict) -> float:
    """SQ 점수 계산 (간소화)"""
    m = customer.get("monthly_fee", 0) / 10000  # 만원 단위
    t = customer.get("consult_count", 0) * 5 + customer.get("complain_count", 0) * 15
    s = customer.get("synergy", 0)
    
    return (1.5 * m) + (2.0 * s) - (2.5 * t)


def classify_archetype(sq_score: float, complain_count: int) -> str:
    """유형 분류"""
    if sq_score >= 80:
        if complain_count <= 1:
            return "PATRON"
        else:
            return "TYCOON"
    elif complain_count >= 5:
        return "VAMPIRE"
    elif sq_score >= 30:
        return "FAN"
    else:
        return "COMMON"


def generate_guide(phone: str, name: str, biz_type: str, is_vip: bool, is_risk: bool) -> Dict:
    """현장 지침 생성"""
    display_name = f"{name or '고객'}님"
    
    # 기존 고객 조회
    customer = _customers.get(phone, {})
    archetype = customer.get("archetype", "COMMON")
    
    # VIP/위험 감지로 오버라이드
    if is_vip and archetype == "COMMON":
        archetype = "PATRON"
    if is_risk and archetype not in ["PATRON", "TYCOON"]:
        archetype = "VAMPIRE"
    
    info = ARCHETYPE_INFO.get(archetype, ARCHETYPE_INFO["COMMON"])
    
    return {
        "display_name": display_name,
        "message": info["message"],
        "bg_color": info["color"],
        "tags": [{"emoji": info["emoji"], "label": info["name_kr"]}],
        "alert_level": "urgent" if archetype in ["PATRON", "TYCOON"] else ("caution" if archetype == "VAMPIRE" else "normal"),
        "archetype": archetype,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 앱
# ═══════════════════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 AUTUS-PRIME Standalone 서버 시작...")
    print(f"   Environment: {ENVIRONMENT}")
    print(f"   Port: {PORT}")
    yield
    print("👋 AUTUS-PRIME 서버 종료")


app = FastAPI(
    title="AUTUS-PRIME Standalone API",
    description="10개 사업장 통합 운영 시스템 (독립 실행 버전)",
    version="3.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 기본 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {
        "name": "AUTUS-PRIME Standalone API",
        "version": "3.1.0",
        "status": "online",
        "environment": ENVIRONMENT,
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "observer": "/api/v1/observer/ingest",
            "lookup": "/api/v1/field/lookup",
            "customers": "/api/v1/customers",
            "health": "/health",
            "docs": "/docs",
        }
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "customers_count": len(_customers),
        "logs_count": len(_recent_logs),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Observer API (OCR 수신)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/observer/ingest")
async def ingest_screen_data(request: IngestRequest):
    """
    [Observer] 화면 OCR 데이터 수신
    
    POS/CRM 화면의 텍스트를 받아서:
    1. 전화번호/이름 추출
    2. VIP/주의 고객 감지
    3. 현장 지침 생성
    """
    raw_text = request.raw_text
    biz_type = request.biz_type.upper()
    station_id = request.station_id
    
    # 1. 데이터 파싱
    phone = extract_phone(raw_text)
    name = extract_name(raw_text)
    
    if not phone:
        _recent_logs.append({
            "timestamp": datetime.now().isoformat(),
            "station_id": station_id,
            "status": "ignored",
            "reason": "no_phone"
        })
        return {
            "status": "ignored",
            "phone": None,
            "name": None,
            "extracted": {"reason": "전화번호 없음"},
            "guide": None,
        }
    
    # 2. VIP/위험 감지
    is_vip = detect_vip(raw_text)
    is_risk = detect_risk(raw_text)
    
    # 3. 지침 생성
    guide = generate_guide(phone, name, biz_type, is_vip, is_risk)
    
    # 4. 로그 저장
    _recent_logs.append({
        "timestamp": datetime.now().isoformat(),
        "station_id": station_id,
        "biz_type": biz_type,
        "phone": phone[-4:] if phone else None,
        "name": name,
        "alert_level": guide.get("alert_level"),
        "status": "success"
    })
    
    return {
        "status": "success",
        "phone": phone,
        "name": name,
        "extracted": {
            "is_vip": is_vip,
            "is_risk": is_risk,
        },
        "guide": guide,
    }


@app.get("/api/v1/observer/status")
async def get_observer_status():
    """옵저버 상태"""
    return {
        "status": "online",
        "version": "3.1-standalone",
        "recent_logs_count": len(_recent_logs),
        "last_activity": _recent_logs[-1]["timestamp"] if _recent_logs else None,
    }


@app.get("/api/v1/observer/logs")
async def get_observer_logs(limit: int = 20, station_id: str = None):
    """최근 로그"""
    logs = list(_recent_logs)
    if station_id:
        logs = [log for log in logs if log.get("station_id") == station_id]
    return {
        "count": len(logs[-limit:]),
        "logs": list(reversed(logs[-limit:]))
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Field API (현장 직원용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/field/lookup")
async def field_lookup(request: LookupRequest):
    """
    [현장] 전화번호로 고객 조회
    
    직원 태블릿에서 전화번호 입력 시 지침 반환
    """
    phone = normalize_phone(request.phone)
    
    if not phone:
        return {
            "found": False,
            "guide": {
                "display_name": "신규 고객님",
                "message": "첫 방문 고객입니다. 친절히 안내하세요.",
                "bg_color": "WHITE",
                "tags": [{"emoji": "🆕", "label": "신규"}],
                "alert_level": "normal",
            }
        }
    
    customer = _customers.get(phone)
    
    if not customer:
        return {
            "found": False,
            "phone": phone,
            "guide": {
                "display_name": "신규 고객님",
                "message": "첫 방문 고객입니다. 연락처를 등록해주세요.",
                "bg_color": "WHITE",
                "tags": [{"emoji": "🆕", "label": "신규"}],
                "alert_level": "normal",
            }
        }
    
    info = ARCHETYPE_INFO.get(customer.get("archetype", "COMMON"), ARCHETYPE_INFO["COMMON"])
    
    return {
        "found": True,
        "phone": phone,
        "customer": {
            "name": customer.get("name"),
            "archetype": customer.get("archetype"),
            "sq_score": customer.get("sq_score"),
            "biz_types": customer.get("biz_types", []),
        },
        "guide": {
            "display_name": f"{customer.get('name', '고객')}님",
            "message": info["message"],
            "bg_color": info["color"],
            "tags": [{"emoji": info["emoji"], "label": info["name_kr"]}],
            "alert_level": "urgent" if customer.get("archetype") in ["PATRON", "TYCOON"] else "normal",
        }
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Customer API (고객 관리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/customers")
async def list_customers(limit: int = 50, archetype: str = None):
    """고객 목록"""
    customers = list(_customers.values())
    
    if archetype:
        customers = [c for c in customers if c.get("archetype") == archetype.upper()]
    
    # SQ 점수 내림차순 정렬
    customers.sort(key=lambda x: x.get("sq_score", 0), reverse=True)
    
    return {
        "count": len(customers[:limit]),
        "customers": customers[:limit],
    }


@app.post("/api/v1/customers")
async def create_customer(customer: CustomerCreate):
    """고객 등록"""
    phone = normalize_phone(customer.phone)
    
    if not phone:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # SQ 계산
    data = customer.dict()
    data["phone"] = phone
    sq_score = calculate_sq(data)
    archetype = classify_archetype(sq_score, customer.complain_count)
    
    _customers[phone] = {
        "phone": phone,
        "name": customer.name,
        "biz_types": [customer.biz_type],
        "monthly_fee": customer.monthly_fee,
        "consult_count": customer.consult_count,
        "complain_count": customer.complain_count,
        "synergy": 0,
        "sq_score": round(sq_score, 2),
        "archetype": archetype,
        "created_at": datetime.now().isoformat(),
    }
    
    info = ARCHETYPE_INFO.get(archetype, ARCHETYPE_INFO["COMMON"])
    
    return {
        "status": "created",
        "phone": phone,
        "name": customer.name,
        "sq_score": round(sq_score, 2),
        "archetype": archetype,
        "archetype_emoji": info["emoji"],
        "archetype_name": info["name_kr"],
    }


@app.get("/api/v1/customers/{phone}")
async def get_customer(phone: str):
    """고객 상세"""
    normalized = normalize_phone(phone)
    customer = _customers.get(normalized)
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    info = ARCHETYPE_INFO.get(customer.get("archetype", "COMMON"), ARCHETYPE_INFO["COMMON"])
    
    return {
        **customer,
        "archetype_emoji": info["emoji"],
        "archetype_name": info["name_kr"],
        "guide_message": info["message"],
    }


@app.delete("/api/v1/customers/{phone}")
async def delete_customer(phone: str):
    """고객 삭제"""
    normalized = normalize_phone(phone)
    
    if normalized not in _customers:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    del _customers[normalized]
    return {"status": "deleted", "phone": normalized}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통계 API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/stats")
async def get_stats():
    """전체 통계"""
    customers = list(_customers.values())
    
    archetype_dist = {}
    for arch in CustomerArchetype:
        archetype_dist[arch.value] = sum(1 for c in customers if c.get("archetype") == arch.value)
    
    return {
        "total_customers": len(customers),
        "archetype_distribution": archetype_dist,
        "avg_sq_score": round(sum(c.get("sq_score", 0) for c in customers) / max(len(customers), 1), 2),
        "vip_count": archetype_dist.get("PATRON", 0) + archetype_dist.get("TYCOON", 0),
        "risk_count": archetype_dist.get("VAMPIRE", 0),
        "observer_logs": len(_recent_logs),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데모 데이터 로드
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/demo/load")
async def load_demo_data():
    """데모 데이터 로드"""
    demo_customers = [
        {"phone": "01011112222", "name": "김후원", "monthly_fee": 500000, "consult_count": 1, "complain_count": 0},
        {"phone": "01022223333", "name": "이권력", "monthly_fee": 400000, "consult_count": 5, "complain_count": 3},
        {"phone": "01033334444", "name": "박충성", "monthly_fee": 200000, "consult_count": 2, "complain_count": 0},
        {"phone": "01044445555", "name": "최주의", "monthly_fee": 100000, "consult_count": 10, "complain_count": 8},
        {"phone": "01055556666", "name": "정일반", "monthly_fee": 300000, "consult_count": 3, "complain_count": 1},
    ]
    
    for c in demo_customers:
        await create_customer(CustomerCreate(**c, biz_type="ACADEMY"))
    
    return {
        "status": "loaded",
        "count": len(demo_customers),
        "customers": list(_customers.values()),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 실행
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    
    print(f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║      █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗                               ║
║     ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝                               ║
║     ███████║██║   ██║   ██║   ██║   ██║███████╗                               ║
║     ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║                               ║
║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║                               ║
║     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝                               ║
║                                                                               ║
║                    STANDALONE SERVER v3.1                                     ║
║                    최소 의존성 독립 실행                                        ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   🌐 URL:  http://localhost:{PORT:<5}                                          ║
║   📚 Docs: http://localhost:{PORT}/docs                                        ║
║   🔧 Env:  {ENVIRONMENT:<15}                                                   ║
║                                                                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Quick Test:                                                                 ║
║   curl http://localhost:{PORT}/health                                          ║
║   curl http://localhost:{PORT}/api/v1/demo/load -X POST                        ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main_standalone:app",
        host="0.0.0.0",
        port=PORT,
        reload=(ENVIRONMENT == "development"),
    )



