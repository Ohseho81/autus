from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.runtime_controller_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/runtime_controller")
async def run_runtime_controller(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
