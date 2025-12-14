import json
import os
from typing import List, Any

class FeatureEvent:
    def __init__(self, id: int, value: float, ts_norm: float, conf: float):
        self.id = id
        self.value = value
        self.ts_norm = ts_norm
        self.conf = conf

class WorkEventConnector:
    def __init__(self):
        base = os.path.dirname(__file__)
        with open(os.path.join(base, "mapping.json")) as f:
            self.feature_map = json.load(f)
    
    def read(self, envelope) -> Any:
        if hasattr(envelope, "payload"):
            return envelope.payload
        return envelope.get("target", "")
    
    def extract_features(self, raw: Any) -> List[FeatureEvent]:
        if isinstance(raw, str):
            return [FeatureEvent(id=self._map(raw), value=1.0, ts_norm=1.0, conf=0.9)]
        if isinstance(raw, dict):
            etype = raw.get("type", raw.get("event", "UNKNOWN"))
            return [FeatureEvent(
                id=self._map(etype),
                value=min(1.0, max(0.0, float(raw.get("value", 1.0)))),
                ts_norm=1.0,
                conf=0.9
            )]
        return []
    
    def _map(self, event_type: str) -> int:
        return self.feature_map.get(event_type, 999)

WORK_CONNECTOR = WorkEventConnector()
