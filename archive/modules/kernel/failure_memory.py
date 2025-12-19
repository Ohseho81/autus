import json
import os
from datetime import datetime

AUTUS_DIR = os.path.expanduser("~/.autus")
FAILURE_LOG = os.path.join(AUTUS_DIR, "failure_history.jsonl")

def _ensure_dir():
    os.makedirs(AUTUS_DIR, exist_ok=True)

def record_failure(state, reason="COLLAPSE"):
    _ensure_dir()
    v = state.vector.v

    event = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "reason": reason,
        "system_state": getattr(state, "system_state", "UNKNOWN"),
        "snapshot": {
            "energy": v[0],
            "consistency": v[8],
            "growth": v[9],
            "pressure": v[10],
            "entropy": v[11],
        }
    }

    with open(FAILURE_LOG, "a") as f:
        f.write(json.dumps(event) + "\n")

    return event

