# app/api/shadow.py
"""
AUTUS Shadow API

Shadow Snapshot 조회
"""

import time
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import ShadowSnapshot
from app.schemas import ShadowResponse, ShadowBrief
from app.physics import PLANETS

router = APIRouter(prefix="/shadow", tags=["Shadow"])


@router.get("/{entity_id}", response_model=ShadowResponse)
async def get_shadow(
    entity_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Entity의 현재 Shadow State 조회"""
    q = await db.execute(
        select(ShadowSnapshot).where(ShadowSnapshot.entity_id == entity_id)
    )
    snap = q.scalar_one_or_none()
    
    if snap is None:
        raise HTTPException(404, f"Snapshot not found: {entity_id}")
    
    return ShadowResponse(
        entity_id=snap.entity_id,
        entity_type=snap.entity_type,
        ts=snap.ts,
        shadow32f=snap.shadow32f,
        planets9=snap.planets9,
        audit_hash=snap.audit_hash,
    )


@router.get("/snapshot/{entity_id}", response_model=ShadowBrief)
async def get_shadow_brief(
    entity_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Shadow 요약 (Extension 호환)
    
    DB에 없으면 시뮬레이션 데이터 반환
    """
    q = await db.execute(
        select(ShadowSnapshot).where(ShadowSnapshot.entity_id == entity_id)
    )
    snap = q.scalar_one_or_none()
    
    if snap is not None:
        # 소문자 변환 (Extension 호환)
        shadow = {k.lower(): v for k, v in snap.planets9.items()}
        return ShadowBrief(
            entity_id=entity_id,
            shadow=shadow,
            ts=snap.ts,
            simulated=False,
        )
    
    # 시뮬레이션 데이터
    t = time.time()
    seed = sum(ord(c) for c in entity_id)
    
    shadow = {}
    for i, planet in enumerate(PLANETS):
        phase = seed + i * 0.7
        value = 0.5 + 0.3 * math.sin(t * 0.1 + phase)
        shadow[planet.lower()] = round(value, 3)
    
    return ShadowBrief(
        entity_id=entity_id,
        shadow=shadow,
        ts=int(t * 1000),
        simulated=True,
    )


@router.get("/list/all")
async def list_all_snapshots(
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    """전체 Snapshot 목록"""
    q = await db.execute(
        select(ShadowSnapshot)
        .order_by(ShadowSnapshot.ts.desc())
        .limit(limit)
    )
    snapshots = q.scalars().all()
    
    return [
        {
            "entity_id": s.entity_id,
            "entity_type": s.entity_type,
            "ts": s.ts,
            "audit_hash": s.audit_hash,
        }
        for s in snapshots
    ]
