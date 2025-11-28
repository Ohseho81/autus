from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.jeju_school_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/jeju_school")
async def run_jeju_school(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
