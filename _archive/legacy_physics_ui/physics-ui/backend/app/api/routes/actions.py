"""
POST /action/apply
POST /state/reset
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Literal

from app.core.state import apply_action, reset_state

router = APIRouter()


class ApplyActionRequest(BaseModel):
    action: Literal["hold", "push", "drift"]
    client_ts: str


class ApplyActionResponse(BaseModel):
    ok: bool
    action: str
    advanced: bool
    current_station: str
    progress: float


@router.post("/action/apply", response_model=ApplyActionResponse)
def action_apply(req: ApplyActionRequest):
    """Apply action (hold/push/drift)"""
    result = apply_action(req.action)
    return ApplyActionResponse(
        ok=True,
        action=result["action"],
        advanced=result["advanced"],
        current_station=result["current_station"],
        progress=result["progress"],
    )


@router.post("/state/reset")
def state_reset():
    """Reset state to initial values"""
    reset_state()
    return {"ok": True}
