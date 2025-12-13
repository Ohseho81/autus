"""
Atlas Envelope - Universal Contract (LOCKED)
"""
from pydantic import BaseModel, Field
from typing import List, Optional
import hashlib
import json

class AtlasEnvelope(BaseModel):
    """불변 계약 구조"""
    actor_id: str = Field(..., description="행위자 ID")
    intent: str = Field(..., description="의도")
    target: str = Field(..., description="대상")
    constraints: List[str] = Field(default_factory=list, description="제약조건")
    allowed_tools: List[str] = Field(default_factory=list, description="허용 도구")
    shadow_write: bool = Field(default=True, description="Shadow 기록 여부")
    audit_hash: Optional[str] = Field(default=None, description="감사 해시")
    
    def compute_hash(self) -> str:
        """Envelope 해시 계산"""
        data = self.dict(exclude={"audit_hash"})
        body = json.dumps(data, sort_keys=True)
        return hashlib.sha256(body.encode()).hexdigest()[:16]
    
    def seal(self) -> "AtlasEnvelope":
        """해시로 봉인"""
        self.audit_hash = self.compute_hash()
        return self

# 스키마 내보내기
ENVELOPE_SCHEMA = AtlasEnvelope.schema()
