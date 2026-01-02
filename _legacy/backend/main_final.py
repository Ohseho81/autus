#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║              🏛️ AUTUS EMPIRE FINAL FORM - 완전체 통합 서버                                 ║
║                                                                                           ║
║  "아우투스 제국의 모든 것이 하나로"                                                         ║
║                                                                                           ║
║  통합 모듈:                                                                               ║
║  ✅ Observer (OCR 수신)                                                                   ║
║  ✅ Bounty Hunter (현상금 사냥꾼)                                                          ║
║  ✅ Physis Map (M-T-S 3D 좌표)                                                            ║
║  ✅ Human Network (PageRank 인맥)                                                         ║
║  ✅ Oracle Engine (예측 AI)                                                               ║
║  ✅ Gate Keeper API (얼굴 인식)                                                           ║
║  ✅ Legal Shield API (전자 동의)                                                          ║
║  ✅ RPG Gamification API (직원 게이미피케이션)                                             ║
║  ✅ War Game Simulator API (Ghost UI)                                                     ║
║  ✅ God Mode Dashboard                                                                    ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    uvicorn main_final:app --host 0.0.0.0 --port 8000 --reload

Docker:
    docker build -t autus-empire .
    docker run -p 8000:8000 autus-empire
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from enum import Enum
import json
import hashlib
import random
import asyncio
from collections import defaultdict
from pathlib import Path


# ═══════════════════════════════════════════════════════════════════════════════════════════
# FastAPI 앱 초기화
# ═══════════════════════════════════════════════════════════════════════════════════════════

app = FastAPI(
    title="🏛️ AUTUS EMPIRE FINAL FORM",
    description="아우투스 제국 완전체 - 통합 운영 시스템",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 공통 Enum & Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerRank(str, Enum):
    ORBIT = "ORBIT"           # 최고 VIP
    PLANET = "PLANET"         # VIP
    ASTEROID = "ASTEROID"     # 일반
    COMET = "COMET"           # 신규/가능성
    NEBULA = "NEBULA"         # 미분류
    BLACKHOLE = "BLACKHOLE"   # 위험

class RelationType(str, Enum):
    FAMILY = "FAMILY"
    REFERRAL = "REFERRAL"
    FRIEND = "FRIEND"
    GROUP = "GROUP"

class WeatherType(str, Enum):
    SUNNY = "sunny"
    CLOUDY = "cloudy"
    RAINY = "rainy"
    SNOWY = "snowy"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데이터 저장소 (In-Memory + File Backup)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class DataStore:
    """통합 데이터 저장소"""
    
    def __init__(self):
        # 고객 데이터
        self.customers: Dict[str, dict] = {}
        
        # 인간 관계 그래프
        self.relationships: List[dict] = []
        self.adjacency: Dict[str, List[tuple]] = defaultdict(list)
        
        # 입장 기록
        self.entry_logs: List[dict] = []
        
        # 동의 기록
        self.consent_logs: List[dict] = []
        
        # RPG 플레이어
        self.players: Dict[str, dict] = {}
        
        # Bounty Hunter
        self.hunters: Dict[str, dict] = {}
        self.quests: List[dict] = []
        
        # 통계
        self.daily_stats: Dict[str, dict] = {}
        
        self._load()
    
    def _load(self):
        """파일에서 로드"""
        try:
            if Path("autus_data.json").exists():
                with open("autus_data.json", "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.customers = data.get("customers", {})
                    self.relationships = data.get("relationships", [])
                    self.entry_logs = data.get("entry_logs", [])
                    self.consent_logs = data.get("consent_logs", [])
                    self.players = data.get("players", {})
                    self.hunters = data.get("hunters", {})
        except:
            pass
    
    def save(self):
        """파일로 저장"""
        data = {
            "customers": self.customers,
            "relationships": self.relationships,
            "entry_logs": self.entry_logs[-1000:],  # 최근 1000개만
            "consent_logs": self.consent_logs[-1000:],
            "players": self.players,
            "hunters": self.hunters,
        }
        with open("autus_data.json", "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


# 전역 데이터 저장소
db = DataStore()


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pydantic Models
# ═══════════════════════════════════════════════════════════════════════════════════════════

class CustomerCreate(BaseModel):
    user_id: str
    name: str
    phone: str = ""
    station_id: str = ""
    m_score: float = 50.0
    t_score: float = 50.0
    s_score: float = 50.0

class OCRData(BaseModel):
    station_id: str
    raw_text: str
    detected_names: List[str] = []
    amount: int = 0
    timestamp: str = ""

class EntryEvent(BaseModel):
    user_id: str
    name: str
    rank: str = "NORMAL"
    station_id: str
    confidence: float = 1.0

class ConsentRecord(BaseModel):
    name: str
    phone: str
    station_id: str
    agreed_items: Dict[str, bool]

class RelationshipCreate(BaseModel):
    source_id: str
    target_id: str
    rel_type: RelationType
    strength: float = 1.0

class SimulationRequest(BaseModel):
    discount_rate: float = 10.0
    target_group: str = "all"
    budget: float = 1000000

class QuestComplete(BaseModel):
    employee_id: str
    quest_id: str


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 1. HEALTH & STATUS
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "4.0.0 FINAL FORM",
        "modules": {
            "observer": "active",
            "bounty_hunter": "active",
            "physis_map": "active",
            "human_network": "active",
            "oracle_engine": "active",
            "gate_keeper": "active",
            "legal_shield": "active",
            "rpg_system": "active",
            "war_game": "active",
        }
    }

@app.get("/")
async def root():
    """루트 - 대시보드 리다이렉트"""
    return HTMLResponse(content="""
    <html>
        <head>
            <title>AUTUS EMPIRE</title>
            <meta http-equiv="refresh" content="0; url=/docs" />
        </head>
        <body style="background: #1a1a2e; color: white; font-family: Arial; text-align: center; padding-top: 100px;">
            <h1>🏛️ AUTUS EMPIRE FINAL FORM</h1>
            <p>Redirecting to API Documentation...</p>
            <p><a href="/docs" style="color: #f5a524;">Go to API Docs →</a></p>
        </body>
    </html>
    """)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 2. CUSTOMER MANAGEMENT (Physis Map)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/customers", tags=["Customers"])
async def create_customer(customer: CustomerCreate):
    """고객 등록"""
    db.customers[customer.user_id] = {
        **customer.dict(),
        "rank": calculate_rank(customer.m_score, customer.t_score, customer.s_score),
        "created_at": datetime.now().isoformat(),
        "visit_count": 0,
        "total_spent": 0,
    }
    db.save()
    return {"success": True, "customer": db.customers[customer.user_id]}

@app.get("/api/v1/customers", tags=["Customers"])
async def list_customers(
    rank: Optional[str] = None,
    station_id: Optional[str] = None,
    limit: int = 100
):
    """고객 목록 조회"""
    customers = list(db.customers.values())
    
    if rank:
        customers = [c for c in customers if c.get("rank") == rank]
    if station_id:
        customers = [c for c in customers if c.get("station_id") == station_id]
    
    return {"customers": customers[:limit], "total": len(customers)}

@app.get("/api/v1/customers/{user_id}", tags=["Customers"])
async def get_customer(user_id: str):
    """고객 상세 조회"""
    if user_id not in db.customers:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db.customers[user_id]

@app.put("/api/v1/customers/{user_id}/scores", tags=["Customers"])
async def update_scores(user_id: str, m: float = None, t: float = None, s: float = None):
    """M-T-S 점수 업데이트"""
    if user_id not in db.customers:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = db.customers[user_id]
    if m is not None:
        customer["m_score"] = m
    if t is not None:
        customer["t_score"] = t
    if s is not None:
        customer["s_score"] = s
    
    customer["rank"] = calculate_rank(customer["m_score"], customer["t_score"], customer["s_score"])
    db.save()
    
    return {"success": True, "customer": customer}

def calculate_rank(m: float, t: float, s: float) -> str:
    """M-T-S 기반 등급 계산"""
    if m >= 80 and t <= 30:
        return CustomerRank.ORBIT.value
    elif m >= 60 and t <= 40:
        return CustomerRank.PLANET.value
    elif t >= 70:
        return CustomerRank.BLACKHOLE.value
    elif s >= 60:
        return CustomerRank.COMET.value
    elif m >= 40:
        return CustomerRank.ASTEROID.value
    else:
        return CustomerRank.NEBULA.value


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 3. OBSERVER (OCR Data Reception)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/observer/ocr", tags=["Observer"])
async def receive_ocr_data(data: OCRData, background_tasks: BackgroundTasks):
    """OCR 데이터 수신"""
    # VIP/주의 고객 감지
    alerts = []
    tactics = []
    
    for name in data.detected_names:
        # 이름으로 고객 찾기
        for uid, customer in db.customers.items():
            if customer.get("name") == name:
                rank = customer.get("rank", "NEBULA")
                
                if rank == CustomerRank.ORBIT.value:
                    alerts.append({"type": "VIP", "name": name, "message": "👑 최고 VIP 입장!"})
                    tactics.append(f"💎 {name}님께 즉시 인사 + 서비스 제공")
                elif rank == CustomerRank.BLACKHOLE.value:
                    alerts.append({"type": "CAUTION", "name": name, "message": "⚠️ 주의 고객 감지"})
                    tactics.append(f"🛡️ {name}님 규정대로 응대, 녹음 준비")
                
                # 방문 횟수 증가
                customer["visit_count"] = customer.get("visit_count", 0) + 1
                break
    
    db.save()
    
    return {
        "success": True,
        "alerts": alerts,
        "tactics": tactics,
        "processed_at": datetime.now().isoformat(),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 4. HUMAN NETWORK (PageRank)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/network/relationship", tags=["Human Network"])
async def add_relationship(rel: RelationshipCreate):
    """관계 추가"""
    relationship = {
        **rel.dict(),
        "rel_type": rel.rel_type.value,
        "created_at": datetime.now().isoformat(),
    }
    db.relationships.append(relationship)
    
    # 인접 리스트 업데이트
    weight = get_relation_weight(rel.rel_type)
    db.adjacency[rel.source_id].append((rel.target_id, weight))
    db.adjacency[rel.target_id].append((rel.source_id, weight))
    
    db.save()
    return {"success": True, "relationship": relationship}

@app.get("/api/v1/network/pagerank", tags=["Human Network"])
async def get_pagerank(top_n: int = 10):
    """PageRank 영향력 순위"""
    pagerank = calculate_pagerank()
    sorted_pr = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)[:top_n]
    
    result = []
    for uid, score in sorted_pr:
        customer = db.customers.get(uid, {"name": uid})
        result.append({
            "user_id": uid,
            "name": customer.get("name", uid),
            "pagerank": round(score, 2),
            "connections": len(db.adjacency.get(uid, [])),
        })
    
    return {"ranking": result}

@app.get("/api/v1/network/queen-bees", tags=["Human Network"])
async def find_queen_bees(top_n: int = 5):
    """여왕벌(핵인싸) 탐색"""
    pagerank = calculate_pagerank()
    
    results = []
    for uid, pr in pagerank.items():
        connections = len(db.adjacency.get(uid, []))
        influence = pr * 0.6 + (connections / max(len(db.customers), 1) * 100) * 0.4
        
        customer = db.customers.get(uid, {"name": uid})
        results.append({
            "user_id": uid,
            "name": customer.get("name", uid),
            "influence_score": round(influence, 2),
            "pagerank": round(pr, 2),
            "connections": connections,
            "strategy": f"이 사람에게 단체 쿠폰을 주면 {connections}명이 따라옵니다.",
        })
    
    results.sort(key=lambda x: x["influence_score"], reverse=True)
    return {"queen_bees": results[:top_n]}

@app.get("/api/v1/network/churn-impact/{user_id}", tags=["Human Network"])
async def simulate_churn_impact(user_id: str):
    """이탈 영향 시뮬레이션"""
    if user_id not in db.customers:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = db.customers[user_id]
    connections = db.adjacency.get(user_id, [])
    
    at_risk = []
    for target_id, weight in connections:
        churn_prob = min(1.0, weight / 5.0 * 0.8)
        target = db.customers.get(target_id, {"name": target_id, "total_spent": 0})
        at_risk.append({
            "user_id": target_id,
            "name": target.get("name", target_id),
            "churn_probability": round(churn_prob, 2),
            "revenue_at_risk": int(target.get("total_spent", 0) * churn_prob),
        })
    
    expected_churns = sum(r["churn_probability"] for r in at_risk)
    total_revenue_risk = customer.get("total_spent", 0) + sum(r["revenue_at_risk"] for r in at_risk)
    
    return {
        "target": {"user_id": user_id, "name": customer.get("name")},
        "connections": len(connections),
        "expected_churns": round(expected_churns, 1),
        "at_risk_users": at_risk,
        "total_revenue_at_risk": total_revenue_risk,
        "risk_level": "HIGH" if expected_churns >= 3 else "MEDIUM" if expected_churns >= 1 else "LOW",
    }

def get_relation_weight(rel_type: RelationType) -> float:
    weights = {
        RelationType.FAMILY: 5.0,
        RelationType.REFERRAL: 4.0,
        RelationType.GROUP: 3.0,
        RelationType.FRIEND: 2.0,
    }
    return weights.get(rel_type, 1.0)

def calculate_pagerank(damping: float = 0.85, iterations: int = 50) -> Dict[str, float]:
    """PageRank 계산"""
    nodes = set(db.customers.keys())
    if not nodes:
        return {}
    
    n = len(nodes)
    pagerank = {uid: 1.0 / n for uid in nodes}
    
    for _ in range(iterations):
        new_pr = {}
        for uid in nodes:
            incoming_pr = 0.0
            for source, targets in db.adjacency.items():
                for target, weight in targets:
                    if target == uid and source in pagerank:
                        outgoing = len(db.adjacency.get(source, []))
                        if outgoing > 0:
                            incoming_pr += (pagerank[source] * weight) / outgoing
            
            new_pr[uid] = (1 - damping) / n + damping * incoming_pr
        pagerank = new_pr
    
    # 정규화
    max_pr = max(pagerank.values()) if pagerank else 1
    return {k: (v / max_pr) * 100 for k, v in pagerank.items()}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5. ORACLE ENGINE (Prediction AI)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/oracle/tomorrow/{station_id}", tags=["Oracle Engine"])
async def predict_tomorrow(station_id: str, biz_type: str = "restaurant"):
    """내일 예측"""
    tomorrow = datetime.now() + timedelta(days=1)
    return generate_forecast(tomorrow, station_id, biz_type)

@app.get("/api/v1/oracle/weekly/{station_id}", tags=["Oracle Engine"])
async def weekly_forecast(station_id: str, biz_type: str = "restaurant"):
    """주간 예보"""
    forecasts = []
    for i in range(1, 8):
        target = datetime.now() + timedelta(days=i)
        forecast = generate_forecast(target, station_id, biz_type)
        forecasts.append({
            "date": forecast["date"],
            "weather": forecast["weather"],
            "expected_revenue": forecast["expected_revenue"],
            "risk_score": forecast["risk_score"],
        })
    
    return {"station_id": station_id, "forecasts": forecasts}

def generate_forecast(date: datetime, station_id: str, biz_type: str) -> dict:
    """예보 생성"""
    # 날씨 시뮬레이션
    month = date.month
    if month in [12, 1, 2]:
        weather = random.choice(["sunny", "cloudy", "snowy"])
    elif month in [6, 7, 8]:
        weather = random.choice(["sunny", "rainy", "cloudy"])
    else:
        weather = random.choice(["sunny", "cloudy", "rainy"])
    
    # 기본 매출
    base_revenue = 1500000
    
    # 날씨 계수
    weather_mult = {"sunny": 1.2, "cloudy": 1.0, "rainy": 0.7, "snowy": 0.5}.get(weather, 1.0)
    
    # 요일 계수
    day_mult = [0.9, 0.85, 0.9, 0.95, 1.2, 1.3, 1.1][date.weekday()]
    
    # 예측
    expected_revenue = base_revenue * weather_mult * day_mult
    expected_traffic = int(80 * weather_mult * day_mult)
    
    # 예측 메시지
    predictions = []
    if weather == "rainy":
        predictions.append({
            "category": "weather",
            "message": "☔ 비 예보: 배달 매출 40% 증가 예상",
            "impact": "high",
            "action": "💡 배달 용기 재고 확보",
        })
    if date.day == 25:
        predictions.append({
            "category": "event",
            "message": "💰 월급날: 매출 20% 상승 예상",
            "impact": "medium",
            "action": "💡 프리미엄 메뉴 추천",
        })
    
    return {
        "date": date.strftime("%Y-%m-%d"),
        "weather": weather,
        "expected_revenue": int(expected_revenue),
        "expected_traffic": expected_traffic,
        "risk_score": random.uniform(0.2, 0.6),
        "predictions": predictions,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 6. GATE KEEPER API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/gate/entry", tags=["Gate Keeper"])
async def log_entry(event: EntryEvent):
    """입장 기록"""
    entry = {
        **event.dict(),
        "timestamp": datetime.now().isoformat(),
    }
    db.entry_logs.append(entry)
    
    # 고객 방문 횟수 업데이트
    if event.user_id in db.customers:
        db.customers[event.user_id]["visit_count"] = db.customers[event.user_id].get("visit_count", 0) + 1
    
    db.save()
    
    # 알림 생성
    alerts = []
    if event.rank in ["VIP", "ORBIT", "PLANET"]:
        alerts.append({"type": "VIP", "message": f"👑 {event.name}님 입장!"})
    elif event.rank in ["CAUTION", "BLACKHOLE"]:
        alerts.append({"type": "CAUTION", "message": f"⚠️ 주의: {event.name}님 입장"})
    
    return {"success": True, "entry": entry, "alerts": alerts}

@app.get("/api/v1/gate/entries", tags=["Gate Keeper"])
async def get_entries(
    station_id: Optional[str] = None,
    date: Optional[str] = None,
    limit: int = 50
):
    """입장 기록 조회"""
    entries = db.entry_logs
    
    if station_id:
        entries = [e for e in entries if e.get("station_id") == station_id]
    if date:
        entries = [e for e in entries if e.get("timestamp", "").startswith(date)]
    
    return {"entries": entries[-limit:][::-1], "total": len(entries)}

@app.get("/api/v1/gate/today-count", tags=["Gate Keeper"])
async def today_entry_count(station_id: Optional[str] = None):
    """오늘 입장 수"""
    today = datetime.now().strftime("%Y-%m-%d")
    entries = [e for e in db.entry_logs if e.get("timestamp", "").startswith(today)]
    
    if station_id:
        entries = [e for e in entries if e.get("station_id") == station_id]
    
    return {"date": today, "count": len(entries)}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 7. LEGAL SHIELD API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/legal/consent", tags=["Legal Shield"])
async def record_consent(record: ConsentRecord):
    """동의 기록"""
    consent_id = hashlib.sha256(
        f"{record.phone}-{datetime.now().isoformat()}".encode()
    ).hexdigest()[:16].upper()
    
    consent = {
        "consent_id": consent_id,
        **record.dict(),
        "timestamp": datetime.now().isoformat(),
        "legal_hash": hashlib.sha256(
            json.dumps(record.dict(), sort_keys=True).encode()
        ).hexdigest(),
    }
    
    db.consent_logs.append(consent)
    db.save()
    
    return {"success": True, "consent_id": consent_id, "consent": consent}

@app.get("/api/v1/legal/verify/{phone}", tags=["Legal Shield"])
async def verify_consent(phone: str):
    """동의 여부 확인"""
    for consent in reversed(db.consent_logs):
        if consent.get("phone") == phone:
            return {"has_consent": True, "consent": consent}
    return {"has_consent": False}

@app.get("/api/v1/legal/evidence/{consent_id}", tags=["Legal Shield"])
async def get_legal_evidence(consent_id: str):
    """법적 증거 문서 생성"""
    for consent in db.consent_logs:
        if consent.get("consent_id") == consent_id:
            evidence = f"""
═══════════════════════════════════════════════════════════════
              개인정보 수집 동의 확인서
═══════════════════════════════════════════════════════════════

동의서 번호: {consent['consent_id']}
동의 일시: {consent['timestamp']}
동의자 성명: {consent['name']}
연락처: {consent['phone'][:3]}****{consent['phone'][-4:]}
처리 매장: {consent['station_id']}

═══ 동의 항목 ═══
"""
            for key, value in consent['agreed_items'].items():
                status = "✅ 동의" if value else "❌ 미동의"
                evidence += f"- {key}: {status}\n"
            
            evidence += f"""
검증 해시: {consent['legal_hash'][:32]}...

═══════════════════════════════════════════════════════════════
본 동의서는 전자적 방식으로 작성되었으며,
「개인정보보호법」에 따라 적법하게 수집되었음을 증명합니다.
═══════════════════════════════════════════════════════════════
"""
            return {"consent_id": consent_id, "evidence": evidence}
    
    raise HTTPException(status_code=404, detail="Consent not found")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 8. RPG GAMIFICATION API
# ═══════════════════════════════════════════════════════════════════════════════════════════

LEVEL_TABLE = {
    1: {"xp": 0, "title": "견습생", "bonus": 0},
    2: {"xp": 100, "title": "파트타이머", "bonus": 100},
    3: {"xp": 300, "title": "팀원", "bonus": 200},
    4: {"xp": 600, "title": "시니어", "bonus": 400},
    5: {"xp": 1000, "title": "리더", "bonus": 700},
    6: {"xp": 1500, "title": "매니저", "bonus": 1000},
    7: {"xp": 2500, "title": "부점장", "bonus": 1500},
    8: {"xp": 4000, "title": "점장", "bonus": 2000},
    9: {"xp": 6000, "title": "마스터", "bonus": 3000},
    10: {"xp": 10000, "title": "레전드", "bonus": 5000},
}

QUESTS = [
    {"id": "d1", "name": "정시 출근", "xp": 20, "gold": 1000},
    {"id": "d2", "name": "청결 유지", "xp": 15, "gold": 500},
    {"id": "d3", "name": "친절왕", "xp": 30, "gold": 2000},
    {"id": "w1", "name": "매출왕", "xp": 100, "gold": 10000},
]

@app.post("/api/v1/rpg/player", tags=["RPG System"])
async def create_player(employee_id: str, name: str):
    """플레이어 생성"""
    if employee_id not in db.players:
        db.players[employee_id] = {
            "employee_id": employee_id,
            "name": name,
            "level": 1,
            "xp": 0,
            "gold": 0,
            "completed_quests": [],
            "inventory": [],
            "created_at": datetime.now().isoformat(),
        }
        db.save()
    
    return {"success": True, "player": db.players[employee_id]}

@app.get("/api/v1/rpg/player/{employee_id}", tags=["RPG System"])
async def get_player(employee_id: str):
    """플레이어 조회"""
    if employee_id not in db.players:
        raise HTTPException(status_code=404, detail="Player not found")
    
    player = db.players[employee_id]
    level_info = LEVEL_TABLE.get(player["level"], LEVEL_TABLE[1])
    
    return {
        **player,
        "title": level_info["title"],
        "hourly_bonus": level_info["bonus"],
    }

@app.post("/api/v1/rpg/quest/complete", tags=["RPG System"])
async def complete_quest(data: QuestComplete):
    """퀘스트 완료"""
    if data.employee_id not in db.players:
        raise HTTPException(status_code=404, detail="Player not found")
    
    quest = next((q for q in QUESTS if q["id"] == data.quest_id), None)
    if not quest:
        raise HTTPException(status_code=404, detail="Quest not found")
    
    player = db.players[data.employee_id]
    
    # 중복 체크
    today = datetime.now().strftime("%Y-%m-%d")
    quest_key = f"{data.quest_id}_{today}"
    if quest_key in player.get("completed_quests", []):
        return {"success": False, "error": "Already completed today"}
    
    # 보상 지급
    player["xp"] = player.get("xp", 0) + quest["xp"]
    player["gold"] = player.get("gold", 0) + quest["gold"]
    player["completed_quests"] = player.get("completed_quests", []) + [quest_key]
    
    # 레벨업 체크
    leveled_up = False
    for level in range(10, 0, -1):
        if player["xp"] >= LEVEL_TABLE[level]["xp"]:
            if level > player["level"]:
                player["level"] = level
                leveled_up = True
            break
    
    db.save()
    
    return {
        "success": True,
        "xp_gained": quest["xp"],
        "gold_gained": quest["gold"],
        "leveled_up": leveled_up,
        "new_level": player["level"] if leveled_up else None,
    }

@app.get("/api/v1/rpg/leaderboard", tags=["RPG System"])
async def rpg_leaderboard(limit: int = 10):
    """RPG 랭킹"""
    players = sorted(
        db.players.values(),
        key=lambda p: (p.get("level", 1), p.get("xp", 0)),
        reverse=True
    )
    
    return {"leaderboard": players[:limit]}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 9. WAR GAME SIMULATOR API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/wargame/simulate/coupon", tags=["War Game Simulator"])
async def simulate_coupon(req: SimulationRequest):
    """쿠폰 시뮬레이션"""
    # 민감도
    sensitivity = {
        "all": 1.0,
        "vip": 0.5,
        "new": 2.0,
        "risk": 0.3,
    }.get(req.target_group, 1.0)
    
    # 기준값
    base_customers = {
        "all": 1000,
        "vip": 100,
        "new": 300,
        "risk": 50,
    }.get(req.target_group, 1000)
    
    # 계산
    response_rate = min(100, req.discount_rate * sensitivity * 1.5)
    expected_customers = int(base_customers * (response_rate / 100))
    
    avg_ticket = 20000 * (1 - req.discount_rate / 100)
    expected_revenue = expected_customers * avg_ticket
    expected_cost = expected_customers * 10000 + (req.discount_rate / 100 * req.budget)
    expected_profit = expected_revenue - expected_cost
    
    # 리스크 판단
    if expected_profit < 0:
        risk_level = "HIGH"
    elif expected_profit < expected_revenue * 0.1:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
    
    # 권장사항
    recommendations = []
    if req.discount_rate > 30:
        recommendations.append("⚠️ 할인율이 너무 높습니다.")
    if expected_profit < 0:
        recommendations.append("🚨 적자가 예상됩니다.")
    if 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25:
        recommendations.append("⭐ 최적의 할인율입니다!")
    
    return {
        "scenario": f"쿠폰 {req.discount_rate}% - {req.target_group}",
        "expected_customers": expected_customers,
        "expected_revenue": int(expected_revenue),
        "expected_cost": int(expected_cost),
        "expected_profit": int(expected_profit),
        "response_rate": round(response_rate, 1),
        "risk_level": risk_level,
        "recommendations": recommendations,
    }

@app.get("/api/v1/wargame/optimal-discount", tags=["War Game Simulator"])
async def find_optimal_discount(target_group: str = "all"):
    """최적 할인율 탐색"""
    results = []
    
    for discount in range(0, 55, 5):
        sim = await simulate_coupon(SimulationRequest(
            discount_rate=discount,
            target_group=target_group,
        ))
        results.append({
            "discount": discount,
            "profit": sim["expected_profit"],
            "customers": sim["expected_customers"],
        })
    
    optimal = max(results, key=lambda x: x["profit"])
    
    return {
        "optimal_discount": optimal["discount"],
        "expected_profit": optimal["profit"],
        "expected_customers": optimal["customers"],
        "all_results": results,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10. BOUNTY HUNTER API
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.post("/api/v1/bounty/hunter/register", tags=["Bounty Hunter"])
async def register_hunter(user_id: str, name: str, phone: str):
    """사냥꾼 등록"""
    hunter_code = hashlib.md5(f"{user_id}-HUNTER".encode()).hexdigest()[:8].upper()
    
    db.hunters[user_id] = {
        "user_id": user_id,
        "name": name,
        "phone": phone,
        "hunter_code": hunter_code,
        "total_catches": 0,
        "total_rewards": 0,
        "active": True,
        "registered_at": datetime.now().isoformat(),
    }
    db.save()
    
    return {"success": True, "hunter_code": hunter_code, "hunter": db.hunters[user_id]}

@app.get("/api/v1/bounty/hunters", tags=["Bounty Hunter"])
async def list_hunters():
    """사냥꾼 목록"""
    return {"hunters": list(db.hunters.values())}

@app.post("/api/v1/bounty/quest/create", tags=["Bounty Hunter"])
async def create_bounty_quest(
    target_type: str,
    description: str,
    reward: int,
    station_id: str
):
    """현상금 퀘스트 생성"""
    quest = {
        "quest_id": f"BQ-{len(db.quests)+1:04d}",
        "target_type": target_type,
        "description": description,
        "reward": reward,
        "station_id": station_id,
        "status": "active",
        "created_at": datetime.now().isoformat(),
    }
    db.quests.append(quest)
    db.save()
    
    return {"success": True, "quest": quest}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 11. GOD MODE DASHBOARD
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/godmode/overview", tags=["God Mode"])
async def godmode_overview():
    """God Mode 전체 현황"""
    today = datetime.now().strftime("%Y-%m-%d")
    
    # 오늘 입장
    today_entries = len([e for e in db.entry_logs if e.get("timestamp", "").startswith(today)])
    
    # 고객 통계
    rank_counts = {}
    for c in db.customers.values():
        rank = c.get("rank", "NEBULA")
        rank_counts[rank] = rank_counts.get(rank, 0) + 1
    
    # Top VIP
    vips = [c for c in db.customers.values() if c.get("rank") in ["ORBIT", "PLANET"]]
    vips.sort(key=lambda x: x.get("total_spent", 0), reverse=True)
    
    # Top 영향력자
    pagerank = calculate_pagerank()
    top_influencers = sorted(pagerank.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "timestamp": datetime.now().isoformat(),
        "summary": {
            "total_customers": len(db.customers),
            "today_entries": today_entries,
            "total_relationships": len(db.relationships),
            "active_hunters": len([h for h in db.hunters.values() if h.get("active")]),
            "active_players": len(db.players),
        },
        "rank_distribution": rank_counts,
        "top_vips": [{"name": v.get("name"), "spent": v.get("total_spent", 0)} for v in vips[:5]],
        "top_influencers": [
            {"user_id": uid, "name": db.customers.get(uid, {}).get("name", uid), "score": score}
            for uid, score in top_influencers
        ],
    }

@app.get("/api/v1/godmode/alerts", tags=["God Mode"])
async def godmode_alerts():
    """실시간 알림"""
    alerts = []
    
    # 최근 VIP 입장
    for entry in db.entry_logs[-50:]:
        if entry.get("rank") in ["VIP", "ORBIT", "PLANET"]:
            alerts.append({
                "type": "VIP_ENTRY",
                "message": f"👑 {entry.get('name')} VIP 입장",
                "timestamp": entry.get("timestamp"),
            })
        elif entry.get("rank") in ["CAUTION", "BLACKHOLE"]:
            alerts.append({
                "type": "CAUTION_ENTRY",
                "message": f"⚠️ {entry.get('name')} 주의 고객 입장",
                "timestamp": entry.get("timestamp"),
            })
    
    return {"alerts": alerts[-20:][::-1]}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 12. STATISTICS
# ═══════════════════════════════════════════════════════════════════════════════════════════

@app.get("/api/v1/stats/daily/{date}", tags=["Statistics"])
async def daily_stats(date: str):
    """일별 통계"""
    entries = [e for e in db.entry_logs if e.get("timestamp", "").startswith(date)]
    
    return {
        "date": date,
        "total_entries": len(entries),
        "unique_visitors": len(set(e.get("user_id") for e in entries)),
        "vip_entries": len([e for e in entries if e.get("rank") in ["VIP", "ORBIT", "PLANET"]]),
        "caution_entries": len([e for e in entries if e.get("rank") in ["CAUTION", "BLACKHOLE"]]),
    }

@app.get("/api/v1/stats/weekly", tags=["Statistics"])
async def weekly_stats():
    """주간 통계"""
    stats = []
    for i in range(7):
        date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
        entries = [e for e in db.entry_logs if e.get("timestamp", "").startswith(date)]
        stats.append({
            "date": date,
            "entries": len(entries),
        })
    return {"weekly_stats": stats}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import uvicorn
    print("""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║              🏛️ AUTUS EMPIRE FINAL FORM v4.0.0                                            ║
║                                                                                           ║
║  Server starting at http://0.0.0.0:8000                                                   ║
║  API Docs: http://localhost:8000/docs                                                     ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000)
