"""
Boundary Rulebook - PH→KR Talent Pack
정책·비자·노동 자동 차단
"""
from typing import Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum
from datetime import datetime

class BoundaryEvent(str, Enum):
    # Visa
    VISA_STATUS_CHANGE = "VISA_STATUS_CHANGE"
    VISA_EXPIRY_D30 = "VISA_EXPIRY_D30"
    VISA_EXPIRY_D14 = "VISA_EXPIRY_D14"
    VISA_EXPIRY_D7 = "VISA_EXPIRY_D7"
    VISA_RENEWAL_FAILED = "VISA_RENEWAL_FAILED"
    # Labor
    WORK_HOUR_EXCEEDED = "WORK_HOUR_EXCEEDED"
    JOB_ROLE_CHANGED = "JOB_ROLE_CHANGED"
    PAYMENT_DELAYED = "PAYMENT_DELAYED"
    CONTRACT_MISMATCH = "CONTRACT_MISMATCH"
    # Academic
    ENROLLMENT_SUSPENDED = "ENROLLMENT_SUSPENDED"
    CREDIT_SHORTFALL = "CREDIT_SHORTFALL"
    ATTENDANCE_BELOW_THRESHOLD = "ATTENDANCE_BELOW_THRESHOLD"

class BoundaryAction(str, Enum):
    ALLOW = "allow"
    SAFE_HOLD = "safe_hold"
    BLOCK = "block"
    REDUCE = "reduce"

@dataclass
class BoundaryResult:
    rule_id: str
    action: BoundaryAction
    reason: str
    affects_gmu: str
    ledger_entry: Dict[str, Any]

class BoundaryRules:
    """Boundary 자동 차단 규칙"""
    
    def br01_visa_risk(self, event: str, gmu_id: str) -> Optional[BoundaryResult]:
        """BR-01: 비자 만료 리스크 차단"""
        if event in [BoundaryEvent.VISA_EXPIRY_D14.value, 
                     BoundaryEvent.VISA_EXPIRY_D7.value,
                     BoundaryEvent.VISA_RENEWAL_FAILED.value]:
            return BoundaryResult(
                rule_id="BR-01",
                action=BoundaryAction.SAFE_HOLD,
                reason="Visa risk - schedule frozen",
                affects_gmu=gmu_id,
                ledger_entry={
                    "gmu": gmu_id,
                    "boundary_rule": "BR-01",
                    "event": event,
                    "action": "SAFE_HOLD",
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        return None
    
    def br02_work_hour(self, event: str, gmu_id: str) -> Optional[BoundaryResult]:
        """BR-02: 근로시간 초과 차단"""
        if event == BoundaryEvent.WORK_HOUR_EXCEEDED.value:
            return BoundaryResult(
                rule_id="BR-02",
                action=BoundaryAction.BLOCK,
                reason="Work hour exceeded - additional work blocked",
                affects_gmu=gmu_id,
                ledger_entry={
                    "gmu": gmu_id,
                    "boundary_rule": "BR-02",
                    "event": event,
                    "action": "BLOCK",
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        return None
    
    def br03_job_mismatch(self, event: str, gmu_id: str, employer_gmu: str) -> Optional[BoundaryResult]:
        """BR-03: 직무 불일치 차단"""
        if event == BoundaryEvent.JOB_ROLE_CHANGED.value:
            return BoundaryResult(
                rule_id="BR-03",
                action=BoundaryAction.BLOCK,
                reason="Job role changed without approval - work blocked",
                affects_gmu=employer_gmu,
                ledger_entry={
                    "gmu": gmu_id,
                    "employer_gmu": employer_gmu,
                    "boundary_rule": "BR-03",
                    "event": event,
                    "action": "BLOCK",
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        return None
    
    def br04_academic_priority(self, event: str, gmu_id: str) -> Optional[BoundaryResult]:
        """BR-04: 학적 붕괴 전 차단"""
        if event in [BoundaryEvent.ATTENDANCE_BELOW_THRESHOLD.value,
                     BoundaryEvent.CREDIT_SHORTFALL.value,
                     BoundaryEvent.ENROLLMENT_SUSPENDED.value]:
            return BoundaryResult(
                rule_id="BR-04",
                action=BoundaryAction.REDUCE,
                reason="Academic risk - work intensity reduced, academic priority",
                affects_gmu=gmu_id,
                ledger_entry={
                    "gmu": gmu_id,
                    "boundary_rule": "BR-04",
                    "event": event,
                    "action": "REDUCE",
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        return None
    
    def check(self, event: str, gmu_id: str, employer_gmu: str = None) -> BoundaryResult:
        """모든 Boundary 규칙 체크"""
        # BR-01: Visa
        result = self.br01_visa_risk(event, gmu_id)
        if result: return result
        
        # BR-02: Work Hour
        result = self.br02_work_hour(event, gmu_id)
        if result: return result
        
        # BR-03: Job Mismatch
        if employer_gmu:
            result = self.br03_job_mismatch(event, gmu_id, employer_gmu)
            if result: return result
        
        # BR-04: Academic
        result = self.br04_academic_priority(event, gmu_id)
        if result: return result
        
        # 위반 없음
        return BoundaryResult(
            rule_id="NONE",
            action=BoundaryAction.ALLOW,
            reason="No boundary violation",
            affects_gmu=gmu_id,
            ledger_entry={}
        )
    
    def can_release(self, current_state: Dict[str, Any]) -> bool:
        """자동 해제 조건 확인"""
        # 위반 이벤트 해소 + 상태 정상화
        violations = current_state.get("active_violations", [])
        return len(violations) == 0
