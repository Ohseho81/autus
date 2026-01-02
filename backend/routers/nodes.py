"""
Nodes Router - CRUD API
Zero Meaning 적용
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from database import get_db
from models import Node
from schemas.node import NodeCreate, NodeUpdate, NodeResponse, NodeList, NodeCalculation
from engines.value_calculator import ValueCalculator

router = APIRouter(prefix="/nodes", tags=["nodes"])
calculator = ValueCalculator()


@router.get("/", response_model=NodeList)
async def get_nodes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    status: Optional[str] = Query(None, regex="^(STABLE|OVERHEATED|DECAYING)$"),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """
    노드 목록 조회
    
    - **skip**: 건너뛸 개수
    - **limit**: 조회 개수 (최대 10000)
    - **status**: 상태 필터 (STABLE, OVERHEATED, DECAYING)
    - **active_only**: 활성 노드만 조회
    """
    query = select(Node)
    
    if active_only:
        query = query.where(Node.is_active == True)
    
    if status:
        query = query.where(Node.status == status)
    
    # Total count
    count_query = select(func.count(Node.id))
    if active_only:
        count_query = count_query.where(Node.is_active == True)
    if status:
        count_query = count_query.where(Node.status == status)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get nodes
    query = query.order_by(Node.value.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    nodes = result.scalars().all()
    
    return NodeList(
        items=[NodeResponse.model_validate(n) for n in nodes],
        total=total,
        page=skip // limit + 1,
        limit=limit,
        has_next=(skip + limit) < total
    )


@router.post("/", response_model=NodeResponse, status_code=201)
async def create_node(
    node: NodeCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    노드 생성 (Zero Meaning)
    
    필수: lat, lon
    선택: value, time_cost
    """
    db_node = Node(
        lat=node.lat,
        lon=node.lon,
        value=node.value,
        time_cost=node.time_cost,
        direct_money=0,
        synergy_money=0,
        status="STABLE"
    )
    
    db.add(db_node)
    await db.commit()
    await db.refresh(db_node)
    
    return NodeResponse.model_validate(db_node)


@router.get("/{node_id}", response_model=NodeResponse)
async def get_node(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """단일 노드 조회"""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return NodeResponse.model_validate(node)


@router.put("/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: int,
    node_update: NodeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """노드 수정"""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    update_data = node_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(node, key, value)
    
    await db.commit()
    await db.refresh(node)
    
    return NodeResponse.model_validate(node)


@router.delete("/{node_id}")
async def delete_node(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """노드 삭제 (비활성화)"""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    node.is_active = False
    node.status = "DECAYING"
    await db.commit()
    
    return {"message": "Node deactivated", "node_id": node_id}


@router.post("/{node_id}/calculate", response_model=NodeCalculation)
async def calculate_node_value(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    노드 가치 재계산
    
    V = M - T + S
    """
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # 가치 계산
    calculation = await calculator.calculate_value(db, node_id)
    
    return NodeCalculation(
        node_id=node_id,
        value=calculation["value"],
        breakdown={
            "direct_money": calculation["direct_money"],
            "time_cost": calculation["time_cost"],
            "synergy_money": calculation["synergy_money"]
        },
        status=calculation["status"]
    )


@router.get("/{node_id}/predict")
async def predict_node_value(
    node_id: int,
    months: int = Query(12, ge=1, le=120),
    synergy_rate: float = Query(0.1, ge=0, le=1),
    db: AsyncSession = Depends(get_db)
):
    """
    복리 예측: Future V = V × (1 + s)^t
    """
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    predictions = calculator.predict_future_value(
        current_value=node.value,
        synergy_rate=synergy_rate,
        months=months
    )
    
    return {
        "node_id": node_id,
        "current_value": node.value,
        "synergy_rate": synergy_rate,
        "predictions": predictions
    }





"""
Nodes Router - CRUD API
Zero Meaning 적용
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional

from database import get_db
from models import Node
from schemas.node import NodeCreate, NodeUpdate, NodeResponse, NodeList, NodeCalculation
from engines.value_calculator import ValueCalculator

router = APIRouter(prefix="/nodes", tags=["nodes"])
calculator = ValueCalculator()


@router.get("/", response_model=NodeList)
async def get_nodes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=10000),
    status: Optional[str] = Query(None, regex="^(STABLE|OVERHEATED|DECAYING)$"),
    active_only: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """
    노드 목록 조회
    
    - **skip**: 건너뛸 개수
    - **limit**: 조회 개수 (최대 10000)
    - **status**: 상태 필터 (STABLE, OVERHEATED, DECAYING)
    - **active_only**: 활성 노드만 조회
    """
    query = select(Node)
    
    if active_only:
        query = query.where(Node.is_active == True)
    
    if status:
        query = query.where(Node.status == status)
    
    # Total count
    count_query = select(func.count(Node.id))
    if active_only:
        count_query = count_query.where(Node.is_active == True)
    if status:
        count_query = count_query.where(Node.status == status)
    
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Get nodes
    query = query.order_by(Node.value.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    nodes = result.scalars().all()
    
    return NodeList(
        items=[NodeResponse.model_validate(n) for n in nodes],
        total=total,
        page=skip // limit + 1,
        limit=limit,
        has_next=(skip + limit) < total
    )


@router.post("/", response_model=NodeResponse, status_code=201)
async def create_node(
    node: NodeCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    노드 생성 (Zero Meaning)
    
    필수: lat, lon
    선택: value, time_cost
    """
    db_node = Node(
        lat=node.lat,
        lon=node.lon,
        value=node.value,
        time_cost=node.time_cost,
        direct_money=0,
        synergy_money=0,
        status="STABLE"
    )
    
    db.add(db_node)
    await db.commit()
    await db.refresh(db_node)
    
    return NodeResponse.model_validate(db_node)


@router.get("/{node_id}", response_model=NodeResponse)
async def get_node(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """단일 노드 조회"""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    return NodeResponse.model_validate(node)


@router.put("/{node_id}", response_model=NodeResponse)
async def update_node(
    node_id: int,
    node_update: NodeUpdate,
    db: AsyncSession = Depends(get_db)
):
    """노드 수정"""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    update_data = node_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(node, key, value)
    
    await db.commit()
    await db.refresh(node)
    
    return NodeResponse.model_validate(node)


@router.delete("/{node_id}")
async def delete_node(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """노드 삭제 (비활성화)"""
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    node.is_active = False
    node.status = "DECAYING"
    await db.commit()
    
    return {"message": "Node deactivated", "node_id": node_id}


@router.post("/{node_id}/calculate", response_model=NodeCalculation)
async def calculate_node_value(
    node_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    노드 가치 재계산
    
    V = M - T + S
    """
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    # 가치 계산
    calculation = await calculator.calculate_value(db, node_id)
    
    return NodeCalculation(
        node_id=node_id,
        value=calculation["value"],
        breakdown={
            "direct_money": calculation["direct_money"],
            "time_cost": calculation["time_cost"],
            "synergy_money": calculation["synergy_money"]
        },
        status=calculation["status"]
    )


@router.get("/{node_id}/predict")
async def predict_node_value(
    node_id: int,
    months: int = Query(12, ge=1, le=120),
    synergy_rate: float = Query(0.1, ge=0, le=1),
    db: AsyncSession = Depends(get_db)
):
    """
    복리 예측: Future V = V × (1 + s)^t
    """
    result = await db.execute(select(Node).where(Node.id == node_id))
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    predictions = calculator.predict_future_value(
        current_value=node.value,
        synergy_rate=synergy_rate,
        months=months
    )
    
    return {
        "node_id": node_id,
        "current_value": node.value,
        "synergy_rate": synergy_rate,
        "predictions": predictions
    }










