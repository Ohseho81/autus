"""
Stats Router - 시스템 통계
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models import Node, Motion, ActionLog

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/")
async def get_system_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    시스템 전체 통계
    
    - 총 노드 수
    - 총 모션 수
    - 총 가치
    - 상태별 분포
    - 건강 점수
    """
    # 총 노드 수
    total_nodes_result = await db.execute(
        select(func.count(Node.id)).where(Node.is_active == True)
    )
    total_nodes = total_nodes_result.scalar() or 0
    
    # 총 모션 수
    total_motions_result = await db.execute(select(func.count(Motion.id)))
    total_motions = total_motions_result.scalar() or 0
    
    # 총 가치
    total_value_result = await db.execute(
        select(func.sum(Node.value)).where(Node.is_active == True)
    )
    total_value = total_value_result.scalar() or 0
    
    # 상태별 분포
    status_result = await db.execute(
        select(Node.status, func.count(Node.id))
        .where(Node.is_active == True)
        .group_by(Node.status)
    )
    status_distribution = {row[0]: row[1] for row in status_result.fetchall()}
    
    # 음수 가치 노드
    negative_result = await db.execute(
        select(func.count(Node.id))
        .where(Node.is_active == True, Node.value < 0)
    )
    negative_nodes = negative_result.scalar() or 0
    
    # 건강 점수 계산
    health_score = calculate_health_score(
        total_nodes,
        status_distribution,
        negative_nodes
    )
    
    return {
        "total_nodes": total_nodes,
        "total_motions": total_motions,
        "total_value": float(total_value),
        "status_distribution": {
            "stable": status_distribution.get("STABLE", 0),
            "overheated": status_distribution.get("OVERHEATED", 0),
            "decaying": status_distribution.get("DECAYING", 0)
        },
        "negative_nodes": negative_nodes,
        "health_score": health_score
    }


@router.get("/actions")
async def get_action_stats(
    db: AsyncSession = Depends(get_db)
):
    """액션 통계"""
    # 액션 타입별 카운트
    action_result = await db.execute(
        select(ActionLog.action_type, func.count(ActionLog.id))
        .group_by(ActionLog.action_type)
    )
    action_counts = {row[0]: row[1] for row in action_result.fetchall()}
    
    # 최근 액션
    recent_result = await db.execute(
        select(ActionLog)
        .order_by(ActionLog.executed_at.desc())
        .limit(10)
    )
    recent_actions = recent_result.scalars().all()
    
    return {
        "total_actions": sum(action_counts.values()),
        "by_type": {
            "cut": action_counts.get("CUT", 0),
            "link": action_counts.get("LINK", 0)
        },
        "recent": [
            {
                "id": a.id,
                "type": a.action_type,
                "node_id": a.node_id,
                "executed_at": a.executed_at.isoformat() if a.executed_at else None
            }
            for a in recent_actions
        ]
    }


@router.get("/money-flow")
async def get_money_flow_stats(
    db: AsyncSession = Depends(get_db)
):
    """돈 흐름 통계"""
    # 총 흐름
    total_flow_result = await db.execute(select(func.sum(Motion.amount)))
    total_flow = total_flow_result.scalar() or 0
    
    # 평균 흐름
    avg_flow_result = await db.execute(select(func.avg(Motion.amount)))
    avg_flow = avg_flow_result.scalar() or 0
    
    # Top 유입 노드
    top_incoming = await db.execute(
        select(Motion.target_id, func.sum(Motion.amount).label("total"))
        .group_by(Motion.target_id)
        .order_by(func.sum(Motion.amount).desc())
        .limit(5)
    )
    
    # Top 유출 노드
    top_outgoing = await db.execute(
        select(Motion.source_id, func.sum(Motion.amount).label("total"))
        .group_by(Motion.source_id)
        .order_by(func.sum(Motion.amount).desc())
        .limit(5)
    )
    
    return {
        "total_flow": float(total_flow),
        "average_flow": float(avg_flow),
        "top_incoming": [
            {"node_id": row[0], "amount": float(row[1])}
            for row in top_incoming.fetchall()
        ],
        "top_outgoing": [
            {"node_id": row[0], "amount": float(row[1])}
            for row in top_outgoing.fetchall()
        ]
    }


def calculate_health_score(
    total_nodes: int,
    status_distribution: dict,
    negative_nodes: int
) -> float:
    """
    시스템 건강 점수 계산 (0-100)
    
    - 안정 비율: 40점
    - 쇠퇴 비율: 30점
    - 음수 비율: 30점
    """
    if total_nodes == 0:
        return 100.0
    
    # 안정 비율 (40점)
    stable_ratio = status_distribution.get("STABLE", 0) / total_nodes
    stable_score = stable_ratio * 40
    
    # 쇠퇴 비율 (30점)
    decaying_ratio = status_distribution.get("DECAYING", 0) / total_nodes
    decay_score = (1 - decaying_ratio) * 30
    
    # 음수 비율 (30점)
    negative_ratio = negative_nodes / total_nodes
    negative_score = (1 - negative_ratio) * 30
    
    return round(stable_score + decay_score + negative_score, 1)





"""
Stats Router - 시스템 통계
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from database import get_db
from models import Node, Motion, ActionLog

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/")
async def get_system_stats(
    db: AsyncSession = Depends(get_db)
):
    """
    시스템 전체 통계
    
    - 총 노드 수
    - 총 모션 수
    - 총 가치
    - 상태별 분포
    - 건강 점수
    """
    # 총 노드 수
    total_nodes_result = await db.execute(
        select(func.count(Node.id)).where(Node.is_active == True)
    )
    total_nodes = total_nodes_result.scalar() or 0
    
    # 총 모션 수
    total_motions_result = await db.execute(select(func.count(Motion.id)))
    total_motions = total_motions_result.scalar() or 0
    
    # 총 가치
    total_value_result = await db.execute(
        select(func.sum(Node.value)).where(Node.is_active == True)
    )
    total_value = total_value_result.scalar() or 0
    
    # 상태별 분포
    status_result = await db.execute(
        select(Node.status, func.count(Node.id))
        .where(Node.is_active == True)
        .group_by(Node.status)
    )
    status_distribution = {row[0]: row[1] for row in status_result.fetchall()}
    
    # 음수 가치 노드
    negative_result = await db.execute(
        select(func.count(Node.id))
        .where(Node.is_active == True, Node.value < 0)
    )
    negative_nodes = negative_result.scalar() or 0
    
    # 건강 점수 계산
    health_score = calculate_health_score(
        total_nodes,
        status_distribution,
        negative_nodes
    )
    
    return {
        "total_nodes": total_nodes,
        "total_motions": total_motions,
        "total_value": float(total_value),
        "status_distribution": {
            "stable": status_distribution.get("STABLE", 0),
            "overheated": status_distribution.get("OVERHEATED", 0),
            "decaying": status_distribution.get("DECAYING", 0)
        },
        "negative_nodes": negative_nodes,
        "health_score": health_score
    }


@router.get("/actions")
async def get_action_stats(
    db: AsyncSession = Depends(get_db)
):
    """액션 통계"""
    # 액션 타입별 카운트
    action_result = await db.execute(
        select(ActionLog.action_type, func.count(ActionLog.id))
        .group_by(ActionLog.action_type)
    )
    action_counts = {row[0]: row[1] for row in action_result.fetchall()}
    
    # 최근 액션
    recent_result = await db.execute(
        select(ActionLog)
        .order_by(ActionLog.executed_at.desc())
        .limit(10)
    )
    recent_actions = recent_result.scalars().all()
    
    return {
        "total_actions": sum(action_counts.values()),
        "by_type": {
            "cut": action_counts.get("CUT", 0),
            "link": action_counts.get("LINK", 0)
        },
        "recent": [
            {
                "id": a.id,
                "type": a.action_type,
                "node_id": a.node_id,
                "executed_at": a.executed_at.isoformat() if a.executed_at else None
            }
            for a in recent_actions
        ]
    }


@router.get("/money-flow")
async def get_money_flow_stats(
    db: AsyncSession = Depends(get_db)
):
    """돈 흐름 통계"""
    # 총 흐름
    total_flow_result = await db.execute(select(func.sum(Motion.amount)))
    total_flow = total_flow_result.scalar() or 0
    
    # 평균 흐름
    avg_flow_result = await db.execute(select(func.avg(Motion.amount)))
    avg_flow = avg_flow_result.scalar() or 0
    
    # Top 유입 노드
    top_incoming = await db.execute(
        select(Motion.target_id, func.sum(Motion.amount).label("total"))
        .group_by(Motion.target_id)
        .order_by(func.sum(Motion.amount).desc())
        .limit(5)
    )
    
    # Top 유출 노드
    top_outgoing = await db.execute(
        select(Motion.source_id, func.sum(Motion.amount).label("total"))
        .group_by(Motion.source_id)
        .order_by(func.sum(Motion.amount).desc())
        .limit(5)
    )
    
    return {
        "total_flow": float(total_flow),
        "average_flow": float(avg_flow),
        "top_incoming": [
            {"node_id": row[0], "amount": float(row[1])}
            for row in top_incoming.fetchall()
        ],
        "top_outgoing": [
            {"node_id": row[0], "amount": float(row[1])}
            for row in top_outgoing.fetchall()
        ]
    }


def calculate_health_score(
    total_nodes: int,
    status_distribution: dict,
    negative_nodes: int
) -> float:
    """
    시스템 건강 점수 계산 (0-100)
    
    - 안정 비율: 40점
    - 쇠퇴 비율: 30점
    - 음수 비율: 30점
    """
    if total_nodes == 0:
        return 100.0
    
    # 안정 비율 (40점)
    stable_ratio = status_distribution.get("STABLE", 0) / total_nodes
    stable_score = stable_ratio * 40
    
    # 쇠퇴 비율 (30점)
    decaying_ratio = status_distribution.get("DECAYING", 0) / total_nodes
    decay_score = (1 - decaying_ratio) * 30
    
    # 음수 비율 (30점)
    negative_ratio = negative_nodes / total_nodes
    negative_score = (1 - negative_ratio) * 30
    
    return round(stable_score + decay_score + negative_score, 1)











