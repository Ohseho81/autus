from typing import Dict, Any, List
from enum import Enum
from dataclasses import dataclass
import time

class ActionType(str, Enum):
    COMMIT_BLOCK = "commit_block"
    RATE_DOWN = "rate_down"
    INPUT_CLAMP = "input_clamp"

@dataclass
class GuardrailAction:
    action_type: ActionType
    reason: str
    auto_release_at: float

class ActionExecutor:
    def __init__(self):
        self.active_actions: List[GuardrailAction] = []
    
    def execute_block(self, reason: str, duration: float = 300) -> GuardrailAction:
        action = GuardrailAction(ActionType.COMMIT_BLOCK, reason, time.time() + duration)
        self.active_actions.append(action)
        return action
    
    def check_auto_release(self):
        now = time.time()
        self.active_actions = [a for a in self.active_actions if now < a.auto_release_at]
    
    def is_blocked(self) -> bool:
        self.check_auto_release()
        return any(a.action_type == ActionType.COMMIT_BLOCK for a in self.active_actions)
