from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime

from app.models.route import Point

MotionKind = Literal["orbit", "stream", "pulse"]


class Motion(BaseModel):
    motion_id: str
    kind: MotionKind
    path: list[Point] = Field(min_length=2)
    intensity: float = Field(ge=0.0, le=1.0)
    ttl_ms: int = Field(ge=1000, le=300000)


class MotionsResponse(BaseModel):
    motions: list[Motion]
    updated_at: datetime
