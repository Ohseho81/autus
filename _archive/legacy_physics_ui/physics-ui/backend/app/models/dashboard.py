from pydantic import BaseModel, Field
from datetime import datetime


class GaugeState(BaseModel):
    stability: float = Field(ge=0.0, le=1.0)
    pressure: float = Field(ge=0.0, le=1.0)
    drag: float = Field(ge=0.0, le=1.0)
    momentum: float = Field(ge=0.0, le=1.0)
    volatility: float = Field(ge=0.0, le=1.0)
    recovery: float = Field(ge=0.0, le=1.0)


class DashboardStateResponse(BaseModel):
    gauges: GaugeState
    updated_at: datetime
