from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime, timezone
import math
import random

from app.models.dashboard import GaugeState
from app.models.route import Point, RouteStation, AlternateRoute, RouteResponse
from app.models.motion import Motion, MotionsResponse


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class PhysicsState:
    goal_text: str = "goal"
    stability: float = 0.67
    pressure: float = 0.42
    drag: float = 0.31
    momentum: float = 0.55
    volatility: float = 0.28
    recovery: float = 0.61
    t: float = 0.0


STATE = PhysicsState()


def get_dashboard() -> tuple[GaugeState, datetime]:
    gauges = GaugeState(
        stability=STATE.stability,
        pressure=STATE.pressure,
        drag=STATE.drag,
        momentum=STATE.momentum,
        volatility=STATE.volatility,
        recovery=STATE.recovery,
    )
    return gauges, now_utc()


def get_route() -> RouteResponse:
    dest = Point(x=0.0, y=0.0)
    cur = RouteStation(id="s3", x=-0.50, y=0.10, kind="build")
    nxt = RouteStation(id="s4", x=-0.20, y=0.05, kind="verify")

    primary = [
        Point(x=cur.x, y=cur.y),
        Point(x=nxt.x, y=nxt.y),
        Point(x=0.0, y=0.0),
    ]

    alternates: list[AlternateRoute] = []
    if STATE.pressure > 0.55:
        alternates.append(
            AlternateRoute(
                trigger="risk",
                route=[Point(x=cur.x, y=cur.y), Point(x=-0.35, y=0.25), Point(x=0.0, y=0.0)],
            )
        )
    if STATE.drag > 0.45:
        alternates.append(
            AlternateRoute(
                trigger="delay",
                route=[Point(x=cur.x, y=cur.y), Point(x=-0.40, y=-0.15), Point(x=-0.15, y=-0.10), Point(x=0.0, y=0.0)],
            )
        )

    return RouteResponse(
        destination=dest,
        current_station=cur,
        next_station=nxt,
        primary_route=primary,
        alternates=alternates[:2],
        ttl_ms=60000,
        updated_at=now_utc(),
    )


def _arc_points(radius: float, phase: float, count: int = 20) -> list[Point]:
    pts: list[Point] = []
    for i in range(count):
        a = phase + (i / (count - 1)) * (math.pi * 0.9)
        pts.append(Point(x=math.cos(a) * radius, y=math.sin(a) * radius))
    return pts


def get_motions() -> MotionsResponse:
    base = 0.20 + 0.15 * STATE.momentum
    phase = STATE.t

    motions: list[Motion] = []
    motions.append(
        Motion(
            motion_id="m_orbit_1",
            kind="orbit",
            path=_arc_points(radius=base, phase=phase, count=22),
            intensity=min(1.0, 0.25 + STATE.momentum * 0.75),
            ttl_ms=60000,
        )
    )
    motions.append(
        Motion(
            motion_id="m_orbit_2",
            kind="orbit",
            path=_arc_points(radius=base * 1.35, phase=phase + 1.2, count=18),
            intensity=min(1.0, 0.15 + STATE.pressure * 0.65),
            ttl_ms=60000,
        )
    )
    if STATE.volatility > 0.3:
        motions.append(
            Motion(
                motion_id="m_pulse_1",
                kind="pulse",
                path=_arc_points(radius=base * 0.6, phase=phase + 2.4, count=12),
                intensity=min(1.0, STATE.volatility * 0.8),
                ttl_ms=30000,
            )
        )

    return MotionsResponse(motions=motions, updated_at=now_utc())


def apply_action(action: str) -> None:
    if action == "hold":
        STATE.stability = min(1.0, STATE.stability + 0.02)
        STATE.pressure = max(0.0, STATE.pressure - 0.02)
        STATE.drag = max(0.0, STATE.drag - 0.01)
        STATE.momentum = max(0.0, STATE.momentum - 0.01)
    elif action == "push":
        STATE.momentum = min(1.0, STATE.momentum + 0.03)
        STATE.pressure = min(1.0, STATE.pressure + 0.03)
        STATE.volatility = min(1.0, STATE.volatility + 0.02)
        STATE.stability = max(0.0, STATE.stability - 0.01)
    elif action == "drift":
        STATE.pressure = max(0.0, STATE.pressure - 0.015)
        STATE.volatility = max(0.0, STATE.volatility - 0.01)
        STATE.recovery = min(1.0, STATE.recovery + 0.02)
        STATE.drag = min(1.0, STATE.drag + 0.01)

    STATE.t += 0.12
    STATE.t += (random.random() - 0.5) * 0.01


def set_goal(goal_text: str) -> None:
    STATE.goal_text = goal_text
    STATE.t = 0.0
