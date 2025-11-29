"""
Auto-generated Pydantic models for city_os
Generated: 2025-11-29T12:40:05.055445
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal, Any
from datetime import datetime, timedelta

class Zone(BaseModel):
    """도시 구역"""
    zone_id: str = Field(..., description="Primary key")
    name: Optional[str] = None
    type: Optional[Literal['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'GREEN']] = None
    population: Optional[int] = None

class Sensor(BaseModel):
    """IoT 센서"""
    sensor_id: str = Field(..., description="Primary key")
    zone_id: Optional[str] = None
    type: Optional[Literal['TRAFFIC', 'AIR_QUALITY', 'NOISE', 'WEATHER', 'CCTV']] = None
    status: Optional[Literal['ACTIVE', 'INACTIVE', 'ERROR']] = None

class TrafficSignal(BaseModel):
    """교통 신호"""
    signal_id: str = Field(..., description="Primary key")
    zone_id: Optional[str] = None
    mode: Optional[Literal['NORMAL', 'RUSH_HOUR', 'EMERGENCY']] = None

class Incident(BaseModel):
    """사건/사고"""
    incident_id: str = Field(..., description="Primary key")
    zone_id: Optional[str] = None
    type: Optional[Literal['TRAFFIC', 'FIRE', 'CRIME', 'DISASTER']] = None
    severity: Optional[Literal['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']] = None
    status: Optional[Literal['REPORTED', 'RESPONDING', 'RESOLVED']] = None
