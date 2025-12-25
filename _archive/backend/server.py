#!/usr/bin/env python3
"""
AUTUS Backend Server
FastAPI + WebSocket 기반 실시간 데이터 서버
"""

import asyncio
import json
import time
import random
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from enum import Enum

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
import uvicorn

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

# ═══════════════════════════════════════════════════════════════
# PHYSICS ENGINE (Core Logic)
# ═══════════════════════════════════════════════════════════════

class PhysicsEngine:
    """AUTUS 물리 엔진 - 손실 속도 계산"""
    
    ENERGY_TO_WON = 1_000_000  # 1 에너지 = 100만원
    DAY_SEC = 86400
    
    def calculate_loss(self, energy: float, resistance: float, entropy: float, pnr_days: float = 30) -> float:
        """
        L = ∫ (Pressure + Resistance × Entropy) dt
        Returns: 손실 속도 (원/초)
        """
        time_to_pnr = max(pnr_days * self.DAY_SEC, 1)
        
        # Pressure: PNR이 가까울수록 압력 증가
        pressure = (energy * self.ENERGY_TO_WON) / (time_to_pnr ** 0.5)
        
        # Friction: 저항 × 엔트로피
        friction = resistance * (1 + entropy) * self.ENERGY_TO_WON / self.DAY_SEC
        
        # Total Loss Velocity
        loss_velocity = pressure + friction
        
        return round(loss_velocity, 2)

# ═══════════════════════════════════════════════════════════════
# PACK ENGINES
# ═══════════════════════════════════════════════════════════════

class OverseasTalentPack:
    """해외인력 Pack - 인건비 최적화"""
    
    COUNTRY_COSTS = {
        "philippines": 0.25,  # 한국 대비 25%
        "vietnam": 0.30,
        "india": 0.35,
        "indonesia": 0.28
    }
    
    def analyze(self, team_size: int = 10, korea_salary: float = 5000) -> PackMetrics:
        # 해외 이전 시 비용 절감
        overseas_cost = korea_salary * team_size * self.COUNTRY_COSTS["philippines"]
        korea_cost = korea_salary * team_size
        savings = korea_cost - overseas_cost
        
        energy = min(95, 70 + (savings / 1000) * 5)  # 절감액 비례 에너지
        flow = savings / 10000  # 억 단위
        risk = max(0.1, 0.4 - (savings / 50000))  # 절감 많을수록 리스크 감소
        
        physics = PhysicsEngine()
        loss_velocity = physics.calculate_loss(100 - energy, risk, 0.3)
        
        state = "STABLE" if energy > 75 and risk < 0.35 else "WARNING"
        
        return PackMetrics(
            energy=round(energy, 1),
            flow=round(flow, 2),
            risk=round(risk, 2),
            loss_velocity=loss_velocity,
            state=state,
            thresholds={"energy": 60, "risk": 0.5}
        )

class TaxShieldPack:
    """절세 Pack - 세금 최적화"""
    
    TAX_RATES = {
        "korea": 0.22,
        "clark": 0.10,
        "singapore": 0.17
    }
    
    def analyze(self, revenue: float = 70, current_tax_rate: float = 0.22) -> PackMetrics:
        # 클락 이전 시 절세액
        korea_tax = revenue * self.TAX_RATES["korea"]
        clark_tax = revenue * self.TAX_RATES["clark"]
        savings = korea_tax - clark_tax
        
        energy = min(98, 80 + savings * 2)
        flow = savings
        risk = 0.15 if savings < 10 else 0.25  # 절세액 클수록 리스크
        
        physics = PhysicsEngine()
        loss_velocity = physics.calculate_loss(100 - energy, risk, 0.2)
        
        state = "STABLE" if risk < 0.3 else "WARNING"
        
        return PackMetrics(
            energy=round(energy, 1),
            flow=round(flow, 2),
            risk=round(risk, 2),
            loss_velocity=loss_velocity,
            state=state,
            thresholds={"energy": 70, "risk": 0.4}
        )

class B2BEnginePack:
    """B2B Pack - 거래 최적화"""
    
    def analyze(self, deals: int = 5, avg_value: float = 10, win_rate: float = 0.3) -> PackMetrics:
        expected_value = deals * avg_value * win_rate
        pipeline_risk = 1 - win_rate
        
        energy = min(90, 50 + expected_value * 2)
        flow = expected_value - (deals * 2)  # 비용 차감
        risk = round(pipeline_risk * 0.8, 2)
        
        physics = PhysicsEngine()
        loss_velocity = physics.calculate_loss(100 - energy, risk, 0.5)
        
        state = "WARNING" if flow < 0 or risk > 0.4 else "STABLE"
        
        return PackMetrics(
            energy=round(energy, 1),
            flow=round(flow, 2),
            risk=round(risk, 2),
            loss_velocity=loss_velocity,
            state=state,
            thresholds={"energy": 50, "risk": 0.6}
        )

# ═══════════════════════════════════════════════════════════════
# AUTUS KERNEL
# ═══════════════════════════════════════════════════════════════

class AutusKernel:
    """AUTUS 핵심 커널 - 상태 관리 및 분석"""
    
    STATIONS = ["Reality", "State", "Threshold", "Forecast", "Decision", "Action", "Log", "Loop"]
    
    def __init__(self):
        self.packs = {
            PackType.OVERSEAS: OverseasTalentPack(),
            PackType.TAX: TaxShieldPack(),
            PackType.B2B: B2BEnginePack()
        }
        
        # Initial State
        self.state = AutusState(
            current_station=2,
            current_pack=PackType.OVERSEAS,
            detour_active=False,
            beads=BeadStatus(
                bead1=BeadState.ACTIVE,
                bead2=BeadState.LOCK,
                bead3=BeadState.LOCK,
                accel=0.0,
                has_proof=False,
                check_streak=0
            ),
            metrics=self.packs[PackType.OVERSEAS].analyze(),
            now_action="Threshold 확인",
            next_action="상태 개선 후 결정",
            goal="B2B 거래 손실률 14일 내 10% 이하로 감소",
            timestamp=datetime.now().isoformat()
        )
    
    def get_state(self) -> Dict:
        """현재 상태 반환"""
        self.state.timestamp = datetime.now().isoformat()
        return asdict(self.state)
    
    def switch_pack(self, pack: PackType) -> Dict:
        """Pack 전환"""
        self.state.current_pack = pack
        self.state.metrics = self.packs[pack].analyze()
        self.state.now_action = f"{pack.value} 분석 완료"
        return self.get_state()
    
    def proceed(self) -> Dict:
        """다음 스테이션으로 진행"""
        if self.state.current_station < 7:
            self.state.current_station += 1
        else:
            self.state.current_station = 1  # Loop back
        
        self.state.now_action = self.STATIONS[self.state.current_station]
        self.state.next_action = self.STATIONS[(self.state.current_station + 1) % 8]
        self._bump_accel(0.15)
        
        return self.get_state()
    
    def check_threshold(self) -> Dict:
        """Threshold 검사"""
        m = self.state.metrics
        passed = m.energy >= m.thresholds["energy"] and m.risk <= m.thresholds["risk"]
        
        if passed:
            self._bump_accel(0.3)
            self.state.now_action = "✅ Threshold PASS"
            self.state.detour_active = False
        else:
            self.state.now_action = "❌ Threshold FAIL"
            self.state.detour_active = True
        
        return self.get_state()
    
    def record_proof(self, proof_type: str) -> Dict:
        """증거 기록"""
        accel_map = {"check": 0.4, "timer": 0.6, "upload": 0.8}
        delta = accel_map.get(proof_type, 0.3)
        
        self.state.beads.has_proof = True
        if proof_type == "check":
            self.state.beads.check_streak += 1
        
        self._bump_accel(delta)
        self.state.now_action = f"📋 PROOF: {proof_type.upper()}"
        
        return self.get_state()
    
    def _bump_accel(self, delta: float):
        """가속도 증가 및 Bead 해금"""
        self.state.beads.accel = round(self.state.beads.accel + delta, 2)
        
        if self.state.beads.accel >= 1.0 and self.state.beads.bead2 == BeadState.LOCK:
            self.state.beads.bead2 = BeadState.UNLOCK
        
        if self.state.beads.accel >= 2.0 and self.state.beads.has_proof and self.state.beads.bead3 == BeadState.LOCK:
            self.state.beads.bead3 = BeadState.UNLOCK
    
    def simulate_realtime(self) -> Dict:
        """실시간 시뮬레이션 (랜덤 변동)"""
        m = self.state.metrics
        
        # 작은 랜덤 변동
        m.energy = max(0, min(100, m.energy + random.uniform(-0.5, 0.5)))
        m.flow = round(m.flow + random.uniform(-0.1, 0.1), 2)
        m.risk = max(0, min(1, m.risk + random.uniform(-0.01, 0.01)))
        
        # 손실 속도 재계산
        physics = PhysicsEngine()
        m.loss_velocity = physics.calculate_loss(100 - m.energy, m.risk, 0.3)
        
        m.state = "STABLE" if m.energy > 60 and m.risk < 0.5 else "WARNING"
        
        return self.get_state()

# ═══════════════════════════════════════════════════════════════
# FASTAPI SERVER
# ═══════════════════════════════════════════════════════════════

app = FastAPI(title="AUTUS Backend", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kernel Instance
kernel = AutusKernel()

# WebSocket Connections
active_connections: List[WebSocket] = []

async def broadcast(message: Dict):
    """모든 클라이언트에 메시지 전송"""
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except:
            pass

# ═══════════════════════════════════════════════════════════════
# REST ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/")
async def root():
    return {"status": "AUTUS Backend Running", "version": "1.0.0"}

@app.get("/api/state")
async def get_state():
    """현재 상태 조회"""
    return kernel.get_state()

@app.post("/api/pack/{pack_type}")
async def switch_pack(pack_type: str):
    """Pack 전환"""
    try:
        pack = PackType(pack_type)
        state = kernel.switch_pack(pack)
        await broadcast({"type": "state_update", "data": state})
        return state
    except ValueError:
        return {"error": f"Invalid pack: {pack_type}"}

@app.post("/api/proceed")
async def proceed():
    """다음 스테이션으로 진행"""
    state = kernel.proceed()
    await broadcast({"type": "state_update", "data": state})
    return state

@app.post("/api/threshold")
async def check_threshold():
    """Threshold 검사"""
    state = kernel.check_threshold()
    await broadcast({"type": "state_update", "data": state})
    return state

@app.post("/api/proof/{proof_type}")
async def record_proof(proof_type: str):
    """증거 기록 (check, timer, upload)"""
    state = kernel.record_proof(proof_type)
    await broadcast({"type": "state_update", "data": state})
    return state

# ═══════════════════════════════════════════════════════════════
# WEBSOCKET ENDPOINT
# ═══════════════════════════════════════════════════════════════

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    
    try:
        # 초기 상태 전송
        await websocket.send_json({"type": "init", "data": kernel.get_state()})
        
        while True:
            # 클라이언트 메시지 수신
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
            
            # 상태 브로드캐스트
            await broadcast({"type": "state_update", "data": state})
            
    except WebSocketDisconnect:
        active_connections.remove(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        if websocket in active_connections:
            active_connections.remove(websocket)

# ═══════════════════════════════════════════════════════════════
# REALTIME SIMULATION TASK
# ═══════════════════════════════════════════════════════════════

async def realtime_simulation():
    """백그라운드 실시간 시뮬레이션"""
    while True:
        await asyncio.sleep(3)  # 3초마다 업데이트
        if active_connections:
            state = kernel.simulate_realtime()
            await broadcast({"type": "realtime", "data": state})

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(realtime_simulation())

# ═══════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("""
    ╔══════════════════════════════════════════════════════════════╗
    ║                    AUTUS BACKEND SERVER                      ║
    ║                                                              ║
    ║   REST API:    http://localhost:8000/api/state               ║
    ║   WebSocket:   ws://localhost:8000/ws                        ║
    ║   Docs:        http://localhost:8000/docs                    ║
    ╚══════════════════════════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000)
