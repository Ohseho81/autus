from dataclasses import dataclass
from enum import Enum

class GuardrailAction(str, Enum):
    ALLOW = "allow"
    BLOCK = "block"
    WARN = "warn"

@dataclass
class GuardrailResult:
    guardrail_id: str
    action: GuardrailAction
    reason: str

class TalentGuardrails:
    GRADE_THRESHOLD = 0.6
    ATTENDANCE_THRESHOLD = 0.8
    
    def gr01_student(self, event_type: str, value: float) -> GuardrailResult:
        if event_type == "grade" and value < self.GRADE_THRESHOLD:
            return GuardrailResult("GR-01", GuardrailAction.BLOCK, f"Grade {value:.0%} < threshold")
        if event_type == "attendance" and value < self.ATTENDANCE_THRESHOLD:
            return GuardrailResult("GR-01", GuardrailAction.BLOCK, f"Attendance {value:.0%} < threshold")
        if event_type == "violation":
            return GuardrailResult("GR-01", GuardrailAction.BLOCK, "Violation detected")
        return GuardrailResult("GR-01", GuardrailAction.ALLOW, "OK")
    
    def gr02_employer(self, event_type: str, value: float) -> GuardrailResult:
        if event_type == "condition_change":
            return GuardrailResult("GR-02", GuardrailAction.BLOCK, "Condition change - new placement blocked")
        if event_type == "legal_risk" and value > 0.7:
            return GuardrailResult("GR-02", GuardrailAction.BLOCK, "Legal risk high")
        return GuardrailResult("GR-02", GuardrailAction.ALLOW, "OK")
    
    def gr03_university(self, management_load: float) -> GuardrailResult:
        if management_load > 0.75:
            return GuardrailResult("GR-03", GuardrailAction.WARN, "Management load high")
        return GuardrailResult("GR-03", GuardrailAction.ALLOW, "OK")
