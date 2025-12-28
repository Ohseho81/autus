"""
POST /selfcheck/submit
- Selfcheck within action window
"""

from fastapi import APIRouter, HTTPException

from app.core.state import submit_selfcheck
from app.core.store import STORE
from app.models.selfcheck import SelfcheckSubmitRequest, SelfcheckSubmitResponse

router = APIRouter()


@router.post("/selfcheck/submit", response_model=SelfcheckSubmitResponse)
def selfcheck_submit(req: SelfcheckSubmitRequest):
    """Submit selfcheck (only valid within 60s window after action)"""
    
    success, remaining = submit_selfcheck(
        alignment=req.alignment,
        clarity=req.clarity,
        friction=req.friction,
        momentum=req.momentum,
        confidence=req.confidence,
        recovery=req.recovery,
    )
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="window_closed"
        )
    
    return SelfcheckSubmitResponse(ok=True, window_remaining_sec=remaining)
