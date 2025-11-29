from fastapi import APIRouter
from .service import JejuSchoolService

router = APIRouter(prefix="/pack/jeju_school")

@router.post("/run")
def run(payload: dict):
    return JejuSchoolService().run(payload)
