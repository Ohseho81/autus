# app/schemas.py
"""
AUTUS Schemas — Pydantic Models (API Contract)
"""

from pydantic import BaseModel, Field
from typing import Literal, Optional, Any
from uuid import UUID


# ============================================
# Type Definitions (LOCK)
# ============================================

EntityType = Literal["human", "company", "city", "nation", "admin"]

PLANETS = [
    "OUTPUT", "QUALITY", "TIME", "FRICTION", "STABILITY",
    "COHESION", "RECOVERY", "TRANSFER", "SHOCK"
]


# ============================================
# Event Schemas
# ============================================

class EventCreate(BaseModel):
    """Event 생성 요청"""
    entity_id: str = Field(..., min_length=1, max_length=128)
    entity_type: EntityType
    event_type: str = Field(..., min_length=1, max_length=64)
    ts: int = Field(..., gt=0, description="Epoch milliseconds")
    payload: dict = Field(default_factory=dict)


class EventResponse(BaseModel):
    """Event 응답"""
    id: UUID
    entity_id: str
    entity_type: EntityType
    event_type: str
    ts: int
    payload: dict
    audit_hash: str
    prev_hash: Optional[str] = None


class IngestResponse(BaseModel):
    """Event ingest 결과"""
    event_id: str
    audit_hash: str
    snapshot_updated: bool
    snapshot_hash: Optional[str] = None


# ============================================
# Shadow Schemas
# ============================================

class ShadowResponse(BaseModel):
    """Shadow Snapshot 응답"""
    entity_id: str
    entity_type: EntityType
    ts: int
    shadow32f: list[float]
    planets9: dict[str, float]
    audit_hash: str


class ShadowBrief(BaseModel):
    """Shadow 요약 (Extension용)"""
    entity_id: str
    shadow: dict[str, float]
    ts: int
    simulated: bool = False


# ============================================
# Orbit Schemas
# ============================================

class PlanetPosition(BaseModel):
    """행성 위치"""
    key: str
    value: float
    x: float
    y: float
    z: float


class OrbitResponse(BaseModel):
    """Orbit 프레임 응답"""
    entity_id: str
    past: list[PlanetPosition]
    now: list[PlanetPosition]
    forecast: list[PlanetPosition]


# ============================================
# Simulation Schemas
# ============================================

class SimForces(BaseModel):
    """시뮬레이션 Force"""
    E: float = Field(default=0.0, ge=0.0, le=1.0, description="Energy")
    R: float = Field(default=0.0, ge=0.0, le=1.0, description="Reduce Friction")
    T: float = Field(default=0.0, ge=0.0, le=1.0, description="Time")
    Q: float = Field(default=0.0, ge=0.0, le=1.0, description="Quality")
    MU: float = Field(default=0.0, ge=0.0, le=1.0, description="Cohesion")


class SimPreviewRequest(BaseModel):
    """SimPreview 요청"""
    entity_id: str
    forces: SimForces = Field(default_factory=SimForces)


class SimPreviewResponse(BaseModel):
    """SimPreview 응답"""
    entity_id: str
    forces: dict
    current_planets: dict[str, float]
    forecast_planets: dict[str, float]
    forecast_orbit: list[PlanetPosition]
    delta: dict[str, float]


# ============================================
# Replay Schemas
# ============================================

class ReplayRequest(BaseModel):
    """리플레이 요청"""
    entity_id: str
    ts_from: int
    ts_to: int
    limit: int = Field(default=500, le=1000)


class ReplayEvent(BaseModel):
    """리플레이 이벤트"""
    id: str
    event_type: str
    ts: int
    payload: dict
    audit_hash: str


class ReplayResponse(BaseModel):
    """리플레이 응답"""
    entity_id: str
    ts_from: int
    ts_to: int
    count: int
    events: list[ReplayEvent]
    hash_chain_valid: bool


# ============================================
# Status Schemas
# ============================================

class HealthResponse(BaseModel):
    """Health check 응답"""
    ok: bool
    service: str
    version: str
    db_connected: bool


class StatusResponse(BaseModel):
    """시스템 상태"""
    status: Literal["GREEN", "YELLOW", "RED"]
    service: str
    version: str
    entities_count: int = 0
    events_count: int = 0
