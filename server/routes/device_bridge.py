from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.device_bridge_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/device_bridge")
async def run_device_bridge(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
