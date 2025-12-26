"""
Goal Coordinate API
Semantic Neutrality Compliant

Goal = pure coordinate S* = [E*, F*, R*]
Delta = S* - S (numbers only, no judgment)
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Literal
from datetime import datetime, timezone

router = APIRouter()

TimeHorizon = Literal["1day", "1week", "1month", "1year"]


class GoalCoordinate(BaseModel):
    energy: float = Field(ge=0.0, le=100.0)
    flow: float = Field(ge=0.0, le=100.0)
    risk: float = Field(ge=0.0, le=100.0)


class GoalSetRequest(BaseModel):
    coordinate: GoalCoordinate
    time_horizon: TimeHorizon = "1week"


class DeltaGoal(BaseModel):
    d_energy: float
    d_flow: float
    d_risk: float


class GoalResponse(BaseModel):
    goal_id: str
    coordinate: GoalCoordinate
    time_horizon: TimeHorizon
    delta: DeltaGoal
    updated_at: datetime


# Global state
_goal = {
    "energy": 50.0,
    "flow": 50.0,
    "risk": 50.0,
    "time_horizon": "1week"
}

# Current state (simulated)
_current = {
    "energy": 67.0,
    "flow": 55.0,
    "risk": 28.0
}


def _calc_delta() -> dict:
    """Calculate delta = goal - current"""
    return {
        "d_energy": _goal["energy"] - _current["energy"],
        "d_flow": _goal["flow"] - _current["flow"],
        "d_risk": _goal["risk"] - _current["risk"],
    }


@router.post("/goal/set", response_model=GoalResponse)
def goal_set(req: GoalSetRequest):
    """Set goal coordinate S*"""
    _goal["energy"] = req.coordinate.energy
    _goal["flow"] = req.coordinate.flow
    _goal["risk"] = req.coordinate.risk
    _goal["time_horizon"] = req.time_horizon
    
    return GoalResponse(
        goal_id="g_1",
        coordinate=GoalCoordinate(
            energy=_goal["energy"],
            flow=_goal["flow"],
            risk=_goal["risk"]
        ),
        time_horizon=_goal["time_horizon"],
        delta=DeltaGoal(**_calc_delta()),
        updated_at=datetime.now(timezone.utc),
    )


@router.get("/goal/get", response_model=GoalResponse)
def goal_get():
    """Get current goal state"""
    return GoalResponse(
        goal_id="g_1",
        coordinate=GoalCoordinate(
            energy=_goal["energy"],
            flow=_goal["flow"],
            risk=_goal["risk"]
        ),
        time_horizon=_goal["time_horizon"],
        delta=DeltaGoal(**_calc_delta()),
        updated_at=datetime.now(timezone.utc),
    )
