"""
AUTUS Local - Core Models v1.0
Based on DEFINITION.md Final Lock

- StateVector: 6축 물리 상태 (Internal)
- DisplayState: 3축 UI 상태 (E, F, R)
- CostUnit (CU): 비용 단위 (전이 불가)
- PersonNFT: 상태 스냅샷 (로컬 체인)
- Coalition: 사람들의 가중 합 (새 개체 아님)

HARD CONSTRAINTS:
- No egress
- No θ exposure
- No recommendation/ranking/judgment
- Deterministic execution
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List
import uuid, hashlib, json


# ============================================
# FORBIDDEN OPERATIONS (KERNEL CONSTRAINT)
# ============================================

FORBIDDEN_OPERATIONS = [
    "optimize",
    "recommend", 
    "rank",
    "score",
    "evaluate",
    "judge",
    "compare_users",
    "external_call",
    "track_location",
    "store_identity"
]

ALLOWED_OPERATIONS = [
    "observe",
    "forecast_physics",
    "display_numbers",
    "log_immutable"
]


class Action(str, Enum):
    HOLD = "HOLD"
    PUSH = "PUSH"
    DRIFT = "DRIFT"


@dataclass(frozen=True)
class PersonId:
    value: str
    @staticmethod
    def new() -> "PersonId":
        return PersonId(value=str(uuid.uuid4()))


@dataclass(frozen=True)
class Theta:
    """Personal parameters - NEVER exposed externally"""
    k_recovery: float
    k_drag: float
    k_vol: float


# ============================================
# 6-AXIS CORE STATE (Physics Kernel)
# ============================================

@dataclass
class StateVector:
    """
    6-axis Core State (Hidden Layer)
    
    stability:  구조적 안정성 [0, 1]
    pressure:   외부/내부 압력 [0, 1]
    drag:       저항/마찰 [0, 1]
    momentum:   운동량/관성 [0, 1]
    volatility: 변동성 [0, 1]
    recovery:   회복력 [0, 1]
    """
    stability: float
    pressure: float
    drag: float
    momentum: float
    volatility: float
    recovery: float

    def as_dict(self) -> Dict[str, float]:
        return {k: round(getattr(self, k), 4) for k in ["stability", "pressure", "drag", "momentum", "volatility", "recovery"]}

    def copy(self) -> "StateVector":
        return StateVector(self.stability, self.pressure, self.drag, self.momentum, self.volatility, self.recovery)
    
    def to_display(self) -> "DisplayState":
        """Convert 6-axis Core State to 3-axis Display State"""
        return core_to_display(self)


# ============================================
# 3-AXIS DISPLAY STATE (UI Layer)
# ============================================

@dataclass
class DisplayState:
    """
    3-axis Display State (UI Layer)
    
    E (Energy): f(stability, recovery)
    F (Flow):   f(momentum, drag)
    R (Risk):   f(pressure, volatility)
    
    Note: These are NOT "good" or "bad" - just directions.
    """
    E: float  # Energy
    F: float  # Flow
    R: float  # Risk

    def as_dict(self) -> Dict[str, float]:
        return {"E": round(self.E, 4), "F": round(self.F, 4), "R": round(self.R, 4)}


def core_to_display(S: StateVector) -> DisplayState:
    """
    Transform 6-axis Core State to 3-axis Display State
    
    E = 0.6 * stability + 0.4 * recovery
    F = 0.7 * momentum - 0.3 * drag  (clamped to [0, 1])
    R = 0.5 * pressure + 0.5 * volatility
    """
    E = 0.6 * S.stability + 0.4 * S.recovery
    F = max(0.0, min(1.0, 0.7 * S.momentum - 0.3 * S.drag + 0.3))  # offset for balance
    R = 0.5 * S.pressure + 0.5 * S.volatility
    
    return DisplayState(E=E, F=F, R=R)


# ============================================
# REFERENCE ANCHOR (NOT Goal!)
# ============================================

@dataclass
class ReferenceAnchor:
    """
    User-defined reference point for ΔS calculation.
    
    ⚠️ This is NOT:
    - An optimization target
    - An evaluation standard
    - An ideal state
    
    ✅ This IS:
    - A user-defined reference point
    - Used ONLY for calculating deviation magnitude
    """
    E: float
    F: float
    R: float

    def as_dict(self) -> Dict[str, float]:
        return {"E": round(self.E, 4), "F": round(self.F, 4), "R": round(self.R, 4)}


def compute_delta_s(current: DisplayState, reference: ReferenceAnchor) -> Dict[str, float]:
    """
    Compute state deviation from reference.
    
    Returns direction and magnitude only - NO judgment.
    """
    return {
        "dE": round(current.E - reference.E, 4),
        "dF": round(current.F - reference.F, 4),
        "dR": round(current.R - reference.R, 4),
        "magnitude": round(
            ((current.E - reference.E) ** 2 + 
             (current.F - reference.F) ** 2 + 
             (current.R - reference.R) ** 2) ** 0.5, 4
        )
    }


@dataclass(frozen=True)
class LedgerEntry:
    t: int
    person_id: str
    delta_cu: float
    note: str


class CostUnitLedger:
    """CU = Cost Unit (NOT coin) - No transfer, No reward"""
    def __init__(self):
        self._entries: List[LedgerEntry] = []
        self._balance: Dict[str, float] = {}

    def add_cost(self, t: int, person: PersonId, delta_cu: float, note: str = "") -> None:
        if delta_cu < 0:
            raise ValueError("delta_cu must be >= 0 (cost only, no rewards)")
        self._entries.append(LedgerEntry(t=t, person_id=person.value, delta_cu=delta_cu, note=note))
        self._balance[person.value] = self._balance.get(person.value, 0.0) + delta_cu

    def balance(self, person: PersonId) -> float:
        return self._balance.get(person.value, 0.0)


@dataclass(frozen=True)
class PersonNFTSnapshot:
    person_id: str
    t: int
    state: dict
    prev_hash: str
    state_hash: str


def mint_snapshot(person: PersonId, t: int, S: StateVector, prev_hash: str) -> PersonNFTSnapshot:
    payload = {"person_id": person.value, "t": t, "state": S.as_dict(), "prev_hash": prev_hash}
    state_hash = hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()
    return PersonNFTSnapshot(person_id=person.value, t=t, state=S.as_dict(), prev_hash=prev_hash, state_hash=state_hash)


@dataclass(frozen=True)
class CoalitionMember:
    person_id: str
    weight: float


@dataclass
class Coalition:
    id: str
    members: List[CoalitionMember] = field(default_factory=list)


def new_coalition() -> Coalition:
    return Coalition(id=str(uuid.uuid4()), members=[])


def aggregate_state(states: Dict[str, StateVector], members: List[CoalitionMember]) -> StateVector:
    wsum = sum(max(0.0, m.weight) for m in members)
    if wsum <= 0:
        return StateVector(0.5, 0.5, 0.5, 0.5, 0.5, 0.5)
    agg = {k: 0.0 for k in ["stability", "pressure", "drag", "momentum", "volatility", "recovery"]}
    for m in members:
        w = max(0.0, m.weight)
        S = states.get(m.person_id)
        if S and w > 0:
            for k in agg:
                agg[k] += w * getattr(S, k)
    return StateVector(**{k: agg[k] / wsum for k in agg})


def aggregate_cu(balances: Dict[str, float], members: List[CoalitionMember]) -> float:
    wsum = sum(max(0.0, m.weight) for m in members)
    if wsum <= 0:
        return 0.0
    return sum(max(0.0, m.weight) * balances.get(m.person_id, 0.0) for m in members) / wsum







