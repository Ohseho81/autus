from typing import Dict, Any, Optional
from .config import DEFAULT_CONFIG
from .evaluator import GuardrailEvaluator, ThreatLevel
from .actions import ActionExecutor

class GuardrailState:
    def __init__(self, config=None):
        self.config = config or DEFAULT_CONFIG
        self.evaluator = GuardrailEvaluator(self.config)
        self.executor = ActionExecutor()
    
    def check_and_act(self, pressure: float, slots: Dict[str, float]) -> Dict[str, Any]:
        evaluation = self.evaluator.evaluate(pressure, slots)
        actions_taken = 0
        
        if evaluation["level"] == ThreatLevel.CRITICAL.value:
            self.executor.execute_block("CRITICAL_THREAT", self.config.auto_release_after)
            actions_taken = 1
        
        return {
            "evaluation": evaluation,
            "actions_taken": actions_taken,
            "is_blocked": self.executor.is_blocked()
        }
    
    def can_commit(self) -> bool:
        return not self.executor.is_blocked()

_guardrail = None
def get_guardrail() -> GuardrailState:
    global _guardrail
    if _guardrail is None:
        _guardrail = GuardrailState()
    return _guardrail
