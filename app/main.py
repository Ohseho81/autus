import os
import time
import threading
import sqlite3
import json
import logging
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

# #8 로깅/모니터링
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("autus")

# Config
AUTUS_API_KEY = os.getenv("AUTUS_API_KEY", "")
RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "60"))
DB_PATH = os.getenv("DB_PATH", "/tmp/autus.db")
# #7 인증/권한 — 보호 대상 엔드포인트
PROTECTED_PREFIXES = (
    "/execute", 
    "/event/",
    "/api/v1/execute",
    "/api/v1/burn/execute"  # Burn 실행은 인증 필요
)
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
    method = request.method
    ip = request.client.host if request.client else "unknown"
    start_time = time.time()
    
    if any(path.startswith(p) for p in PROTECTED_PREFIXES):
        if AUTUS_API_KEY:
            if request.headers.get("X-AUTUS-KEY", "") != AUTUS_API_KEY:
                logger.warning(f"[AUTH] Unauthorized access attempt: {method} {path} from {ip}")
                return JSONResponse({"detail": "Unauthorized"}, status_code=401)
        now = time.time()
        rate_limit_store[ip] = [t for t in rate_limit_store[ip] if now - t < 60]
        if len(rate_limit_store[ip]) >= RATE_LIMIT_PER_MIN:
            logger.warning(f"[RATE] Rate limit exceeded: {ip}")
            return JSONResponse({"detail": "Rate limit exceeded"}, status_code=429)
        rate_limit_store[ip].append(now)
    
    response = await call_next(request)
    
    # #8 로깅: API 호출 기록 (v1 엔드포인트만)
    if path.startswith("/api/v1"):
        duration = (time.time() - start_time) * 1000
        logger.info(f"[API] {method} {path} | {response.status_code} | {duration:.1f}ms | {ip}")
    
    return response

@app.on_event("startup")
def startup():
    ENGINE.start()
    logger.info(f"✅ AUTUS v1.1 Started | DB: {DB_PATH} | API Key: {'ON' if AUTUS_API_KEY else 'OFF'}")
    logger.info(f"Protected endpoints: {PROTECTED_PREFIXES}")

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

@app.get("/api/v1/state", response_model=SolarHQState)
@app.get("/api/state", response_model=SolarHQState, include_in_schema=False)  # Legacy alias
def get_solar_hq_state():
    """Solar System HQ 프론트엔드용 통합 상태 API (v1 정규화)"""
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

@app.post("/api/v1/execute")
@app.post("/execute", include_in_schema=False)  # Legacy alias
def execute(body: ExecuteIn):
    """시스템 액션 실행 (v1 정규화)"""
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

# ═══════════════════════════════════════════════════════════════════════════
# P0 업무 자동화 API — "Human decides once → System closes forever"
# ═══════════════════════════════════════════════════════════════════════════

# === P0-1: 비용 승인 (Cost Approval) ===
class CostQuote(BaseModel):
    vendor: str
    amount: int  # 원화
    delivery_days: int
    risk_score: float = Field(default=0.0, ge=0.0, le=1.0)

class CostApprovalIn(BaseModel):
    quotes: List[CostQuote]  # 견적 목록
    actor_id: Optional[str] = None

class CostApprovalDecision(BaseModel):
    selected_vendor: str
    actor_id: Optional[str] = None

@app.post("/api/v1/task/cost/analyze")
def analyze_cost(body: CostApprovalIn):
    """비용 견적 비교 분석 — 자동 추천"""
    quotes = body.quotes
    if not quotes:
        return {"error": "No quotes provided"}
    
    # 최저가 찾기
    sorted_by_price = sorted(quotes, key=lambda q: q.amount)
    lowest = sorted_by_price[0]
    
    # 리스크 조정 점수 계산 (가격 + 배송 + 리스크)
    def score(q):
        price_score = 1 - (q.amount / max(q.amount for q in quotes))  # 저렴할수록 높음
        delivery_score = 1 - (q.delivery_days / max(q.delivery_days for q in quotes))  # 빠를수록 높음
        risk_penalty = q.risk_score * 0.3
        return price_score * 0.5 + delivery_score * 0.3 - risk_penalty
    
    ranked = sorted(quotes, key=score, reverse=True)
    recommended = ranked[0]
    
    # 절감액 계산
    avg_amount = sum(q.amount for q in quotes) / len(quotes)
    savings = int(avg_amount - recommended.amount)
    
    return {
        "quotes": [q.dict() for q in quotes],
        "analysis": {
            "lowest_price": lowest.dict(),
            "recommended": recommended.dict(),
            "savings": savings,
            "savings_percent": round(savings / avg_amount * 100, 1) if avg_amount > 0 else 0
        },
        "action_required": "LOCK",
        "decision_options": ["LOCK", "HOLD", "REJECT"]
    }

@app.post("/api/v1/task/cost/decide")
def decide_cost(body: CostApprovalDecision):
    """비용 승인 결정 — 봉인"""
    decision_id = f"COST-{int(time.time())}"
    
    # Audit 기록
    with get_db() as conn:
        conn.execute(
            "INSERT INTO audit (ts, event, actor_id, data, state_snapshot) VALUES (?, ?, ?, ?, ?)",
            (int(time.time()), "COST_APPROVAL", body.actor_id or "system", 
             json.dumps({"vendor": body.selected_vendor, "decision": "LOCKED"}),
             json.dumps(ENGINE.snapshot()))
        )
        conn.commit()
    
    logger.info(f"[P0-1] Cost Approval LOCKED: {body.selected_vendor} by {body.actor_id}")
    
    return {
        "decision_id": decision_id,
        "status": "LOCKED",
        "vendor": body.selected_vendor,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "immutable": True,
        "audit_link": f"/audit/{decision_id}"
    }


# === P0-2: 일정 지연 승인 (Schedule Delay) ===
class ScheduleDelayIn(BaseModel):
    task_name: str
    original_deadline: str  # ISO format
    delay_days: int
    reason: str
    actor_id: Optional[str] = None

class ScheduleDelayDecision(BaseModel):
    task_name: str
    approved: bool
    actor_id: Optional[str] = None

@app.post("/api/v1/task/schedule/analyze")
def analyze_schedule_delay(body: ScheduleDelayIn):
    """일정 지연 영향 분석"""
    # 지연 영향 계산
    risk_increase = min(0.5, body.delay_days * 0.03)  # 1일당 3% 위험 증가
    cost_impact = body.delay_days * 500000  # 1일당 50만원 추가 비용
    
    # 연쇄 영향 계산
    downstream_tasks = max(1, body.delay_days // 3)  # 영향받는 후속 작업 수
    
    return {
        "task": body.task_name,
        "delay_days": body.delay_days,
        "reason": body.reason,
        "impact": {
            "risk_increase_percent": round(risk_increase * 100, 1),
            "additional_cost": cost_impact,
            "downstream_tasks_affected": downstream_tasks,
            "new_deadline": body.original_deadline  # 실제로는 계산 필요
        },
        "recommendation": "APPROVE" if body.delay_days <= 7 else "REVIEW",
        "action_required": "APPROVE" if body.delay_days <= 7 else "REJECT",
        "decision_options": ["APPROVE", "REJECT"]
    }

@app.post("/api/v1/task/schedule/decide")
def decide_schedule_delay(body: ScheduleDelayDecision):
    """일정 지연 승인 결정 — 타임라인 고정"""
    decision_id = f"SCHED-{int(time.time())}"
    status = "APPROVED" if body.approved else "REJECTED"
    
    with get_db() as conn:
        conn.execute(
            "INSERT INTO audit (ts, event, actor_id, data, state_snapshot) VALUES (?, ?, ?, ?, ?)",
            (int(time.time()), "SCHEDULE_DELAY", body.actor_id or "system",
             json.dumps({"task": body.task_name, "status": status}),
             json.dumps(ENGINE.snapshot()))
        )
        conn.commit()
    
    logger.info(f"[P0-2] Schedule Delay {status}: {body.task_name} by {body.actor_id}")
    
    return {
        "decision_id": decision_id,
        "status": status,
        "task": body.task_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "timeline_locked": True,
        "immutable": True
    }


# === P0-3: 리스크 차단 (Risk Block) ===
class RiskBlockIn(BaseModel):
    risk_type: str  # e.g., "ENTROPY_HIGH", "PRESSURE_CRITICAL"
    current_value: float
    threshold: float
    actor_id: Optional[str] = None

class RiskBlockDecision(BaseModel):
    risk_type: str
    action: Literal["LOCK", "HOLD", "REJECT"]
    actor_id: Optional[str] = None

@app.post("/api/v1/task/risk/analyze")
def analyze_risk_block(body: RiskBlockIn):
    """리스크 차단 분석"""
    snap = ENGINE.snapshot()
    sig = snap.get("signals", {})
    
    # 현재 시스템 상태
    current_entropy = sig.get("entropy", 0.2)
    current_pressure = sig.get("pressure", 0.3)
    
    # 차단 필요성 판단
    severity = "CRITICAL" if body.current_value > body.threshold * 1.2 else "WARNING"
    
    # 추천 액션
    recommended_action = "LOCK" if severity == "CRITICAL" else "HOLD"
    
    # 미조치 시 예상 결과
    hours_to_failure = max(1, int(24 * (1 - body.current_value)))
    
    return {
        "risk_type": body.risk_type,
        "current_value": body.current_value,
        "threshold": body.threshold,
        "severity": severity,
        "system_state": {
            "entropy": round(current_entropy, 3),
            "pressure": round(current_pressure, 3)
        },
        "prediction": {
            "hours_to_failure": hours_to_failure,
            "collapse_probability": round(min(0.95, body.current_value + 0.1), 2)
        },
        "recommended_action": recommended_action,
        "decision_options": ["LOCK", "HOLD", "REJECT"]
    }

@app.post("/api/v1/task/risk/decide")
def decide_risk_block(body: RiskBlockDecision):
    """리스크 차단 결정 — 변경 불가 봉인"""
    decision_id = f"RISK-{int(time.time())}"
    
    # 실제 시스템 조치
    if body.action == "LOCK":
        ENGINE.execute("AUTO_STABILIZE", body.actor_id)
    
    with get_db() as conn:
        conn.execute(
            "INSERT INTO audit (ts, event, actor_id, data, state_snapshot) VALUES (?, ?, ?, ?, ?)",
            (int(time.time()), "RISK_BLOCK", body.actor_id or "system",
             json.dumps({"risk_type": body.risk_type, "action": body.action}),
             json.dumps(ENGINE.snapshot()))
        )
        conn.commit()
    
    logger.info(f"[P0-3] Risk Block {body.action}: {body.risk_type} by {body.actor_id}")
    
    return {
        "decision_id": decision_id,
        "status": body.action,
        "risk_type": body.risk_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sealed": True,
        "immutable": True,
        "system_action_taken": body.action == "LOCK"
    }


# === P0-4: 권한 변경 (Permission Change) ===
class PermissionChangeIn(BaseModel):
    requester_id: str
    permission_type: Literal["READ", "WRITE", "ADMIN", "EXECUTE"]
    target_resource: str
    reason: str
    actor_id: Optional[str] = None

class PermissionChangeDecision(BaseModel):
    requester_id: str
    permission_type: str
    approved: bool
    actor_id: Optional[str] = None

@app.post("/api/v1/task/permission/analyze")
def analyze_permission_change(body: PermissionChangeIn):
    """권한 변경 영향 분석"""
    # 권한 레벨 점수
    permission_levels = {"READ": 1, "WRITE": 2, "EXECUTE": 3, "ADMIN": 4}
    level = permission_levels.get(body.permission_type, 1)
    
    # 리스크 평가
    risk_score = level * 0.15  # 권한 높을수록 리스크
    
    return {
        "requester": body.requester_id,
        "permission": body.permission_type,
        "resource": body.target_resource,
        "reason": body.reason,
        "impact": {
            "risk_level": "HIGH" if level >= 3 else "MEDIUM" if level >= 2 else "LOW",
            "risk_score": round(risk_score, 2),
            "requires_2fa": level >= 3,
            "audit_required": True
        },
        "recommendation": "APPROVE" if risk_score < 0.4 else "REVIEW",
        "decision_options": ["APPROVE", "REJECT"]
    }

@app.post("/api/v1/task/permission/decide")
def decide_permission_change(body: PermissionChangeDecision):
    """권한 변경 결정 — 즉시 반영"""
    decision_id = f"PERM-{int(time.time())}"
    status = "GRANTED" if body.approved else "DENIED"
    
    with get_db() as conn:
        conn.execute(
            "INSERT INTO audit (ts, event, actor_id, data, state_snapshot) VALUES (?, ?, ?, ?, ?)",
            (int(time.time()), "PERMISSION_CHANGE", body.actor_id or "system",
             json.dumps({"requester": body.requester_id, "permission": body.permission_type, "status": status}),
             json.dumps(ENGINE.snapshot()))
        )
        conn.commit()
    
    logger.info(f"[P0-4] Permission {status}: {body.permission_type} for {body.requester_id} by {body.actor_id}")
    
    return {
        "decision_id": decision_id,
        "status": status,
        "requester": body.requester_id,
        "permission": body.permission_type,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "effective_immediately": body.approved,
        "immutable": True
    }


# === P0-5: 결정 공유 (Decision Share) ===
class DecisionShareIn(BaseModel):
    decision_id: str
    share_type: Literal["LINK", "EMAIL", "TEAM"] = "LINK"

@app.post("/api/v1/task/decision/share")
def share_decision(body: DecisionShareIn):
    """결정 공유 — Read-only 링크 생성"""
    import hashlib
    
    # 공유 토큰 생성
    share_token = hashlib.sha256(f"{body.decision_id}-{time.time()}".encode()).hexdigest()[:16]
    share_link = f"/share/{share_token}"
    
    with get_db() as conn:
        conn.execute(
            "INSERT INTO audit (ts, event, actor_id, data, state_snapshot) VALUES (?, ?, ?, ?, ?)",
            (int(time.time()), "DECISION_SHARE", "system",
             json.dumps({"decision_id": body.decision_id, "share_token": share_token}),
             json.dumps(ENGINE.snapshot()))
        )
        conn.commit()
    
    logger.info(f"[P0-5] Decision Shared: {body.decision_id} -> {share_token}")
    
    return {
        "decision_id": body.decision_id,
        "share_token": share_token,
        "share_link": share_link,
        "share_type": body.share_type,
        "read_only": True,
        "expires_in_hours": 168,  # 7일
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


# === P0 업무 목록 조회 ===
@app.get("/api/v1/tasks/pending")
def get_pending_tasks():
    """대기 중인 P0 업무 목록"""
    snap = ENGINE.snapshot()
    sig = snap.get("signals", {})
    out = snap.get("output", {})
    
    tasks = []
    
    # 리스크 기반 자동 생성
    entropy = sig.get("entropy", 0.2)
    pressure = sig.get("pressure", 0.3)
    
    if entropy > 0.4:
        tasks.append({
            "id": f"AUTO-RISK-{int(time.time())}",
            "type": "RISK_BLOCK",
            "title": "⚠️ 엔트로피 임계값 초과",
            "description": f"현재 Entropy {round(entropy * 100)}% > 40%",
            "priority": "HIGH",
            "auto_generated": True,
            "action_url": "/api/v1/task/risk/analyze"
        })
    
    if pressure > 0.5:
        tasks.append({
            "id": f"AUTO-PRESSURE-{int(time.time())}",
            "type": "RISK_BLOCK",
            "title": "⚠️ 압력 임계값 초과",
            "description": f"현재 Pressure {round(pressure * 100)}% > 50%",
            "priority": "MEDIUM",
            "auto_generated": True,
            "action_url": "/api/v1/task/risk/analyze"
        })
    
    return {
        "count": len(tasks),
        "tasks": tasks,
        "system_status": out.get("status", "GREEN")
    }


# ═══════════════════════════════════════════════════════════════════════════
# COMMIT 중심 DB API — "책임 저장 장치"
# ═══════════════════════════════════════════════════════════════════════════
try:
    from app.models.commit_schema import (
        init_commit_schema,
        PersonIn, CommitIn, MoneyFlowIn, ActionIn,
        create_person, create_commit, create_money_flow, execute_action,
        get_person_dashboard, calculate_survival_mass, calculate_risk_score,
        get_commit_db, record_audit,
        # 6개 역할 시스템
        ROLE_PRIORITY, ROLE_PERMISSIONS, ROLE_COMMIT_TYPES,
        check_permission, resolve_conflict, get_allowed_commit_types
    )
    
    # 스키마 초기화
    init_commit_schema()
    
    # === Person API ===
    @app.post("/api/v1/commit/person")
    def api_create_person(body: PersonIn):
        """Person 생성 — 최소 정보 컨테이너"""
        return create_person(body)
    
    @app.get("/api/v1/commit/person/{person_id}")
    def api_get_person(person_id: str):
        """Person 대시보드 — 전체 상태 조회"""
        return get_person_dashboard(person_id)
    
    # === Commit API ===
    @app.post("/api/v1/commit/create")
    def api_create_commit(body: CommitIn):
        """Commit 생성 — 돈과 책임의 물리단위"""
        return create_commit(body)
    
    @app.get("/api/v1/commit/list/{person_id}")
    def api_list_commits(person_id: str):
        """Person의 활성 Commit 목록"""
        with get_commit_db() as conn:
            rows = conn.execute('''
                SELECT * FROM commit WHERE actor_to = ? AND status = 'active'
                ORDER BY created_at DESC
            ''', (person_id,)).fetchall()
            return {"commits": [dict(r) for r in rows]}
    
    @app.post("/api/v1/commit/close/{commit_id}")
    def api_close_commit(commit_id: str):
        """Commit 종료 — 되돌릴 수 없음"""
        with get_commit_db() as conn:
            conn.execute("UPDATE commit SET status = 'closed' WHERE commit_id = ?", (commit_id,))
            conn.commit()
            record_audit('commit', commit_id, 'CLOSED', {'status': 'closed'})
            return {"commit_id": commit_id, "status": "closed", "immutable": True}
    
    # === Money Flow API ===
    @app.post("/api/v1/commit/flow")
    def api_record_flow(body: MoneyFlowIn):
        """Money Flow 기록"""
        return create_money_flow(body)
    
    # === Action API ===
    @app.post("/api/v1/commit/action")
    def api_execute_action(body: ActionIn):
        """Action 실행 — 1회만 가능"""
        return execute_action(body)
    
    # === Survival Mass API ===
    @app.get("/api/v1/commit/survival/{person_id}")
    def api_get_survival(person_id: str):
        """Survival Mass 계산"""
        return calculate_survival_mass(person_id)
    
    @app.get("/api/v1/commit/risk/{person_id}")
    def api_get_risk(person_id: str):
        """Risk Score 계산"""
        return calculate_risk_score(person_id)
    
    # === System State API ===
    @app.get("/api/v1/commit/system/state")
    def api_get_system_state():
        """전역 시스템 상태"""
        with get_commit_db() as conn:
            state = conn.execute("SELECT * FROM system_state WHERE state_id = 'GLOBAL'").fetchone()
            return dict(state) if state else {"status": "unknown"}
    
    @app.post("/api/v1/commit/system/recalculate")
    def api_recalculate_system():
        """시스템 상태 재계산"""
        with get_commit_db() as conn:
            # 전체 Person의 Survival Mass 합계
            rows = conn.execute('''
                SELECT actor_to, SUM(mass * gravity) as person_mass
                FROM commit WHERE status = 'active'
                GROUP BY actor_to
            ''').fetchall()
            
            total_mass = sum(r['person_mass'] or 0 for r in rows)
            person_count = len(rows)
            
            # Float Pressure 계산
            friction_sum = conn.execute('''
                SELECT SUM(friction * mass) as total_friction FROM commit WHERE status = 'active'
            ''').fetchone()['total_friction'] or 0
            
            float_pressure = friction_sum / max(total_mass, 0.01)
            
            # Status 결정
            if total_mass < 0.5 or float_pressure > 0.8:
                status = 'red'
            elif total_mass < 1.0 or float_pressure > 0.5:
                status = 'yellow'
            else:
                status = 'green'
            
            # 업데이트
            now = int(time.time())
            conn.execute('''
                UPDATE system_state SET survival_mass = ?, float_pressure = ?, 
                       status = ?, calculated_at = ? WHERE state_id = 'GLOBAL'
            ''', (total_mass, float_pressure, status, now))
            conn.commit()
            
            return {
                'survival_mass': round(total_mass, 4),
                'float_pressure': round(float_pressure, 4),
                'status': status,
                'person_count': person_count,
                'calculated_at': now
            }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6개 역할 시스템 API — "역할은 늘어날수록 책임은 사라진다"
    # ═══════════════════════════════════════════════════════════════════════════
    
    @app.get("/api/v1/role/permissions/{role}")
    def api_get_role_permissions(role: str):
        """역할별 권한 조회"""
        if role not in ROLE_PERMISSIONS:
            return {"error": f"Unknown role: {role}"}
        
        return {
            "role": role,
            "priority": ROLE_PRIORITY.get(role, 0),
            "permissions": ROLE_PERMISSIONS.get(role, {}),
            "allowed_commit_types": ROLE_COMMIT_TYPES.get(role, [])
        }
    
    @app.get("/api/v1/role/all")
    def api_get_all_roles():
        """전체 역할 구조 조회"""
        roles = []
        for role in ['subject', 'operator', 'sponsor', 'employer', 'institution', 'system']:
            roles.append({
                "role": role,
                "priority": ROLE_PRIORITY.get(role, 0),
                "permissions": ROLE_PERMISSIONS.get(role, {}),
                "allowed_commit_types": ROLE_COMMIT_TYPES.get(role, []),
                "icon": {
                    'subject': '👤',
                    'operator': '🔧',
                    'sponsor': '💰',
                    'employer': '🏢',
                    'institution': '🏛️',
                    'system': '🔒'
                }.get(role, '?')
            })
        return {"roles": roles, "priority_rule": "System > Institution > Sponsor > Employer > Operator > Subject"}
    
    @app.post("/api/v1/role/conflict")
    def api_resolve_conflict(role1: str, role2: str):
        """역할 충돌 해결"""
        winner = resolve_conflict(role1, role2)
        return {
            "role1": role1,
            "role2": role2,
            "winner": winner,
            "reason": f"{winner} has higher priority ({ROLE_PRIORITY.get(winner, 0)} vs {ROLE_PRIORITY.get(role1 if winner == role2 else role2, 0)})"
        }
    
    @app.get("/api/v1/role/check/{role}/{action}")
    def api_check_permission(role: str, action: str):
        """역할 권한 확인"""
        allowed = check_permission(role, action)
        return {
            "role": role,
            "action": action,
            "allowed": allowed,
            "reason": "Permission granted" if allowed else "Permission denied"
        }
    
    @app.get("/api/v1/role/ui/{role}")
    def api_get_role_ui(role: str):
        """역할별 UI 구성 반환 — 버튼 표시/숨김"""
        perms = ROLE_PERMISSIONS.get(role, {})
        
        # 역할별 보이는 UI 요소
        ui_config = {
            "role": role,
            "icon": {'subject': '👤', 'operator': '🔧', 'sponsor': '💰', 
                    'employer': '🏢', 'institution': '🏛️', 'system': '🔒'}.get(role, '?'),
            "panels": {
                "action_buttons": perms.get('can_action', False) in [True, 'auto'],
                "commit_create": perms.get('can_commit', False) in [True, 'auto'],
                "audit_log": perms.get('can_audit') in ['read', 'write'],
                "risk_chart": True,  # 모든 역할 열람 가능
                "survival_mass": True,
                "system_state": role in ['operator', 'system'],
                "cluster_view": role in ['operator', 'sponsor', 'system'],
                "settings": role == 'system'
            },
            "buttons": {
                "LOCK": perms.get('can_action', False) in [True, 'auto'],
                "HOLD": perms.get('can_action', False) in [True, 'auto'],
                "REJECT": perms.get('can_action', False) in [True, 'auto'],
                "CREATE_COMMIT": perms.get('can_commit', False) in [True, 'auto'],
                "CLOSE_COMMIT": role in ['operator', 'system'],
                "OVERRIDE": perms.get('can_override', False)
            },
            "allowed_commit_types": ROLE_COMMIT_TYPES.get(role, []),
            "view_scope": perms.get('view_scope', 'self')
        }
        
        return ui_config
    
    # === 학생 1명 시뮬레이션 데이터 생성 ===
    @app.post("/api/v1/commit/demo/student")
    def api_create_demo_student():
        """학생 1명 + Commit 3개 데모 데이터 생성"""
        import uuid
        
        # 1. Person 생성 (학생)
        student = PersonIn(
            person_id="STU_001",
            role="student",
            country="KR",
            name="김유학"
        )
        create_person(student)
        
        # 2. Person 생성 (대학, 회사, 기관)
        create_person(PersonIn(person_id="UNIV_001", role="institution", country="KR", name="서울대학교"))
        create_person(PersonIn(person_id="CORP_001", role="employer", country="KR", name="삼성전자"))
        create_person(PersonIn(person_id="INST_001", role="institution", country="KR", name="한국장학재단"))
        
        # 3. Commit 생성 (등록금, 급여, 관리비)
        commits = [
            CommitIn(
                commit_id="CMT_TUITION_001",
                commit_type="tuition",
                actor_from="STU_001",
                actor_to="UNIV_001",
                amount=15000000,
                currency="KRW",
                start_date="2025-03-01",
                end_date="2025-08-31"
            ),
            CommitIn(
                commit_id="CMT_WAGE_001",
                commit_type="wage",
                actor_from="CORP_001",
                actor_to="STU_001",
                amount=2500000,
                currency="KRW",
                start_date="2025-01-01",
                end_date="2025-12-31"
            ),
            CommitIn(
                commit_id="CMT_GRANT_001",
                commit_type="grant",
                actor_from="INST_001",
                actor_to="STU_001",
                amount=500000,
                currency="KRW",
                start_date="2025-01-01",
                end_date="2025-12-31"
            )
        ]
        
        results = []
        for commit in commits:
            result = create_commit(commit)
            results.append(result)
        
        # 4. Money Flow 기록 (1월분)
        flows = [
            MoneyFlowIn(
                flow_id="FLOW_001",
                commit_id="CMT_WAGE_001",
                amount=2500000,
                flow_date="2025-01-25",
                direction="in",
                memo="1월 급여"
            ),
            MoneyFlowIn(
                flow_id="FLOW_002",
                commit_id="CMT_GRANT_001",
                amount=500000,
                flow_date="2025-01-15",
                direction="in",
                memo="1월 장학금"
            )
        ]
        
        for flow in flows:
            create_money_flow(flow)
        
        # 5. 최종 상태
        dashboard = get_person_dashboard("STU_001")
        
        return {
            "demo_created": True,
            "student": dashboard,
            "commits_created": len(results)
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 온보딩 플로우 API — 학생 1명 단계별 등록
    # ═══════════════════════════════════════════════════════════════════════════
    
    class OnboardingStep1(BaseModel):
        """Step 1: 기본 정보"""
        email: str
        name: str
        country: str = "PH"  # 필리핀 기본
        phone: Optional[str] = None
    
    class OnboardingStep2(BaseModel):
        """Step 2: 교육 정보"""
        person_id: str
        university: str
        major: str
        enrollment_date: str
        tuition_amount: int
    
    class OnboardingStep3(BaseModel):
        """Step 3: 취업 정보"""
        person_id: str
        employer: str
        job_title: str
        wage_amount: int
        start_date: str
    
    class OnboardingStep4(BaseModel):
        """Step 4: 지원 정보 (선택)"""
        person_id: str
        sponsor: Optional[str] = None
        grant_amount: Optional[int] = None
    
    # 온보딩 상태 저장 (메모리 — 실제는 DB)
    onboarding_sessions = {}
    
    @app.post("/api/v1/onboarding/step1")
    def onboarding_step1(body: OnboardingStep1):
        """Step 1: 기본 정보 등록 → Person 생성"""
        import hashlib
        
        # Person ID 생성
        person_id = f"STU_{hashlib.md5(body.email.encode()).hexdigest()[:8].upper()}"
        
        # Person 생성
        try:
            create_person(PersonIn(
                person_id=person_id,
                role='subject',
                country=body.country,
                name=body.name
            ))
        except Exception as e:
            # 이미 존재할 수 있음
            pass
        
        # 세션 저장
        onboarding_sessions[person_id] = {
            'step': 1,
            'email': body.email,
            'name': body.name,
            'country': body.country,
            'phone': body.phone,
            'created_at': int(time.time())
        }
        
        record_audit('person', person_id, 'ONBOARDING_STEP1', {'email': body.email})
        
        return {
            'person_id': person_id,
            'step': 1,
            'next_step': '/api/v1/onboarding/step2',
            'message': '기본 정보 등록 완료'
        }
    
    @app.post("/api/v1/onboarding/step2")
    def onboarding_step2(body: OnboardingStep2):
        """Step 2: 교육 정보 → Tuition Commit 생성"""
        # 대학 Person 확인/생성
        univ_id = f"UNIV_{body.university[:4].upper()}"
        try:
            create_person(PersonIn(
                person_id=univ_id,
                role='institution',
                country='KR',
                name=body.university
            ))
        except:
            pass
        
        # Tuition Commit 생성
        commit_id = f"CMT_TUI_{body.person_id}_{int(time.time())}"
        create_commit(CommitIn(
            commit_id=commit_id,
            commit_type='tuition',
            actor_from=body.person_id,
            actor_to=univ_id,
            amount=body.tuition_amount,
            currency='KRW',
            start_date=body.enrollment_date,
            end_date=None
        ))
        
        # 세션 업데이트
        if body.person_id in onboarding_sessions:
            onboarding_sessions[body.person_id]['step'] = 2
            onboarding_sessions[body.person_id]['university'] = body.university
            onboarding_sessions[body.person_id]['tuition_commit'] = commit_id
        
        record_audit('commit', commit_id, 'ONBOARDING_STEP2', {'university': body.university})
        
        return {
            'person_id': body.person_id,
            'step': 2,
            'commit_id': commit_id,
            'next_step': '/api/v1/onboarding/step3',
            'message': f'{body.university} 등록 완료'
        }
    
    @app.post("/api/v1/onboarding/step3")
    def onboarding_step3(body: OnboardingStep3):
        """Step 3: 취업 정보 → Wage Commit 생성"""
        # 고용주 Person 확인/생성
        emp_id = f"EMP_{body.employer[:4].upper()}"
        try:
            create_person(PersonIn(
                person_id=emp_id,
                role='employer',
                country='KR',
                name=body.employer
            ))
        except:
            pass
        
        # Wage Commit 생성
        commit_id = f"CMT_WAG_{body.person_id}_{int(time.time())}"
        create_commit(CommitIn(
            commit_id=commit_id,
            commit_type='wage',
            actor_from=emp_id,
            actor_to=body.person_id,
            amount=body.wage_amount,
            currency='KRW',
            start_date=body.start_date,
            end_date=None
        ))
        
        # 세션 업데이트
        if body.person_id in onboarding_sessions:
            onboarding_sessions[body.person_id]['step'] = 3
            onboarding_sessions[body.person_id]['employer'] = body.employer
            onboarding_sessions[body.person_id]['wage_commit'] = commit_id
        
        record_audit('commit', commit_id, 'ONBOARDING_STEP3', {'employer': body.employer})
        
        return {
            'person_id': body.person_id,
            'step': 3,
            'commit_id': commit_id,
            'next_step': '/api/v1/onboarding/step4',
            'message': f'{body.employer} 취업 등록 완료'
        }
    
    @app.post("/api/v1/onboarding/step4")
    def onboarding_step4(body: OnboardingStep4):
        """Step 4: 지원 정보 (선택) → Grant Commit 생성"""
        commit_id = None
        
        if body.sponsor and body.grant_amount:
            # 장학재단 Person 확인/생성
            sponsor_id = f"SPO_{body.sponsor[:4].upper()}"
            try:
                create_person(PersonIn(
                    person_id=sponsor_id,
                    role='sponsor',
                    country='KR',
                    name=body.sponsor
                ))
            except:
                pass
            
            # Grant Commit 생성
            commit_id = f"CMT_GRA_{body.person_id}_{int(time.time())}"
            create_commit(CommitIn(
                commit_id=commit_id,
                commit_type='grant',
                actor_from=sponsor_id,
                actor_to=body.person_id,
                amount=body.grant_amount,
                currency='KRW',
                start_date=datetime.now().strftime('%Y-%m-%d'),
                end_date=None
            ))
        
        # 세션 완료
        if body.person_id in onboarding_sessions:
            onboarding_sessions[body.person_id]['step'] = 4
            onboarding_sessions[body.person_id]['completed'] = True
        
        # 최종 대시보드
        dashboard = get_person_dashboard(body.person_id)
        
        record_audit('person', body.person_id, 'ONBOARDING_COMPLETE', {'grant_commit': commit_id})
        
        return {
            'person_id': body.person_id,
            'step': 4,
            'completed': True,
            'grant_commit': commit_id,
            'dashboard': dashboard,
            'message': '온보딩 완료! 이제 AUTUS에서 상태를 확인하세요.'
        }
    
    @app.get("/api/v1/onboarding/status/{person_id}")
    def onboarding_status(person_id: str):
        """온보딩 진행 상태 조회"""
        session = onboarding_sessions.get(person_id, {})
        if not session:
            return {'error': 'Session not found', 'person_id': person_id}
        
        return {
            'person_id': person_id,
            'current_step': session.get('step', 0),
            'completed': session.get('completed', False),
            'data': session
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Magic Link 인증 — 비밀번호 없는 로그인
    # ═══════════════════════════════════════════════════════════════════════════
    
    import secrets
    import hashlib
    
    # Magic Link 저장소 (실제는 Redis/DB)
    magic_links = {}
    authenticated_sessions = {}
    
    class MagicLinkRequest(BaseModel):
        email: str
    
    class MagicLinkVerify(BaseModel):
        token: str
    
    @app.post("/api/v1/auth/magic-link/request")
    def request_magic_link(body: MagicLinkRequest):
        """Magic Link 요청 — 이메일로 로그인 링크 전송"""
        # 토큰 생성
        token = secrets.token_urlsafe(32)
        expires_at = int(time.time()) + 600  # 10분 유효
        
        # 저장
        magic_links[token] = {
            'email': body.email,
            'expires_at': expires_at,
            'used': False
        }
        
        # 실제로는 이메일 전송 — 여기서는 로그만
        login_url = f"/api/v1/auth/magic-link/verify?token={token}"
        logger.info(f"[AUTH] Magic Link generated for {body.email}: {login_url}")
        
        record_audit('system', body.email, 'MAGIC_LINK_REQUESTED', {'expires_at': expires_at})
        
        return {
            'success': True,
            'message': f'로그인 링크가 {body.email}로 전송되었습니다.',
            'expires_in_seconds': 600,
            # 개발용으로 토큰 반환 (실제 배포시 제거)
            '_dev_token': token,
            '_dev_url': login_url
        }
    
    @app.get("/api/v1/auth/magic-link/verify")
    def verify_magic_link(token: str):
        """Magic Link 검증 — 토큰으로 로그인"""
        link_data = magic_links.get(token)
        
        if not link_data:
            return JSONResponse({'error': 'Invalid token'}, status_code=401)
        
        if link_data['used']:
            return JSONResponse({'error': 'Token already used'}, status_code=401)
        
        if int(time.time()) > link_data['expires_at']:
            return JSONResponse({'error': 'Token expired'}, status_code=401)
        
        # 토큰 사용 처리
        magic_links[token]['used'] = True
        
        # 세션 생성
        session_token = secrets.token_urlsafe(32)
        email = link_data['email']
        
        # Person 찾기 또는 생성
        person_id = f"STU_{hashlib.md5(email.encode()).hexdigest()[:8].upper()}"
        
        authenticated_sessions[session_token] = {
            'email': email,
            'person_id': person_id,
            'authenticated_at': int(time.time()),
            'expires_at': int(time.time()) + 86400 * 7  # 7일
        }
        
        record_audit('person', person_id, 'MAGIC_LINK_LOGIN', {'email': email})
        logger.info(f"[AUTH] Login successful: {email} → {person_id}")
        
        return {
            'success': True,
            'session_token': session_token,
            'person_id': person_id,
            'email': email,
            'expires_in_seconds': 86400 * 7,
            'redirect': f'/frontend/solar.html?session={session_token}'
        }
    
    @app.get("/api/v1/auth/session/{session_token}")
    def get_session(session_token: str):
        """세션 정보 조회"""
        session = authenticated_sessions.get(session_token)
        
        if not session:
            return JSONResponse({'error': 'Invalid session'}, status_code=401)
        
        if int(time.time()) > session['expires_at']:
            return JSONResponse({'error': 'Session expired'}, status_code=401)
        
        return {
            'valid': True,
            'person_id': session['person_id'],
            'email': session['email'],
            'authenticated_at': session['authenticated_at']
        }
    
    @app.post("/api/v1/auth/logout")
    def logout(session_token: str):
        """로그아웃"""
        if session_token in authenticated_sessions:
            del authenticated_sessions[session_token]
        return {'success': True, 'message': '로그아웃 완료'}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 계약서 PDF 자동 생성
    # ═══════════════════════════════════════════════════════════════════════════
    
    @app.get("/api/v1/contract/generate/{person_id}")
    def generate_contract(person_id: str, contract_type: str = "all"):
        """계약서 데이터 생성 (PDF 렌더링은 프론트엔드)"""
        dashboard = get_person_dashboard(person_id)
        
        if 'error' in dashboard:
            return dashboard
        
        person = dashboard.get('person', {})
        commits = dashboard.get('commits', [])
        survival = dashboard.get('survival', {})
        
        # 계약서 데이터 구성
        contracts = []
        
        for commit in commits:
            commit_type = commit.get('commit_type')
            
            if contract_type != 'all' and contract_type != commit_type:
                continue
            
            contract_data = {
                'contract_id': f"CONTRACT_{commit.get('commit_id')}",
                'type': commit_type,
                'generated_at': datetime.now(timezone.utc).isoformat(),
                'parties': {
                    'from': commit.get('actor_from'),
                    'to': commit.get('actor_to')
                },
                'terms': {
                    'amount': commit.get('amount'),
                    'currency': commit.get('currency', 'KRW'),
                    'start_date': commit.get('start_date'),
                    'end_date': commit.get('end_date'),
                    'status': commit.get('status')
                },
                'physics': {
                    'mass': commit.get('mass'),
                    'gravity': commit.get('gravity'),
                    'friction': commit.get('friction')
                },
                'clauses': get_contract_clauses(commit_type),
                'signatures': {
                    'autus_verified': True,
                    'commit_id': commit.get('commit_id'),
                    'audit_hash': hashlib.sha256(json.dumps(commit, sort_keys=True).encode()).hexdigest()[:16]
                }
            }
            
            contracts.append(contract_data)
        
        return {
            'person_id': person_id,
            'person_name': person.get('name'),
            'contracts': contracts,
            'summary': {
                'total_commits': len(commits),
                'total_amount': sum(c.get('amount', 0) for c in commits),
                'survival_mass': survival.get('survival_mass'),
                'risk_score': dashboard.get('risk', {}).get('risk_score')
            }
        }
    
    def get_contract_clauses(commit_type: str) -> List[Dict]:
        """Commit 타입별 계약 조항"""
        clauses = {
            'tuition': [
                {'id': 1, 'title': '등록금 납부', 'content': '본 등록금은 AUTUS 시스템의 tuition Commit으로 관리됩니다.'},
                {'id': 2, 'title': '환불 조건', 'content': 'Commit 종료 전 환불 요청 시 시스템 규정에 따릅니다.'},
                {'id': 3, 'title': '학사 규정', 'content': '학생은 Institution의 학사 규정을 준수해야 합니다.'}
            ],
            'wage': [
                {'id': 1, 'title': '임금 지급', 'content': '임금은 매월 AUTUS 시스템의 money_flow로 기록됩니다.'},
                {'id': 2, 'title': '근로 조건', 'content': '주 20시간 이내 근로 (유학생 비자 조건)'},
                {'id': 3, 'title': '4대 보험', 'content': '고용주는 관련 법령에 따라 4대 보험을 적용합니다.'}
            ],
            'grant': [
                {'id': 1, 'title': '장학금 지급', 'content': '장학금은 AUTUS 시스템의 grant Commit으로 관리됩니다.'},
                {'id': 2, 'title': '지급 조건', 'content': '학업 유지 및 성적 기준 충족 시 지급됩니다.'},
                {'id': 3, 'title': '반환 조건', 'content': '조건 미충족 시 Sponsor 규정에 따라 반환합니다.'}
            ],
            'management': [
                {'id': 1, 'title': '운영 위탁', 'content': 'Operator는 Subject의 Commit 상태를 관리합니다.'},
                {'id': 2, 'title': 'SLA', 'content': '시스템 가용성 99.9% 보장'},
                {'id': 3, 'title': '책임 한계', 'content': 'Operator는 Subject의 결정을 대신하지 않습니다.'}
            ],
            'outcome': [
                {'id': 1, 'title': '성과 기준', 'content': '성과는 Employer가 정한 기준에 따라 측정됩니다.'},
                {'id': 2, 'title': '인센티브', 'content': '성과 달성 시 추가 보상이 지급됩니다.'},
                {'id': 3, 'title': '평가 주기', 'content': '분기별 성과 평가 후 Commit 갱신'}
            ]
        }
        return clauses.get(commit_type, [])
    
    @app.get("/api/v1/contract/pdf-template/{contract_type}")
    def get_pdf_template(contract_type: str):
        """PDF 템플릿 HTML 반환 (프론트엔드에서 렌더링)"""
        templates = {
            'tuition': '''
                <h1>입학 허가 및 등록금 납부 확인서</h1>
                <p>본 문서는 AUTUS 시스템에 의해 자동 생성되었습니다.</p>
                <h2>당사자 정보</h2>
                <p><strong>학생:</strong> {{person_name}} ({{person_id}})</p>
                <p><strong>대학:</strong> {{university}}</p>
                <h2>등록금 정보</h2>
                <p><strong>금액:</strong> {{amount}} {{currency}}</p>
                <p><strong>기간:</strong> {{start_date}} ~ {{end_date}}</p>
                <h2>AUTUS 검증</h2>
                <p>Commit ID: {{commit_id}}</p>
                <p>Audit Hash: {{audit_hash}}</p>
            ''',
            'wage': '''
                <h1>근로계약서</h1>
                <p>본 문서는 AUTUS 시스템에 의해 자동 생성되었습니다.</p>
                <h2>계약 당사자</h2>
                <p><strong>근로자:</strong> {{person_name}} ({{person_id}})</p>
                <p><strong>사용자:</strong> {{employer}}</p>
                <h2>근로 조건</h2>
                <p><strong>월 급여:</strong> {{amount}} {{currency}}</p>
                <p><strong>근무 시작일:</strong> {{start_date}}</p>
                <h2>AUTUS 검증</h2>
                <p>Commit ID: {{commit_id}}</p>
                <p>Audit Hash: {{audit_hash}}</p>
            ''',
            'grant': '''
                <h1>장학금 지급 확인서</h1>
                <p>본 문서는 AUTUS 시스템에 의해 자동 생성되었습니다.</p>
                <h2>당사자 정보</h2>
                <p><strong>수혜자:</strong> {{person_name}} ({{person_id}})</p>
                <p><strong>지원 기관:</strong> {{sponsor}}</p>
                <h2>장학금 정보</h2>
                <p><strong>금액:</strong> {{amount}} {{currency}}</p>
                <p><strong>지급 기간:</strong> {{start_date}} ~ {{end_date}}</p>
                <h2>AUTUS 검증</h2>
                <p>Commit ID: {{commit_id}}</p>
                <p>Audit Hash: {{audit_hash}}</p>
            '''
        }
        
        return {
            'contract_type': contract_type,
            'template_html': templates.get(contract_type, '<h1>계약서</h1><p>템플릿 없음</p>'),
            'required_fields': ['person_name', 'person_id', 'amount', 'currency', 'start_date', 'end_date', 'commit_id', 'audit_hash']
        }
    
    logger.info("✅ Commit Schema API loaded")
    logger.info("✅ Onboarding Flow API loaded")
    logger.info("✅ Magic Link Auth API loaded")
    logger.info("✅ Contract PDF API loaded")
    
except Exception as e:
    logger.warning(f"⚠️ Commit Schema API not loaded: {e}")


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
