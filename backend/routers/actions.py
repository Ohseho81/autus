"""
Actions Router - 2버튼 시스템
CUT: 노드 삭제 (비활성화)
LINK: 노드 연결 (모션 생성)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database import get_db
from models import Node, Motion, ActionLog
from schemas.action import ActionCut, ActionLink, ActionResponse
from engines.value_calculator import ValueCalculator

router = APIRouter(prefix="/actions", tags=["actions"])
calculator = ValueCalculator()


@router.post("/cut", response_model=ActionResponse)
async def execute_cut(
    action: ActionCut,
    db: AsyncSession = Depends(get_db)
):
    """
    CUT: 노드 비활성화 + 연결 제거
    
    효과:
    - 노드 비활성화 (is_active = False)
    - 관련 모션 제거
    - 연결된 노드 시너지 재계산
    """
    # 노드 조회
    result = await db.execute(
        select(Node).where(Node.id == action.node_id, Node.is_active == True)
    )
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    before_value = node.value
    
    # 연결된 노드 ID 수집
    outgoing = await db.execute(
        select(Motion.target_id).where(Motion.source_id == action.node_id)
    )
    incoming = await db.execute(
        select(Motion.source_id).where(Motion.target_id == action.node_id)
    )
    
    affected_ids = set(
        [r[0] for r in outgoing.fetchall()] + 
        [r[0] for r in incoming.fetchall()]
    )
    affected_ids.discard(action.node_id)
    
    # 모션 제거
    await db.execute(
        delete(Motion).where(
            (Motion.source_id == action.node_id) | 
            (Motion.target_id == action.node_id)
        )
    )
    
    # 노드 비활성화
    node.is_active = False
    node.value = 0
    node.status = "DECAYING"
    
    # 액션 로그
    log = ActionLog(
        action_type="CUT",
        node_id=action.node_id,
        before_value=before_value,
        after_value=0
    )
    db.add(log)
    
    await db.commit()
    
    # 연결된 노드 재계산
    for affected_id in affected_ids:
        try:
            await calculator.calculate_value(db, affected_id)
        except Exception:
            pass
    
    return ActionResponse(
        action="CUT",
        success=True,
        node_id=action.node_id,
        before_value=before_value,
        after_value=0,
        affected_nodes=list(affected_ids),
        message=f"Node {action.node_id} cut successfully"
    )


@router.post("/link", response_model=ActionResponse)
async def execute_link(
    action: ActionLink,
    db: AsyncSession = Depends(get_db)
):
    """
    LINK: 두 노드 연결 (모션 생성)
    
    효과:
    - 새 모션 생성
    - 양쪽 노드 가치 재계산
    - 시너지 업데이트
    """
    # 노드 존재 확인
    source_result = await db.execute(
        select(Node).where(Node.id == action.source_id, Node.is_active == True)
    )
    source = source_result.scalar_one_or_none()
    
    target_result = await db.execute(
        select(Node).where(Node.id == action.target_id, Node.is_active == True)
    )
    target = target_result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source node not found")
    if not target:
        raise HTTPException(status_code=404, detail="Target node not found")
    if action.source_id == action.target_id:
        raise HTTPException(status_code=400, detail="Cannot link node to itself")
    
    before_source = source.value
    before_target = target.value
    
    # 모션 생성
    motion = Motion(
        source_id=action.source_id,
        target_id=action.target_id,
        amount=action.amount
    )
    db.add(motion)
    
    # 액션 로그
    log = ActionLog(
        action_type="LINK",
        node_id=action.source_id,
        target_node_id=action.target_id,
        before_value=before_source
    )
    db.add(log)
    
    await db.commit()
    
    # 양쪽 노드 재계산
    source_calc = await calculator.calculate_value(db, action.source_id)
    target_calc = await calculator.calculate_value(db, action.target_id)
    
    # 로그 업데이트
    log.after_value = source_calc["value"]
    await db.commit()
    
    return ActionResponse(
        action="LINK",
        success=True,
        node_id=action.source_id,
        before_value=before_source,
        after_value=source_calc["value"],
        affected_nodes=[action.source_id, action.target_id],
        message=f"Linked {action.source_id} → {action.target_id} with amount {action.amount}"
    )


@router.get("/history")
async def get_action_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """액션 히스토리 조회"""
    result = await db.execute(
        select(ActionLog)
        .order_by(ActionLog.executed_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    
    return {
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "action_type": log.action_type,
                "node_id": log.node_id,
                "target_node_id": log.target_node_id,
                "before_value": log.before_value,
                "after_value": log.after_value,
                "executed_at": log.executed_at.isoformat() if log.executed_at else None
            }
            for log in logs
        ]
    }





"""
Actions Router - 2버튼 시스템
CUT: 노드 삭제 (비활성화)
LINK: 노드 연결 (모션 생성)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from database import get_db
from models import Node, Motion, ActionLog
from schemas.action import ActionCut, ActionLink, ActionResponse
from engines.value_calculator import ValueCalculator

router = APIRouter(prefix="/actions", tags=["actions"])
calculator = ValueCalculator()


@router.post("/cut", response_model=ActionResponse)
async def execute_cut(
    action: ActionCut,
    db: AsyncSession = Depends(get_db)
):
    """
    CUT: 노드 비활성화 + 연결 제거
    
    효과:
    - 노드 비활성화 (is_active = False)
    - 관련 모션 제거
    - 연결된 노드 시너지 재계산
    """
    # 노드 조회
    result = await db.execute(
        select(Node).where(Node.id == action.node_id, Node.is_active == True)
    )
    node = result.scalar_one_or_none()
    
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")
    
    before_value = node.value
    
    # 연결된 노드 ID 수집
    outgoing = await db.execute(
        select(Motion.target_id).where(Motion.source_id == action.node_id)
    )
    incoming = await db.execute(
        select(Motion.source_id).where(Motion.target_id == action.node_id)
    )
    
    affected_ids = set(
        [r[0] for r in outgoing.fetchall()] + 
        [r[0] for r in incoming.fetchall()]
    )
    affected_ids.discard(action.node_id)
    
    # 모션 제거
    await db.execute(
        delete(Motion).where(
            (Motion.source_id == action.node_id) | 
            (Motion.target_id == action.node_id)
        )
    )
    
    # 노드 비활성화
    node.is_active = False
    node.value = 0
    node.status = "DECAYING"
    
    # 액션 로그
    log = ActionLog(
        action_type="CUT",
        node_id=action.node_id,
        before_value=before_value,
        after_value=0
    )
    db.add(log)
    
    await db.commit()
    
    # 연결된 노드 재계산
    for affected_id in affected_ids:
        try:
            await calculator.calculate_value(db, affected_id)
        except Exception:
            pass
    
    return ActionResponse(
        action="CUT",
        success=True,
        node_id=action.node_id,
        before_value=before_value,
        after_value=0,
        affected_nodes=list(affected_ids),
        message=f"Node {action.node_id} cut successfully"
    )


@router.post("/link", response_model=ActionResponse)
async def execute_link(
    action: ActionLink,
    db: AsyncSession = Depends(get_db)
):
    """
    LINK: 두 노드 연결 (모션 생성)
    
    효과:
    - 새 모션 생성
    - 양쪽 노드 가치 재계산
    - 시너지 업데이트
    """
    # 노드 존재 확인
    source_result = await db.execute(
        select(Node).where(Node.id == action.source_id, Node.is_active == True)
    )
    source = source_result.scalar_one_or_none()
    
    target_result = await db.execute(
        select(Node).where(Node.id == action.target_id, Node.is_active == True)
    )
    target = target_result.scalar_one_or_none()
    
    if not source:
        raise HTTPException(status_code=404, detail="Source node not found")
    if not target:
        raise HTTPException(status_code=404, detail="Target node not found")
    if action.source_id == action.target_id:
        raise HTTPException(status_code=400, detail="Cannot link node to itself")
    
    before_source = source.value
    before_target = target.value
    
    # 모션 생성
    motion = Motion(
        source_id=action.source_id,
        target_id=action.target_id,
        amount=action.amount
    )
    db.add(motion)
    
    # 액션 로그
    log = ActionLog(
        action_type="LINK",
        node_id=action.source_id,
        target_node_id=action.target_id,
        before_value=before_source
    )
    db.add(log)
    
    await db.commit()
    
    # 양쪽 노드 재계산
    source_calc = await calculator.calculate_value(db, action.source_id)
    target_calc = await calculator.calculate_value(db, action.target_id)
    
    # 로그 업데이트
    log.after_value = source_calc["value"]
    await db.commit()
    
    return ActionResponse(
        action="LINK",
        success=True,
        node_id=action.source_id,
        before_value=before_source,
        after_value=source_calc["value"],
        affected_nodes=[action.source_id, action.target_id],
        message=f"Linked {action.source_id} → {action.target_id} with amount {action.amount}"
    )


@router.get("/history")
async def get_action_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """액션 히스토리 조회"""
    result = await db.execute(
        select(ActionLog)
        .order_by(ActionLog.executed_at.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    
    return {
        "total": len(logs),
        "logs": [
            {
                "id": log.id,
                "action_type": log.action_type,
                "node_id": log.node_id,
                "target_node_id": log.target_node_id,
                "before_value": log.before_value,
                "after_value": log.after_value,
                "executed_at": log.executed_at.isoformat() if log.executed_at else None
            }
            for log in logs
        ]
    }










