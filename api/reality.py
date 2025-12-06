"""Reality Event Engine - OS 입력 포트"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime

router = APIRouter(prefix="/reality", tags=["Reality"])
event_store: List[Dict] = []

class RealityEvent(BaseModel):
    type: str
    device: str
    value: Any
    timestamp: Optional[datetime] = None
    meta: Optional[Dict[str, Any]] = None

@router.post("/event")
async def ingest_event(event: RealityEvent):
    ts = event.timestamp or datetime.utcnow()
    event_data = {"id": len(event_store)+1, "type": event.type, "device": event.device, "value": event.value, "timestamp": ts.isoformat()}
    event_store.append(event_data)
    print(f"[Reality] {event.type} {event.device} {event.value}")
    return {"status": "ok", "event_id": event_data["id"]}

@router.get("/events")
async def get_events():
    return {"count": len(event_store), "events": event_store[-100:]}
