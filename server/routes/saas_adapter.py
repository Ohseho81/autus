from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.saas_adapter_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/saas_adapter")
async def run_saas_adapter(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
