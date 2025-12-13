from typing import Dict, Any
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
    auto_release_sec: int = 300

class TalentGuardrails:
    """PH→KR Talent Pack 전용 Guardrail"""
    
    # 임계값
    GRADE_THRESHOLD = 0.6
    ATTENDANCE_THRESHOLD = 0.8
    MANAGEMENT_LOAD_THRESHOLD = 0.75
    LEGAL_RISK_THRESHOLD = 0.7
    
    def gr01_student(self, student_state: Dict[str, Any], event_type: str, value: float) -> GuardrailResult:
        """GR-01: Student Guardrail
        학업성취 < 기준 OR 무단결근 → Commit BLOCK
        """
        if event_type == "grade" and value < self.GRADE_THRESHOLD:
            return GuardrailResult(
                guardrail_id="GR-01",
                action=GuardrailAction.BLOCK,
                reason=f"Grade {value:.0%} < {self.GRADE_THRESHOLD:.0%}",
                auto_release_sec=86400  # 24시간
            )
        
        if event_type == "attendance" and value < self.ATTENDANCE_THRESHOLD:
            return GuardrailResult(
                guardrail_id="GR-01",
                action=GuardrailAction.BLOCK,
                reason=f"Attendance {value:.0%} < {self.ATTENDANCE_THRESHOLD:.0%}",
                auto_release_sec=43200  # 12시간
            )
        
        if event_type == "violation":
            return GuardrailResult(
                guardrail_id="GR-01",
                action=GuardrailAction.BLOCK,
                reason="Violation detected",
                auto_release_sec=604800  # 7일
            )
        
        return GuardrailResult("GR-01", GuardrailAction.ALLOW, "OK")
    
    def gr02_employer(self, employer_state: Dict[str, Any], event_type: str, value: float) -> GuardrailResult:
        """GR-02: Employer Guardrail
        근로조건 변경 OR 법적 리스크 → 신규 투입 BLOCK
        """
        if event_type == "condition_change":
            return GuardrailResult(
                guardrail_id="GR-02",
                action=GuardrailAction.BLOCK,
                reason="Condition change - new placement blocked",
                auto_release_sec=259200  # 3일
            )
        
        if event_type == "legal_risk" and value > self.LEGAL_RISK_THRESHOLD:
            return GuardrailResult(
                guardrail_id="GR-02",
                action=GuardrailAction.BLOCK,
                reason=f"Legal risk {value:.0%} > threshold",
                auto_release_sec=604800  # 7일
            )
        
        return GuardrailResult("GR-02", GuardrailAction.ALLOW, "OK")
    
    def gr03_university(self, university_state: Dict[str, Any], management_load: float) -> GuardrailResult:
        """GR-03: University Guardrail
        관리부담 > 임계 → 정원 축소
        """
        if management_load > self.MANAGEMENT_LOAD_THRESHOLD:
            return GuardrailResult(
                guardrail_id="GR-03",
                action=GuardrailAction.WARN,
                reason=f"Management load {management_load:.0%} > threshold - capacity reduction recommended",
                auto_release_sec=86400
            )
        
        return GuardrailResult("GR-03", GuardrailAction.ALLOW, "OK")
    
    def check_all(self, gmu_type: str, state: Dict, event_type: str, value: float) -> GuardrailResult:
        """GMU 타입에 따른 Guardrail 체크"""
        if gmu_type == "STUDENT":
            return self.gr01_student(state, event_type, value)
        if gmu_type == "EMPLOYER":
            return self.gr02_employer(state, event_type, value)
        if gmu_type == "UNIVERSITY":
            return self.gr03_university(state, value)
        return GuardrailResult("NONE", GuardrailAction.ALLOW, "Unknown type")
