from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal


class GoalSetRequest(BaseModel):
    goal_text: str = Field(min_length=1, max_length=80)
    mode: Literal["replace"] = "replace"


class GoalResponse(BaseModel):
    goal_id: str
    goal_state: Literal["active", "inactive"] = "active"
    stability: float = Field(ge=0.0, le=1.0)
    updated_at: datetime
