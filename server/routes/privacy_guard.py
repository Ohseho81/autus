from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.privacy_guard_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/privacy_guard")
async def run_privacy_guard(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
