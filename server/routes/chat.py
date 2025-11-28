from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.chat_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/chat")
async def run_chat(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
