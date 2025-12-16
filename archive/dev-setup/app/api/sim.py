# app/api/sim.py
"""
AUTUS Simulation API

시뮬레이션 미리보기 (DB 저장 없음)
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db import get_db
from app.models import ShadowSnapshot
from app.schemas import SimPreviewRequest, SimPreviewResponse, PlanetPosition
from app.physics import planets_to_orbit, apply_forces

router = APIRouter(prefix="/sim", tags=["Simulation"])


@router.post("/preview", response_model=SimPreviewResponse)
async def sim_preview(
    req: SimPreviewRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    시뮬레이션 미리보기
    
    LOCK:
    - 현실 데이터 변경 없음
    - 가상 forces는 계산에만 사용
    - DB에 저장하지 않음
    """
    q = await db.execute(
        select(ShadowSnapshot).where(ShadowSnapshot.entity_id == req.entity_id)
    )
    snap = q.scalar_one_or_none()
    
    if snap is None:
        raise HTTPException(404, f"Snapshot not found: {req.entity_id}")
    
    current_planets = dict(snap.planets9)
    
    # Force 적용 (가상)
    forces_dict = req.forces.model_dump()
    forecast_planets = apply_forces(current_planets, forces_dict)
    
    # Delta 계산
    delta = {
        k: round(forecast_planets[k] - current_planets[k], 4)
        for k in current_planets.keys()
    }
    
    # 예측 궤도
    forecast_orbit = [
        PlanetPosition(**p) 
        for p in planets_to_orbit(forecast_planets, t=2.0)
    ]
    
    return SimPreviewResponse(
        entity_id=req.entity_id,
        forces=forces_dict,
        current_planets=current_planets,
        forecast_planets=forecast_planets,
        forecast_orbit=forecast_orbit,
        delta=delta,
    )


@router.post("/what-if")
async def what_if(
    entity_id: str,
    e: float = 0.0,
    r: float = 0.0,
    t: float = 0.0,
    q: float = 0.0,
    mu: float = 0.0,
    db: AsyncSession = Depends(get_db),
):
    """
    What-If 간단 시뮬레이션 (쿼리 파라미터)
    """
    q_result = await db.execute(
        select(ShadowSnapshot).where(ShadowSnapshot.entity_id == entity_id)
    )
    snap = q_result.scalar_one_or_none()
    
    if snap is None:
        raise HTTPException(404, f"Snapshot not found: {entity_id}")
    
    current = dict(snap.planets9)
    forces = {"E": e, "R": r, "T": t, "Q": q, "MU": mu}
    
    forecast = apply_forces(current, forces)
    
    return {
        "entity_id": entity_id,
        "forces": forces,
        "current": current,
        "forecast": forecast,
        "impact": {k: round(forecast[k] - current[k], 4) for k in current},
    }
