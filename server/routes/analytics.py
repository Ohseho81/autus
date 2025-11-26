from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.analytics_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/analytics")
async def run_analytics(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
