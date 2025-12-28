from dataclasses import dataclass
from typing import List
from .models import Action, StateVector, Theta
from .physics import update_state

@dataclass(frozen=True)
class StepInput:
    t: int
    action: Action

def replay(initial: StateVector, theta: Theta, steps: List[StepInput]) -> List[StateVector]:
    states = []
    S = initial.copy()
    for step in steps:
        S = update_state(S, step.action, theta)
        states.append(S.copy())
    return states

def verify_determinism(initial: StateVector, theta: Theta, steps: List[StepInput], runs: int = 3) -> bool:
    first = replay(initial, theta, steps)
    for _ in range(runs - 1):
        if [s.as_dict() for s in replay(initial, theta, steps)] != [s.as_dict() for s in first]:
            return False
    return True

def generate_deterministic_steps(count: int, seed: int = 42) -> List[StepInput]:
    actions = [Action.HOLD, Action.PUSH, Action.DRIFT]
    return [StepInput(t=t, action=actions[(seed * 31 + t * 17) % 3]) for t in range(count)]







