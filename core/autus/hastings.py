import time
from typing import Dict, Any, List
class HastingsLayer:
    def __init__(self):
        self.history = []
    def inspect(self, parsed_data: Dict[str, Any]) -> Dict[str, Any]:
        raw = parsed_data.get("raw", "")
        if not raw or len(raw) < 2: return {"valid": False, "reason": "NOISE"}
        if parsed_data["ir"]["pressure"] > 0.8:
            if not any(h["type"] == parsed_data["type"] for h in self.history[-5:]):
                return {"valid": True, "warnings": ["SPIKE"]}
        self.history.append({"type": parsed_data["type"], "time": time.time()})
        return {"valid": True, "warnings": []}
