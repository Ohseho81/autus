from typing import List, Dict, Any
from datetime import datetime

class FeatureEvent:
    def __init__(self, id: int, value: float, ts_norm: float, conf: float):
        self.id = id
        self.value = value
        self.ts_norm = ts_norm
        self.conf = conf

class TrustPassportConnector:
    FEATURE_IDS = {
        "attendance": 0, "grade": 1, "work_hour": 2, "payment": 3,
        "visa_status": 4, "health": 5, "compliance": 6, "violation": 7
    }
    
    def read(self, envelope: Dict) -> Dict:
        return {
            "attendance_rate": 0.92, "gpa": 3.5, "work_hours_week": 20,
            "payment_status": "on_time", "visa_days_left": 180,
            "health_check": "passed", "violations": 0
        }
    
    def extract_features(self, raw: Dict) -> List[FeatureEvent]:
        ts = (datetime.utcnow().timestamp() % 86400) / 86400
        features = []
        if "attendance_rate" in raw:
            features.append(FeatureEvent(0, raw["attendance_rate"], ts, 0.95))
        if "gpa" in raw:
            features.append(FeatureEvent(1, raw["gpa"]/4.0, ts, 0.90))
        if "visa_days_left" in raw:
            features.append(FeatureEvent(4, raw["visa_days_left"]/365, ts, 0.99))
        if "violations" in raw:
            features.append(FeatureEvent(7, max(0, 1-raw["violations"]*0.2), ts, 0.99))
        return features
    
    def compute_trust_score(self, features: List[FeatureEvent]) -> float:
        if not features:
            return 0.5
        total = sum(f.value * f.conf for f in features)
        return round(total / len(features), 4)

trust_passport = TrustPassportConnector()
