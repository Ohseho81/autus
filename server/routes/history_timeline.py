from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.history_timeline_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/history_timeline")
async def run_history_timeline(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
