from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.erp_adapter_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/erp_adapter")
async def run_erp_adapter(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
