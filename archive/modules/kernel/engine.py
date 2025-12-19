"""
Autus Reality Language (ARL) v1.0 - Kernel Engine
"""
from typing import Dict, Any, List
from datetime import datetime

class State:
    """Entity state with 8-axis model"""
    def __init__(self, id: str, type: str, axes: Dict[str, float] = None):
        self.id = id
        self.type = type
        self.axes = axes or {f"A{i}": 0.0 for i in range(2, 10)}
        self.meta = {}
    
    def to_dict(self) -> Dict:
        return {"id": self.id, "type": self.type, "axes": self.axes, "meta": self.meta}

class Event:
    """Reality change event with delta vector"""
    def __init__(self, id: str, type: str, delta: Dict[str, float], actor: str = None, targets: List[str] = None):
        self.id = id
        self.type = type
        self.delta = delta
        self.actor = actor
        self.targets = targets or []
        self.timestamp = datetime.now().isoformat()
        self.context = {}
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id, "type": self.type, "delta": self.delta,
            "actor": self.actor, "targets": self.targets,
            "timestamp": self.timestamp, "context": self.context
        }

class Rule:
    """Condition and transformation logic"""
    def __init__(self, id: str, trigger: str, conditions: Dict, delta: Dict[str, float], severity: str = "info"):
        self.id = id
        self.trigger = trigger
        self.conditions = conditions
        self.delta = delta
        self.severity = severity  # blocker, warning, info
    
    def evaluate(self, state: State) -> bool:
        field = self.conditions.get("field")
        operator = self.conditions.get("operator")
        value = self.conditions.get("value")
        
        state_value = state.meta.get(field) or state.axes.get(field, 0)
        
        if operator == ">=": return state_value >= value
        if operator == "<=": return state_value <= value
        if operator == "==": return state_value == value
        if operator == "!=": return state_value != value
        if operator == ">": return state_value > value
        if operator == "<": return state_value < value
        return False

def apply_event(state: State, event: Event) -> State:
    """Apply event delta to state axes"""
    for axis, delta in event.delta.items():
        if axis in state.axes:
            state.axes[axis] += delta
    return state

def calculate_score(state: State, rules: List[Rule]) -> float:
    """Calculate eligibility score based on rules"""
    score = 0.0
    weights = {"blocker": 0.4, "warning": 0.2, "info": 0.1}
    
    for rule in rules:
        if rule.evaluate(state):
            score += weights.get(rule.severity, 0.1)
    
    return min(score, 1.0)
