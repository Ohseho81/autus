#!/usr/bin/env python3
"""
AUTUS Backend Server with Database
FastAPI + WebSocket + SQLite 통합 버전
"""

import asyncio
import json
import uuid
import random
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import uvicorn

from database import DatabaseManager, EventType

# ═══════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════

class PackType(str, Enum):
    OVERSEAS = "overseas"
    TAX = "tax"
    B2B = "b2b"

class BeadState(str, Enum):
    LOCK = "LOCK"
    ACTIVE = "ACTIVE"
    UNLOCK = "UNLOCK"

@dataclass
class PackMetrics:
    energy: float
    flow: float
    risk: float
    loss_velocity: float
    state: str
    thresholds: Dict[str, float]

@dataclass
class BeadStatus:
    bead1: BeadState
    bead2: BeadState
    bead3: BeadState
    accel: float
    has_proof: bool
    check_streak: int

@dataclass
class AutusState:
    current_station: int
    current_pack: PackType
    detour_active: bool
    beads: BeadStatus
    metrics: PackMetrics
    now_action: str
    next_action: str
    goal: str
    timestamp: str
    session_id: str

# ═══════════════════════════════════════════════════════════════
# PHYSICS ENGINE
# ═══════════════════════════════════════════════════════════════

class PhysicsEngine:
    ENERGY_TO_WON = 1_000_000
    DAY_SEC = 86400
    
    def calculate_loss(self, energy: float, resistance: float, entropy: float, pnr_days: float = 30) -> float:
        time_to_pnr = max(pnr_days * self.DAY_SEC, 1)
        pressure = (energy * self.ENERGY_TO_WON) / (time_to_pnr ** 0.5)
        friction = resistance * (1 + entropy) * self.ENERGY_TO_WON / self.DAY_SEC
        return round(pressure + friction, 2)

# ═══════════════════════════════════════════════════════════════
# PACK ENGINES
# ═══════════════════════════════════════════════════════════════

class OverseasTalentPack:
    COUNTRY_COSTS = {"philippines": 0.25, "vietnam": 0.30, "india": 0.35}
    
    def analyze(self, team_size: int = 10, korea_salary: float = 5000) -> PackMetrics:
        overseas_cost = korea_salary * team_size * self.COUNTRY_COSTS["philippines"]
        korea_cost = korea_salary * team_size
        savings = korea_cost - overseas_cost
        
        energy = min(95, 70 + (savings / 1000) * 5)
        flow = savings / 10000
        risk = max(0.1, 0.4 - (savings / 50000))
        
        physics = PhysicsEngine()
        loss_velocity = physics.calculate_loss(100 - energy, risk, 0.3)
        state = "STABLE" if energy > 75 and risk < 0.35 else "WARNING"
        
        return PackMetrics(round(energy, 1), round(flow, 2), round(risk, 2), loss_velocity, state, {"energy": 60, "risk": 0.5})

class TaxShieldPack:
    TAX_RATES = {"korea": 0.22, "clark": 0.10}
    
    def analyze(self, revenue: float = 70) -> PackMetrics:
        savings = revenue * (self.TAX_RATES["korea"] - self.TAX_RATES["clark"])
        
        energy = min(98, 80 + savings * 2)
        flow = savings
        risk = 0.15 if savings < 10 else 0.25
        
        physics = PhysicsEngine()
        loss_velocity = physics.calculate_loss(100 - energy, risk, 0.2)
        state = "STABLE" if risk < 0.3 else "WARNING"
        
        return PackMetrics(round(energy, 1), round(flow, 2), round(risk, 2), loss_velocity, state, {"energy": 70, "risk": 0.4})

class B2BEnginePack:
    def analyze(self, deals: int = 5, avg_value: float = 10, win_rate: float = 0.3) -> PackMetrics:
        expected_value = deals * avg_value * win_rate
        
        energy = min(90, 50 + expected_value * 2)
        flow = expected_value - (deals * 2)
        risk = round((1 - win_rate) * 0.8, 2)
        
        physics = PhysicsEngine()
        loss_velocity = physics.calculate_loss(100 - energy, risk, 0.5)
        state = "WARNING" if flow < 0 or risk > 0.4 else "STABLE"
        
        return PackMetrics(round(energy, 1), round(flow, 2), risk, loss_velocity, state, {"energy": 50, "risk": 0.6})

# ═══════════════════════════════════════════════════════════════
# AUTUS KERNEL (with DB)
# ═══════════════════════════════════════════════════════════════

class AutusKernel:
    STATIONS = ["Reality", "State", "Threshold", "Forecast", "Decision", "Action", "Log", "Loop"]
    
    def __init__(self, db: DatabaseManager):
        self.db = db
        self.packs = {
            PackType.OVERSEAS: OverseasTalentPack(),
            PackType.TAX: TaxShieldPack(),
            PackType.B2B: B2BEnginePack()
        }
        
        self.session_id = str(uuid.uuid4())[:8]
        self.loops_completed = 0
        self.beads_unlocked = 0
        
        # DB에 세션 생성
        self.db.create_session(self.session_id)
        
        # Initial State
        self.state = AutusState(
            current_station=2,
            current_pack=PackType.OVERSEAS,
            detour_active=False,
            beads=BeadStatus(BeadState.ACTIVE, BeadState.LOCK, BeadState.LOCK, 0.0, False, 0),
            metrics=self.packs[PackType.OVERSEAS].analyze(),
            now_action="Threshold 확인",
            next_action="상태 개선 후 결정",
            goal="B2B 거래 손실률 14일 내 10% 이하로 감소",
            timestamp=datetime.now().isoformat(),
            session_id=self.session_id
        )
        
        # 초기 이벤트 기록
        self._log_event(EventType.STATE_CHANGE, {"action": "init"})
    
    def _log_event(self, event_type: EventType, extra_data: Dict = None):
        """이벤트 DB 기록"""
        state_dict = self._state_to_dict()
        self.db.log_event(event_type, state_dict, extra_data)
    
    def _state_to_dict(self) -> Dict:
        """State를 Dict로 변환"""
        return {
            "current_pack": self.state.current_pack.value,
            "current_station": self.state.current_station,
            "beads": {
                "accel": self.state.beads.accel,
                "bead1": self.state.beads.bead1.value,
                "bead2": self.state.beads.bead2.value,
                "bead3": self.state.beads.bead3.value,
                "has_proof": self.state.beads.has_proof,
                "check_streak": self.state.beads.check_streak
            },
            "metrics": {
                "energy": self.state.metrics.energy,
                "flow": self.state.metrics.flow,
                "risk": self.state.metrics.risk,
                "loss_velocity": self.state.metrics.loss_velocity
            }
        }
    
    def get_state(self) -> Dict:
        self.state.timestamp = datetime.now().isoformat()
        return asdict(self.state)
    
    def switch_pack(self, pack: PackType) -> Dict:
        self.state.current_pack = pack
        self.state.metrics = self.packs[pack].analyze()
        self.state.now_action = f"{pack.value} 분석 완료"
        self._log_event(EventType.PACK_SWITCH, {"pack": pack.value})
        return self.get_state()
    
    def proceed(self) -> Dict:
        if self.state.current_station < 7:
            self.state.current_station += 1
        else:
            self.state.current_station = 1
            self.loops_completed += 1
            self._log_event(EventType.LOOP_COMPLETE, {"loops": self.loops_completed})
        
        self.state.now_action = self.STATIONS[self.state.current_station]
        self.state.next_action = self.STATIONS[(self.state.current_station + 1) % 8]
        self._bump_accel(0.15)
        self._log_event(EventType.STATE_CHANGE, {"station": self.state.current_station})
        return self.get_state()
    
    def check_threshold(self) -> Dict:
        m = self.state.metrics
        passed = m.energy >= m.thresholds["energy"] and m.risk <= m.thresholds["risk"]
        
        if passed:
            self._bump_accel(0.3)
            self.state.now_action = "✅ Threshold PASS"
            self.state.detour_active = False
        else:
            self.state.now_action = "❌ Threshold FAIL"
            self.state.detour_active = True
            self._log_event(EventType.DETOUR_ENTER, {"reason": "threshold_fail"})
        
        self._log_event(EventType.THRESHOLD_CHECK, {"passed": passed})
        return self.get_state()
    
    def record_proof(self, proof_type: str) -> Dict:
        accel_map = {"check": 0.4, "timer": 0.6, "upload": 0.8}
        delta = accel_map.get(proof_type, 0.3)
        
        old_accel = self.state.beads.accel
        self.state.beads.has_proof = True
        if proof_type == "check":
            self.state.beads.check_streak += 1
        
        self._bump_accel(delta)
        self.state.now_action = f"📋 PROOF: {proof_type.upper()}"
        
        # Proof DB 기록
        self.db.log_proof(proof_type, self.session_id, old_accel, self.state.beads.accel)
        self._log_event(EventType.PROOF_RECORD, {"proof_type": proof_type, "delta": delta})
        
        return self.get_state()
    
    def _bump_accel(self, delta: float):
        old_accel = self.state.beads.accel
        self.state.beads.accel = round(self.state.beads.accel + delta, 2)
        
        if self.state.beads.accel >= 1.0 and self.state.beads.bead2 == BeadState.LOCK:
            self.state.beads.bead2 = BeadState.UNLOCK
            self.beads_unlocked += 1
            self._log_event(EventType.BEAD_UNLOCK, {"bead": 2, "accel": self.state.beads.accel})
        
        if self.state.beads.accel >= 2.0 and self.state.beads.has_proof and self.state.beads.bead3 == BeadState.LOCK:
            self.state.beads.bead3 = BeadState.UNLOCK
            self.beads_unlocked += 1
            self._log_event(EventType.BEAD_UNLOCK, {"bead": 3, "accel": self.state.beads.accel})
    
    def simulate_realtime(self) -> Dict:
        m = self.state.metrics
        m.energy = max(0, min(100, m.energy + random.uniform(-0.5, 0.5)))
        m.flow = round(m.flow + random.uniform(-0.1, 0.1), 2)
        m.risk = max(0, min(1, m.risk + random.uniform(-0.01, 0.01)))
        
        physics = PhysicsEngine()
        m.loss_velocity = physics.calculate_loss(100 - m.energy, m.risk, 0.3)
        m.state = "STABLE" if m.energy > 60 and m.risk < 0.5 else "WARNING"
        
        return self.get_state()
    
    def get_session_stats(self) -> Dict:
        return {
            "session_id": self.session_id,
            "loops_completed": self.loops_completed,
            "beads_unlocked": self.beads_unlocked,
            "final_accel": self.state.beads.accel,
            "total_events": self.db.get_event_count()
        }

# ═══════════════════════════════════════════════════════════════
# FASTAPI SERVER
# ═══════════════════════════════════════════════════════════════

app = FastAPI(title="AUTUS Backend with DB", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database & Kernel
db = DatabaseManager()
kernel = AutusKernel(db)
active_connections: List[WebSocket] = []

async def broadcast(message: Dict):
    for conn in active_connections:
        try:
            await conn.send_json(message)
        except:
            pass

# ═══════════════════════════════════════════════════════════════
# REST ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"status": "AUTUS Backend with DB", "version": "2.0.0", "session": kernel.session_id}

@app.get("/api/state")
async def get_state():
    return kernel.get_state()

@app.post("/api/pack/{pack_type}")
async def switch_pack(pack_type: str):
    try:
        pack = PackType(pack_type)
        state = kernel.switch_pack(pack)
        await broadcast({"type": "state_update", "data": state})
        return state
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid pack: {pack_type}")

@app.post("/api/proceed")
async def proceed():
    state = kernel.proceed()
    await broadcast({"type": "state_update", "data": state})
    return state

@app.post("/api/threshold")
async def check_threshold():
    state = kernel.check_threshold()
    await broadcast({"type": "state_update", "data": state})
    return state

@app.post("/api/proof/{proof_type}")
async def record_proof(proof_type: str):
    state = kernel.record_proof(proof_type)
    await broadcast({"type": "state_update", "data": state})
    return state

# ═══════════════════════════════════════════════════════════════
# DATABASE ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/api/db/stats")
async def get_db_stats():
    """데이터베이스 통계"""
    return db.get_stats()

@app.get("/api/db/events")
async def get_events(limit: int = 100, event_type: str = None, pack: str = None):
    """이벤트 조회"""
    return db.get_events(limit, event_type, pack)

@app.get("/api/db/sessions")
async def get_sessions(limit: int = 10):
    """세션 목록"""
    return db.get_sessions(limit)

@app.get("/api/db/proofs")
async def get_proofs(session_id: str = None, limit: int = 50):
    """증거 목록"""
    return db.get_proofs(session_id, limit)

@app.get("/api/db/goals")
async def get_goals():
    """목표 목록"""
    return db.get_goals_history()

@app.post("/api/db/goals")
async def create_goal(goal_text: str, pack: str = "overseas"):
    """목표 생성"""
    goal_id = db.create_goal(goal_text, pack, kernel.state.metrics.energy)
    return {"id": goal_id, "status": "created"}

# ═══════════════════════════════════════════════════════════════
# ANALYTICS ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/api/analytics/daily")
async def get_daily_report(date: str = None):
    """일일 리포트"""
    return db.generate_daily_report(date)

@app.get("/api/analytics/weekly")
async def get_weekly_summary():
    """주간 요약"""
    return db.get_weekly_summary()

@app.get("/api/analytics/pack/{pack}")
async def get_pack_analytics(pack: str):
    """Pack별 분석"""
    return db.get_pack_analytics(pack)

@app.get("/api/analytics/session")
async def get_session_stats():
    """현재 세션 통계"""
    return kernel.get_session_stats()

# ═══════════════════════════════════════════════════════════════
# EXPORT ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.get("/api/export")
async def export_data():
    """데이터 JSON 내보내기"""
    filepath = db.export_to_json("autus_export.json")
    return FileResponse(filepath, filename="autus_export.json", media_type="application/json")

# ═══════════════════════════════════════════════════════════════
# WEBSOCKET ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        await websocket.send_json({"type": "init", "data": kernel.get_state()})
        
        while True:
            data = await websocket.receive_json()
            action = data.get("action")
            
            if action == "proceed":
                state = kernel.proceed()
            elif action == "threshold":
                state = kernel.check_threshold()
            elif action == "switch_pack":
                pack = PackType(data.get("pack", "overseas"))
                state = kernel.switch_pack(pack)
            elif action == "proof":
                proof_type = data.get("proof_type", "check")
                state = kernel.record_proof(proof_type)
            elif action == "ping":
                await websocket.send_json({"type": "pong"})
                continue
            else:
                state = kernel.get_state()
            
            await broadcast({"type": "state_update", "data": state})
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)

# ═══════════════════════════════════════════════════════════════
# BACKGROUND TASK
# ═══════════════════════════════════════════════════════════════

async def realtime_simulation():
    while True:
        await asyncio.sleep(5)
        if active_connections:
            state = kernel.simulate_realtime()
            await broadcast({"type": "realtime", "data": state})

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(realtime_simulation())
    print(f"✅ Session started: {kernel.session_id}")

@app.on_event("shutdown")
async def shutdown_event():
    stats = kernel.get_session_stats()
    db.end_session(kernel.session_id, stats)
    print(f"✅ Session ended: {kernel.session_id}")

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║              AUTUS BACKEND SERVER v2.0 (with DB)             ║
    ║                                                              ║
    ║   REST API:      http://localhost:8000/api/state             ║
    ║   WebSocket:     ws://localhost:8000/ws                      ║
    ║   Docs:          http://localhost:8000/docs                  ║
    ║   DB Stats:      http://localhost:8000/api/db/stats          ║
    ║   Analytics:     http://localhost:8000/api/analytics/weekly  ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000)
