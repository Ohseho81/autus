from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.risk_monitor_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/risk_monitor")
async def run_risk_monitor(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
