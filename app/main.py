import os
import time
import threading
from dataclasses import dataclass, field
from typing import Dict, Optional, Literal, Any, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


# -------------------------
# Models (API)
# -------------------------
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


# -------------------------
# State Engine (v1)
# -------------------------
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
    def __init__(self) -> None:
        self.state = SolarState()
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._tick_interval_sec = float(os.getenv("TICK_INTERVAL_SEC", "1.0"))

    def start(self) -> None:
        with self._lock:
            if self._running:
                return
            self._running = True
            self._thread = threading.Thread(target=self._run_loop, daemon=True)
            self._thread.start()

    def stop(self) -> None:
        with self._lock:
            self._running = False

    def _run_loop(self) -> None:
        while True:
            with self._lock:
                if not self._running:
                    break
            self.tick()
            time.sleep(self._tick_interval_sec)

    def tick(self) -> None:
        with self._lock:
            s = self.state
            s.tick += 1
            s.last_updated_epoch = time.time()
            s.pressure *= s.decay_pr
            s.release *= s.decay_pr
            s.decision *= s.decay_d
            imbalance = max(0.0, s.pressure - s.release)
            s.entropy = self._clamp(s.entropy + 0.01 * imbalance - 0.008 * s.release, 0.0, 1.0)
            s.gravity = self._clamp(
                0.70 * s.gravity + 0.20 * self._clamp(s.release, 0.0, 3.0) / 3.0 + 0.10 * self._clamp(s.decision, 0.0, 1.0) - 0.15 * s.entropy,
                0.0, 1.0
            )
            self._derive_controls(s)
            s.failure_in_ticks = self._estimate_failure_ticks(s)
            if s.tick % 60 == 0:
                s.cycle += 1

    def add_work(self, count: int, weight: float, actor_id: Optional[str]) -> None:
        with self._lock:
            s = self.state
            s.pressure += float(count) * float(weight)
            s.audit_log.append(self._log("ADD_WORK", {"count": count, "weight": weight}, actor_id))

    def remove_work(self, count: int, weight: float, actor_id: Optional[str]) -> None:
        with self._lock:
            s = self.state
            s.release += float(count) * float(weight)
            s.audit_log.append(self._log("REMOVE_WORK", {"count": count, "weight": weight}, actor_id))

    def commit_decision(self, decision: str, actor_id: Optional[str]) -> None:
        with self._lock:
            s = self.state
            if decision == "commit":
                s.decision = self._clamp(s.decision + 1.0, 0.0, 1.0)
            elif decision == "hold":
                s.decision = self._clamp(s.decision + 0.4, 0.0, 1.0)
            elif decision == "stop":
                s.decision = self._clamp(s.decision + 0.8, 0.0, 1.0)
            s.audit_log.append(self._log("COMMIT_DECISION", {"decision": decision}, actor_id))

    def execute(self, action: str, actor_id: Optional[str]) -> None:
        with self._lock:
            s = self.state
            if action == "AUTO_STABILIZE":
                s.release += 1.5
                s.pressure = max(0.0, s.pressure - 1.0)
                s.decision = self._clamp(s.decision + 0.6, 0.0, 1.0)
            elif action == "REMOVE_LOW_IMPACT":
                s.release += 1.0
                s.pressure = max(0.0, s.pressure - 0.8)
            elif action == "FORCE_DECISION":
                s.decision = self._clamp(s.decision + 1.0, 0.0, 1.0)
            s.audit_log.append(self._log("EXECUTE", {"action": action}, actor_id))

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            s = self.state
            return {
                "id": s.id,
                "name": s.name,
                "tick": s.tick,
                "cycle": s.cycle,
                "signals": {
                    "pressure": round(s.pressure, 4),
                    "release": round(s.release, 4),
                    "decision": round(s.decision, 4),
                    "gravity": round(s.gravity, 4),
                    "entropy": round(s.entropy, 4),
                },
                "output": {
                    "status": s.status,
                    "bottleneck": s.bottleneck,
                    "required_action": s.required_action,
                    "failure_in_ticks": s.failure_in_ticks,
                },
                "truth": "/status",
                "ts": int(s.last_updated_epoch),
            }

    def audit_tail(self, n: int = 50) -> List[Dict[str, Any]]:
        with self._lock:
            return self.state.audit_log[-n:]

    @staticmethod
    def _clamp(x: float, lo: float, hi: float) -> float:
        return max(lo, min(hi, x))

    @staticmethod
    def _log(event: str, data: Dict[str, Any], actor_id: Optional[str]) -> Dict[str, Any]:
        return {"ts": int(time.time()), "event": event, "actor_id": actor_id or "", "data": data}

    def _derive_controls(self, s: SolarState) -> None:
        if s.entropy > 0.55 and s.pressure > s.release + 0.5:
            s.bottleneck = "OVERLOAD"
            s.required_action = "REMOVE"
        elif s.release < 0.20 and s.pressure > 0.30:
            s.bottleneck = "NO_RELEASE"
            s.required_action = "REMOVE"
        elif s.decision < 0.15 and s.pressure > 0.40:
            s.bottleneck = "DECISION_DELAY"
            s.required_action = "DECIDE"
        else:
            s.bottleneck = "NONE"
            s.required_action = "NONE"

        if s.entropy >= 0.70 or (s.gravity <= 0.15 and s.entropy >= 0.55):
            s.status = "RED"
        elif s.entropy >= 0.45 or s.gravity <= 0.30 or s.bottleneck != "NONE":
            s.status = "YELLOW"
        else:
            s.status = "GREEN"

    def _estimate_failure_ticks(self, s: SolarState) -> Optional[int]:
        if s.status == "GREEN":
            return None
        rate = 0.02
        if s.pressure > s.release:
            rate += 0.02
        if s.decision < 0.2:
            rate += 0.01
        rate += 0.03 * s.entropy
        margin = max(0.0, 0.85 - s.entropy)
        ticks = int(max(1.0, min(60.0, margin / max(rate, 1e-6))))
        return min(ticks, 10) if s.status == "RED" else min(ticks, 30)


# -------------------------
# FastAPI App
# -------------------------
app = FastAPI(title="AUTUS Solar", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ENGINE = Engine()

@app.on_event("startup")
def _startup() -> None:
    ENGINE.start()

@app.get("/")
def root():
    return {"status": "AUTUS v1.0", "endpoints": ["/health", "/status", "/autus/solar/status", "/event/*", "/execute", "/audit"]}

@app.get("/health")
def health() -> Dict[str, bool]:
    return {"ok": True}

@app.get("/status")
def status_root() -> Dict[str, Any]:
    return ENGINE.snapshot()

@app.get("/autus/solar/status")
def status_alias() -> Dict[str, Any]:
    return ENGINE.snapshot()

@app.post("/event/add_work")
def event_add_work(body: AddWorkIn) -> Dict[str, Any]:
    ENGINE.add_work(count=body.count, weight=body.weight, actor_id=body.actor_id)
    return {"ok": True, "status": ENGINE.snapshot()}

@app.post("/event/remove_work")
def event_remove_work(body: RemoveWorkIn) -> Dict[str, Any]:
    ENGINE.remove_work(count=body.count, weight=body.weight, actor_id=body.actor_id)
    return {"ok": True, "status": ENGINE.snapshot()}

@app.post("/event/commit_decision")
def event_commit_decision(body: CommitDecisionIn) -> Dict[str, Any]:
    ENGINE.commit_decision(decision=body.decision, actor_id=body.actor_id)
    return {"ok": True, "status": ENGINE.snapshot()}

@app.post("/execute")
def execute(body: ExecuteIn) -> Dict[str, Any]:
    ENGINE.execute(action=body.action, actor_id=body.actor_id)
    return {"ok": True, "status": ENGINE.snapshot()}

@app.get("/audit")
def audit(n: int = 50) -> Dict[str, Any]:
    n = max(1, min(200, int(n)))
    return {"count": n, "tail": ENGINE.audit_tail(n=n)}

@app.get("/routes")
def routes() -> Dict[str, Any]:
    out = []
    for r in app.router.routes:
        methods = sorted(list(getattr(r, "methods", []) or []))
        path = getattr(r, "path", "")
        name = getattr(r, "name", "")
        if path:
            out.append({"path": path, "methods": methods, "name": name})
    return {"count": len(out), "routes": out}

# Frontend
frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_path):
    app.mount("/frontend", StaticFiles(directory=frontend_path, html=True), name="frontend")

print("✅ AUTUS State Engine v1 Ready")
