"""
Replay Engine
- reduce_events: 이벤트 → 상태 리듀서
- build_*: view 구성 요소 생성
- 결정성 보장 (랜덤 금지)
"""

from dataclasses import dataclass
from typing import Any
import math


@dataclass
class ReplayState:
    """Reduced state from events"""
    stability: float = 0.67
    pressure: float = 0.42
    drag: float = 0.31
    momentum: float = 0.55
    volatility: float = 0.28
    recovery: float = 0.61
    t: float = 0.0
    action_count: int = 0
    selfcheck_count: int = 0


def reduce_events(events: list[dict]) -> ReplayState:
    """
    Pure reducer: events → state
    Deterministic, no random
    """
    state = ReplayState()
    
    for event in events:
        event_type = event.get("type", "")
        payload = event.get("payload", {})
        
        if event_type == "action_apply":
            action = payload.get("action", "")
            state = _apply_action(state, action)
            state.action_count += 1
        
        elif event_type == "selfcheck_submit":
            state = _apply_selfcheck(state, payload)
            state.selfcheck_count += 1
        
        elif event_type == "goal_set":
            state.t = 0.0
    
    return state


def _apply_action(state: ReplayState, action: str) -> ReplayState:
    """Apply action deterministically"""
    if action == "hold":
        state.stability = min(1.0, state.stability + 0.02)
        state.pressure = max(0.0, state.pressure - 0.02)
        state.drag = max(0.0, state.drag - 0.01)
        state.momentum = max(0.0, state.momentum - 0.01)
    elif action == "push":
        state.momentum = min(1.0, state.momentum + 0.03)
        state.pressure = min(1.0, state.pressure + 0.03)
        state.volatility = min(1.0, state.volatility + 0.02)
        state.stability = max(0.0, state.stability - 0.01)
    elif action == "drift":
        state.pressure = max(0.0, state.pressure - 0.015)
        state.volatility = max(0.0, state.volatility - 0.01)
        state.recovery = min(1.0, state.recovery + 0.02)
        state.drag = min(1.0, state.drag + 0.01)
    
    state.t += 0.12
    return state


def _apply_selfcheck(state: ReplayState, payload: dict) -> ReplayState:
    """Apply selfcheck deterministically"""
    # Blend with current state (70% current, 30% selfcheck)
    blend = 0.3
    
    if "a" in payload:  # alignment → stability
        state.stability = state.stability * (1 - blend) + payload["a"] * blend
    if "cl" in payload:  # clarity → inverse drag
        state.drag = state.drag * (1 - blend) + (1 - payload["cl"]) * blend
    if "f" in payload:  # friction → drag
        state.drag = state.drag * (1 - blend / 2) + payload["f"] * (blend / 2)
    if "m" in payload:  # momentum
        state.momentum = state.momentum * (1 - blend) + payload["m"] * blend
    if "co" in payload:  # confidence → stability
        state.stability = state.stability * (1 - blend / 2) + payload["co"] * (blend / 2)
    if "r" in payload:  # recovery
        state.recovery = state.recovery * (1 - blend) + payload["r"] * blend
    
    return state


def build_dashboard(state: ReplayState) -> dict:
    """Build dashboard from replay state"""
    return {
        "gauges": {
            "stability": round(state.stability, 3),
            "pressure": round(state.pressure, 3),
            "drag": round(state.drag, 3),
            "momentum": round(state.momentum, 3),
            "volatility": round(state.volatility, 3),
            "recovery": round(state.recovery, 3),
        }
    }


def build_route(state: ReplayState) -> dict:
    """Build route from replay state (deterministic)"""
    # Fixed positions, no random
    return {
        "destination": {"x": 0.0, "y": 0.0},
        "current_station": {"id": "s3", "x": -0.50, "y": 0.10, "kind": "build"},
        "next_station": {"id": "s4", "x": -0.20, "y": 0.05, "kind": "verify"},
        "primary_route": [
            {"x": -0.50, "y": 0.10},
            {"x": -0.20, "y": 0.05},
            {"x": 0.0, "y": 0.0},
        ],
        "alternates": [
            {
                "trigger": "risk",
                "route": [
                    {"x": -0.50, "y": 0.10},
                    {"x": -0.35, "y": 0.25},
                    {"x": 0.0, "y": 0.0},
                ],
            }
        ] if state.pressure > 0.55 else [],
    }


def build_motions(state: ReplayState) -> dict:
    """Build motions from replay state (deterministic, no random)"""
    base = 0.20 + 0.15 * state.momentum
    phase = state.t
    
    def arc_points(radius: float, phase_offset: float, count: int = 20) -> list[dict]:
        pts = []
        for i in range(count):
            a = phase + phase_offset + (i / (count - 1)) * (math.pi * 0.9)
            pts.append({"x": round(math.cos(a) * radius, 4), "y": round(math.sin(a) * radius, 4)})
        return pts
    
    motions = [
        {
            "motion_id": "m_orbit_1",
            "kind": "orbit",
            "path": arc_points(base, 0, 22),
            "intensity": round(min(1.0, 0.25 + state.momentum * 0.75), 3),
            "ttl_ms": 60000,
        },
        {
            "motion_id": "m_orbit_2",
            "kind": "orbit",
            "path": arc_points(base * 1.35, 1.2, 18),
            "intensity": round(min(1.0, 0.15 + state.pressure * 0.65), 3),
            "ttl_ms": 60000,
        },
    ]
    
    if state.volatility > 0.3:
        motions.append({
            "motion_id": "m_pulse_1",
            "kind": "pulse",
            "path": arc_points(base * 0.6, 2.4, 12),
            "intensity": round(min(1.0, state.volatility * 0.8), 3),
            "ttl_ms": 30000,
        })
    
    return {"motions": motions}
