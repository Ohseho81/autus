"""
Physics State Engine
- 물리 모델 기반 상태 관리
- Route 진행 로직 포함
- Snapshot/Restore 지원
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Optional
import math

from app.core.store import STORE
from app.core.physics_model import (
    apply_action_effects,
    apply_natural_decay,
    apply_interactions,
    can_advance_station,
    compute_progress_score,
    clamp,
    CONFIG,
)
from app.models.dashboard import GaugeState
from app.models.route import Point, RouteStation, AlternateRoute, RouteResponse
from app.models.motion import Motion, MotionsResponse


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


# Route 정의: Origin(0,0)을 향한 경로
ROUTE_STATIONS = [
    RouteStation(id="s1", x=-0.80, y=0.30, kind="align"),    # 시작: 정렬
    RouteStation(id="s2", x=-0.65, y=0.20, kind="acquire"),  # 획득
    RouteStation(id="s3", x=-0.50, y=0.10, kind="commit"),   # 결정
    RouteStation(id="s4", x=-0.35, y=0.05, kind="build"),    # 구축
    RouteStation(id="s5", x=-0.20, y=0.02, kind="verify"),   # 검증
    RouteStation(id="s6", x=-0.08, y=0.00, kind="deploy"),   # 배포
]
DESTINATION = Point(x=0.0, y=0.0)  # Origin


@dataclass
class PhysicsState:
    # Gauges
    stability: float = 0.55
    pressure: float = 0.35
    drag: float = 0.30
    momentum: float = 0.45
    volatility: float = 0.25
    recovery: float = 0.50
    
    # Route 진행
    current_station_idx: int = 0  # ROUTE_STATIONS 인덱스
    progress_accumulated: float = 0.0  # 진행 누적치
    
    # Time
    t: float = 0.0
    tick_count: int = 0
    
    # Selfcheck window
    last_action_ts: Optional[float] = None
    selfcheck_window_sec: float = 60.0
    
    # Rolling selfcheck (last 7)
    selfcheck_history: list[dict] = field(default_factory=list)


STATE = PhysicsState()


def export_snapshot() -> dict:
    """Export current state as snapshot"""
    return {
        "stability": STATE.stability,
        "pressure": STATE.pressure,
        "drag": STATE.drag,
        "momentum": STATE.momentum,
        "volatility": STATE.volatility,
        "recovery": STATE.recovery,
        "current_station_idx": STATE.current_station_idx,
        "progress_accumulated": STATE.progress_accumulated,
        "t": STATE.t,
        "tick_count": STATE.tick_count,
        "last_action_ts": STATE.last_action_ts,
        "selfcheck_history": STATE.selfcheck_history,
    }


def import_snapshot(data: dict) -> None:
    """Import state from snapshot"""
    STATE.stability = data.get("stability", 0.55)
    STATE.pressure = data.get("pressure", 0.35)
    STATE.drag = data.get("drag", 0.30)
    STATE.momentum = data.get("momentum", 0.45)
    STATE.volatility = data.get("volatility", 0.25)
    STATE.recovery = data.get("recovery", 0.50)
    STATE.current_station_idx = data.get("current_station_idx", 0)
    STATE.progress_accumulated = data.get("progress_accumulated", 0.0)
    STATE.t = data.get("t", 0.0)
    STATE.tick_count = data.get("tick_count", 0)
    STATE.last_action_ts = data.get("last_action_ts")
    STATE.selfcheck_history = data.get("selfcheck_history", [])


def restore_on_startup() -> None:
    """Restore state from disk on startup"""
    STORE.restore_from_disk()
    snapshot = STORE.load_snapshot()
    if snapshot:
        import_snapshot(snapshot)


def get_dashboard() -> tuple[GaugeState, datetime]:
    """현재 게이지 상태 반환"""
    gauges = GaugeState(
        stability=round(STATE.stability, 3),
        pressure=round(STATE.pressure, 3),
        drag=round(STATE.drag, 3),
        momentum=round(STATE.momentum, 3),
        volatility=round(STATE.volatility, 3),
        recovery=round(STATE.recovery, 3),
    )
    return gauges, now_utc()


def get_current_station() -> RouteStation:
    """현재 스테이션 반환"""
    idx = min(STATE.current_station_idx, len(ROUTE_STATIONS) - 1)
    return ROUTE_STATIONS[idx]


def get_next_station() -> RouteStation:
    """다음 스테이션 반환"""
    idx = min(STATE.current_station_idx + 1, len(ROUTE_STATIONS) - 1)
    return ROUTE_STATIONS[idx]


def get_route() -> RouteResponse:
    """Route 정보 반환"""
    cur = get_current_station()
    nxt = get_next_station()
    
    # Primary route: current → next → ... → destination
    remaining_stations = ROUTE_STATIONS[STATE.current_station_idx:]
    primary = [Point(x=s.x, y=s.y) for s in remaining_stations]
    primary.append(DESTINATION)
    
    # Alternates: 조건부 대체 경로
    alternates: list[AlternateRoute] = []
    
    # 압력이 높으면 우회 경로 제안
    if STATE.pressure > 0.55:
        bypass = [
            Point(x=cur.x, y=cur.y),
            Point(x=cur.x + 0.1, y=cur.y + 0.15),  # 위로 우회
            Point(x=nxt.x, y=nxt.y),
        ]
        alternates.append(AlternateRoute(trigger="risk", route=bypass))
    
    # 저항이 높으면 느린 경로 제안
    if STATE.drag > 0.50:
        slow_path = [
            Point(x=cur.x, y=cur.y),
            Point(x=cur.x + 0.08, y=cur.y - 0.10),  # 아래로 우회
            Point(x=cur.x + 0.15, y=cur.y - 0.08),
            Point(x=nxt.x, y=nxt.y),
        ]
        alternates.append(AlternateRoute(trigger="delay", route=slow_path))
    
    return RouteResponse(
        destination=DESTINATION,
        current_station=cur,
        next_station=nxt,
        primary_route=primary[:5],  # 최대 5개 포인트
        alternates=alternates[:2],
        ttl_ms=60000,
        updated_at=now_utc(),
    )


def _arc_points(radius: float, phase: float, count: int = 20) -> list[Point]:
    """결정론적 arc points 생성"""
    pts: list[Point] = []
    for i in range(count):
        a = phase + (i / (count - 1)) * (math.pi * 0.9)
        pts.append(Point(x=round(math.cos(a) * radius, 4), y=round(math.sin(a) * radius, 4)))
    return pts


def get_motions() -> MotionsResponse:
    """Motion 정보 반환 - 물리 상태 기반"""
    base = 0.15 + 0.20 * STATE.momentum  # 모멘텀에 비례
    phase = STATE.t
    
    motions: list[Motion] = []
    
    # Orbit 1: 기본 궤도 (모멘텀 표현)
    motions.append(
        Motion(
            motion_id="m_orbit_1",
            kind="orbit",
            path=_arc_points(radius=base, phase=phase, count=22),
            intensity=round(clamp(0.2 + STATE.momentum * 0.6, 0.1, 0.9), 3),
            ttl_ms=60000,
        )
    )
    
    # Orbit 2: 외부 궤도 (압력 표현)
    motions.append(
        Motion(
            motion_id="m_orbit_2",
            kind="orbit",
            path=_arc_points(radius=base * 1.4, phase=phase + 1.3, count=18),
            intensity=round(clamp(0.1 + STATE.pressure * 0.5, 0.05, 0.7), 3),
            ttl_ms=60000,
        )
    )
    
    # Pulse: 변동성이 높을 때만 표시
    if STATE.volatility > 0.35:
        motions.append(
            Motion(
                motion_id="m_pulse_1",
                kind="pulse",
                path=_arc_points(radius=base * 0.5, phase=phase + 2.5, count=12),
                intensity=round(clamp(STATE.volatility * 0.7, 0.1, 0.8), 3),
                ttl_ms=30000,
            )
        )
    
    # Stream: 안정성이 높을 때 추가
    if STATE.stability > 0.60:
        motions.append(
            Motion(
                motion_id="m_stream_1",
                kind="stream",
                path=_arc_points(radius=base * 0.8, phase=phase + 0.5, count=16),
                intensity=round(clamp(STATE.stability * 0.5, 0.2, 0.6), 3),
                ttl_ms=45000,
            )
        )
    
    return MotionsResponse(motions=motions, updated_at=now_utc())


def apply_action(action: str) -> dict:
    """
    Action 적용 - 물리 모델 기반
    Returns: 결과 정보
    """
    # 1. Action 효과 적용
    (
        STATE.stability,
        STATE.pressure,
        STATE.drag,
        STATE.momentum,
        STATE.volatility,
        STATE.recovery,
    ) = apply_action_effects(
        STATE.stability,
        STATE.pressure,
        STATE.drag,
        STATE.momentum,
        STATE.volatility,
        STATE.recovery,
        action,  # type: ignore
    )
    
    # 2. 자연 감쇄 적용
    (
        STATE.stability,
        STATE.pressure,
        STATE.drag,
        STATE.momentum,
        STATE.volatility,
        STATE.recovery,
    ) = apply_natural_decay(
        STATE.stability,
        STATE.pressure,
        STATE.drag,
        STATE.momentum,
        STATE.volatility,
        STATE.recovery,
    )
    
    # 3. 상호작용 적용
    (
        STATE.stability,
        STATE.pressure,
        STATE.drag,
        STATE.momentum,
        STATE.volatility,
        STATE.recovery,
    ) = apply_interactions(
        STATE.stability,
        STATE.pressure,
        STATE.drag,
        STATE.momentum,
        STATE.volatility,
        STATE.recovery,
    )
    
    # 4. Route 진행 체크
    advanced = False
    if can_advance_station(STATE.momentum, STATE.drag):
        progress = compute_progress_score(STATE.momentum, STATE.drag, STATE.stability)
        STATE.progress_accumulated += progress
        
        # 진행 누적치가 1.0 이상이면 다음 스테이션으로
        if STATE.progress_accumulated >= 1.0 and STATE.current_station_idx < len(ROUTE_STATIONS) - 1:
            STATE.current_station_idx += 1
            STATE.progress_accumulated = 0.0
            advanced = True
    
    # 5. 시간 진행
    STATE.t += 0.15
    STATE.tick_count += 1
    STATE.last_action_ts = datetime.now(timezone.utc).timestamp()
    
    # 6. 이벤트 기록 및 스냅샷 저장
    STORE.append_event("action_apply", {
        "action": action,
        "station_idx": STATE.current_station_idx,
        "advanced": advanced,
    })
    STORE.save_snapshot(export_snapshot())
    
    return {
        "action": action,
        "advanced": advanced,
        "current_station": get_current_station().id,
        "progress": round(STATE.progress_accumulated, 2),
    }


def submit_selfcheck(
    alignment: float,
    clarity: float,
    friction: float,
    momentum: float,
    confidence: float,
    recovery: float,
) -> tuple[bool, float]:
    """
    Selfcheck 제출 - action 후 60초 이내만 유효
    Returns: (success, remaining_window_sec)
    """
    now = datetime.now(timezone.utc).timestamp()
    
    # Window 체크
    if STATE.last_action_ts is None:
        return False, 0.0
    
    elapsed = now - STATE.last_action_ts
    if elapsed > STATE.selfcheck_window_sec:
        return False, 0.0
    
    remaining = STATE.selfcheck_window_sec - elapsed
    
    # Selfcheck 기록 추가 (최대 7개 유지)
    selfcheck_entry = {
        "ts": now,
        "alignment": alignment,
        "clarity": clarity,
        "friction": friction,
        "momentum": momentum,
        "confidence": confidence,
        "recovery": recovery,
    }
    STATE.selfcheck_history.append(selfcheck_entry)
    STATE.selfcheck_history = STATE.selfcheck_history[-7:]
    
    # Rolling average 계산
    if len(STATE.selfcheck_history) >= 2:
        def avg_field(field: str) -> float:
            values = [h[field] for h in STATE.selfcheck_history]
            return sum(values) / len(values)
        
        # Selfcheck → Gauge 매핑 (20% 블렌딩)
        blend = 0.20
        STATE.stability = clamp(STATE.stability * (1 - blend) + avg_field("alignment") * blend)
        STATE.drag = clamp(STATE.drag * (1 - blend) + avg_field("friction") * blend)
        STATE.momentum = clamp(STATE.momentum * (1 - blend) + avg_field("momentum") * blend)
        STATE.recovery = clamp(STATE.recovery * (1 - blend) + avg_field("recovery") * blend)
        
        # clarity → volatility 반비례
        STATE.volatility = clamp(STATE.volatility * (1 - blend) + (1 - avg_field("clarity")) * blend)
        
        # confidence → pressure 반비례
        STATE.pressure = clamp(STATE.pressure * (1 - blend * 0.5) + (1 - avg_field("confidence")) * blend * 0.5)
    
    # 이벤트 기록 및 스냅샷 저장
    STORE.append_event("selfcheck_submit", {
        "a": alignment, "cl": clarity, "f": friction,
        "m": momentum, "co": confidence, "r": recovery,
    })
    STORE.save_snapshot(export_snapshot())
    
    return True, remaining


def reset_state() -> None:
    """상태 초기화"""
    STATE.stability = 0.55
    STATE.pressure = 0.35
    STATE.drag = 0.30
    STATE.momentum = 0.45
    STATE.volatility = 0.25
    STATE.recovery = 0.50
    STATE.current_station_idx = 0
    STATE.progress_accumulated = 0.0
    STATE.t = 0.0
    STATE.tick_count = 0
    STATE.last_action_ts = None
    STATE.selfcheck_history = []
    
    STORE.append_event("state_reset", {})
    STORE.save_snapshot(export_snapshot())


def set_goal(goal_text: str) -> None:
    """Goal 설정 (legacy 호환)"""
    STATE.t = 0.0
    STORE.append_event("goal_set", {"mode": "replace"})
    STORE.save_snapshot(export_snapshot())
