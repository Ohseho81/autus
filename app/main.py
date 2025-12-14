import os
import time
import threading
from dataclasses import dataclass, field
from typing import Dict, Optional, Literal, Any, List
from collections import defaultdict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Security Config
AUTUS_API_KEY = os.getenv("AUTUS_API_KEY", "")
RATE_LIMIT_PER_MIN = int(os.getenv("RATE_LIMIT_PER_MIN", "60"))
PROTECTED_PREFIXES = ("/execute", "/event/")
rate_limit_store: Dict[str, List[float]] = defaultdict(list)

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

# State Engine
@dataclass
class SolarState:
    id: str = "SUN_001"
    name: str = "AUTUS Solar"
    tick: int = 0
    cycle: int = 0
    pressure: float = 0.0
    release: float = 0.0
    decision: float = 0.0
    gravity: float = 0.34
    entropy: float = 0.188
    status: Literal["GREEN", "YELLOW", "RED"] = "GREEN"
    bottleneck: Literal["NONE", "DECISION_DELAY", "OVERLOAD", "NO_RELEASE"] = "NONE"
    required_action: Literal["NONE", "DECIDE", "STOP", "REMOVE"] = "NONE"
    failure_in_ticks: Optional[int] = None
    last_updated_epoch: float = field(default_factory=lambda: time.time())
    audit_log: List[Dict[str, Any]] = field(default_factory=list)
    decay_pr: float = 0.92
    decay_d: float = 0.85

class Engine:
    def __init__(self):
        self.state = SolarState()
        self._lock = threading.Lock()
        self._running = False
        self._thread = None
        self._tick_interval = float(os.getenv("TICK_INTERVAL_SEC", "1.0"))

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
            s = self.state
            s.tick += 1
            s.last_updated_epoch = time.time()
            s.pressure *= s.decay_pr
            s.release *= s.decay_pr
            s.decision *= s.decay_d
            imbalance = max(0.0, s.pressure - s.release)
            s.entropy = max(0.0, min(1.0, s.entropy + 0.01*imbalance - 0.008*s.release))
            s.gravity = max(0.0, min(1.0, 0.70*s.gravity + 0.20*min(s.release,3.0)/3.0 + 0.10*min(s.decision,1.0) - 0.15*s.entropy))
            self._derive(s)
            if s.tick % 60 == 0: s.cycle += 1

    def _derive(self, s):
        if s.entropy > 0.55 and s.pressure > s.release + 0.5:
            s.bottleneck, s.required_action = "OVERLOAD", "REMOVE"
        elif s.release < 0.20 and s.pressure > 0.30:
            s.bottleneck, s.required_action = "NO_RELEASE", "REMOVE"
        elif s.decision < 0.15 and s.pressure > 0.40:
            s.bottleneck, s.required_action = "DECISION_DELAY", "DECIDE"
        else:
            s.bottleneck, s.required_action = "NONE", "NONE"
        
        if s.entropy >= 0.70 or (s.gravity <= 0.15 and s.entropy >= 0.55):
            s.status = "RED"
        elif s.entropy >= 0.45 or s.gravity <= 0.30 or s.bottleneck != "NONE":
            s.status = "YELLOW"
        else:
            s.status = "GREEN"
        
        if s.status == "GREEN":
            s.failure_in_ticks = None
        else:
            rate = 0.02 + (0.02 if s.pressure > s.release else 0) + (0.01 if s.decision < 0.2 else 0) + 0.03*s.entropy
            margin = max(0.0, 0.85 - s.entropy)
            ticks = int(max(1, min(60, margin / max(rate, 1e-6))))
            s.failure_in_ticks = min(ticks, 10 if s.status == "RED" else 30)

    def add_work(self, count, weight, actor_id):
        with self._lock:
            self.state.pressure += count * weight
            self._audit("ADD_WORK", {"count": count, "weight": weight}, actor_id)

    def remove_work(self, count, weight, actor_id):
        with self._lock:
            self.state.release += count * weight
            self._audit("REMOVE_WORK", {"count": count, "weight": weight}, actor_id)

    def commit_decision(self, decision, actor_id):
        with self._lock:
            s = self.state
            s.decision = min(1.0, s.decision + (1.0 if decision=="commit" else 0.4 if decision=="hold" else 0.8))
            self._audit("COMMIT_DECISION", {"decision": decision}, actor_id)

    def execute(self, action, actor_id):
        with self._lock:
            s = self.state
            if action == "AUTO_STABILIZE":
                s.release += 1.5
                s.pressure = max(0, s.pressure - 1.0)
                s.decision = min(1.0, s.decision + 0.6)
            elif action == "REMOVE_LOW_IMPACT":
                s.release += 1.0
                s.pressure = max(0, s.pressure - 0.8)
            elif action == "FORCE_DECISION":
                s.decision = min(1.0, s.decision + 1.0)
            self._audit("EXECUTE", {"action": action}, actor_id)

    def _audit(self, event, data, actor_id):
        self.state.audit_log.append({"ts": int(time.time()), "event": event, "actor_id": actor_id or "", "data": data})
        if len(self.state.audit_log) > 1000:
            self.state.audit_log = self.state.audit_log[-500:]

    def snapshot(self):
        with self._lock:
            s = self.state
            return {
                "id": s.id, "name": s.name, "tick": s.tick, "cycle": s.cycle,
                "signals": {"pressure": round(s.pressure,4), "release": round(s.release,4), "decision": round(s.decision,4), "gravity": round(s.gravity,4), "entropy": round(s.entropy,4)},
                "output": {"status": s.status, "bottleneck": s.bottleneck, "required_action": s.required_action, "failure_in_ticks": s.failure_in_ticks},
                "truth": "/status", "ts": int(s.last_updated_epoch)
            }

    def audit_tail(self, n=50):
        with self._lock:
            return self.state.audit_log[-n:]

# App
app = FastAPI(title="AUTUS", version="1.0")
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
    print(f"✅ AUTUS Started | API Key: {'ON' if AUTUS_API_KEY else 'OFF'}")

@app.get("/")
def root():
    return {"status": "AUTUS v1.0", "security": bool(AUTUS_API_KEY)}

@app.get("/health")
def health():
    return {"ok": True, "security": bool(AUTUS_API_KEY)}

@app.get("/status")
def status():
    return ENGINE.snapshot()

@app.get("/autus/solar/status")
def solar_status():
    return ENGINE.snapshot()

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
