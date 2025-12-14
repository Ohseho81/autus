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
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Config
AUTUS_API_KEY = os.getenv("AUTUS_API_KEY", "")
RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "60"))
DB_PATH = os.getenv("DB_PATH", "/tmp/autus.db")
PROTECTED_PREFIXES = ("/execute", "/event/")
rate_limit_store: Dict[str, List[float]] = defaultdict(list)

# Database
@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

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
            row = conn.execute("SELECT * FROM state WHERE id='SUN_001'").fetchone()
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
            return dict(row) if row else None

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

# Frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/frontend", StaticFiles(directory=frontend_path, html=True), name="frontend")
