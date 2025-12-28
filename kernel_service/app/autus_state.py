# app/autus_state.py
"""
AUTUS State Contract (정본)
===========================

Version: 1.0.1
Status: 🔒 LOCKED

핵심 원칙:
① Motion is Money     모든 모션은 비용이다
② Entity is Person    모든 개체는 사람이다
③ No Judgment         시스템은 판단하지 않는다
④ Physics Only        물리량만 표시한다
⑤ User Decides        최종 결정은 사용자가 한다
⑥ Deterministic       동일 입력 → 동일 출력
⑦ Replayable          모든 상태는 재현 가능하다
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Literal, Tuple
from enum import Enum
import json
import hashlib

Mode = Literal["SIM", "LIVE"]
Horizon = Literal["H1", "D1", "D7", "D30", "D180"]


# ================================================================
# UTILITY FUNCTIONS (LOCKED)
# ================================================================

def clamp01(x: float) -> float:
    """Clamp to [0, 1]"""
    return max(0.0, min(1.0, x))


def clamp(x: float, lo: float, hi: float) -> float:
    """Clamp to [lo, hi]"""
    return max(lo, min(hi, x))


def lerp(a: float, b: float, alpha: float) -> float:
    """Linear interpolation: a + (b - a) * alpha"""
    return a + (b - a) * alpha


def round_f(x: float) -> float:
    """결정론을 위한 고정 라운딩 (6자리)"""
    return float(f"{x:.6f}")


def canonical_json(obj: Any) -> str:
    """결정론 해시를 위한 canonical JSON (키 정렬, 공백 제거)"""
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256_hex(s: str) -> str:
    """SHA256 full hex"""
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def sha256_short(s: str) -> str:
    """SHA256 앞 16자"""
    return sha256_hex(s)[:16]


# ================================================================
# ENUMS (LOCKED)
# ================================================================

class NodeType(str, Enum):
    """노드 타입 (물리 상태 기반)"""
    POTENTIAL = "POTENTIAL"           # E < 0.30, σ < 0.50
    KINETIC = "KINETIC"               # E > M
    STABLE = "STABLE"                 # Stability > 0.70
    THRESHOLD = "THRESHOLD"           # Density > 0.75, σ < 0.25
    ENTROPY_DOMINANT = "ENTROPY_DOMINANT"  # σ > 0.60
    DIFFUSE = "DIFFUSE"               # 기타
    MASS_DOMINANT = "MASS_DOMINANT"   # M > 0.60, σ < 0.40
    FLOW_DOMINANT = "FLOW_DOMINANT"   # E > 0.50


SLOTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


# ================================================================
# CORE STATE STRUCTURES (LOCKED)
# ================================================================

@dataclass
class CoreState:
    """
    Core State (6축 - Hidden)
    
    물리법칙 계층 Level 0-2에서 사용
    """
    stability: float = 0.7      # [0] 안정성
    pressure: float = 0.5       # [1] 압력
    drag: float = 0.1           # [2] 저항
    momentum: float = 0.5       # [3] 운동량
    volatility: float = 0.3     # [4] 변동성 (σ)
    recovery: float = 0.1       # [5] 회복력


@dataclass
class DisplayState:
    """
    Display State (3축 - Visible)
    
    UI에 표시되는 물리량
    """
    E: float = 0.5      # Energy (에너지)
    F: float = 0.5      # Flow (흐름)
    R: float = 0.3      # Risk (위험)


@dataclass
class Measure:
    """
    통합 물리 측정값
    
    Core + Display + Derived
    """
    # Core
    M: float = 0.5              # Mass
    E: float = 0.5              # Energy
    dE_dt: float = 0.0          # Energy rate
    sigma: float = 0.3          # Entropy (σ)
    leak: float = 0.1           # Loss rate
    pressure: float = 0.5       # 1 - leak 기반
    volume: float = 0.5         # Goal radius (r)
    
    # Derived
    density: float = 0.5        # E * pressure / volume
    stability: float = 0.7      # 1 - sigma
    recovery: float = 0.1       # Recovery rate
    node_type: str = "POTENTIAL"


@dataclass
class Forecast:
    """예측 상태"""
    horizon: Horizon = "D1"
    P_outcome: float = 0.0
    trajectory_samples: List[float] = field(default_factory=lambda: [0.0, 0.0, 0.0, 0.0])
    confidence: float = 0.0


@dataclass
class GraphNode:
    """Entity Node"""
    id: str
    mass: float = 1.0
    sigma: float = 0.3
    density: float = 0.9
    type: str = "SELF"
    layer: int = 0


@dataclass
class GraphEdge:
    """CU Flow Edge"""
    a: str
    b: str
    flow: float = 0.0
    sigma: float = 0.0


@dataclass
class Graph:
    """Relationship Graph"""
    anchor_node_id: str = "SELF"
    nodes: List[Dict[str, Any]] = field(default_factory=lambda: [
        {"id": "SELF", "mass": 0.5, "sigma": 0.3, "density": 0.3, "type": "SELF", "layer": 0}
    ])
    edges: List[Dict[str, Any]] = field(default_factory=list)


# ================================================================
# DRAFT STRUCTURES (LOCKED)
# ================================================================

@dataclass
class DraftPage1:
    """
    Page 1: Goal Calibration
    
    Limits:
    - mass_modifier: [-0.50, +0.50]
    - volume_override: [0.30, 0.90]
    - horizon_override: H1|D1|D7|D30|D180
    """
    mass_modifier: float = 0.0
    volume_override: float = 0.50
    horizon_override: Horizon = "D1"


@dataclass
class DraftPage2:
    """
    Page 2: Route / Topology
    
    Limits:
    - filters: [0.0, 1.0]
    - virtual_anchor_shift: [-1, 1] each
    - ops: NodeOps list (SIM에서 수집, Commit 시 적용)
    
    NodeOps Types (4종):
    - NODE_CREATE: 노드 생성
    - NODE_DELETE: 노드 삭제
    - NODE_MASS_SCALE: 노드 질량 스케일
    - EDGE_WEIGHT_SET: 엣지 가중치 설정
    """
    mass_filter: float = 0.0
    flow_filter: float = 0.0
    sigma_filter: float = 1.0
    virtual_anchor_shift: Tuple[float, float] = (0.0, 0.0)
    ops: List[Dict[str, Any]] = field(default_factory=list)  # NodeOps list (SIM)


@dataclass
class DraftPage3:
    """
    Page 3: Mandala Investment
    
    Limits:
    - allocations: 각 [0.0, 1.0], 합계 = 1.0
    """
    allocations: Dict[str, float] = field(default_factory=lambda: {
        "N": 0.125, "NE": 0.125, "E": 0.125, "SE": 0.125,
        "S": 0.125, "SW": 0.125, "W": 0.125, "NW": 0.125
    })


@dataclass
class Draft:
    """3페이지 Draft 통합"""
    page1: DraftPage1 = field(default_factory=DraftPage1)
    page2: DraftPage2 = field(default_factory=DraftPage2)
    page3: DraftPage3 = field(default_factory=DraftPage3)


# ================================================================
# REPLAY STRUCTURES (LOCKED)
# ================================================================

@dataclass
class ReplayMarker:
    """Replay 마커"""
    id: str
    t_ms: int
    hash: str
    state_hash: str


@dataclass
class Replay:
    """Replay 상태"""
    last_marker_id: Optional[str] = None
    markers: List[ReplayMarker] = field(default_factory=list)
    last_chain_hash: Optional[str] = None


# ================================================================
# UI STATE
# ================================================================

@dataclass
class UI:
    """UI 상태"""
    mode: Mode = "LIVE"
    page: int = 1
    hud_visible: bool = False


# ================================================================
# AUTUS STATE (ROOT)
# ================================================================

@dataclass
class AutusState:
    """
    AUTUS 루트 상태
    
    모든 물리량 + Draft + Replay
    """
    version: str = "autus.state.v1"
    session_id: str = ""
    t_ms: int = 0
    measure: Measure = field(default_factory=Measure)
    forecast: Forecast = field(default_factory=Forecast)
    graph: Graph = field(default_factory=Graph)
    ui: UI = field(default_factory=UI)
    draft: Draft = field(default_factory=Draft)
    replay: Replay = field(default_factory=Replay)


# ================================================================
# SERIALIZATION (LOCKED)
# ================================================================

def state_to_dict(state: AutusState) -> Dict[str, Any]:
    """
    State → Dict 변환 (결정론적)
    
    모든 float는 6자리 라운딩
    """
    return {
        "version": state.version,
        "session_id": state.session_id,
        "t_ms": state.t_ms,
        "measure": {
            "M": round_f(state.measure.M),
            "E": round_f(state.measure.E),
            "dE_dt": round_f(state.measure.dE_dt),
            "sigma": round_f(state.measure.sigma),
            "leak": round_f(state.measure.leak),
            "pressure": round_f(state.measure.pressure),
            "volume": round_f(state.measure.volume),
            "density": round_f(state.measure.density),
            "stability": round_f(state.measure.stability),
            "recovery": round_f(state.measure.recovery),
            "node_type": state.measure.node_type
        },
        "forecast": {
            "horizon": state.forecast.horizon,
            "P_outcome": round_f(state.forecast.P_outcome),
            "trajectory": {
                "samples": [round_f(x) for x in state.forecast.trajectory_samples],
                "confidence": round_f(state.forecast.confidence)
            }
        },
        "graph": {
            "anchor_node_id": state.graph.anchor_node_id,
            "nodes": state.graph.nodes,
            "edges": state.graph.edges
        },
        "ui": {
            "mode": state.ui.mode,
            "page": state.ui.page,
            "hud_visible": state.ui.hud_visible
        },
        "draft": {
            "page1": {
                "mass_modifier": round_f(state.draft.page1.mass_modifier),
                "volume_override": round_f(state.draft.page1.volume_override),
                "horizon_override": state.draft.page1.horizon_override
            },
            "page2": {
                "mass_filter": round_f(state.draft.page2.mass_filter),
                "flow_filter": round_f(state.draft.page2.flow_filter),
                "sigma_filter": round_f(state.draft.page2.sigma_filter),
                "virtual_anchor_shift": [
                    round_f(state.draft.page2.virtual_anchor_shift[0]),
                    round_f(state.draft.page2.virtual_anchor_shift[1])
                ],
                "ops": state.draft.page2.ops
            },
            "page3": {
                "allocations": {k: round_f(v) for k, v in state.draft.page3.allocations.items()}
            }
        },
        "replay": {
            "last_marker_id": state.replay.last_marker_id,
            "markers": [
                {"id": m.id, "t_ms": m.t_ms, "hash": m.hash, "state_hash": m.state_hash}
                for m in state.replay.markers
            ]
        }
    }


# ================================================================
# STATE STORE
# ================================================================

class StateStore:
    """In-memory state store (세션별)"""

    def __init__(self) -> None:
        self._states: Dict[str, AutusState] = {}

    def get_or_create(self, session_id: str) -> AutusState:
        if session_id not in self._states:
            st = AutusState(session_id=session_id)
            self._states[session_id] = st
        return self._states[session_id]

    def exists(self, session_id: str) -> bool:
        return session_id in self._states

    def list_sessions(self) -> List[str]:
        return list(self._states.keys())

    def clear(self) -> None:
        self._states.clear()


STORE = StateStore()





