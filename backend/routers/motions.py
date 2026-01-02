"""
Motions Router - 돈 흐름 API
Zero Meaning 적용
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from database import get_db
from models import Node, Motion
from schemas.motion import MotionCreate, MotionResponse, MotionList

router = APIRouter(prefix="/motions", tags=["motions"])


@router.get("/", response_model=MotionList)
async def get_motions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    source_id: Optional[int] = None,
    target_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    모션 목록 조회
    
    - **source_id**: 출발 노드로 필터
    - **target_id**: 도착 노드로 필터
    """
    query = select(Motion)
    
    if source_id:
        query = query.where(Motion.source_id == source_id)
    if target_id:
        query = query.where(Motion.target_id == target_id)
    
    # Total count
    count_query = select(func.count(Motion.id))
    if source_id:
        count_query = count_query.where(Motion.source_id == source_id)
    if target_id:
        count_query = count_query.where(Motion.target_id == target_id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get motions
    query = query.order_by(Motion.occurred_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    motions = result.scalars().all()
    
    return MotionList(
        items=[MotionResponse.model_validate(m) for m in motions],
        total=total
    )


@router.post("/", response_model=MotionResponse, status_code=201)
async def create_motion(
    motion: MotionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    모션 생성 (돈 흐름)
    
    Zero Meaning: source_id, target_id, amount만
    """
    # 노드 존재 확인
    source_result = await db.execute(
        select(Node).where(Node.id == motion.source_id, Node.is_active == True)
    )
    source = source_result.scalar_one_or_none()
    
    target_result = await db.execute(
        select(Node).where(Node.id == motion.target_id, Node.is_active == True)
    )
    target = target_result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source node not found")
    if not target:
        raise HTTPException(status_code=404, detail="Target node not found")
    if motion.source_id == motion.target_id:
        raise HTTPException(status_code=400, detail="Source and target must be different")
    
    db_motion = Motion(
        source_id=motion.source_id,
        target_id=motion.target_id,
        amount=motion.amount
    )
    
    db.add(db_motion)
    await db.commit()
    await db.refresh(db_motion)
    
    return MotionResponse.model_validate(db_motion)


@router.get("/{motion_id}", response_model=MotionResponse)
async def get_motion(
    motion_id: int,
    db: AsyncSession = Depends(get_db)
):
    """단일 모션 조회"""
    result = await db.execute(select(Motion).where(Motion.id == motion_id))
    motion = result.scalar_one_or_none()
    
    if not motion:
        raise HTTPException(status_code=404, detail="Motion not found")
    
    return MotionResponse.model_validate(motion)


@router.delete("/{motion_id}")
async def delete_motion(
    motion_id: int,
    db: AsyncSession = Depends(get_db)
):
    """모션 삭제"""
    result = await db.execute(select(Motion).where(Motion.id == motion_id))
    motion = result.scalar_one_or_none()
    
    if not motion:
        raise HTTPException(status_code=404, detail="Motion not found")
    
    await db.delete(motion)
    await db.commit()
    
    return {"message": "Motion deleted", "motion_id": motion_id}


@router.get("/node/{node_id}/incoming")
async def get_incoming_motions(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """노드로 들어오는 모션 (유입)"""
    result = await db.execute(
        select(Motion)
        .where(Motion.target_id == node_id)
        .order_by(Motion.occurred_at.desc())
    )
    motions = result.scalars().all()
    
    total_amount = sum(m.amount for m in motions)
    
    return {
        "node_id": node_id,
        "incoming_count": len(motions),
        "total_amount": total_amount,
        "motions": [MotionResponse.model_validate(m) for m in motions]
    }


@router.get("/node/{node_id}/outgoing")
async def get_outgoing_motions(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """노드에서 나가는 모션 (유출)"""
    result = await db.execute(
        select(Motion)
        .where(Motion.source_id == node_id)
        .order_by(Motion.occurred_at.desc())
    )
    motions = result.scalars().all()
    
    total_amount = sum(m.amount for m in motions)
    
    return {
        "node_id": node_id,
        "outgoing_count": len(motions),
        "total_amount": total_amount,
        "motions": [MotionResponse.model_validate(m) for m in motions]
    }





"""
Motions Router - 돈 흐름 API
Zero Meaning 적용
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional

from database import get_db
from models import Node, Motion
from schemas.motion import MotionCreate, MotionResponse, MotionList

router = APIRouter(prefix="/motions", tags=["motions"])


@router.get("/", response_model=MotionList)
async def get_motions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    source_id: Optional[int] = None,
    target_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    모션 목록 조회
    
    - **source_id**: 출발 노드로 필터
    - **target_id**: 도착 노드로 필터
    """
    query = select(Motion)
    
    if source_id:
        query = query.where(Motion.source_id == source_id)
    if target_id:
        query = query.where(Motion.target_id == target_id)
    
    # Total count
    count_query = select(func.count(Motion.id))
    if source_id:
        count_query = count_query.where(Motion.source_id == source_id)
    if target_id:
        count_query = count_query.where(Motion.target_id == target_id)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get motions
    query = query.order_by(Motion.occurred_at.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    motions = result.scalars().all()
    
    return MotionList(
        items=[MotionResponse.model_validate(m) for m in motions],
        total=total
    )


@router.post("/", response_model=MotionResponse, status_code=201)
async def create_motion(
    motion: MotionCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    모션 생성 (돈 흐름)
    
    Zero Meaning: source_id, target_id, amount만
    """
    # 노드 존재 확인
    source_result = await db.execute(
        select(Node).where(Node.id == motion.source_id, Node.is_active == True)
    )
    source = source_result.scalar_one_or_none()
    
    target_result = await db.execute(
        select(Node).where(Node.id == motion.target_id, Node.is_active == True)
    )
    target = target_result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source node not found")
    if not target:
        raise HTTPException(status_code=404, detail="Target node not found")
    if motion.source_id == motion.target_id:
        raise HTTPException(status_code=400, detail="Source and target must be different")
    
    db_motion = Motion(
        source_id=motion.source_id,
        target_id=motion.target_id,
        amount=motion.amount
    )
    
    db.add(db_motion)
    await db.commit()
    await db.refresh(db_motion)
    
    return MotionResponse.model_validate(db_motion)


@router.get("/{motion_id}", response_model=MotionResponse)
async def get_motion(
    motion_id: int,
    db: AsyncSession = Depends(get_db)
):
    """단일 모션 조회"""
    result = await db.execute(select(Motion).where(Motion.id == motion_id))
    motion = result.scalar_one_or_none()
    
    if not motion:
        raise HTTPException(status_code=404, detail="Motion not found")
    
    return MotionResponse.model_validate(motion)


@router.delete("/{motion_id}")
async def delete_motion(
    motion_id: int,
    db: AsyncSession = Depends(get_db)
):
    """모션 삭제"""
    result = await db.execute(select(Motion).where(Motion.id == motion_id))
    motion = result.scalar_one_or_none()
    
    if not motion:
        raise HTTPException(status_code=404, detail="Motion not found")
    
    await db.delete(motion)
    await db.commit()
    
    return {"message": "Motion deleted", "motion_id": motion_id}


@router.get("/node/{node_id}/incoming")
async def get_incoming_motions(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """노드로 들어오는 모션 (유입)"""
    result = await db.execute(
        select(Motion)
        .where(Motion.target_id == node_id)
        .order_by(Motion.occurred_at.desc())
    )
    motions = result.scalars().all()
    
    total_amount = sum(m.amount for m in motions)
    
    return {
        "node_id": node_id,
        "incoming_count": len(motions),
        "total_amount": total_amount,
        "motions": [MotionResponse.model_validate(m) for m in motions]
    }


@router.get("/node/{node_id}/outgoing")
async def get_outgoing_motions(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """노드에서 나가는 모션 (유출)"""
    result = await db.execute(
        select(Motion)
        .where(Motion.source_id == node_id)
        .order_by(Motion.occurred_at.desc())
    )
    motions = result.scalars().all()
    
    total_amount = sum(m.amount for m in motions)
    
    return {
        "node_id": node_id,
        "outgoing_count": len(motions),
        "total_amount": total_amount,
        "motions": [MotionResponse.model_validate(m) for m in motions]
    }










