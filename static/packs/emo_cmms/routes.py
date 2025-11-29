from fastapi import APIRouter
from .service import EmoCmmsService

router = APIRouter(prefix="/pack/emo_cmms")

@router.post("/run")
def run(payload: dict):
    return EmoCmmsService().run(payload)
