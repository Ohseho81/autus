"""Tick 처리"""
from engine.state import SolarState
from engine.physics import entropy

DECAY_PRESSURE = 0.92
DECAY_ENTROPY_RESOLUTION = 0.008

def process_tick(state: SolarState, unresolved: float = 0.0, resolution: float = 0.0) -> SolarState:
    state.pressure *= DECAY_PRESSURE
    
    imbalance = max(0, state.pressure) * 0.01
    new_entropy = entropy(state.entropy, imbalance + unresolved, resolution + DECAY_ENTROPY_RESOLUTION)
    state.entropy = new_entropy
    state.tick += 1
    
    return state
