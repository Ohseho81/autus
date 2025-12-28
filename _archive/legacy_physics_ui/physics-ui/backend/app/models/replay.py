"""
Replay Models
"""

from pydantic import BaseModel
from typing import Any
from datetime import datetime


class ReplayEvent(BaseModel):
    type: str
    payload: dict
    ts: str


class ReplayEventsResponse(BaseModel):
    events: list[ReplayEvent]
    count: int


class ReplayRunRequest(BaseModel):
    use_store: bool = False
    events: list[dict] = []


class ReplayRunResponse(BaseModel):
    gauges: dict
    route: dict
    motions: dict
    render: dict
    event_count: int
    action_count: int
    selfcheck_count: int
