"""Base classes for Tile Services"""
from pydantic import BaseModel
from typing import Any, Optional, Dict, List
from datetime import datetime, timezone


class TileMeta(BaseModel):
    """Standard metadata for all tile responses"""
    generated_at: datetime = None
    source: str = "autus_lime_kernel"
    version: str = "1.0.0"
    confidence: Optional[float] = None
    cache_ttl: int = 60  # seconds
    
    def __init__(self, **data):
        if 'generated_at' not in data or data['generated_at'] is None:
            data['generated_at'] = datetime.now(timezone.utc)
        super().__init__(**data)


class TileResponse(BaseModel):
    """Standard response wrapper for all tiles"""
    data: Dict[str, Any]
    meta: TileMeta
    
    @classmethod
    def create(cls, data: Dict[str, Any], confidence: float = None, **meta_kwargs):
        meta = TileMeta(confidence=confidence, **meta_kwargs)
        return cls(data=data, meta=meta)


class TileError(BaseModel):
    """Standard error response"""
    error: Dict[str, str]
    
    @classmethod
    def create(cls, code: str, message: str, hint: str = None):
        error = {"code": code, "message": message}
        if hint:
            error["hint"] = hint
        return cls(error=error)
