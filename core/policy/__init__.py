"""AUTUS Policy Module"""

from .outcome import (
    CRITICAL_THRESHOLD,
    EPSILON,
    Outcome,
    Gate,
    OutcomeResult,
    ProofCapsule,
    classify_outcome,
    compute_gate,
    should_store_proof,
    get_retention_days,
    create_proof_capsule,
    get_outcome_icon,
    format_log_message,
    OutcomeAggregator
)

# === Legacy compatibility (for app/main.py) ===
from dataclasses import dataclass
from typing import Dict, Any, Optional

@dataclass
class PolicyConstraint:
    """Policy constraint for state validation"""
    friction: float = 0.0
    min_recovery: float = 0.3
    max_risk: float = 0.8
    
    def dict(self):
        return {
            "friction": self.friction,
            "min_recovery": self.min_recovery,
            "max_risk": self.max_risk
        }

def apply_policy(
    state: Dict[str, Any],
    constraint: Optional[PolicyConstraint] = None
) -> Dict[str, Any]:
    """Apply policy constraints to state"""
    if constraint is None:
        constraint = PolicyConstraint()
    
    adjusted = state.copy()
    
    # Apply friction
    if "risk" in adjusted:
        adjusted["risk"] = min(adjusted["risk"] * (1 + constraint.friction), 1.0)
    
    return adjusted

__all__ = [
    "CRITICAL_THRESHOLD",
    "EPSILON",
    "Outcome",
    "Gate",
    "OutcomeResult",
    "ProofCapsule",
    "classify_outcome",
    "compute_gate",
    "should_store_proof",
    "get_retention_days",
    "create_proof_capsule",
    "get_outcome_icon",
    "format_log_message",
    "OutcomeAggregator",
    "PolicyConstraint",
    "apply_policy"
]
