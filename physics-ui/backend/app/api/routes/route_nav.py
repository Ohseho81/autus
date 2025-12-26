"""
Route Navigation API
Semantic Neutrality Compliant

L0 = Self (center)
L1 = Primary decision points
L2 = Secondary points
L3 = Background field (density only)
Shadow = Risk zone (hatch pattern, no color judgment)
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import math
import random

router = APIRouter()


class Point(BaseModel):
    x: float
    y: float


class Station(BaseModel):
    id: str
    layer: int = Field(ge=0, le=2)
    position: Point
    mass: float = Field(ge=0)
    shadow_intensity: float = Field(ge=0, le=1)


class Line(BaseModel):
    id: str
    from_station: str
    to_station: str
    flow_rate: float = Field(ge=0, le=1)
    delay: float = Field(ge=0, le=1)


class ShadowField(BaseModel):
    station_id: str
    radius: float
    intensity: float = Field(ge=0, le=1)


class RouteNavResponse(BaseModel):
    self_position: Point
    l1_stations: list[Station]
    l2_stations: list[Station]
    l3_field_density: float
    lines: list[Line]
    shadow_fields: list[ShadowField]
    active_route: list[str]
    updated_at: datetime


# Global state
_stations: list[dict] = []
_lines: list[dict] = []
_active_route: list[str] = []
_l3_density: float = 0.3
_initialized: bool = False


def _init():
    global _stations, _lines, _active_route, _l3_density, _initialized
    
    _stations = [{
        "id": "L0",
        "layer": 0,
        "x": 0.0,
        "y": 0.0,
        "mass": 2.0,
        "shadow_intensity": 0.0,
        "parent_id": ""
    }]
    _lines = []
    
    # L1 Stations (5)
    for i in range(5):
        angle = (i / 5) * math.pi * 2 + random.uniform(-0.2, 0.2)
        r = 0.25 + random.uniform(0, 0.1)
        shadow = random.uniform(0, 0.4)
        
        _stations.append({
            "id": f"L1_{i}",
            "layer": 1,
            "x": math.cos(angle) * r,
            "y": math.sin(angle) * r,
            "mass": 1.0 + random.uniform(0, 1.0),
            "shadow_intensity": shadow,
            "parent_id": "L0"
        })
        
        _lines.append({
            "id": f"line_L0_L1_{i}",
            "from_station": "L0",
            "to_station": f"L1_{i}",
            "flow_rate": 0.5 + random.uniform(0, 0.3),
            "delay": random.uniform(0, 0.3)
        })
    
    # L2 Stations (10)
    l1_list = [s for s in _stations if s["layer"] == 1]
    
    for i in range(10):
        parent = l1_list[i % len(l1_list)]
        offset_angle = random.uniform(0, math.pi * 2)
        offset_r = 0.15 + random.uniform(0, 0.1)
        shadow = random.uniform(0, 0.6)
        
        _stations.append({
            "id": f"L2_{i}",
            "layer": 2,
            "x": parent["x"] + math.cos(offset_angle) * offset_r,
            "y": parent["y"] + math.sin(offset_angle) * offset_r,
            "mass": 0.5 + random.uniform(0, 0.5),
            "shadow_intensity": shadow,
            "parent_id": parent["id"]
        })
        
        _lines.append({
            "id": f"line_{parent['id']}_L2_{i}",
            "from_station": parent["id"],
            "to_station": f"L2_{i}",
            "flow_rate": 0.3 + random.uniform(0, 0.4),
            "delay": random.uniform(0, 0.5)
        })
    
    # Set active route
    random_l1 = random.choice([s["id"] for s in l1_list])
    l2_children = [s["id"] for s in _stations if s["layer"] == 2 and s["parent_id"] == random_l1]
    _active_route = ["L0", random_l1]
    if l2_children:
        _active_route.append(random.choice(l2_children))
    
    _l3_density = 0.25 + random.uniform(0, 0.15)
    _initialized = True


def _ensure_init():
    if not _initialized:
        _init()


@router.get("/nav/route", response_model=RouteNavResponse)
def get_route_nav():
    """Get current route navigation state"""
    _ensure_init()
    
    l1 = [
        Station(
            id=s["id"],
            layer=s["layer"],
            position=Point(x=s["x"], y=s["y"]),
            mass=s["mass"],
            shadow_intensity=s["shadow_intensity"]
        )
        for s in _stations if s["layer"] == 1
    ]
    
    l2 = [
        Station(
            id=s["id"],
            layer=s["layer"],
            position=Point(x=s["x"], y=s["y"]),
            mass=s["mass"],
            shadow_intensity=s["shadow_intensity"]
        )
        for s in _stations if s["layer"] == 2
    ]
    
    lines = [
        Line(
            id=l["id"],
            from_station=l["from_station"],
            to_station=l["to_station"],
            flow_rate=l["flow_rate"],
            delay=l["delay"]
        )
        for l in _lines
    ]
    
    shadows = [
        ShadowField(
            station_id=s["id"],
            radius=30 + s["shadow_intensity"] * 40,
            intensity=s["shadow_intensity"]
        )
        for s in _stations if s["shadow_intensity"] > 0.1
    ]
    
    return RouteNavResponse(
        self_position=Point(x=0.0, y=0.0),
        l1_stations=l1,
        l2_stations=l2,
        l3_field_density=_l3_density,
        lines=lines,
        shadow_fields=shadows,
        active_route=_active_route,
        updated_at=datetime.now(timezone.utc)
    )


@router.post("/nav/reset")
def reset_route():
    """Reset and regenerate route network"""
    _init()
    return {"ok": True}
