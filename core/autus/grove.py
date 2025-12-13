import statistics
from enum import Enum

class GroveState(str, Enum):
    NORMAL = "normal"
    TENSION = "tension"
    INFLECTION = "inflection"
    TRANSITION_READY = "transition_ready"

def compute_slot_variance(slots: dict) -> float:
    values = list(slots.values())
    if not values:
        return 0.0
    mean = statistics.mean(values)
    return statistics.mean([(v - mean) ** 2 for v in values])

def detect_sip(pressure: float, resource_efficiency: float, slot_variance: float,
               P_HIGH=0.7, R_LOW=0.4, V_HIGH=0.6) -> bool:
    return pressure >= P_HIGH and resource_efficiency <= R_LOW and slot_variance >= V_HIGH

def update_grove_state(current_state: GroveState, pressure: float, 
                       resource_efficiency: float, slots: dict) -> GroveState:
    variance = compute_slot_variance(slots)
    
    if current_state == GroveState.NORMAL:
        if pressure > 0.5:
            return GroveState.TENSION
    
    if current_state == GroveState.TENSION:
        if detect_sip(pressure, resource_efficiency, variance):
            return GroveState.INFLECTION
    
    if current_state == GroveState.INFLECTION:
        return GroveState.TRANSITION_READY
    
    return current_state
