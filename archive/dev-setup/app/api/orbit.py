# app/api/orbit.py
"""
AUTUS Orbit API

궤도 프레임 조회
"""

import time
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import ShadowSnapshot
from app.schemas import OrbitResponse, PlanetPosition
from app.physics import PLANETS, planets_to_orbit

router = APIRouter(prefix="/orbit", tags=["Orbit"])


@router.get("/{entity_id}", response_model=OrbitResponse)
async def get_orbit(
    entity_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Entity의 궤도 프레임 조회
    
    LOCK:
    - past/now/forecast는 t 파라미터만 다름
    - 확률이 아닌 결정론적 물리 연장
    """
    q = await db.execute(
        select(ShadowSnapshot).where(ShadowSnapshot.entity_id == entity_id)
    )
    snap = q.scalar_one_or_none()
    
    if snap is None:
        raise HTTPException(404, f"Snapshot not found: {entity_id}")
    
    planets9 = snap.planets9
    
    return OrbitResponse(
        entity_id=entity_id,
        past=[PlanetPosition(**p) for p in planets_to_orbit(planets9, t=0.0)],
        now=[PlanetPosition(**p) for p in planets_to_orbit(planets9, t=1.0)],
        forecast=[PlanetPosition(**p) for p in planets_to_orbit(planets9, t=2.0)],
    )


@router.get("/frames/{entity_id}")
async def get_orbit_frames(
    entity_id: str,
    window: int = Query(default=3600000, description="Time window in ms"),
    density: int = Query(default=30, description="Number of frames"),
    db: AsyncSession = Depends(get_db),
):
    """
    Extension 호환 Orbit API
    
    DB에 없으면 시뮬레이션 데이터 반환
    """
    q = await db.execute(
        select(ShadowSnapshot).where(ShadowSnapshot.entity_id == entity_id)
    )
    snap = q.scalar_one_or_none()
    
    if snap is not None:
        planets9 = snap.planets9
        return {
            "entity_id": entity_id,
            "past": planets_to_orbit(planets9, t=0.0),
            "now": planets_to_orbit(planets9, t=1.0),
            "forecast": planets_to_orbit(planets9, t=2.0),
        }
    
    # 시뮬레이션 데이터
    t = time.time()
    seed = sum(ord(c) for c in entity_id)
    
    simulated_planets = {}
    for i, planet in enumerate(PLANETS):
        phase = seed + i * 0.7
        simulated_planets[planet] = 0.5 + 0.3 * math.sin(t * 0.1 + phase)
    
    return {
        "entity_id": entity_id,
        "past": planets_to_orbit(simulated_planets, t=0.0),
        "now": planets_to_orbit(simulated_planets, t=1.0),
        "forecast": planets_to_orbit(simulated_planets, t=2.0),
        "simulated": True,
    }
