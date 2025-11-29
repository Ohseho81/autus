from fastapi import APIRouter
from .service import NbaAtbService

router = APIRouter(prefix="/pack/nba_atb")

@router.post("/run")
def run(payload: dict):
    return NbaAtbService().run(payload)
