from fastapi import APIRouter
from typing import Any, Dict
from packs.utils.controller import RuntimeController
from packs.weather_api_autogen import run as pack_run
router = APIRouter()
@router.post("/pack/weather_api")
async def run_weather_api(payload: Dict[str, Any]) -> Dict[str, Any]:
    controller = RuntimeController()
    return pack_run(controller, payload)
