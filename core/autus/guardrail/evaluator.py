from typing import Dict, Any
from enum import Enum
from .config import DEFAULT_CONFIG

class ThreatLevel(str, Enum):
    NONE = "none"
    WARNING = "warning"
    DANGER = "danger"
    CRITICAL = "critical"

class GuardrailEvaluator:
    def __init__(self, config=None):
        self.config = config or DEFAULT_CONFIG
    
    def evaluate(self, pressure: float, slots: Dict[str, float]) -> Dict[str, Any]:
        base = slots.get("Base", 0.5)
        threats = []
        level = ThreatLevel.NONE
        
        if pressure >= self.config.pressure_critical:
            threats.append({"type": "PRESSURE_CRITICAL", "value": pressure})
            level = ThreatLevel.CRITICAL
        elif pressure >= self.config.pressure_high:
            threats.append({"type": "PRESSURE_HIGH", "value": pressure})
            level = ThreatLevel.WARNING
        
        if base <= self.config.base_critical:
            threats.append({"type": "BASE_CRITICAL", "value": base})
            level = ThreatLevel.CRITICAL
        elif base <= self.config.base_low:
            threats.append({"type": "BASE_LOW", "value": base})
            level = ThreatLevel.DANGER if level != ThreatLevel.CRITICAL else level
        
        if pressure >= self.config.pressure_high and base <= self.config.base_low:
            threats.append({"type": "COMPOUND_COLLAPSE_RISK"})
            level = ThreatLevel.CRITICAL
        
        return {
            "level": level.value,
            "threats": threats,
            "requires_action": level in [ThreatLevel.DANGER, ThreatLevel.CRITICAL]
        }
