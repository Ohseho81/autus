"""AUTUS Storage Manager v1.0"""
import os, json, yaml
from datetime import datetime, date
from pathlib import Path
from typing import Dict, List, Optional

AUTUS_DIR = Path.home() / ".autus"

class StorageManager:
    def __init__(self):
        self.base = AUTUS_DIR
        self._ensure_dirs()
    
    def _ensure_dirs(self):
        for d in ["raw", "states/hourly", "states/daily", "interpretations", "predictions", "failures", "tuning"]:
            (self.base / d).mkdir(parents=True, exist_ok=True)
    
    def load_config(self) -> Dict:
        p = self.base / "config.yaml"
        return yaml.safe_load(open(p)) if p.exists() else {}
    
    def append_event(self, event: Dict):
        p = self.base / "raw" / f"{date.today().isoformat()}.jsonl"
        event["ts"] = datetime.utcnow().isoformat() + "Z"
        open(p, "a").write(json.dumps(event) + "\n")
    
    def load_events(self, d=None) -> List[Dict]:
        d = d or date.today().isoformat()
        p = self.base / "raw" / f"{d}.jsonl"
        return [json.loads(l) for l in open(p)] if p.exists() else []
    
    def save_state(self, state: Dict, interval="hourly"):
        now = datetime.utcnow()
        fn = now.strftime("%Y-%m-%d_%H.json") if interval == "hourly" else now.strftime("%Y-%m-%d.json")
        state["saved_at"] = now.isoformat() + "Z"
        json.dump(state, open(self.base / "states" / interval / fn, "w"), indent=2)
    
    def append_failure(self, f: Dict):
        f["ts"] = datetime.utcnow().isoformat() + "Z"
        open(self.base / "failures" / "failure_history.jsonl", "a").write(json.dumps(f) + "\n")

storage = StorageManager()

if __name__ == "__main__":
    s = StorageManager()
    print(f"Base: {s.base}")
    s.append_event({"source": "test", "type": "ping"})
    print(f"Events: {len(s.load_events())}")
    s.save_state({"vector": [0.5]*14, "system_state": "STABLE"})
    print("Done!")
