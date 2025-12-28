"""
Goal Coordinate Models
Semantic Neutrality Compliant

Goal = pure coordinate S* = [E*, F*, R*]
No "good" or "bad" judgments
Numbers only
"""

from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal

TimeHorizon = Literal["1day", "1week", "1month", "1year"]


class GoalCoordinate(BaseModel):
    """3-axis goal coordinate"""
    energy: float = Field(ge=0.0, le=100.0)
    flow: float = Field(ge=0.0, le=100.0)
    risk: float = Field(ge=0.0, le=100.0)


class GoalSetRequest(BaseModel):
    """Request to set goal coordinate"""
    coordinate: GoalCoordinate
    time_horizon: TimeHorizon = "1week"


class DeltaGoal(BaseModel):
    """Delta = Goal - Current (numbers only)"""
    d_energy: float
    d_flow: float
    d_risk: float


class GoalResponse(BaseModel):
    """Goal state response"""
    goal_id: str
    coordinate: GoalCoordinate
    time_horizon: TimeHorizon
    delta: DeltaGoal
    updated_at: datetime
