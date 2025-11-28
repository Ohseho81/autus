from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.billing_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/billing")
async def run_billing(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
