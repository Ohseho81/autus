from typing import Dict

AXIS_WEIGHTS = {
    "A2": 0.2, "A3": 1.0, "A4": 0.5, "A5": 1.0,
    "A6": 0.5, "A7": 0.5, "A8": 0.5, "A9": 1.0
}

SEVERITY_WEIGHTS = {"blocker": 3.0, "warning": 2.0, "info": 1.0}

def axis_impact(delta: Dict[str, float]) -> float:
    return sum(abs(d) * AXIS_WEIGHTS.get(k, 0) for k, d in delta.items())

def severity_weight(severity: str) -> float:
    return SEVERITY_WEIGHTS.get(severity, 1.0)

def calculate_priority(severity: str, delta: Dict[str, float], missing_fields: int = 0) -> float:
    return severity_weight(severity) + axis_impact(delta) - (0.1 * missing_fields)
