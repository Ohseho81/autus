"""
Selfcheck Model
- 사용자 자기 평가 입력
- action 후 60초 윈도우 내에서만 허용
"""

from pydantic import BaseModel, Field
from datetime import datetime


class SelfcheckSubmitRequest(BaseModel):
    alignment: float = Field(ge=0.0, le=1.0)
    clarity: float = Field(ge=0.0, le=1.0)
    friction: float = Field(ge=0.0, le=1.0)
    momentum: float = Field(ge=0.0, le=1.0)
    confidence: float = Field(ge=0.0, le=1.0)
    recovery: float = Field(ge=0.0, le=1.0)
    client_ts: datetime


class SelfcheckSubmitResponse(BaseModel):
    ok: bool
    window_remaining_sec: float
