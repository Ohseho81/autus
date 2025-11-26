from fastapi import APIRouter
from typing import Any, Dict
from core.runtime.controller import RuntimeController
from packs.notification_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/notification")
async def run_notification(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
