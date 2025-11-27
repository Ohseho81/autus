from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.identity_core_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/identity_core")
async def run_identity_core(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
