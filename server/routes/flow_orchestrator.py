from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.flow_orchestrator_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/flow_orchestrator")
async def run_flow_orchestrator(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
