import os
import time
import threading
import sqlite3
import json
from dataclasses import dataclass, field
from typing import Dict, Optional, Literal, Any, List
from collections import defaultdict
from contextlib import contextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse
import asyncio
from pydantic import BaseModel, Field
from datetime import datetime, timezone

# Config
AUTUS_API_KEY = os.getenv("AUTUS_API_KEY", "")
RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "60"))
DB_PATH = os.getenv("DB_PATH", "/tmp/autus.db")
PROTECTED_PREFIXES = ("/execute", "/event/")
rate_limit_store: Dict[str, List[float]] = defaultdict(list)
USE_POSTGRES = False

# Database
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def db_query(conn, sql, params=None, fetch_one=False, fetch_all=False):
    """PostgreSQL/SQLite 호환 쿼리"""
    cur = conn.cursor()
    if USE_POSTGRES and params:
        sql = sql.replace('?', '%s')
    if params:
        cur.execute(sql, params)
    else:
        cur.execute(sql)
    if fetch_one:
        row = cur.fetchone()
        return dict(zip([d[0] for d in cur.description], row)) if row else None
    if fetch_all:
        return [dict(r) for r in cur.fetchall()]
    conn.commit()
    return cur



def init_db():
    with get_db() as conn:
        conn.execute('''CREATE TABLE IF NOT EXISTS state (
            id TEXT PRIMARY KEY,
            tick INTEGER, cycle INTEGER,
            pressure REAL, release REAL, decision REAL,
            gravity REAL, entropy REAL,
            status TEXT, bottleneck TEXT, required_action TEXT,
            failure_in_ticks INTEGER,
            updated_at INTEGER
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS actors (
            actor_id TEXT PRIMARY KEY,
            total_pressure REAL DEFAULT 0,
            total_release REAL DEFAULT 0,
            total_decisions INTEGER DEFAULT 0,
            last_event TEXT,
            last_event_ts INTEGER,
            risk_score REAL DEFAULT 0
        )''')
        conn.execute('''CREATE TABLE IF NOT EXISTS audit (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ts INTEGER, event TEXT, actor_id TEXT,
            data TEXT, state_snapshot TEXT
        )''')
        conn.execute('''CREATE INDEX IF NOT EXISTS idx_audit_ts ON audit(ts)''')
        conn.execute('''CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit(actor_id)''')
        # Init state if not exists
        cur = conn.execute("SELECT id FROM state WHERE id='SUN_001'")
        if not cur.fetchone():
            conn.execute('''INSERT INTO state (id, tick, cycle, pressure, release, decision, gravity, entropy, status, bottleneck, required_action, failure_in_ticks, updated_at)
                VALUES ('SUN_001', 0, 0, 0, 0, 0, 0.34, 0.188, 'GREEN', 'NONE', 'NONE', NULL, ?)''', (int(time.time()),))
        conn.commit()

# Models
class AddWorkIn(BaseModel):
    count: int = Field(default=1, ge=1, le=100)
    weight: float = Field(default=1.0, ge=0.1, le=10.0)
    actor_id: Optional[str] = Field(default=None, max_length=64)

class RemoveWorkIn(BaseModel):
    count: int = Field(default=1, ge=1, le=100)
    weight: float = Field(default=1.0, ge=0.1, le=10.0)
    actor_id: Optional[str] = Field(default=None, max_length=64)

class CommitDecisionIn(BaseModel):
    decision: Literal["commit", "hold", "stop"] = "commit"
    actor_id: Optional[str] = Field(default=None, max_length=64)

class ExecuteIn(BaseModel):
    action: Literal["AUTO_STABILIZE", "REMOVE_LOW_IMPACT", "FORCE_DECISION"] = "AUTO_STABILIZE"
    actor_id: Optional[str] = Field(default=None, max_length=64)

# === Solar HQ State Schema ===
class SolarHQState(BaseModel):
    ts: str
    entity_id: str
    status: str
    fps: int
    orbit_deg: int
    planets: Dict[str, float]
    twin: Dict[str, float]
    system: Dict[str, float]
    ui: Dict[str, Any]

# State Engine with Persistence
class Engine:
    def __init__(self):
        self._lock = threading.Lock()
        self._running = False
        self._thread = None
        self._tick_interval = float(os.getenv("TICK_INTERVAL_SEC", "1.0"))
        init_db()
        self._load_state()

    def _load_state(self):
        with get_db() as conn:
            row = db_query(conn, "SELECT * FROM state WHERE id='SUN_001'", fetch_one=True)
            if row:
                self._state = dict(row)
            else:
                self._state = {"id": "SUN_001", "tick": 0, "cycle": 0, "pressure": 0, "release": 0, "decision": 0, "gravity": 0.34, "entropy": 0.188, "status": "GREEN", "bottleneck": "NONE", "required_action": "NONE", "failure_in_ticks": None, "updated_at": int(time.time())}

    def _save_state(self):
        with get_db() as conn:
            s = self._state
            conn.execute('''UPDATE state SET tick=?, cycle=?, pressure=?, release=?, decision=?, gravity=?, entropy=?, status=?, bottleneck=?, required_action=?, failure_in_ticks=?, updated_at=? WHERE id='SUN_001' ''',
                (s["tick"], s["cycle"], s["pressure"], s["release"], s["decision"], s["gravity"], s["entropy"], s["status"], s["bottleneck"], s["required_action"], s["failure_in_ticks"], int(time.time())))
            conn.commit()

    def start(self):
        with self._lock:
            if self._running: return
            self._running = True
            self._thread = threading.Thread(target=self._loop, daemon=True)
            self._thread.start()

    def _loop(self):
        while self._running:
            self._tick()
            time.sleep(self._tick_interval)

    def _tick(self):
        with self._lock:
            s = self._state
            s["tick"] += 1
            s["updated_at"] = int(time.time())
            s["pressure"] *= 0.92
            s["release"] *= 0.92
            s["decision"] *= 0.85
            imbalance = max(0.0, s["pressure"] - s["release"])
            s["entropy"] = max(0.0, min(1.0, s["entropy"] + 0.01*imbalance - 0.008*s["release"]))
            s["gravity"] = max(0.0, min(1.0, 0.70*s["gravity"] + 0.20*min(s["release"],3.0)/3.0 + 0.10*min(s["decision"],1.0) - 0.15*s["entropy"]))
            self._derive()
            if s["tick"] % 60 == 0: s["cycle"] += 1
            if s["tick"] % 10 == 0: self._save_state()  # Save every 10 ticks

    def _derive(self):
        s = self._state
        if s["entropy"] > 0.55 and s["pressure"] > s["release"] + 0.5:
            s["bottleneck"], s["required_action"] = "OVERLOAD", "REMOVE"
        elif s["release"] < 0.20 and s["pressure"] > 0.30:
            s["bottleneck"], s["required_action"] = "NO_RELEASE", "REMOVE"
        elif s["decision"] < 0.15 and s["pressure"] > 0.40:
            s["bottleneck"], s["required_action"] = "DECISION_DELAY", "DECIDE"
        else:
            s["bottleneck"], s["required_action"] = "NONE", "NONE"
        
        if s["entropy"] >= 0.70 or (s["gravity"] <= 0.15 and s["entropy"] >= 0.55):
            s["status"] = "RED"
        elif s["entropy"] >= 0.45 or s["gravity"] <= 0.30 or s["bottleneck"] != "NONE":
            s["status"] = "YELLOW"
        else:
            s["status"] = "GREEN"
        
        if s["status"] == "GREEN":
            s["failure_in_ticks"] = None
        else:
            rate = 0.02 + (0.02 if s["pressure"] > s["release"] else 0) + (0.01 if s["decision"] < 0.2 else 0) + 0.03*s["entropy"]
            margin = max(0.0, 0.85 - s["entropy"])
            ticks = int(max(1, min(60, margin / max(rate, 1e-6))))
            s["failure_in_ticks"] = min(ticks, 10 if s["status"] == "RED" else 30)

    def _update_actor(self, actor_id: str, event: str, pressure_delta: float = 0, release_delta: float = 0, decision_delta: int = 0):
        if not actor_id: return
        with get_db() as conn:
            conn.execute('''INSERT INTO actors (actor_id, total_pressure, total_release, total_decisions, last_event, last_event_ts, risk_score)
                VALUES (?, ?, ?, ?, ?, ?, 0)
                ON CONFLICT(actor_id) DO UPDATE SET
                    total_pressure = total_pressure + ?,
                    total_release = total_release + ?,
                    total_decisions = total_decisions + ?,
                    last_event = ?,
                    last_event_ts = ?,
                    risk_score = CASE WHEN total_pressure > total_release + 5 THEN 1.0 ELSE total_pressure / (total_release + 1) END
            ''', (actor_id, pressure_delta, release_delta, decision_delta, event, int(time.time()),
                  pressure_delta, release_delta, decision_delta, event, int(time.time())))
            conn.commit()

    def _audit(self, event: str, data: dict, actor_id: str):
        with get_db() as conn:
            conn.execute('''INSERT INTO audit (ts, event, actor_id, data, state_snapshot) VALUES (?, ?, ?, ?, ?)''',
                (int(time.time()), event, actor_id or "", json.dumps(data), json.dumps(self.snapshot())))
            conn.commit()

    def add_work(self, count, weight, actor_id):
        with self._lock:
            delta = count * weight
            self._state["pressure"] += delta
            self._update_actor(actor_id, "ADD_WORK", pressure_delta=delta)
            self._audit("ADD_WORK", {"count": count, "weight": weight}, actor_id)
            self._save_state()

    def remove_work(self, count, weight, actor_id):
        with self._lock:
            delta = count * weight
            self._state["release"] += delta
            self._update_actor(actor_id, "REMOVE_WORK", release_delta=delta)
            self._audit("REMOVE_WORK", {"count": count, "weight": weight}, actor_id)
            self._save_state()

    def commit_decision(self, decision, actor_id):
        with self._lock:
            s = self._state
            s["decision"] = min(1.0, s["decision"] + (1.0 if decision=="commit" else 0.4 if decision=="hold" else 0.8))
            self._update_actor(actor_id, "COMMIT_DECISION", decision_delta=1)
            self._audit("COMMIT_DECISION", {"decision": decision}, actor_id)
            self._save_state()

    def execute(self, action, actor_id):
        with self._lock:
            s = self._state
            if action == "AUTO_STABILIZE":
                s["release"] += 1.5
                s["pressure"] = max(0, s["pressure"] - 1.0)
                s["decision"] = min(1.0, s["decision"] + 0.6)
            elif action == "REMOVE_LOW_IMPACT":
                s["release"] += 1.0
                s["pressure"] = max(0, s["pressure"] - 0.8)
            elif action == "FORCE_DECISION":
                s["decision"] = min(1.0, s["decision"] + 1.0)
            self._audit("EXECUTE", {"action": action}, actor_id)
            self._save_state()

    def snapshot(self):
        s = self._state
        return {
            "id": s["id"], "name": "AUTUS Solar", "tick": s["tick"], "cycle": s["cycle"],
            "signals": {"pressure": round(s["pressure"],4), "release": round(s["release"],4), "decision": round(s["decision"],4), "gravity": round(s["gravity"],4), "entropy": round(s["entropy"],4)},
            "output": {"status": s["status"], "bottleneck": s["bottleneck"], "required_action": s["required_action"], "failure_in_ticks": s["failure_in_ticks"]},
            "truth": "/status", "ts": s["updated_at"]
        }

    def get_actors(self, limit=20):
        with get_db() as conn:
            rows = conn.execute("SELECT * FROM actors ORDER BY risk_score DESC LIMIT ?", (limit,)).fetchall()
            return [dict(r) for r in rows]

    def get_top_risk_actor(self):
        with get_db() as conn:
            row = conn.execute("SELECT * FROM actors ORDER BY risk_score DESC LIMIT 1").fetchone()
            return dict(zip([d[0] for d in cur.description], row)) if row else None

    def audit_tail(self, n=50):
        with get_db() as conn:
            rows = conn.execute("SELECT ts, event, actor_id, data FROM audit ORDER BY id DESC LIMIT ?", (n,)).fetchall()
            return [{"ts": r["ts"], "event": r["event"], "actor_id": r["actor_id"], "data": json.loads(r["data"])} for r in rows]

# App
app = FastAPI(title="AUTUS", version="1.1")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
ENGINE = Engine()

@app.middleware("http")
async def security(request: Request, call_next):
    path = request.url.path
    if any(path.startswith(p) for p in PROTECTED_PREFIXES):
        if AUTUS_API_KEY:
            if request.headers.get("X-AUTUS-KEY", "") != AUTUS_API_KEY:
                return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        now = time.time()
        ip = request.client.host if request.client else "unknown"
        rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < 60]
        if len(rate_limit_store[ip]) >= RATE_LIMIT_PER_MIN:
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        rate_limit_store[ip].append(now)
    return await call_next(request)

@app.on_event("startup")
def startup():
    ENGINE.start()
    print(f"✅ AUTUS v1.1 Started | DB: {DB_PATH} | API Key: {'ON' if AUTUS_API_KEY else 'OFF'}")

@app.get("/")
def root():
    return {"status": "AUTUS v1.1", "features": ["persistence", "actors", "audit"], "security": bool(AUTUS_API_KEY)}

@app.get("/health")
def health():
    return {"ok": True, "version": "1.1", "security": bool(AUTUS_API_KEY)}

@app.get("/status")
def status():
    snap = ENGINE.snapshot()
    top_risk = ENGINE.get_top_risk_actor()
    snap["top_risk_actor"] = top_risk
    return snap

@app.get("/api/state", response_model=SolarHQState)
def get_solar_hq_state():
    """Solar System HQ 프론트엔드용 통합 상태 API"""
    snap = ENGINE.snapshot()
    sig = snap.get("signals", {})
    out = snap.get("output", {})
    
    # 9 Planets 값 계산 (Physics 기반)
    entropy_val = sig.get("entropy", 0.188)
    pressure_val = sig.get("pressure", 0)
    gravity_val = sig.get("gravity", 0.5)
    release_val = sig.get("release", 0)
    decision_val = sig.get("decision", 0)
    
    # Risk 계산
    risk = min(1.0, entropy_val * 1.2 + pressure_val * 0.3)
    
    # Status 계산
    if risk > 0.6:
        status = "CRITICAL"
    elif risk > 0.35:
        status = "WARNING"
    else:
        status = "STABLE"
    
    # 9 Planets 매핑
    planets = {
        "recovery": max(0.1, min(1.0, gravity_val * 0.8 + release_val * 0.2)),
        "stability": max(0.1, min(1.0, 1.0 - entropy_val)),
        "cohesion": max(0.1, min(1.0, decision_val * 0.5 + gravity_val * 0.5)),
        "shock": max(0.1, min(1.0, entropy_val)),
        "friction": max(0.1, min(1.0, pressure_val * 0.8)),
        "transfer": max(0.1, min(1.0, release_val * 0.7 + gravity_val * 0.3)),
        "time": max(0.1, min(1.0, 1.0 - pressure_val * 0.5)),
        "quality": max(0.1, min(1.0, decision_val * 0.6 + (1.0 - entropy_val) * 0.4)),
        "output": max(0.1, min(1.0, gravity_val * 0.6 + release_val * 0.4)),
    }
    
    return SolarHQState(
        ts=datetime.now(timezone.utc).isoformat(),
        entity_id="SUN_001",
        status=status,
        fps=120,
        orbit_deg=int((snap.get("tick", 0) * 3) % 360),
        planets=planets,
        twin={
            "entropy": round(entropy_val, 4),
            "pressure": round(pressure_val, 4),
            "risk": round(risk, 4),
            "flow": round(release_val, 4),
        },
        system={
            "uptime_pct": 0.999,
            "latency_ms": 12,
        },
        ui={
            "selected_planet": "recovery",
            "type": "SOURCE",
            "auto": True,
        },
    )

@app.get("/autus/solar/status")
def solar_status():
    return ENGINE.snapshot()

@app.get("/actors")
def actors(limit: int = 20):
    return {"count": limit, "actors": ENGINE.get_actors(min(100, max(1, limit)))}

@app.get("/audit")
def audit(n: int = 50):
    return {"count": n, "tail": ENGINE.audit_tail(min(200, max(1, n)))}

@app.get("/routes")
def routes():
    return {"count": len(app.router.routes), "routes": [{"path": getattr(r,"path",""), "methods": sorted(list(getattr(r,"methods",[]) or [])), "protected": any(getattr(r,"path","").startswith(p) for p in PROTECTED_PREFIXES)} for r in app.router.routes if getattr(r,"path","")]}

@app.post("/event/add_work")
def add_work(body: AddWorkIn):
    ENGINE.add_work(body.count, body.weight, body.actor_id)
    return {"ok": True, "status": ENGINE.snapshot()}

@app.post("/event/remove_work")
def remove_work(body: RemoveWorkIn):
    ENGINE.remove_work(body.count, body.weight, body.actor_id)
    return {"ok": True, "status": ENGINE.snapshot()}

@app.post("/event/commit_decision")
def commit_decision(body: CommitDecisionIn):
    ENGINE.commit_decision(body.decision, body.actor_id)
    return {"ok": True, "status": ENGINE.snapshot()}

@app.post("/execute")
def execute(body: ExecuteIn):
    ENGINE.execute(body.action, body.actor_id)
    return {"ok": True, "status": ENGINE.snapshot()}

# === Burn Simulate API (명세서 Phase 2) ===
class BurnSimulateIn(BaseModel):
    impulse: Literal["RECOVER", "DEFRICTION", "SHOCK_DAMP"] = "RECOVER"
    magnitude: float = Field(default=1.0, ge=0.1, le=2.0)

IMPULSE_MAP = {
    "RECOVER": "AUTO_STABILIZE",
    "DEFRICTION": "REMOVE_LOW_IMPACT",
    "SHOCK_DAMP": "FORCE_DECISION"
}

@app.post("/api/v1/burn/simulate")
def simulate_burn(body: BurnSimulateIn):
    """Burn 시뮬레이션 (실행 안 함) — 결과만 예측"""
    snap = ENGINE.snapshot()
    sig = snap.get("signals", {})
    
    # 현재 상태
    current_entropy = sig.get("entropy", 0.2)
    current_pressure = sig.get("pressure", 0.3)
    current_risk = min(1.0, current_entropy * 0.6 + current_pressure * 0.4)
    
    # Impulse별 예측 효과
    effects = {
        "RECOVER": {"delta_risk": -0.12, "delta_entropy": -0.08, "cost": 15, "time": 8, "confidence": 78},
        "DEFRICTION": {"delta_risk": -0.08, "delta_entropy": -0.05, "cost": 20, "time": 12, "confidence": 85},
        "SHOCK_DAMP": {"delta_risk": -0.18, "delta_entropy": -0.10, "cost": 35, "time": 20, "confidence": 72}
    }
    
    effect = effects.get(body.impulse, effects["RECOVER"])
    magnitude = body.magnitude
    
    # 결과 계산
    new_risk = max(0, current_risk + effect["delta_risk"] * magnitude)
    new_entropy = max(0, current_entropy + effect["delta_entropy"] * magnitude)
    
    return {
        "impulse": body.impulse,
        "magnitude": magnitude,
        "current": {
            "risk": round(current_risk, 3),
            "entropy": round(current_entropy, 3)
        },
        "predicted": {
            "risk": round(new_risk, 3),
            "entropy": round(new_entropy, 3)
        },
        "delta": {
            "risk": round(effect["delta_risk"] * magnitude, 3),
            "entropy": round(effect["delta_entropy"] * magnitude, 3)
        },
        "cost_percent": effect["cost"],
        "time_percent": effect["time"],
        "confidence": effect["confidence"],
        "executed": False
    }

@app.post("/api/v1/burn/execute")
def execute_burn(body: BurnSimulateIn):
    """Burn 확정 실행 (되돌릴 수 없음)"""
    action = IMPULSE_MAP.get(body.impulse, "AUTO_STABILIZE")
    ENGINE.execute(action, None)
    return {
        "impulse": body.impulse,
        "executed": True,
        "status": ENGINE.snapshot()
    }

# === Phase 3: SSE 실시간 스트림 ===
@app.get("/api/v1/stream/state")
async def stream_state():
    """실시간 상태 스트림 (SSE)"""
    async def event_generator():
        while True:
            snap = ENGINE.snapshot()
            sig = snap.get("signals", {})
            
            # 9 Planets 상태
            planets = {
                "recovery": max(0.1, 1.0 - sig.get("entropy", 0.2)),
                "stability": max(0.1, 1.0 - sig.get("pressure", 0.3) * 0.5),
                "cohesion": max(0.1, sig.get("gravity", 0.5)),
                "shock": min(0.9, sig.get("entropy", 0.2) * 1.5),
                "friction": min(0.9, sig.get("pressure", 0.3)),
                "transfer": max(0.1, 1.0 - sig.get("pressure", 0.3) * 0.3),
                "time": max(0.1, 1.0 - sig.get("entropy", 0.2) * 0.8),
                "quality": max(0.1, sig.get("gravity", 0.5) * 1.2),
                "output": max(0.1, sig.get("gravity", 0.5) * 0.9)
            }
            
            # Snapshot 계산
            risk = min(1.0, sig.get("entropy", 0.2) * 0.6 + sig.get("pressure", 0.3) * 0.4)
            entropy = sig.get("entropy", 0.2)
            pressure = sig.get("pressure", 0.3)
            flow = max(0.1, 1.0 - pressure * 0.5)
            
            data = {
                "ts": datetime.now(timezone.utc).isoformat(),
                "planets": planets,
                "snapshot": {
                    "risk": round(risk, 3),
                    "entropy": round(entropy, 3),
                    "pressure": round(pressure, 3),
                    "flow": round(flow, 3)
                },
                "status": snap.get("status", "GREEN")
            }
            
            yield f"data: {json.dumps(data)}\n\n"
            await asyncio.sleep(1)  # 1초마다 업데이트
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# === Phase 4: 예측 API ===
@app.get("/api/v1/predict/branches")
def predict_branches():
    """미래 시나리오 분기 예측 (명세서 Phase 4)"""
    snap = ENGINE.snapshot()
    sig = snap.get("signals", {})
    
    # 현재 상태
    current_entropy = sig.get("entropy", 0.2)
    current_pressure = sig.get("pressure", 0.3)
    current_risk = min(1.0, current_entropy * 0.6 + current_pressure * 0.4)
    
    # SHOCK_DAMP 시나리오
    shock_damp = {
        "action": "SHOCK_DAMP",
        "delta_risk": -0.18,
        "delta_entropy": -0.10,
        "predicted_risk": round(max(0, current_risk - 0.18), 3),
        "cost_percent": 32,
        "time_percent": 18,
        "reputation_sigma": 0.6,
        "confidence": 72,
        "recommendation": current_entropy > 0.3
    }
    
    # RECOVER 시나리오
    recover = {
        "action": "RECOVER",
        "delta_risk": -0.09,
        "delta_entropy": -0.05,
        "predicted_risk": round(max(0, current_risk - 0.09), 3),
        "cost_percent": 15,
        "time_percent": 8,
        "reputation_sigma": 0.2,
        "confidence": 85,
        "recommendation": current_risk > 0.4
    }
    
    # DEFRICTION 시나리오
    defriction = {
        "action": "DEFRICTION",
        "delta_risk": -0.08,
        "delta_entropy": -0.03,
        "predicted_risk": round(max(0, current_risk - 0.08), 3),
        "cost_percent": 20,
        "time_percent": 12,
        "reputation_sigma": 0.3,
        "confidence": 80,
        "recommendation": current_pressure > 0.5
    }
    
    # NO_ACTION 시나리오 (붕괴 예측)
    entropy_growth = 0.02 * (1 + current_pressure)  # 압력에 비례해 엔트로피 증가
    no_action = {
        "action": "NO_ACTION",
        "delta_risk": round(entropy_growth * 2, 3),
        "delta_entropy": round(entropy_growth, 3),
        "predicted_risk": round(min(1.0, current_risk + entropy_growth * 2), 3),
        "hours_to_critical": max(1, int(24 * (1 - current_risk))),  # 위험도에 따른 임계 시간
        "collapse_probability": round(min(0.95, current_risk + 0.15), 2),
        "warning": "Entropy 지속 증가, 시스템 불안정"
    }
    
    # 최적 추천 결정
    recommendations = [shock_damp, recover, defriction]
    best = max(recommendations, key=lambda x: x["delta_risk"] * -1 * x["confidence"] / 100)
    
    return {
        "current": {
            "risk": round(current_risk, 3),
            "entropy": round(current_entropy, 3),
            "pressure": round(current_pressure, 3)
        },
        "branches": {
            "shock_damp": shock_damp,
            "recover": recover,
            "defriction": defriction,
            "no_action": no_action
        },
        "recommended": best["action"],
        "horizon_hours": 1
    }

# Frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/frontend", StaticFiles(directory=frontend_path, html=True), name="frontend")

# === Solar State API (Physics Kernel) ===
from core.physics import entropy, pressure, gravity, failure_horizon, DeltaState

_prev_metrics = {}

@app.get("/solar/state/{entity_id}")
def get_solar_state(entity_id: str):
    """물리 수식 커널 기반 Solar State 조회"""
    global _prev_metrics
    
    # 현재 상태 조회
    with get_db() as conn:
        row = conn.execute("SELECT * FROM state WHERE id=?", (entity_id,)).fetchone()
        if not row:
            row = db_query(conn, "SELECT * FROM state WHERE id='SUN_001'", fetch_one=True)
    
    if not row:
        return {"error": "Entity not found"}
    
    # 현재 메트릭스
    entropy_val = row["entropy"] or 0
    pressure_val = row["pressure"] or 0
    gravity_val = row["gravity"] or 0.5
    
    metrics_now = {
        "energy": gravity_val,
        "stability": max(0.01, 1.0 - entropy_val),
        "pressure": pressure_val,
        "influence": gravity_val,
        "trust": 1.0,
        "risk": min(1.0, entropy_val * 0.8 + pressure_val * 0.2),
        "demand": pressure_val + 0.3,
    }
    
    # 이전 메트릭스
    metrics_prev = _prev_metrics.get(entity_id, metrics_now.copy())
    
    # ΔState 계산
    delta = DeltaState(
        dE=metrics_now["energy"] - metrics_prev.get("energy", metrics_now["energy"]),
        dS=metrics_now["stability"] - metrics_prev.get("stability", metrics_now["stability"]),
        dP=metrics_now["pressure"] - metrics_prev.get("pressure", metrics_now["pressure"]),
        dG=metrics_now["influence"] - metrics_prev.get("influence", metrics_now["influence"]),
        dR=metrics_now["risk"] - metrics_prev.get("risk", metrics_now["risk"]),
    )
    
    # Risk Rate
    risk_rate = abs(delta.dR) if delta.dR > 0 else 0.01
    
    # 물리량 계산
    total_change = abs(delta.dE) + abs(delta.dS) + abs(delta.dP) + abs(delta.dG) + abs(delta.dR)
    S = entropy(total_change, dt=1.0)
    P = pressure(metrics_now["demand"], metrics_now["energy"], metrics_now["stability"])
    G = gravity(metrics_now["influence"], metrics_now["trust"])
    FH = failure_horizon(metrics_now["risk"], risk_rate, threshold=1.0)
    
    # 상태 저장
    _prev_metrics[entity_id] = metrics_now.copy()
    
    return {
        "entity_id": entity_id,
        "tick": row["tick"] or 0,
        "cycle": row["cycle"] or 0,
        "delta": delta.dict(),
        "physics": {
            "entropy": round(S, 4),
            "pressure": round(P, 4),
            "gravity": round(G, 4),
            "failure_horizon": round(FH, 2) if FH != float('inf') else 9999,
        },
        "metrics": {
            "energy": round(metrics_now["energy"], 4),
            "stability": round(metrics_now["stability"], 4),
            "risk": round(metrics_now["risk"], 4),
        },
        "status": row["status"] or "GREEN",
    }

# === Time Drift + Policy 확장 ===
from core.physics import time_drift
from core.policy import PolicyConstraint, apply_policy

@app.get("/solar/state/v2/{entity_id}")
def get_solar_state_v2(entity_id: str):
    """Physics + Policy + Time Drift 통합 API"""
    global _prev_metrics
    
    with get_db() as conn:
        row = conn.execute("SELECT * FROM state WHERE id=?", (entity_id,)).fetchone()
        if not row:
            row = db_query(conn, "SELECT * FROM state WHERE id='SUN_001'", fetch_one=True)
    
    if not row:
        return {"error": "Entity not found"}
    
    entropy_val = row["entropy"] or 0
    pressure_val = row["pressure"] or 0
    gravity_val = row["gravity"] or 0.5
    
    metrics_now = {
        "energy": gravity_val,
        "stability": max(0.01, 1.0 - entropy_val),
        "pressure": pressure_val,
        "influence": gravity_val,
        "trust": 1.0,
        "risk": min(1.0, entropy_val * 0.8 + pressure_val * 0.2),
        "demand": pressure_val + 0.3,
        "flow": 1.0 - pressure_val,
    }
    
    metrics_prev = _prev_metrics.get(entity_id, metrics_now.copy())
    
    # ΔState
    dE = metrics_now["energy"] - metrics_prev.get("energy", metrics_now["energy"])
    dS = metrics_now["stability"] - metrics_prev.get("stability", metrics_now["stability"])
    dP = metrics_now["pressure"] - metrics_prev.get("pressure", metrics_now["pressure"])
    dG = metrics_now["influence"] - metrics_prev.get("influence", metrics_now["influence"])
    dR = metrics_now["risk"] - metrics_prev.get("risk", metrics_now["risk"])
    
    total_change = abs(dE) + abs(dS) + abs(dP) + abs(dG) + abs(dR)
    
    # Physics
    S = entropy(total_change, dt=1.0)
    P = pressure(metrics_now["demand"], metrics_now["energy"], metrics_now["stability"])
    G = gravity(metrics_now["influence"], metrics_now["trust"])
    
    # Policy
    policy = PolicyConstraint(
        max_energy=1.0,
        max_flow=1.0,
        risk_cap=1.0,
        friction=entropy_val * 0.3
    )
    
    energy_adj, flow_adj, risk_adj = apply_policy(
        metrics_now["energy"],
        metrics_now["flow"],
        metrics_now["risk"],
        policy
    )
    
    # Time Drift
    TD = time_drift(total_change, dt=1.0, pressure=P)
    
    # Failure Horizon
    risk_rate = abs(dR) if dR > 0 else 0.01
    FH = failure_horizon(risk_adj, risk_rate, threshold=1.0)
    
    _prev_metrics[entity_id] = metrics_now.copy()
    
    return {
        "entity_id": entity_id,
        "tick": row["tick"] or 0,
        "cycle": row["cycle"] or 0,
        "delta": {
            "dE": round(dE, 4),
            "dS": round(dS, 4),
            "dP": round(dP, 4),
            "dG": round(dG, 4),
            "dR": round(dR, 4),
            "dT": round(TD, 4),
        },
        "physics": {
            "entropy": round(S, 4),
            "pressure": round(P, 4),
            "gravity": round(G, 4),
            "time_drift": round(TD, 4),
            "failure_horizon": round(FH, 2) if FH != float('inf') else 9999,
        },
        "policy": policy.dict(),
        "adjusted": {
            "energy": round(energy_adj, 4),
            "flow": round(flow_adj, 4),
            "risk": round(risk_adj, 4),
        },
        "status": row["status"] or "GREEN",
    }


@app.get("/ui/bind/{entity_id}")
def ui_bind(entity_id: str):
    """WebGL 바인딩 전용 엔드포인트 - 계산 없이 바로 렌더"""
    state = get_solar_state_v2(entity_id)
    
    if "error" in state:
        return state
    
    physics = state.get("physics", {})
    policy = state.get("policy", {})
    
    return {
        "core": {
            "scale": physics.get("gravity", 0.5),
            "glow": physics.get("entropy", 0),
        },
        "orbits": {
            "speed": 1.0 - physics.get("pressure", 0),
            "distortion": physics.get("entropy", 0),
        },
        "time": {
            "drift": physics.get("time_drift", 0),
            "failure_horizon": physics.get("failure_horizon", 9999),
        },
        "policy_shadow": policy.get("friction", 0),
    }

# === Observer API ===
try:
    from app.api.observer_api import router as observer_router
    app.include_router(observer_router)
    print("✅ Observer API loaded")
except Exception as e:
    print(f"⚠️ Observer API not loaded: {e}")

# === Realtime API ===
try:
    from app.api.realtime_api import router as realtime_router
    app.include_router(realtime_router)
    print("✅ Realtime API loaded")
except Exception as e:
    print(f"⚠️ Realtime API not loaded: {e}")
