from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from typing import Dict, Any, Optional

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
    ledger_entry: Dict[str, Any]

class BoundaryRules:
    def check(self, event: str, gmu_id: str, employer_gmu: str = None) -> BoundaryResult:
        now = datetime.utcnow().isoformat()
        
        if event in ["VISA_EXPIRY_D14", "VISA_EXPIRY_D7", "VISA_RENEWAL_FAILED"]:
            return BoundaryResult("BR-01", BoundaryAction.SAFE_HOLD, "Visa risk", {"gmu": gmu_id, "rule": "BR-01", "event": event, "ts": now})
        
        if event == "WORK_HOUR_EXCEEDED":
            return BoundaryResult("BR-02", BoundaryAction.BLOCK, "Work hour exceeded", {"gmu": gmu_id, "rule": "BR-02", "ts": now})
        
        if event == "JOB_ROLE_CHANGED":
            return BoundaryResult("BR-03", BoundaryAction.BLOCK, "Job role changed", {"gmu": gmu_id, "rule": "BR-03", "ts": now})
        
        if event in ["ATTENDANCE_BELOW_THRESHOLD", "CREDIT_SHORTFALL"]:
            return BoundaryResult("BR-04", BoundaryAction.REDUCE, "Academic risk", {"gmu": gmu_id, "rule": "BR-04", "ts": now})
        
        return BoundaryResult("NONE", BoundaryAction.ALLOW, "OK", {})
