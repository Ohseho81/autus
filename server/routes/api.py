from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

router = APIRouter()

@router.get("/risk/report")
def get_risk_report():
    # 샘플 데이터, 실제 구현시 risk_reporter 연동
    return {"risks": [{"id": "R1", "name": "Test", "severity": "HIGH"}]}

@router.post("/workflow/trigger")
def trigger_workflow(request: Request):
    # 샘플 응답, 실제 구현시 workflow engine 연동
    return {"status": "success"}
