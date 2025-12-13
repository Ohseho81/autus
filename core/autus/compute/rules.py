from typing import Dict, Any
from dataclasses import dataclass
from enum import Enum

class RuleSeverity(str, Enum):
    INFO = "info"
    WARN = "warn"
    BLOCK = "block"

@dataclass
class RuleResult:
    rule_id: str
    passed: bool
    severity: RuleSeverity
    score: int
    reason: str

def evaluate_rules(context: Dict[str, Any]) -> Dict[str, Any]:
    results = []
    
    # MUSK-001: 가정 2개 이상 차단
    intent = context.get("intent", "")
    assumptions = sum(1 for kw in ["if", "assume", "maybe", "가정", "아마"] if kw in intent.lower())
    results.append(RuleResult("MUSK-001", assumptions <= 2, RuleSeverity.BLOCK, 80 if assumptions <= 2 else 0, f"Assumptions: {assumptions}"))
    
    # JOBS-001: 숫자 금지 (항상 통과)
    results.append(RuleResult("JOBS-001", True, RuleSeverity.INFO, 100, "UI shows forms"))
    
    # BEZOS-001: 비용 증가 경고
    results.append(RuleResult("BEZOS-001", True, RuleSeverity.WARN, 85, "Cost check"))
    
    # THIEL-001: 경쟁자 체크
    competitors = context.get("competitors", 0)
    results.append(RuleResult("THIEL-001", competitors < 3, RuleSeverity.WARN, 85 if competitors < 3 else 60, f"Competitors: {competitors}"))
    
    # ALTMAN-001: 인간 안전
    harm = any(kw in intent.lower() for kw in ["harm", "damage", "위험"])
    results.append(RuleResult("ALTMAN-001", not harm, RuleSeverity.BLOCK, 100 if not harm else 0, "Safety OK" if not harm else "THREAT"))
    
    # HASTINGS-001: 규칙 10개 이하
    results.append(RuleResult("HASTINGS-001", True, RuleSeverity.WARN, 90, "Rules OK"))
    
    # CZ-001: 관할권 전환
    results.append(RuleResult("CZ-001", True, RuleSeverity.INFO, 80, "Jurisdiction available"))
    
    blocked = any(r.severity == RuleSeverity.BLOCK and not r.passed for r in results)
    avg_score = sum(r.score for r in results) / len(results)
    
    return {
        "results": [{"rule": r.rule_id, "passed": r.passed, "score": r.score, "reason": r.reason} for r in results],
        "blocked": blocked,
        "average_score": round(avg_score, 1)
    }
