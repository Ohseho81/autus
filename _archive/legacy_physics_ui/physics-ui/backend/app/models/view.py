"""
Unified Physics View Model
- Single payload for all UI data
"""

from pydantic import BaseModel, Field
from typing import Any
from datetime import datetime

from app.models.dashboard import GaugeState


class ActionOption(BaseModel):
    id: str
    label: str  # "Hold", "Push", "Drift" only


class RenderParams(BaseModel):
    line_opacity: float
    line_width: float
    node_opacity: float
    node_glow: float
    motion_speed: float
    motion_noise: float
    field_density: float
    field_turbulence: float
    shadow_hatch_density: float
    shadow_blur: float


class PhysicsViewResponse(BaseModel):
    gauges: GaugeState
    route: dict  # RouteResponse structure
    motions: dict  # MotionsResponse structure
    actions: list[ActionOption]
    render: RenderParams
    updated_at: datetime
