"""
AUTUS Validator - Constitutional Enforcement
=============================================

헌법 위반 출력 차단:
- 금지어 검출
- 포맷 검증
- 실행 언어 차단

Version: 1.0.0
"""

import re
from dataclasses import dataclass
from typing import List, Dict, Tuple
from enum import Enum


class ViolationType(Enum):
    FORBIDDEN_WORD = "forbidden_word"
    VALUE_JUDGMENT = "value_judgment"
    RECOMMENDATION = "recommendation"
    EXECUTION_LANGUAGE = "execution_language"
    FORMAT_VIOLATION = "format_violation"


@dataclass
class Violation:
    type: ViolationType
    text: str
    severity: str  # "critical" | "warning"


class Validator:
    """
    Constitutional Validator
    
    Rule: LLM output must pass through validator before reaching user.
    """
    
    # FORBIDDEN WORDS (LOCKED)
    FORBIDDEN_KR = [
        "좋다", "나쁘다", "좋은", "나쁜",
        "해야 한다", "해야한다", "하세요", "하십시오",
        "추천", "권장", "제안드립니다",
        "최적", "최선", "최고", "최악",
        "성공", "실패",
        "올바른", "잘못된", "옳다", "틀리다",
    ]
    
    FORBIDDEN_EN = [
        "you should", "you must", "need to", "have to",
        "i recommend", "i suggest", "i advise",
        "better than", "worse than", "the best", "the worst", "the optimal",
        "success", "failure", "succeed", "fail",
        "right choice", "wrong choice", "correct choice", "incorrect choice",
        "good choice", "bad choice",
    ]
    
    # RECOMMENDATION PATTERNS
    RECOMMENDATION_PATTERNS = [
        r"I recommend",
        r"I suggest",
        r"You should",
        r"The best .* is",
        r"The optimal .* is",
        r"추천드립니다",
        r"권장합니다",
        r"하시는 것이 좋",
    ]
    
    # EXECUTION LANGUAGE PATTERNS
    EXECUTION_PATTERNS = [
        r"execute",
        r"run",
        r"perform",
        r"실행",
        r"수행",
    ]
    
    def __init__(self):
        self.violations: List[Violation] = []
    
    def validate(self, text: str) -> Tuple[bool, List[Violation]]:
        """
        Validate text against constitutional rules.
        
        Returns:
            (is_valid, violations)
        """
        self.violations = []
        text_lower = text.lower()
        
        # Check forbidden words
        self._check_forbidden_words(text, text_lower)
        
        # Check recommendation patterns
        self._check_patterns(text_lower, self.RECOMMENDATION_PATTERNS, 
                            ViolationType.RECOMMENDATION)
        
        # Check execution language
        self._check_patterns(text_lower, self.EXECUTION_PATTERNS,
                            ViolationType.EXECUTION_LANGUAGE)
        
        # Critical violations block
        critical = [v for v in self.violations if v.severity == "critical"]
        is_valid = len(critical) == 0
        
        return is_valid, self.violations
    
    def _check_forbidden_words(self, text: str, text_lower: str):
        """Check for forbidden words."""
        all_forbidden = self.FORBIDDEN_KR + self.FORBIDDEN_EN
        
        for word in all_forbidden:
            if word.lower() in text_lower:
                severity = "critical" if word in [
                    "추천", "recommend", "should", "must", "최적", "optimal"
                ] else "warning"
                
                self.violations.append(Violation(
                    type=ViolationType.FORBIDDEN_WORD,
                    text=f"Forbidden word: '{word}'",
                    severity=severity
                ))
    
    def _check_patterns(self, text: str, patterns: List[str], 
                       violation_type: ViolationType):
        """Check for pattern matches."""
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                self.violations.append(Violation(
                    type=violation_type,
                    text=f"Pattern matched: '{pattern}'",
                    severity="critical"
                ))
    
    def get_report(self) -> str:
        """Generate violation report."""
        if not self.violations:
            return "VALID"
        
        lines = ["VIOLATIONS DETECTED:"]
        for v in self.violations:
            lines.append(f"  [{v.severity.upper()}] {v.type.value}: {v.text}")
        return "\n".join(lines)
    
    def wrap_llm_output(self, raw_text: str) -> Dict:
        """
        Wrap LLM output with validation.
        
        Returns:
            {
                "valid": bool,
                "output": str (original or blocked),
                "violations": list,
                "report": str
            }
        """
        is_valid, violations = self.validate(raw_text)
        report = self.get_report()
        
        if is_valid:
            return {
                "valid": True,
                "output": raw_text,
                "violations": [{"type": v.type.value, "text": v.text} for v in violations],
                "report": report
            }
        else:
            return {
                "valid": False,
                "output": "[BLOCKED] Constitutional violation detected.",
                "violations": [{"type": v.type.value, "text": v.text} for v in violations],
                "report": report
            }


# Singleton
_validator_instance: Validator = None

def get_validator() -> Validator:
    global _validator_instance
    if _validator_instance is None:
        _validator_instance = Validator()
    return _validator_instance







