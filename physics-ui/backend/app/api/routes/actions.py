from fastapi import APIRouter
from app.models.action import ApplyActionRequest
from app.core.state import apply_action

router = APIRouter()


@router.post("/action/apply")
def action_apply(req: ApplyActionRequest):
    apply_action(req.action)
    return {"ok": True}
