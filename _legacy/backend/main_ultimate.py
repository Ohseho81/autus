#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║     █████╗ ██╗   ██╗████████╗██╗   ██╗███████╗    ██╗   ██╗██╗  ████████╗██╗███╗   ███╗  ║
║    ██╔══██╗██║   ██║╚══██╔══╝██║   ██║██╔════╝    ██║   ██║██║  ╚══██╔══╝██║████╗ ████║  ║
║    ███████║██║   ██║   ██║   ██║   ██║███████╗    ██║   ██║██║     ██║   ██║██╔████╔██║  ║
║    ██╔══██║██║   ██║   ██║   ██║   ██║╚════██║    ██║   ██║██║     ██║   ██║██║╚██╔╝██║  ║
║    ██║  ██║╚██████╔╝   ██║   ╚██████╔╝███████║    ╚██████╔╝███████╗██║   ██║██║ ╚═╝ ██║  ║
║    ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝ ╚══════╝     ╚═════╝ ╚══════╝╚═╝   ╚═╝╚═╝     ╚═╝  ║
║                                                                                           ║
║                       AUTUS TRINITY - ULTIMATE EDITION v3.2                               ║
║                       The Complete Empire Operating System                                ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ OCR Data Ingestion (Observer API)                                                     ║
║  ✅ God Mode Dashboard (Real-time Control)                                                ║
║  ✅ Auto-Update System (Self-Evolution)                                                   ║
║  ✅ Gamification Engine (Mission & Rewards)                                               ║
║  ✅ VIP/Caution Detection (M-T-S Scoring)                                                 ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    python main_ultimate.py

테스트:
    브라우저: http://localhost:8000/dashboard (갓 모드)
    API: http://localhost:8000/docs (Swagger)
"""

import os
import re
import random
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List
from collections import deque
from contextlib import asynccontextmanager

from fastapi import FastAPI, Body, Request, Query, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uvicorn


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 로깅 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("autus-ultimate")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 클라이언트 버전 관리 (이 값을 올리면 전 매장이 업데이트됨)
LATEST_CLIENT_VERSION = "3.2.0"
UPDATE_URL = os.getenv("UPDATE_URL", "https://your-app.up.railway.app/static/AUTUS_Bridge.exe")

# 환경
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
SECRET_KEY = os.getenv("SECRET_KEY", "autus-ultimate-secret")

# 스테이션 타임아웃 (초)
STATION_TIMEOUT_SECONDS = 30

# 게이미피케이션 미션 풀
DAILY_MISSIONS: Dict[str, List[Dict[str, str]]] = {
    "Sunny": [
        {"mission": "☀️ 화창한 날! 고객에게 밝은 미소로 인사하기", "reward": "스타벅스 +10P"},
        {"mission": "☀️ 오늘 VIP 고객 3명에게 특별 인사하기", "reward": "커피 쿠폰"},
    ],
    "Rainy": [
        {"mission": "🌧️ 비 오는 날! 우산 없는 고객에게 비닐우산 제공", "reward": "스타벅스 +20P"},
        {"mission": "🌧️ 젖은 바닥 안전 안내 3회 이상", "reward": "편의점 쿠폰"},
    ],
    "Cloudy": [
        {"mission": "⛅ 흐린 날! 따뜻한 음료 추천하기", "reward": "스타벅스 +15P"},
    ],
    "Cold": [
        {"mission": "❄️ 추운 날! 핫초코/따뜻한 물 제공하기", "reward": "편의점 상품권"},
    ],
    "Default": [
        {"mission": "🎯 오늘 하루 고객 만족도 100% 달성!", "reward": "포인트 +10"},
        {"mission": "🎯 신규 고객 1명에게 멤버십 안내하기", "reward": "커피 쿠폰"},
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메모리 데이터베이스 (실제론 PostgreSQL/Redis 연동)
# ═══════════════════════════════════════════════════════════════════════════════════════════

# 스테이션(매장) 실시간 상태
station_status: Dict[str, Dict[str, Any]] = {}

# 고객 데이터베이스 (전화번호 → 정보)
customer_db: Dict[str, Dict[str, Any]] = {}

# 이벤트 로그
event_logs: deque = deque(maxlen=500)

# 알림 큐
alert_queue: deque = deque(maxlen=100)

# 통계
stats: Dict[str, int] = {
    "total_lookups": 0,
    "vip_detected": 0,
    "caution_detected": 0,
    "missions_completed": 0,
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 앱
# ═══════════════════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app: FastAPI):
    """앱 시작/종료 시 실행"""
    logger.info("🚀 AUTUS TRINITY Ultimate 서버 시작...")
    logger.info(f"   Environment: {ENVIRONMENT}")
    logger.info(f"   Client Version: {LATEST_CLIENT_VERSION}")
    yield
    logger.info("👋 AUTUS TRINITY Ultimate 서버 종료")


app = FastAPI(
    title="AUTUS TRINITY - Ultimate Edition",
    description="10개 사업장 통합 제국 운영체제",
    version="3.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 프로덕션에서는 특정 도메인만 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Router 등록 (Human Network API)
# ═══════════════════════════════════════════════════════════════════════════════════════════

try:
    from api.network_api import router as network_router
    app.include_router(network_router)
    logger.info("🕸️ Network API 라우터 등록 완료")
except ImportError as e:
    logger.warning(f"Network API 라우터 로드 실패: {e}")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class IngestRequest(BaseModel):
    station_id: str = Field(..., description="스테이션 ID (예: ACADEMY_PC_01)")
    raw_text: str = Field(..., description="OCR 추출 텍스트")
    biz_type: str = Field(..., description="업장 유형")


class CustomerUpdateRequest(BaseModel):
    phone: str = Field(..., description="전화번호")
    is_vip: Optional[bool] = Field(None, description="VIP 여부")
    is_risk: Optional[bool] = Field(None, description="주의 고객 여부")
    note: Optional[str] = Field(None, description="메모")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 핵심 엔진
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataParser:
    """OCR 데이터 파서"""
    
    VIP_KEYWORDS = ["VIP", "VVIP", "프리미엄", "우수", "단골", "골드", "플래티넘"]
    RISK_KEYWORDS = ["환불", "불만", "컴플레인", "진상", "민원", "클레임", "주의"]
    
    @classmethod
    def extract_phone(cls, text: str) -> Optional[str]:
        """전화번호 추출"""
        patterns = [r'010[-.\s]?\d{4}[-.\s]?\d{4}', r'010\d{8}']
        for pattern in patterns:
            if match := re.search(pattern, text):
                return re.sub(r'[^0-9]', '', match.group())
        return None
    
    @classmethod
    def extract_name(cls, text: str) -> Optional[str]:
        """이름 추출"""
        patterns = [
            r'이름[:\s]*([가-힣]{2,4})',
            r'([가-힣]{2,4})\s*(회원|님|고객)',
            r'성명[:\s]*([가-힣]{2,4})',
        ]
        excluded_names = {'회원', '이름', '성명', '님', '고객'}
        
        for pattern in patterns:
            if match := re.search(pattern, text):
                name = match.group(1) if '이름' in pattern or '성명' in pattern else match.group(1)
                if name not in excluded_names:
                    return name
        return None
    
    @classmethod
    def extract_amount(cls, text: str) -> int:
        """금액 추출"""
        if match := re.search(r'(\d{1,3}(,\d{3})*)\s*원', text):
            try:
                return int(match.group(1).replace(',', ''))
            except ValueError:
                pass
        return 0
    
    @classmethod
    def detect_vip(cls, text: str) -> bool:
        """VIP 감지"""
        # 키워드 기반
        text_upper = text.upper()
        for keyword in cls.VIP_KEYWORDS:
            if keyword.upper() in text_upper:
                return True
        # 금액 기반 (100만원 이상)
        if cls.extract_amount(text) >= 1_000_000:
            return True
        return False
    
    @classmethod
    def detect_risk(cls, text: str) -> bool:
        """주의 고객 감지"""
        for keyword in cls.RISK_KEYWORDS:
            if keyword in text:
                return True
        return False


class GuideEngine:
    """현장 지침 생성 엔진"""
    
    @classmethod
    def generate(cls, phone: str, name: Optional[str], biz_type: str,
                 is_vip: bool, is_risk: bool, amount: int = 0) -> Dict[str, Any]:
        
        display_name = f"{name or '고객'}님"
        
        # VIP 우선
        if is_vip:
            return {
                "display_name": display_name,
                "message": "👑 VIP 고객입니다. 최상의 서비스를 제공하세요.",
                "sub_message": f"누적 {amount:,}원" if amount else "",
                "bg_color": "GOLD",
                "text_color": "#1a1a1a",
                "icon": "👑",
                "tags": [{"emoji": "👑", "label": "VIP"}],
                "alert_level": "urgent",
                "sound": "vip",
            }
        
        # 주의 고객
        if is_risk:
            return {
                "display_name": display_name,
                "message": "⚠️ 주의 고객입니다. 규정대로 응대하세요.",
                "sub_message": "민원 이력 있음",
                "bg_color": "#FF4444",
                "text_color": "#ffffff",
                "icon": "⚠️",
                "tags": [{"emoji": "🔇", "label": "주의"}],
                "alert_level": "caution",
                "sound": "warning",
            }
        
        # 일반 고객
        return {
            "display_name": display_name,
            "message": "표준 응대",
            "sub_message": "",
            "bg_color": "#ffffff",
            "text_color": "#333333",
            "icon": "✓",
            "tags": [],
            "alert_level": "normal",
            "sound": None,
        }


class GamificationEngine:
    """게이미피케이션 엔진"""
    
    WEATHER_OPTIONS = ["Sunny", "Cloudy", "Rainy", "Cold"]
    WEATHER_WEIGHTS = [0.4, 0.3, 0.2, 0.1]
    WEATHER_ICONS = {
        "Sunny": "☀️",
        "Cloudy": "⛅",
        "Rainy": "🌧️",
        "Cold": "❄️",
    }
    
    @classmethod
    def get_weather(cls) -> str:
        """날씨 조회 (실제론 기상청 API 연동)"""
        return random.choices(cls.WEATHER_OPTIONS, weights=cls.WEATHER_WEIGHTS)[0]
    
    @classmethod
    def get_mission(cls, weather: str) -> Dict[str, str]:
        """오늘의 미션 생성"""
        missions = DAILY_MISSIONS.get(weather, DAILY_MISSIONS["Default"])
        return random.choice(missions)
    
    @classmethod
    def generate_instruction(cls) -> Dict[str, Any]:
        """현장 지침 생성 (날씨 + 미션)"""
        weather = cls.get_weather()
        mission_data = cls.get_mission(weather)
        
        return {
            "weather": weather,
            "weather_icon": cls.WEATHER_ICONS.get(weather, "🌤️"),
            "weather_alert": f"{cls.WEATHER_ICONS.get(weather, '')} 현재 날씨: {weather}",
            "daily_mission": mission_data["mission"],
            "mission_reward": mission_data["reward"],
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    """루트"""
    return {
        "name": "AUTUS TRINITY - Ultimate Edition",
        "version": "3.2.0",
        "status": "online",
        "environment": ENVIRONMENT,
        "endpoints": {
            "dashboard": "/dashboard",
            "api_docs": "/docs",
            "ingest": "/ingest",
            "version_check": "/version/check",
        }
    }


@app.get("/health")
async def health():
    """헬스체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "3.2.0",
    }


# ─── 1. 데이터 수집 (Observer API) ───

@app.post("/ingest")
async def ingest_data(request: IngestRequest):
    """
    [Core API] OCR 데이터 수신 및 처리
    
    1. 데이터 파싱 (전화번호, 이름, 금액)
    2. VIP/주의 감지
    3. 지침 생성
    4. 게이미피케이션 미션 전달
    """
    station_id = request.station_id
    raw_text = request.raw_text
    biz_type = request.biz_type.upper()
    
    now = datetime.now()
    
    # 스테이션 Heartbeat 업데이트
    station_status[station_id] = {
        "last_seen": now.strftime("%Y-%m-%d %H:%M:%S"),
        "last_seen_ts": now.timestamp(),
        "status": "ONLINE",
        "biz_type": biz_type,
        "event_count": station_status.get(station_id, {}).get("event_count", 0) + 1,
    }
    
    # 1. 데이터 파싱
    phone = DataParser.extract_phone(raw_text)
    name = DataParser.extract_name(raw_text)
    amount = DataParser.extract_amount(raw_text)
    
    if not phone:
        return {
            "status": "ignored",
            "reason": "no_phone",
            "instruction": GamificationEngine.generate_instruction(),
        }
    
    # 2. VIP/주의 감지 (DB에 저장된 정보 우선)
    customer_info = customer_db.get(phone, {})
    is_vip = customer_info.get("is_vip") or DataParser.detect_vip(raw_text)
    is_risk = customer_info.get("is_risk") or DataParser.detect_risk(raw_text)
    
    # 3. 고객 DB 업데이트
    if phone not in customer_db:
        customer_db[phone] = {
            "name": name,
            "first_seen": now.isoformat(),
            "lookup_count": 0,
            "total_amount": 0,
            "is_vip": is_vip,
            "is_risk": is_risk,
        }
    
    customer_db[phone]["lookup_count"] += 1
    customer_db[phone]["last_seen"] = now.isoformat()
    customer_db[phone]["last_station"] = station_id
    if amount:
        customer_db[phone]["total_amount"] += amount
    if name and not customer_db[phone].get("name"):
        customer_db[phone]["name"] = name
    
    # 4. 지침 생성
    guide = GuideEngine.generate(phone, name, biz_type, is_vip, is_risk, amount)
    
    # 5. 통계 업데이트
    stats["total_lookups"] += 1
    if is_vip:
        stats["vip_detected"] += 1
    if is_risk:
        stats["caution_detected"] += 1
    
    # 6. 이벤트 로그
    event_logs.append({
        "timestamp": now.isoformat(),
        "station_id": station_id,
        "biz_type": biz_type,
        "phone": phone[-4:],
        "name": name,
        "alert_level": guide["alert_level"],
    })
    
    # 7. 알림 큐 (VIP/주의)
    if guide["alert_level"] in ["urgent", "caution"]:
        alert_queue.append({
            "timestamp": now.isoformat(),
            "station_id": station_id,
            "customer": name or phone[-4:],
            "type": guide["alert_level"],
            "message": guide["message"],
        })
    
    # 8. 게이미피케이션 지침
    instruction = GamificationEngine.generate_instruction()
    
    logger.info(f"[INGEST] {station_id}: {phone[-4:]} ({guide['alert_level']})")
    
    return {
        "status": "success",
        "phone": phone,
        "name": name,
        "guide": guide,
        "instruction": instruction,
    }


# ─── 2. 자동 업데이트 API ───

@app.get("/version/check")
async def check_version(current_version: str = Query(..., description="현재 클라이언트 버전")):
    """
    [Auto-Update] 클라이언트 버전 체크
    
    클라이언트가 주기적으로 호출하여 업데이트 여부 확인
    """
    needs_update = current_version != LATEST_CLIENT_VERSION
    
    return {
        "needs_update": needs_update,
        "current_version": current_version,
        "latest_version": LATEST_CLIENT_VERSION,
        "download_url": UPDATE_URL if needs_update else None,
        "release_notes": "v3.2.0: 다크 테마, VIP 알림음, 토스트 팝업 추가" if needs_update else None,
    }


# ─── 3. 갓 모드 대시보드 ───

@app.get("/dashboard", response_class=HTMLResponse)
async def god_dashboard():
    """
    [God Mode] 10개 매장 실시간 관제 대시보드
    
    - 5초마다 자동 새로고침
    - 매장별 상태 표시 (ONLINE/OFFLINE)
    - 실시간 알림 피드
    - 통계 요약
    """
    
    now = datetime.now()
    
    # 오프라인 판정 (30초 이상 응답 없음)
    for station_id, info in station_status.items():
        last_ts = info.get("last_seen_ts", 0)
        if now.timestamp() - last_ts > STATION_TIMEOUT_SECONDS:
            info["status"] = "OFFLINE"
    
    online_count = len([s for s in station_status.values() if s.get("status") == "ONLINE"])
    
    # HTML 생성
    html = f"""
<!DOCTYPE html>
<html lang="ko">
<head>
    <title>👁️ AUTUS GOD MODE</title>
    <meta http-equiv="refresh" content="5">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #eee;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
            min-height: 100vh;
            padding: 20px;
        }}
        .header {{
            text-align: center;
            padding: 20px;
            border-bottom: 1px solid #333;
            margin-bottom: 20px;
        }}
        .header h1 {{
            font-size: 2.5em;
            color: #f5a524;
            text-shadow: 0 0 20px rgba(245,165,36,0.3);
        }}
        .header .subtitle {{
            color: #888;
            margin-top: 5px;
        }}
        .stats-row {{
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }}
        .stat-card {{
            background: rgba(255,255,255,0.05);
            border-radius: 15px;
            padding: 20px 40px;
            text-align: center;
            border: 1px solid #333;
            min-width: 120px;
        }}
        .stat-card .number {{
            font-size: 3em;
            font-weight: bold;
        }}
        .stat-card .label {{
            color: #888;
            font-size: 0.9em;
        }}
        .stat-card.vip .number {{ color: #FFD700; }}
        .stat-card.caution .number {{ color: #FF4444; }}
        .stat-card.total .number {{ color: #4CAF50; }}
        
        .main-content {{
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 20px;
        }}
        
        @media (max-width: 900px) {{
            .main-content {{
                grid-template-columns: 1fr;
            }}
        }}
        
        .stations-section h2, .alerts-section h2 {{
            color: #f5a524;
            margin-bottom: 15px;
            font-size: 1.3em;
        }}
        
        .stations-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 15px;
        }}
        .station-card {{
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
            padding: 15px;
            border: 1px solid #333;
            transition: all 0.3s ease;
        }}
        .station-card:hover {{
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }}
        .station-card h3 {{
            font-size: 1em;
            margin-bottom: 10px;
            color: #fff;
        }}
        .station-card .biz-type {{
            font-size: 0.85em;
            color: #888;
            margin-bottom: 8px;
        }}
        .station-card .last-seen {{
            font-size: 0.8em;
            color: #666;
        }}
        .station-card .status {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            margin-top: 8px;
        }}
        .station-card .status.online {{
            background: #4CAF50;
            color: #fff;
        }}
        .station-card .status.offline {{
            background: #666;
            color: #999;
        }}
        .station-card .event-count {{
            font-size: 0.8em;
            color: #888;
            margin-top: 5px;
        }}
        
        .alerts-section {{
            background: rgba(255,255,255,0.03);
            border-radius: 15px;
            padding: 20px;
            border: 1px solid #333;
            max-height: 500px;
            overflow-y: auto;
        }}
        .alert-item {{
            background: rgba(0,0,0,0.3);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 10px;
            border-left: 3px solid;
        }}
        .alert-item.urgent {{ border-color: #FFD700; }}
        .alert-item.caution {{ border-color: #FF4444; }}
        .alert-item .time {{
            font-size: 0.75em;
            color: #666;
        }}
        .alert-item .station {{
            font-size: 0.8em;
            color: #888;
        }}
        .alert-item .customer {{
            font-weight: bold;
            margin: 5px 0;
        }}
        
        .no-data {{
            text-align: center;
            color: #666;
            padding: 40px;
        }}
        
        .biz-icons {{
            margin-right: 5px;
        }}
        
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #333;
            color: #666;
            font-size: 0.85em;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>👁️ AUTUS GOD MODE</h1>
        <div class="subtitle">10개 사업장 실시간 관제 시스템 | {now.strftime("%Y-%m-%d %H:%M:%S")}</div>
    </div>
    
    <div class="stats-row">
        <div class="stat-card total">
            <div class="number">{stats["total_lookups"]}</div>
            <div class="label">총 조회</div>
        </div>
        <div class="stat-card vip">
            <div class="number">{stats["vip_detected"]}</div>
            <div class="label">👑 VIP 감지</div>
        </div>
        <div class="stat-card caution">
            <div class="number">{stats["caution_detected"]}</div>
            <div class="label">⚠️ 주의 감지</div>
        </div>
        <div class="stat-card">
            <div class="number" style="color:#4FC3F7">{online_count}</div>
            <div class="label">활성 스테이션</div>
        </div>
    </div>
    
    <div class="main-content">
        <div class="stations-section">
            <h2>📡 스테이션 현황</h2>
            <div class="stations-grid">
    """
    
    # 스테이션 카드
    biz_icons = {
        "ACADEMY": "🎓",
        "RESTAURANT": "🍽️",
        "SPORTS": "🏋️",
        "CAFE": "☕",
        "OTHER": "📦",
    }
    
    if station_status:
        for station_id, info in sorted(station_status.items()):
            status_class = "online" if info["status"] == "ONLINE" else "offline"
            biz_icon = biz_icons.get(info.get("biz_type", "OTHER"), "📦")
            html += f"""
                <div class="station-card">
                    <h3><span class="biz-icons">{biz_icon}</span>{station_id}</h3>
                    <div class="biz-type">{info.get('biz_type', 'N/A')}</div>
                    <div class="last-seen">마지막: {info.get('last_seen', 'N/A')}</div>
                    <div class="event-count">이벤트: {info.get('event_count', 0)}건</div>
                    <span class="status {status_class}">● {info['status']}</span>
                </div>
            """
    else:
        html += '<div class="no-data">연결된 스테이션이 없습니다.<br>Bridge 클라이언트를 실행하세요.</div>'
    
    html += """
            </div>
        </div>
        
        <div class="alerts-section">
            <h2>🔔 실시간 알림</h2>
    """
    
    # 알림 피드
    if alert_queue:
        for alert in reversed(list(alert_queue)[-10:]):
            alert_class = alert.get("type", "normal")
            icon = "👑" if alert_class == "urgent" else "⚠️"
            html += f"""
                <div class="alert-item {alert_class}">
                    <div class="time">{alert.get('timestamp', '')[:19]}</div>
                    <div class="station">{alert.get('station_id', '')}</div>
                    <div class="customer">{icon} {alert.get('customer', 'Unknown')}</div>
                </div>
            """
    else:
        html += '<div class="no-data">알림이 없습니다.</div>'
    
    html += """
        </div>
    </div>
    
    <div class="footer">
        AUTUS TRINITY v3.2 | "모든 것은 숫자이며, 답은 인적 구조 조정이다."
    </div>
</body>
</html>
    """
    
    return html


# ─── 4. API 조회 ───

@app.get("/api/v1/observer/status")
async def observer_status():
    """옵저버 상태"""
    online_count = len([s for s in station_status.values() if s.get("status") == "ONLINE"])
    return {
        "status": "online",
        "version": "3.2.0",
        "stations_online": online_count,
        "total_events": len(event_logs),
    }


@app.get("/api/v1/observer/logs")
async def observer_logs(limit: int = Query(20, ge=1, le=100)):
    """최근 로그"""
    logs = list(event_logs)[-limit:]
    return {
        "count": len(logs),
        "logs": list(reversed(logs)),
    }


@app.get("/api/v1/observer/stats")
async def observer_stats():
    """통계"""
    return stats


@app.get("/api/v1/customers")
async def list_customers(limit: int = Query(50, ge=1, le=200)):
    """고객 목록"""
    customers = list(customer_db.items())[:limit]
    return {
        "count": len(customers),
        "customers": [{"phone": k[-4:], **v} for k, v in customers],
    }


@app.get("/api/v1/customers/{phone}")
async def get_customer(phone: str):
    """고객 상세 조회"""
    if phone not in customer_db:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {
        "phone": phone[-4:],
        **customer_db[phone]
    }


@app.put("/api/v1/customers/{phone}")
async def update_customer(phone: str, data: CustomerUpdateRequest):
    """고객 정보 업데이트"""
    if phone not in customer_db:
        customer_db[phone] = {
            "first_seen": datetime.now().isoformat(),
            "lookup_count": 0,
            "total_amount": 0,
        }
    
    if data.is_vip is not None:
        customer_db[phone]["is_vip"] = data.is_vip
    if data.is_risk is not None:
        customer_db[phone]["is_risk"] = data.is_risk
    if data.note is not None:
        customer_db[phone]["note"] = data.note
    
    return {"status": "updated", "phone": phone[-4:]}


@app.get("/api/v1/stations")
async def list_stations():
    """스테이션 목록"""
    now = datetime.now()
    
    # 상태 업데이트
    for station_id, info in station_status.items():
        last_ts = info.get("last_seen_ts", 0)
        if now.timestamp() - last_ts > STATION_TIMEOUT_SECONDS:
            info["status"] = "OFFLINE"
    
    return {
        "count": len(station_status),
        "stations": station_status,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인 실행
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    
    print(f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║                    AUTUS TRINITY - ULTIMATE EDITION                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║  🌐 Server:    http://localhost:{port:<5}                                      ║
║  📊 Dashboard: http://localhost:{port}/dashboard                               ║
║  📚 API Docs:  http://localhost:{port}/docs                                    ║
║  🔧 Env:       {ENVIRONMENT:<12}                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
    """)
    
    uvicorn.run(
        "main_ultimate:app",
        host="0.0.0.0",
        port=port,
        reload=(ENVIRONMENT == "development"),
    )



