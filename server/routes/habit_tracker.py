from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.habit_tracker_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/habit_tracker")
async def run_habit_tracker(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
