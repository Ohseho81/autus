"""
AUTUS LLM Boundary Enforcer
============================

Verifies that LLM responses comply with AUTUS Constitutional Prompt.
Blocks violations before they reach the user.

Version: 1.0.0
Status: LOCKED

CORE PRINCIPLE:
"사람은 '세계가 어떻게 작동하는지'를 고정하고
 LLM은 '그 세계 안에서 어디로 가볼지'를 탐색한다."

Human defines HOW the world works.
LLM explores WHERE to go within that world.
"""

import re
from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Optional, Set
from enum import Enum


# ================================================================
# VIOLATION TYPES
# ================================================================

class ViolationType(Enum):
    """Types of boundary violations."""
    FORBIDDEN_WORD = "forbidden_word"
    VALUE_JUDGMENT = "value_judgment"
    RECOMMENDATION = "recommendation"
    NEW_LAW = "new_law"
    NEW_AXIS = "new_axis"
    MEANING_INTERPRETATION = "meaning_interpretation"
    AUTO_EXECUTION = "auto_execution"
    THRESHOLD_OVERRIDE = "threshold_override"


@dataclass
class Violation:
    """Detected violation."""
    type: ViolationType
    text: str
    position: int
    severity: str  # 'critical', 'warning'


# ================================================================
# CONSTITUTIONAL DEFINITIONS (HARD LOCK)
# ================================================================

class ConstitutionalLock:
    """
    HARD LOCK definitions - IMMUTABLE
    
    ⛔ These cannot be modified, extended, questioned, or reinterpreted.
    """
    
    # Physics Hierarchy (A1)
    PHYSICS_HIERARCHY = {
        0: {
            'name': 'FUNDAMENTAL',
            'status': '불변',
            'laws': ['Conservation', 'Inertia', 'Interaction'],
            'equations': [
                'ΣM_in = ΣM_out',
                'M(t+Δt) ≈ M(t)',
                'M_A→B ⇒ M_B→A'
            ]
        },
        1: {
            'name': 'PROJECTION',
            'status': '자동 생성',
            'laws': ['Friction', 'Potential', 'Threshold'],
            'equations': [
                'M_eff = M_raw - Loss',
                'P(t+Δt) = P(t) + Store',
                'E ≥ E_crit → StateChange'
            ]
        },
        2: {
            'name': 'ENVIRONMENT',
            'status': '조건부',
            'laws': ['Scale', 'Entropy', 'Stability', 'Recovery'],
            'equations': [
                'State_Space ∝ n^n',
                'σ = -Σ pᵢ log pᵢ',
                'Stab = 1 - |ΔS|/Max',
                'Rec = 1/τ'
            ]
        },
        3: {
            'name': 'CONTROL',
            'status': '비물리',
            'laws': ['CAP', 'DAMP', 'COOLDOWN', 'Consent', 'Policy'],
            'equations': []
        }
    }
    
    # Allowed State Axes (A2)
    ALLOWED_STATE_AXES = {
        'S001': 'Δstability',
        'S002': 'Δpressure',
        'S003': 'Δdrag',
        'S004': 'Δmomentum',
        'S005': 'Δvolatility',
        'S006': 'Δrecovery',
        'S007': 'ΔE',
        'S008': 'ΔF',
        'S009': 'ΔR',
    }
    
    ALLOWED_OUTPUT_DIMENSIONS = ['ΔEntity', 'ΔMoney', 'Δt']
    
    # Forbidden Axes (A2) - NEVER USE
    FORBIDDEN_AXES = {
        'Emotion', 'Meaning', 'Satisfaction', 'Value judgment',
        'Happiness', 'Success', 'Failure', 'Good', 'Bad',
        'Purpose', 'Motivation', 'Desire', 'Intention',
        '감정', '의미', '만족도', '가치판단', '행복', '성공', '실패',
    }
    
    # Motion Registry (A4) - 68 motions fixed
    MOTION_REGISTRY = {
        'User Actions': ['U001', 'U002', 'U003', 'U004', 'U005', 
                        'U006', 'U007', 'U008', 'U009', 'U010', 'U011'],  # 11
        'Entity Motions': ['E001', 'E002', 'E003', 'E004', 
                          'E005', 'E006', 'E007', 'E008'],  # 8
        'State Motions': ['S001', 'S002', 'S003', 'S004', 'S005',
                         'S006', 'S007', 'S008', 'S009'],  # 9
        'Loop Motions': ['L001', 'L002', 'L003', 'L004',
                        'L005', 'L006', 'L007', 'L008'],  # 8
        'Justice Motions': ['J001', 'J002', 'J003', 'J004'],  # 4
        'Sensory Motions': ['N001', 'N002', 'N003', 'N004', 'N005', 'N006'],  # 6
        'Map Motions': ['M001', 'M002', 'M003', 'M004', 'M005',
                       'M006', 'M007', 'M008', 'M009', 'M010'],  # 10
        'Chain Motions': ['C001', 'C002', 'C003', 'C004', 
                         'C005', 'C006', 'C007'],  # 7
        'Scale Motions': ['X001', 'X002', 'X003', 'X004', 'X005'],  # 5
    }
    
    TOTAL_MOTIONS = 68
    
    @classmethod
    def get_all_motions(cls) -> Set[str]:
        """Get set of all valid motion IDs."""
        all_motions = set()
        for category in cls.MOTION_REGISTRY.values():
            all_motions.update(category)
        return all_motions
    
    @classmethod
    def is_valid_motion(cls, motion_id: str) -> bool:
        """Check if motion ID is in registry."""
        return motion_id in cls.get_all_motions()
    
    @classmethod
    def is_forbidden_axis(cls, axis: str) -> bool:
        """Check if axis is forbidden."""
        axis_lower = axis.lower()
        for forbidden in cls.FORBIDDEN_AXES:
            if forbidden.lower() in axis_lower:
                return True
        return False


# ================================================================
# BOUNDARY ENFORCER
# ================================================================

class BoundaryEnforcer:
    """
    AUTUS LLM Boundary Enforcer
    
    Checks LLM responses against constitutional rules.
    """
    
    # ================================================================
    # FORBIDDEN PATTERNS (RED ZONE)
    # ================================================================
    
    FORBIDDEN_WORDS_KR = [
        "좋다", "나쁘다", "좋은", "나쁜",
        "해야 한다", "해야한다", "하세요", "하십시오",
        "추천", "권장", "제안드립니다",
        "최적", "최선", "최고", "최악",
        "성공", "실패",
        "올바른", "잘못된",
        "옳다", "틀리다",
        "당연히", "분명히",
    ]
    
    FORBIDDEN_WORDS_EN = [
        "should", "must", "need to", "have to",
        "recommend", "suggest", "advise",
        "better", "worse", "best", "worst", "optimal",
        "success", "failure", "succeed", "fail",
        "right", "wrong", "correct", "incorrect",
        "good choice", "bad choice",
        "i think you want", "you probably want",
        "the best option", "the optimal",
        "obviously", "clearly",
    ]
    
    RECOMMENDATION_PATTERNS = [
        r"I recommend",
        r"I suggest",
        r"You should",
        r"The best .* is",
        r"The optimal .* is",
        r"I advise",
        r"My recommendation",
        r"추천드립니다",
        r"권장합니다",
        r"제안드립니다",
        r"하시는 것이 좋",
        r"하는 게 나",
        r"선택하세요",
        r"이것을 선택",
    ]
    
    VALUE_JUDGMENT_PATTERNS = [
        r"this is (good|bad|better|worse)",
        r"(good|bad|better|worse) (choice|option|decision)",
        r"성공적",
        r"실패한",
        r"훌륭한",
        r"잘못된 선택",
        r"좋은 선택",
        r"나쁜 결과",
    ]
    
    MEANING_INTERPRETATION_PATTERNS = [
        r"you (seem|appear) to (want|need|feel)",
        r"this means you",
        r"I think you (want|need|feel)",
        r"you probably (want|need|feel)",
        r"사용자가 원하는 것은",
        r"당신이 느끼는",
        r"의도하신",
        r"바라시는",
    ]
    
    NEW_LAW_PATTERNS = [
        r"new (law|rule|principle)",
        r"I (propose|suggest) adding",
        r"we should add",
        r"새로운 법칙",
        r"추가해야",
        r"법칙을 만들",
        r"규칙을 추가",
    ]
    
    NEW_AXIS_PATTERNS = [
        r"(happiness|satisfaction|emotion|meaning|purpose) (axis|dimension|metric)",
        r"track (happiness|satisfaction|emotion)",
        r"measure (happiness|satisfaction|emotion)",
        r"감정 축",
        r"행복 지표",
        r"만족도를 추적",
        r"감정을 측정",
    ]
    
    # ================================================================
    # VERIFICATION METHODS
    # ================================================================
    
    def __init__(self):
        self.violations: List[Violation] = []
    
    def check_response(self, response: str) -> Tuple[bool, List[Violation]]:
        """
        Check LLM response for boundary violations.
        
        Returns:
            (is_valid, list_of_violations)
        """
        self.violations = []
        response_lower = response.lower()
        
        # Check forbidden words
        self._check_forbidden_words(response, response_lower)
        
        # Check patterns
        self._check_patterns(response, response_lower, 
                            self.RECOMMENDATION_PATTERNS, 
                            ViolationType.RECOMMENDATION)
        
        self._check_patterns(response, response_lower,
                            self.VALUE_JUDGMENT_PATTERNS,
                            ViolationType.VALUE_JUDGMENT)
        
        self._check_patterns(response, response_lower,
                            self.MEANING_INTERPRETATION_PATTERNS,
                            ViolationType.MEANING_INTERPRETATION)
        
        self._check_patterns(response, response_lower,
                            self.NEW_LAW_PATTERNS,
                            ViolationType.NEW_LAW)
        
        self._check_patterns(response, response_lower,
                            self.NEW_AXIS_PATTERNS,
                            ViolationType.NEW_AXIS)
        
        # Check for forbidden axes
        self._check_forbidden_axes(response, response_lower)
        
        is_valid = len([v for v in self.violations if v.severity == 'critical']) == 0
        return is_valid, self.violations
    
    def _check_forbidden_words(self, response: str, response_lower: str):
        """Check for forbidden words."""
        all_forbidden = self.FORBIDDEN_WORDS_KR + self.FORBIDDEN_WORDS_EN
        
        for word in all_forbidden:
            word_lower = word.lower()
            if word_lower in response_lower:
                pos = response_lower.find(word_lower)
                start = max(0, pos - 20)
                end = min(len(response), pos + len(word) + 20)
                context = response[start:end]
                
                severity = 'critical' if word in [
                    '추천', 'recommend', '해야', 'should', 'must',
                    '최적', 'optimal', 'best', '성공', 'success'
                ] else 'warning'
                
                self.violations.append(Violation(
                    type=ViolationType.FORBIDDEN_WORD,
                    text=f"'{word}' in: ...{context}...",
                    position=pos,
                    severity=severity
                ))
    
    def _check_patterns(self, response: str, response_lower: str,
                       patterns: List[str], violation_type: ViolationType):
        """Check for pattern matches."""
        for pattern in patterns:
            matches = re.finditer(pattern, response_lower, re.IGNORECASE)
            for match in matches:
                start = max(0, match.start() - 10)
                end = min(len(response), match.end() + 10)
                context = response[start:end]
                
                self.violations.append(Violation(
                    type=violation_type,
                    text=f"Pattern '{pattern}' matched: ...{context}...",
                    position=match.start(),
                    severity='critical'
                ))
    
    def _check_forbidden_axes(self, response: str, response_lower: str):
        """Check for forbidden axis mentions."""
        for axis in ConstitutionalLock.FORBIDDEN_AXES:
            axis_lower = axis.lower()
            if axis_lower in response_lower:
                # Check if it's in a context of measuring/tracking
                context_patterns = [
                    f"measure {axis_lower}",
                    f"track {axis_lower}",
                    f"{axis_lower} axis",
                    f"{axis_lower} metric",
                    f"{axis_lower} level",
                ]
                
                for pattern in context_patterns:
                    if pattern in response_lower:
                        pos = response_lower.find(pattern)
                        self.violations.append(Violation(
                            type=ViolationType.NEW_AXIS,
                            text=f"Forbidden axis usage: '{pattern}'",
                            position=pos,
                            severity='critical'
                        ))
    
    def get_violation_report(self) -> str:
        """Generate violation report."""
        if not self.violations:
            return "✅ No violations detected. Response is compliant."
        
        report = ["❌ BOUNDARY VIOLATIONS DETECTED", "=" * 50]
        
        critical = [v for v in self.violations if v.severity == 'critical']
        warnings = [v for v in self.violations if v.severity == 'warning']
        
        if critical:
            report.append(f"\n🚫 CRITICAL ({len(critical)}):")
            for v in critical:
                report.append(f"  [{v.type.value}] {v.text}")
        
        if warnings:
            report.append(f"\n⚠️ WARNINGS ({len(warnings)}):")
            for v in warnings:
                report.append(f"  [{v.type.value}] {v.text}")
        
        report.append("\n" + "=" * 50)
        report.append("Response blocked due to boundary violation.")
        
        return "\n".join(report)


# ================================================================
# RESPONSE VALIDATOR
# ================================================================

class ResponseValidator:
    """
    Complete response validation pipeline.
    """
    
    def __init__(self):
        self.enforcer = BoundaryEnforcer()
    
    def validate(self, response: str) -> Dict:
        """
        Validate LLM response.
        
        Returns:
            {
                'valid': bool,
                'response': str (original or blocked message),
                'violations': list,
                'report': str
            }
        """
        is_valid, violations = self.enforcer.check_response(response)
        report = self.enforcer.get_violation_report()
        
        critical = [v for v in violations if v.severity == 'critical']
        
        if critical:
            return {
                'valid': False,
                'response': "[BLOCKED] Response violated AUTUS boundary. See report.",
                'violations': violations,
                'report': report
            }
        elif violations:
            return {
                'valid': True,
                'response': response,
                'violations': violations,
                'report': report,
                'warning': True
            }
        else:
            return {
                'valid': True,
                'response': response,
                'violations': [],
                'report': report
            }


# ================================================================
# CONSENT GATE
# ================================================================

class ConsentGate:
    """
    Level 3 Consent Gate for action execution.
    
    BEFORE ANY EXECUTION:
    1. Display physics outcome prediction
    2. Show all available paths
    3. Wait for explicit user selection
    4. Verify Level 3 consent
    5. Only then: Execute
    """
    
    def __init__(self):
        self.pending_actions: List[Dict] = []
        self.consent_given: bool = False
    
    def request_consent(self, action: Dict) -> str:
        """
        Request consent for action execution.
        """
        self.pending_actions.append(action)
        self.consent_given = False
        
        motion_id = action.get('motion_id', 'Unknown')
        
        return f"""
╔═══════════════════════════════════════════════════════════════╗
║                    CONSENT REQUIRED                           ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Motion: {motion_id}
║  
║  [PHYSICS COMPUTATION]
║  - Δσ (Entropy):    {action.get('delta_sigma', '?')}
║  - ΔStability:      {action.get('delta_stability', '?')}
║  - ΔRecovery:       {action.get('delta_recovery', '?')}
║  - ΔScale:          {action.get('delta_scale', '?')}
║
║  [NO RECOMMENDATION PROVIDED]
║  User decides. System displays physics only.
║                                                               ║
║  Type 'CONFIRM' to execute or 'CANCEL' to abort.             ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
"""
    
    def process_response(self, user_input: str) -> Tuple[bool, str]:
        """
        Process user consent response.
        """
        if user_input.strip().upper() == 'CONFIRM':
            self.consent_given = True
            action = self.pending_actions.pop() if self.pending_actions else None
            motion_id = action.get('motion_id', 'action') if action else 'action'
            return True, f"✅ Consent verified. Executing {motion_id}..."
        
        elif user_input.strip().upper() == 'CANCEL':
            self.pending_actions.clear()
            return False, "❌ Action cancelled. No changes made."
        
        else:
            return False, "⚠️ Invalid response. Type 'CONFIRM' or 'CANCEL'."
    
    def has_pending(self) -> bool:
        """Check if there are pending actions."""
        return len(self.pending_actions) > 0


# ================================================================
# RESPONSE FORMATTER
# ================================================================

class PhysicsResponseFormatter:
    """
    Format LLM responses according to AUTUS standard.
    
    Standard Format:
    [PHYSICS COMPUTATION]
    [PATHS AVAILABLE]
    [SIMULATION] (if requested)
    [NO RECOMMENDATION PROVIDED]
    """
    
    @staticmethod
    def format_physics(motion_id: str, state_change: Dict) -> str:
        """Format physics computation section."""
        return f"""
[PHYSICS COMPUTATION]
Motion: {motion_id}
State Change:
  - Δσ:        {state_change.get('entropy', '?')}
  - Stability: {state_change.get('stability', '?')}
  - Recovery:  {state_change.get('recovery', '?')}
  - Scale:     {state_change.get('scale', '?')}
"""
    
    @staticmethod
    def format_paths(paths: List[Dict]) -> str:
        """Format available paths section."""
        lines = ["[PATHS AVAILABLE]"]
        for i, path in enumerate(paths, 1):
            sequence = ' → '.join(path.get('sequence', []))
            outcome = path.get('outcome', {})
            lines.append(f"Path {i}: {sequence}")
            lines.append(f"  → σ = {outcome.get('entropy', '?')}, Stab = {outcome.get('stability', '?')}")
        return "\n".join(lines)
    
    @staticmethod
    def format_simulation(condition: str, result: Dict) -> str:
        """Format simulation section."""
        return f"""
[SIMULATION]
Condition: {condition}
Result:
  - σ:         {result.get('entropy', '?')}
  - Stability: {result.get('stability', '?')}
  - Recovery:  {result.get('recovery', '?')}
"""
    
    @staticmethod
    def format_footer() -> str:
        """Format standard footer."""
        return """
[NO RECOMMENDATION PROVIDED]
User decides. System displays physics only.
"""
    
    @staticmethod
    def format_complete(motion_id: str, state_change: Dict, 
                       paths: List[Dict] = None, 
                       simulation: Dict = None) -> str:
        """Format complete response."""
        response = PhysicsResponseFormatter.format_physics(motion_id, state_change)
        
        if paths:
            response += "\n" + PhysicsResponseFormatter.format_paths(paths)
        
        if simulation:
            response += "\n" + PhysicsResponseFormatter.format_simulation(
                simulation.get('condition', ''),
                simulation.get('result', {})
            )
        
        response += PhysicsResponseFormatter.format_footer()
        return response


# ================================================================
# SELF-CHECK PROTOCOL
# ================================================================

class SelfCheckProtocol:
    """
    Self-check protocol to run before every response.
    
    □ Does my response modify any Level 0-2 laws?
    □ Does my response add new state axes?
    □ Does my response contain value judgments?
    □ Does my response recommend a specific path?
    □ Does my response use forbidden words?
    □ Does my response trigger execution without consent?
    """
    
    def __init__(self):
        self.enforcer = BoundaryEnforcer()
        self.checks = []
    
    def run_checks(self, response: str) -> Dict:
        """Run all self-checks."""
        self.checks = []
        
        # Check 1: Law modification
        law_modified = self._check_law_modification(response)
        self.checks.append({
            'name': 'Law Modification',
            'passed': not law_modified,
            'action': 'BLOCK' if law_modified else 'OK'
        })
        
        # Check 2: New axes
        new_axis = self._check_new_axis(response)
        self.checks.append({
            'name': 'New State Axes',
            'passed': not new_axis,
            'action': 'BLOCK' if new_axis else 'OK'
        })
        
        # Check 3: Value judgments
        value_judgment = self._check_value_judgment(response)
        self.checks.append({
            'name': 'Value Judgments',
            'passed': not value_judgment,
            'action': 'REMOVE' if value_judgment else 'OK'
        })
        
        # Check 4: Recommendations
        recommendation = self._check_recommendation(response)
        self.checks.append({
            'name': 'Specific Recommendations',
            'passed': not recommendation,
            'action': 'REWRITE' if recommendation else 'OK'
        })
        
        # Check 5: Forbidden words
        forbidden = self._check_forbidden_words(response)
        self.checks.append({
            'name': 'Forbidden Words',
            'passed': not forbidden,
            'action': 'REPLACE' if forbidden else 'OK'
        })
        
        all_passed = all(c['passed'] for c in self.checks)
        
        return {
            'all_passed': all_passed,
            'checks': self.checks,
            'blocking_issues': [c for c in self.checks if c['action'] == 'BLOCK']
        }
    
    def _check_law_modification(self, response: str) -> bool:
        """Check if response modifies physics laws."""
        patterns = [
            r"modify (the )?(law|rule|equation)",
            r"change (the )?(conservation|inertia|interaction)",
            r"법칙을 (수정|변경)",
        ]
        response_lower = response.lower()
        return any(re.search(p, response_lower) for p in patterns)
    
    def _check_new_axis(self, response: str) -> bool:
        """Check if response adds new axes."""
        for axis in ConstitutionalLock.FORBIDDEN_AXES:
            if axis.lower() in response.lower():
                if any(word in response.lower() for word in ['axis', 'metric', 'dimension', '축', '지표']):
                    return True
        return False
    
    def _check_value_judgment(self, response: str) -> bool:
        """Check for value judgments."""
        patterns = BoundaryEnforcer.VALUE_JUDGMENT_PATTERNS
        response_lower = response.lower()
        return any(re.search(p, response_lower) for p in patterns)
    
    def _check_recommendation(self, response: str) -> bool:
        """Check for specific recommendations."""
        patterns = BoundaryEnforcer.RECOMMENDATION_PATTERNS
        response_lower = response.lower()
        return any(re.search(p, response_lower) for p in patterns)
    
    def _check_forbidden_words(self, response: str) -> bool:
        """Check for forbidden words."""
        all_forbidden = BoundaryEnforcer.FORBIDDEN_WORDS_KR + BoundaryEnforcer.FORBIDDEN_WORDS_EN
        response_lower = response.lower()
        return any(word.lower() in response_lower for word in all_forbidden)
    
    def get_report(self) -> str:
        """Generate self-check report."""
        lines = ["SELF-CHECK PROTOCOL", "=" * 40]
        
        for check in self.checks:
            status = "✅" if check['passed'] else "❌"
            lines.append(f"{status} {check['name']}: {check['action']}")
        
        return "\n".join(lines)


# ================================================================
# TEST / DEMO
# ================================================================

if __name__ == '__main__':
    print("=" * 60)
    print("AUTUS LLM Constitutional Prompt v1.0")
    print("=" * 60)
    
    validator = ResponseValidator()
    self_check = SelfCheckProtocol()
    
    # Test valid response
    valid_response = """
[PHYSICS COMPUTATION]
Motion U001 (PUSH) applied.
Δσ: +0.05, ΔStability: -0.10

[PATHS AVAILABLE]
Path 1: PUSH → HOLD → σ = 0.35
Path 2: DRIFT → PUSH → σ = 0.32
Path 3: HOLD → HOLD → σ = 0.30

[NO RECOMMENDATION PROVIDED]
User decides.
"""
    
    # Test invalid response
    invalid_response = """
I recommend choosing Path 2 because it's the best option.
You should definitely go with DRIFT → PUSH for success.
This is a good choice that will lead to optimal results.
"""
    
    print("\n[TEST 1: Valid Response]")
    result = validator.validate(valid_response)
    print(f"Valid: {result['valid']}")
    
    print("\n[TEST 2: Invalid Response]")
    result = validator.validate(invalid_response)
    print(f"Valid: {result['valid']}")
    print(result['report'])
    
    print("\n[TEST 3: Self-Check]")
    check_result = self_check.run_checks(invalid_response)
    print(self_check.get_report())
    
    print("\n" + "=" * 60)
    print("Constitutional Lock Status: ✅ LOCKED")
    print("Version: 1.0.0")
    print("=" * 60)







