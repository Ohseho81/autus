#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "AUTUS init at: $ROOT_DIR"

# 1) 기본 디렉토리
mkdir -p \
  "$ROOT_DIR/core" \
  "$ROOT_DIR/protocols" \
  "$ROOT_DIR/packs" \
  "$ROOT_DIR/server" \
  "$ROOT_DIR/server/routes" \
  "$ROOT_DIR/scripts" \
  "$ROOT_DIR/tests"

touch "$ROOT_DIR/core/__init__.py"
touch "$ROOT_DIR/protocols/__init__.py"
touch "$ROOT_DIR/packs/__init__.py"
touch "$ROOT_DIR/server/__init__.py"
touch "$ROOT_DIR/server/routes/__init__.py"
touch "$ROOT_DIR/scripts/__init__.py"

# 2) core 최소 파일
create_if_missing() {
  local path="$1"
  local content="$2"
  if [ ! -f "$path" ]; then
    echo "  [+] create $path"
    printf '%s\n' "$content" > "$path"
  else
    echo "  [=] keep   $path"
  fi
}

create_if_missing "$ROOT_DIR/core/runtime_kernel.py" \
'class RuntimeKernel:
    def __init__(self) -> None:
        self.initialized = False

    def initialize(self) -> None:
        self.initialized = True

    def status(self) -> dict:
        return {"runtime": "ok", "initialized": self.initialized}
'

create_if_missing "$ROOT_DIR/core/loop_engine.py" \
'class LoopEngine:
    def run_per(self, data: dict) -> dict:
        return {"stage": "PER", "input": data}

    def run_spg(self, data: dict) -> dict:
        return {"stage": "SPG", "input": data}

    def run_fact(self, data: dict) -> dict:
        return {"stage": "FACT", "input": data}

    def run_trust(self, data: dict) -> dict:
        return {"stage": "TRUST", "input": data}
'

create_if_missing "$ROOT_DIR/core/security_kernel.py" \
'class SecurityKernel:
    PII_KEYS = {"name", "email", "phone", "address"}

    def enforce(self, payload: dict) -> None:
        if not isinstance(payload, dict):
            return
        keys = set(payload.keys())
        if self.PII_KEYS & keys:
            raise ValueError("PII detected in payload")
'

create_if_missing "$ROOT_DIR/core/memory_kernel.py" \
'class MemoryKernel:
    def __init__(self) -> None:
        self._store = {}

    def store(self, key: str, value) -> None:
        self._store[key] = value

    def search(self, query: str):
        return {k: v for k, v in self._store.items() if query in k}

    def export(self) -> dict:
        return dict(self._store)
'

create_if_missing "$ROOT_DIR/core/workflow_kernel.py" \
'class WorkflowKernel:
    def validate(self, workflow: dict) -> bool:
        return isinstance(workflow, dict) and "nodes" in workflow

    def execute(self, workflow: dict) -> dict:
        if not self.validate(workflow):
            raise ValueError("Invalid workflow")
        return {"status": "executed", "workflow": workflow}
'

create_if_missing "$ROOT_DIR/core/device_bridge_core.py" \
'class DeviceBridgeCore:
    def send_to_device(self, device_id: str, payload: dict) -> dict:
        return {"device_id": device_id, "payload": payload}

    def broadcast(self, payload: dict) -> dict:
        return {"broadcast": True, "payload": payload}
'

# 3) protocols
create_if_missing "$ROOT_DIR/protocols/identity_core.py" \
'class IdentityCore:
    def snapshot(self, features: dict) -> dict:
        return {"surface": features}
'

create_if_missing "$ROOT_DIR/protocols/state_3d_protocol.py" \
'class State3DProtocol:
    def build_state(self, packs_state: dict) -> dict:
        return {
            "core": {"status": "ok"},
            "protocols": {"count": 12},
            "packs": packs_state,
        }
'

# 4) server/main.py
create_if_missing "$ROOT_DIR/server/main.py" \
'from fastapi import FastAPI
from server.router_loader import load_all_pack_routes

app = FastAPI(title="AUTUS 3-Sphere OS")

@app.get("/")
def root():
    return {"msg": "AUTUS Core Running"}

load_all_pack_routes(app)
'

# 5) router_loader
create_if_missing "$ROOT_DIR/server/router_loader.py" \
'import importlib
import os
from fastapi import FastAPI

def load_all_pack_routes(app: FastAPI) -> None:
    base = "packs"
    base_path = os.path.join(os.path.dirname(__file__), "..", base)
    base_path = os.path.abspath(base_path)

    if not os.path.isdir(base_path):
        return

    for pack in os.listdir(base_path):
        pack_dir = os.path.join(base_path, pack)
        routes_file = os.path.join(pack_dir, "routes.py")
        if os.path.isfile(routes_file):
            module_path = f"{base}.{pack}.routes"
            try:
                module = importlib.import_module(module_path)
                router = getattr(module, "router", None)
                if router is not None:
                    app.include_router(router)
            except Exception:
                continue
'

# 6) base_pack
create_if_missing "$ROOT_DIR/packs/base_pack.py" \
'class BasePack:
    def __init__(self, payload: dict | None = None) -> None:
        self.payload = payload or {}

    def run(self) -> dict:
        return {"pack": "base", "payload": self.payload}
'

echo "Done. AUTUS init complete."
