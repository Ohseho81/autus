from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.scheduler_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/scheduler")
async def run_scheduler(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
