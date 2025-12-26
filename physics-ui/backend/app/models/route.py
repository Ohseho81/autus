from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime


class Point(BaseModel):
    x: float
    y: float


StationKind = Literal["align", "acquire", "commit", "build", "verify", "deploy", "lock"]


class RouteStation(BaseModel):
    id: str
    x: float
    y: float
    kind: StationKind


AlternateTrigger = Literal["risk", "delay", "info"]


class AlternateRoute(BaseModel):
    trigger: AlternateTrigger
    route: list[Point] = Field(min_length=2)


class RouteResponse(BaseModel):
    destination: Point
    current_station: RouteStation
    next_station: RouteStation
    primary_route: list[Point] = Field(min_length=2)
    alternates: list[AlternateRoute] = []
    ttl_ms: int = Field(ge=1000, le=300000)
    updated_at: datetime
