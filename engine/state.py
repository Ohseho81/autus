"""태양·행성 상태 모델"""
from pydantic import BaseModel, Field
from typing import List, Optional

class SolarState(BaseModel):
    brain: float = Field(0.5, ge=0, le=1)
    heart: float = Field(0.5, ge=0, le=1)
    sensors: float = Field(0.5, ge=0, le=1)
    engines: float = Field(0.5, ge=0, le=1)
    core: float = Field(0.5, ge=0, le=1)
    base: float = Field(0.5, ge=0, le=1)
    boundary: float = Field(0.5, ge=0, le=1)
    
    pressure: float = 0.0
    entropy: float = 0.0
    tick: int = 0

class Planet(BaseModel):
    id: str
    name: str
    mass: float = Field(1.0, ge=0)
    velocity: float = 0.0
    category: str = "general"
    stability: float = 1.0
    created_tick: int = 0
