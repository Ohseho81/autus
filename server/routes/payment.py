from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.payment_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/payment")
async def run_payment(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
