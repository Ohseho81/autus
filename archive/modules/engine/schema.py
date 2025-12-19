"""Solar/Galaxy/Universe 스키마 v0"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

# ============================================================
# Solar State (개인 코어 상태 벡터)
# ============================================================
class SolarEnergy(BaseModel):
    brain: float = Field(0.5, ge=0, le=1)
    sensors: float = Field(0.5, ge=0, le=1)
    heart: float = Field(0.5, ge=0, le=1)
    core: float = Field(1.0, ge=0, le=1)
    engines: float = Field(0.5, ge=0, le=1)
    base: float = Field(0.5, ge=0, le=1)
    boundary: float = Field(0.0, ge=0, le=1)

class SolarState(BaseModel):
    id: str = "SUN_001"
    cycle: int = 0
    energy: SolarEnergy = Field(default_factory=SolarEnergy)
    pressure: float = 0.0
    entropy: float = 0.0
    trust: float = 1.0

# ============================================================
# Planet (Galaxy 내부 개체)
# ============================================================
class Orbit(BaseModel):
    radius: float = 1.0
    phase: float = 0.0

class Planet(BaseModel):
    planet_id: str
    category: str = "WORK"
    mass: float = 1.0
    velocity: float = 0.0
    orbit: Orbit = Field(default_factory=Orbit)
    stability: float = 1.0
    tags: List[str] = []

# ============================================================
# Galaxy Snapshot (galaxy3d.html 계약)
# ============================================================
class PlanetSnapshot(BaseModel):
    planet_id: str
    orbit_radius: float
    stability: float
    category: str

class GalaxySnapshot(BaseModel):
    systems: int = 4
    pressure: float = 0.0
    entropy: float = 0.0
    gravity: float = 0.5
    planets: List[PlanetSnapshot] = []

# ============================================================
# External Solar (Universe 외부 태양)
# ============================================================
class ExternalSignals(BaseModel):
    regulation: float = 0.0
    budget: float = 0.0
    sentiment: float = 0.0
    market: float = 0.0

class ExternalSolar(BaseModel):
    external_id: str
    type: str  # ORG, CITY, NATION
    gravity: float = 0.5
    pressure: float = 0.0
    entropy: float = 0.0
    alignment: float = 1.0
    signals: ExternalSignals = Field(default_factory=ExternalSignals)

# ============================================================
# Universe Snapshot
# ============================================================
class InternalState(BaseModel):
    pressure: float = 0.0
    entropy: float = 0.0
    gravity: float = 0.5

class UniverseMetrics(BaseModel):
    pressure: float = 0.0
    entropy: float = 0.0
    alignment: float = 1.0
    risk: float = 0.0

class UniverseSnapshot(BaseModel):
    systems: int = 4
    internal: InternalState = Field(default_factory=InternalState)
    external: List[ExternalSolar] = []
    universe: UniverseMetrics = Field(default_factory=UniverseMetrics)

# ============================================================
# Events
# ============================================================
class ActionEvent(BaseModel):
    event_id: str
    actor_id: str
    action_type: str
    energy: float = 1.0
    outcome_score: float = 1.0
    consistency: float = 1.0
    ts: float = 0

class PressureEvent(BaseModel):
    event_id: str
    source: str  # regulation, audit, deadline, sentiment
    magnitude: float = 0.0
    ts: float = 0

class ContractEvent(BaseModel):
    event_id: str
    contract_type: str  # promise, report, responsibility
    resolved: bool = False
    weight: float = 1.0
    ts: float = 0

class AlignmentEvent(BaseModel):
    event_id: str
    external_id: str
    goal_match: float = 1.0
    time_match: float = 1.0
    incentive_match: float = 1.0
    risk_match: float = 1.0
    ts: float = 0

# ============================================================
# Pressure Event (signals 포함)
# ============================================================
class SignalsPressureEvent(BaseModel):
    event_id: str
    target: str  # external_id
    signals: Dict[str, float]  # R, B, S, M
    source: str = "manual"
    ts: float = 0
