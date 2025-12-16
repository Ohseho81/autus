# app/api/replay.py
"""
AUTUS Replay API

이벤트 리플레이 및 체인 검증
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import Event
from app.schemas import ReplayRequest, ReplayResponse, ReplayEvent
from app.physics import verify_chain

router = APIRouter(prefix="/replay", tags=["Replay"])


@router.post("/", response_model=ReplayResponse)
async def replay_entity(
    req: ReplayRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Entity 상태 리플레이
    
    지정 기간의 모든 Event를 조회하고
    체인 무결성을 검증.
    """
    q = await db.execute(
        select(Event)
        .where(
            Event.entity_id == req.entity_id,
            Event.ts >= req.ts_from,
            Event.ts <= req.ts_to,
        )
        .order_by(Event.ts.asc())
        .limit(req.limit)
    )
    events = q.scalars().all()
    
    # 체인 검증용 딕셔너리 변환
    event_dicts = [
        {
            "entity_id": e.entity_id,
            "entity_type": e.entity_type,
            "event_type": e.event_type,
            "ts": e.ts,
            "payload": e.payload,
            "audit_hash": e.audit_hash,
            "prev_hash": e.prev_hash,
        }
        for e in events
    ]
    
    chain_valid = verify_chain(event_dicts)
    
    return ReplayResponse(
        entity_id=req.entity_id,
        ts_from=req.ts_from,
        ts_to=req.ts_to,
        count=len(events),
        events=[
            ReplayEvent(
                id=str(e.id),
                event_type=e.event_type,
                ts=e.ts,
                payload=e.payload,
                audit_hash=e.audit_hash,
            )
            for e in events
        ],
        hash_chain_valid=chain_valid,
    )


@router.get("/verify/{entity_id}")
async def verify_entity_chain(
    entity_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Entity의 Event 체인 무결성 검증
    """
    q = await db.execute(
        select(Event)
        .where(Event.entity_id == entity_id)
        .order_by(Event.ts.asc())
        .limit(10000)
    )
    events = q.scalars().all()
    
    if not events:
        return {
            "entity_id": entity_id,
            "event_count": 0,
            "hash_chain_valid": True,
            "message": "No events found",
        }
    
    event_dicts = [
        {
            "entity_id": e.entity_id,
            "entity_type": e.entity_type,
            "event_type": e.event_type,
            "ts": e.ts,
            "payload": e.payload,
            "audit_hash": e.audit_hash,
            "prev_hash": e.prev_hash,
        }
        for e in events
    ]
    
    chain_valid = verify_chain(event_dicts)
    
    return {
        "entity_id": entity_id,
        "event_count": len(events),
        "hash_chain_valid": chain_valid,
        "first_event_ts": events[0].ts,
        "last_event_ts": events[-1].ts,
    }
