"""
Lime Kernel v2.0 - Enhanced Vector Engine
"""

from dataclasses import dataclass
from typing import Dict, Optional
from datetime import datetime
import math

AXES = ["DIR", "FOR", "GAP", "UNC", "TEM", "INT"]

CALIBRATED_MATRIX = {
    "HUM": {"DIR": 0.15, "FOR": 0.25, "GAP": -0.10, "UNC": -0.15, "TEM": 0.10, "INT": 0.20},
    "EDU": {"DIR": 0.20, "FOR": 0.15, "GAP": -0.25, "UNC": -0.20, "TEM": 0.15, "INT": 0.25},
    "EMP": {"DIR": 0.25, "FOR": 0.30, "GAP": -0.20, "UNC": -0.15, "TEM": 0.10, "INT": 0.30},
    "GOV": {"DIR": 0.30, "FOR": 0.20, "GAP": -0.15, "UNC": -0.30, "TEM": 0.20, "INT": 0.25},
    "FIN": {"DIR": 0.20, "FOR": 0.35, "GAP": -0.30, "UNC": -0.25, "TEM": 0.15, "INT": 0.20},
    "SOC": {"DIR": 0.15, "FOR": 0.20, "GAP": -0.15, "UNC": -0.20, "TEM": 0.25, "INT": 0.35},
}

CROSS_AXIS_CORRELATIONS = {
    "DIR": {"FOR": 0.15, "UNC": -0.20, "INT": 0.10},
    "FOR": {"DIR": 0.10, "GAP": -0.15, "TEM": 0.05},
    "GAP": {"UNC": 0.25, "INT": -0.20, "FOR": -0.10},
    "UNC": {"DIR": -0.15, "INT": -0.25, "TEM": -0.10},
    "TEM": {"FOR": 0.10, "INT": 0.15},
    "INT": {"UNC": -0.20, "GAP": -0.15, "DIR": 0.10},
}

TEMPORAL_CONFIG = {
    "decay_threshold_days": 14,
    "decay_rates": {"FOR": -0.137, "UNC": 0.084, "TEM": -0.05},
    "max_decay_days": 60,
}

@dataclass
class VectorUpdate:
    old_vector: Dict[str, float]
    new_vector: Dict[str, float]
    delta: Dict[str, float]
    cross_effects: Dict[str, float]
    temporal_decay: Dict[str, float]
    source: str
    event_code: str
    timestamp: str

@dataclass
class SettlementCheck:
    score: float
    settled: bool
    criteria: Dict[str, bool]
    message: str

class EnhancedVectorEngine:
    def __init__(self, country: str = "KR", industry: str = "general"):
        self.country = country
        self.industry = industry
        self.alpha = {"KR": 1.0, "PH": 0.95, "VN": 0.90}.get(country, 0.85)
        self.beta = {"education": 1.10, "manufacturing": 1.05}.get(industry, 1.00)
    
    def apply_event(self, current_vector: Dict[str, float], source: str, 
                    event_delta: Dict[str, float], days_since_last: int = 0,
                    event_code: str = "UNKNOWN") -> VectorUpdate:
        old_vector = current_vector.copy()
        new_vector = current_vector.copy()
        temporal_decay = self._apply_temporal_decay(new_vector, days_since_last)
        source_weights = CALIBRATED_MATRIX.get(source, CALIBRATED_MATRIX["HUM"])
        direct_delta = {}
        for axis, delta in event_delta.items():
            if axis in AXES:
                weighted_delta = delta * source_weights.get(axis, 1.0) * self.alpha * self.beta
                direct_delta[axis] = weighted_delta
                new_vector[axis] = self._clamp(new_vector[axis] + weighted_delta)
        cross_effects = self._apply_cross_correlations(direct_delta, new_vector)
        for axis in AXES:
            new_vector[axis] = self._clamp(new_vector.get(axis, 0.5))
        total_delta = {axis: new_vector[axis] - old_vector[axis] for axis in AXES}
        return VectorUpdate(old_vector, new_vector, total_delta, cross_effects, 
                           temporal_decay, source, event_code, datetime.now().isoformat())
    
    def _apply_temporal_decay(self, vector: Dict[str, float], days: int) -> Dict[str, float]:
        decay = {}
        if days <= TEMPORAL_CONFIG["decay_threshold_days"]:
            return decay
        factor = min(days - 14, 46) / 46
        for axis, rate in TEMPORAL_CONFIG["decay_rates"].items():
            decay[axis] = rate * factor
            vector[axis] = self._clamp(vector[axis] + decay[axis])
        return decay
    
    def _apply_cross_correlations(self, delta: Dict[str, float], vector: Dict[str, float]) -> Dict[str, float]:
        effects = {}
        for src, d in delta.items():
            if src in CROSS_AXIS_CORRELATIONS and abs(d) > 0.01:
                for tgt, corr in CROSS_AXIS_CORRELATIONS[src].items():
                    effects[f"{src}->{tgt}"] = d * corr
                    vector[tgt] = self._clamp(vector[tgt] + d * corr)
        return effects
    
    def _clamp(self, v: float) -> float:
        return max(0.0, min(1.0, v))
    
    def check_settlement(self, vector: Dict[str, float]) -> SettlementCheck:
        criteria = {"DIR>=0.70": vector.get("DIR",0)>=0.70, "GAP<=0.30": vector.get("GAP",1)<=0.30,
                   "UNC<=0.25": vector.get("UNC",1)<=0.25, "INT>=0.75": vector.get("INT",0)>=0.75}
        weights = {"DIR":0.25,"FOR":0.15,"GAP":0.20,"UNC":0.20,"TEM":0.05,"INT":0.15}
        score = sum((1-vector.get(a,0.5) if a in ["GAP","UNC"] else vector.get(a,0.5))*w for a,w in weights.items())
        settled = all(criteria.values())
        msg = "✅ Settled!" if settled else f"⏳ Remaining: {[k for k,v in criteria.items() if not v]}"
        return SettlementCheck(round(score*100,1), settled, criteria, msg)
    
    def create_initial_vector(self, profile: str = "standard") -> Dict[str, float]:
        profiles = {
            "standard": {"DIR":0.30,"FOR":0.40,"GAP":0.70,"UNC":0.60,"TEM":0.50,"INT":0.25},
            "optimistic": {"DIR":0.45,"FOR":0.55,"GAP":0.55,"UNC":0.45,"TEM":0.60,"INT":0.40},
        }
        return profiles.get(profile, profiles["standard"]).copy()
