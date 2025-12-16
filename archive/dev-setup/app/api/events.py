# app/api/events.py
"""
AUTUS Events API

Event 적재 및 조회
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db import get_db
from app.models import Event, ShadowSnapshot, TracePair
from app.schemas import EventCreate, EventResponse, IngestResponse
from app.physics import sha256_hex, shadow_to_planets

router = APIRouter(prefix="/events", tags=["Events"])


@router.post("/ingest", response_model=IngestResponse)
async def ingest_event(
    event: EventCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Event 적재
    
    LOCK: Event는 immutable. 적재 후 수정/삭제 불가.
    payload에 shadow32f가 있으면 Snapshot도 갱신.
    """
    entity_id = event.entity_id
    
    # 1. 이전 Event의 audit_hash 조회
    last_evt_q = await db.execute(
        select(Event)
        .where(Event.entity_id == entity_id)
        .order_by(Event.ts.desc())
        .limit(1)
    )
    last_evt = last_evt_q.scalar_one_or_none()
    prev_hash = last_evt.audit_hash if last_evt else None
    
    # 2. audit_hash 계산
    audit_hash = sha256_hex({
        "prev": prev_hash,
        "entity_id": event.entity_id,
        "entity_type": event.entity_type,
        "event_type": event.event_type,
        "ts": event.ts,
        "payload": event.payload,
    })
    
    # 3. Event 저장
    evt = Event(
        entity_id=event.entity_id,
        entity_type=event.entity_type,
        event_type=event.event_type,
        ts=event.ts,
        payload=event.payload,
        audit_hash=audit_hash,
        prev_hash=prev_hash,
    )
    db.add(evt)
    await db.flush()
    
    # 4. Snapshot 갱신 체크
    incoming_shadow = event.payload.get("shadow32f")
    
    if incoming_shadow is None:
        await db.commit()
        return IngestResponse(
            event_id=str(evt.id),
            audit_hash=audit_hash,
            snapshot_updated=False,
        )
    
    # 5. Planets 계산
    planets9 = shadow_to_planets(incoming_shadow)
    
    # 6. Snapshot hash 계산
    snap_hash = sha256_hex({
        "entity_id": entity_id,
        "ts": event.ts,
        "shadow32f": incoming_shadow,
        "planets9": planets9,
    })
    
    # 7. Snapshot UPSERT
    snap_q = await db.execute(
        select(ShadowSnapshot).where(ShadowSnapshot.entity_id == entity_id)
    )
    snap = snap_q.scalar_one_or_none()
    
    if snap is None:
        snap = ShadowSnapshot(
            entity_id=entity_id,
            entity_type=event.entity_type,
            ts=event.ts,
            shadow32f=incoming_shadow,
            planets9=planets9,
            audit_hash=snap_hash,
            last_event_id=evt.id,
        )
        db.add(snap)
    else:
        snap.entity_type = event.entity_type
        snap.ts = event.ts
        snap.shadow32f = incoming_shadow
        snap.planets9 = planets9
        snap.audit_hash = snap_hash
        snap.last_event_id = evt.id
    
    # 8. TracePair 기록
    db.add(TracePair(
        entity_id=entity_id,
        source_event_id=evt.id,
        derived_snapshot_hash=snap_hash,
        ts=event.ts,
    ))
    
    await db.commit()
    
    return IngestResponse(
        event_id=str(evt.id),
        audit_hash=audit_hash,
        snapshot_updated=True,
        snapshot_hash=snap_hash,
    )


@router.get("/{entity_id}", response_model=list[EventResponse])
async def list_events(
    entity_id: str,
    ts_from: int = 0,
    ts_to: int = 9999999999999,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """Entity의 Event 목록 조회"""
    q = await db.execute(
        select(Event)
        .where(
            Event.entity_id == entity_id,
            Event.ts >= ts_from,
            Event.ts <= ts_to,
        )
        .order_by(Event.ts.asc())
        .limit(limit)
    )
    events = q.scalars().all()
    
    return [
        EventResponse(
            id=e.id,
            entity_id=e.entity_id,
            entity_type=e.entity_type,
            event_type=e.event_type,
            ts=e.ts,
            payload=e.payload,
            audit_hash=e.audit_hash,
            prev_hash=e.prev_hash,
        )
        for e in events
    ]


@router.get("/count/{entity_id}")
async def count_events(
    entity_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Entity의 Event 개수"""
    q = await db.execute(
        select(func.count(Event.id)).where(Event.entity_id == entity_id)
    )
    count = q.scalar()
    return {"entity_id": entity_id, "count": count}
