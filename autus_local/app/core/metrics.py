"""
AUTUS Metrics Layer
===================

UI Projection & Result Panel calculations.

RULES:
- No interpretation/judgment
- No recommendation
- Numbers and directions only
- Physics preview, not guidance

Kernel 10-Line Reference:
1. Entity = Person
2. Motion = Cost(Unit), cost only
3. Time is the only dimension
4. State core = 6D, UI = 3D projection
5. Same physics for all, different θᵢ (hidden)
6. Deterministic: same input → same output
7. CU ≥ 0, non-transferable, accumulate only
8. NFT = local hash chain
9. No recommendation, no ranking, no optimization
10. Justice = minimal constraint (2/3 rule)
"""

from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Tuple

from .models import Action, StateVector, Theta
from .physics import update_state


def clamp01(x: float) -> float:
    """Clamp value to [0, 1]"""
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


# =============================================================================
# E/F/R PROJECTION (6D → 3D)
# =============================================================================

def project_efr(S: StateVector) -> Dict[str, float]:
    """
    Project 6D core state to 3D display state.
    
    E = f(stability, recovery)    # Energy
    F = f(momentum, drag)         # Flow (drag inverted)
    R = f(pressure, volatility)   # Risk
    
    This is UI projection, NOT interpretation.
    """
    E = clamp01(0.55 * S.stability + 0.45 * S.recovery)
    F = clamp01(0.60 * S.momentum + 0.40 * (1.0 - S.drag))
    R = clamp01(0.50 * S.pressure + 0.50 * S.volatility)
    return {"E": E, "F": F, "R": R}


# =============================================================================
# RESULT PANEL (DP/OS/OR)
# =============================================================================

def compute_dp_os_or(S: StateVector) -> Dict[str, float]:
    """
    Compute Result Panel metrics.
    
    DP = Decision Power (steering capability)
    OS = Option Space (available choices)
    OR = Overdose Risk (excess proximity)
    
    IMPORTANT: 
    - NO meaning assignment
    - NO judgment (good/bad)
    - Physics approximation only
    """
    # Decision Power: stability + recovery - volatility - pressure
    dp = clamp01(
        0.5 * S.stability + 
        0.5 * S.recovery - 
        0.3 * S.volatility - 
        0.2 * S.pressure
    )
    
    # Option Space: recovery + stability - drag - pressure
    os = clamp01(
        0.6 * S.recovery + 
        0.4 * S.stability - 
        0.5 * S.drag - 
        0.2 * S.pressure
    )
    
    # Overdose Risk: pressure + volatility + drag
    orisk = clamp01(
        0.4 * S.pressure + 
        0.4 * S.volatility + 
        0.2 * S.drag
    )
    
    return {"DP": dp, "OS": os, "OR": orisk}


# =============================================================================
# ACTION PREVIEW (NOT Recommendation!)
# =============================================================================

def action_preview(S: StateVector, theta: Theta) -> Dict[str, Dict[str, float]]:
    """
    Preview physical result of each action.
    
    ⚠️ This is NOT recommendation.
    ⚠️ This is NOT guidance.
    ⚠️ This shows physics outcome only.
    
    Args:
        S: Current state
        theta: Person's hidden parameters (NOT exposed)
    
    Returns:
        Dict mapping action → projected metrics
    """
    out: Dict[str, Dict[str, float]] = {}
    
    for a in [Action.HOLD, Action.PUSH, Action.DRIFT]:
        # Copy state (don't modify original)
        s2 = StateVector(**S.as_dict())
        
        # Apply physics update (deterministic)
        s2 = update_state(s2, a, theta)
        
        # Project to display metrics
        efr = project_efr(s2)
        panel = compute_dp_os_or(s2)
        
        out[a.value] = {
            "E": efr["E"],
            "F": efr["F"],
            "R": efr["R"],
            "DP": panel["DP"],
            "OS": panel["OS"],
            "OR": panel["OR"],
        }
    
    return out


# =============================================================================
# TREND CALCULATION
# =============================================================================

def trend_arrow(curr: float, prev: float, eps: float = 1e-6) -> str:
    """
    Determine trend direction.
    
    Returns: "UP", "DOWN", or "FLAT"
    
    NOTE: Direction only, no judgment.
    """
    if curr > prev + eps:
        return "UP"
    if curr < prev - eps:
        return "DOWN"
    return "FLAT"


def compute_trends(
    current: Dict[str, float], 
    previous: Dict[str, float]
) -> Dict[str, str]:
    """
    Compute trends for DP/OS/OR.
    
    Returns dict with trend directions.
    """
    return {
        "DP": trend_arrow(current["DP"], previous["DP"]),
        "OS": trend_arrow(current["OS"], previous["OS"]),
        "OR": trend_arrow(current["OR"], previous["OR"]),
    }


# =============================================================================
# DELTA CALCULATION
# =============================================================================

def compute_delta_magnitude(s1: StateVector, s2: StateVector) -> float:
    """
    Compute |ΔS| between two states.
    
    This is ΔS/Δt (state divergence rate).
    Physics measurement, not judgment.
    """
    v1 = [s1.stability, s1.pressure, s1.drag, s1.momentum, s1.volatility, s1.recovery]
    v2 = [s2.stability, s2.pressure, s2.drag, s2.momentum, s2.volatility, s2.recovery]
    
    return sum((a - b) ** 2 for a, b in zip(v1, v2)) ** 0.5


def compute_delta_vector(s1: StateVector, s2: StateVector) -> Dict[str, float]:
    """
    Compute ΔS vector (6D).
    
    Returns delta for each component.
    """
    return {
        "stability": s2.stability - s1.stability,
        "pressure": s2.pressure - s1.pressure,
        "drag": s2.drag - s1.drag,
        "momentum": s2.momentum - s1.momentum,
        "volatility": s2.volatility - s1.volatility,
        "recovery": s2.recovery - s1.recovery,
    }







