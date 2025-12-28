"""
AUTUS Auto-Pilot API Routes
============================

자동화 시스템 API 엔드포인트

Endpoints:
- GET  /api/autopilot/status        - 자동 조종 상태
- POST /api/autopilot/run           - 일일 자동화 실행
- GET  /api/autopilot/pending       - 대기 중인 자동 응답
- POST /api/autopilot/block/{id}    - 노드 차단
- DELETE /api/autopilot/block/{id}  - 차단 해제
- GET  /api/autopilot/projection    - 7일 시너지 예측
- POST /api/autopilot/message       - 메시지 처리 요청

Version: 1.0.0
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime
import logging

# 내부 모듈
from ..core.auto_pilot import AutoPilotSystem, AutoPilotConfig

logger = logging.getLogger("autus.autopilot")

router = APIRouter(prefix="/api/autopilot", tags=["Auto-Pilot"])


# ================================================================
# PYDANTIC MODELS
# ================================================================

class IncomingMessage(BaseModel):
    """들어오는 메시지"""
    node_id: str
    node_name: str
    synergy: float
    content: str = ""


class MessageBatchRequest(BaseModel):
    """메시지 일괄 처리 요청"""
    messages: List[IncomingMessage]


class BlockRequest(BaseModel):
    """차단 요청"""
    node_id: str
    node_name: str
    synergy: float
    reason: str = ""


class AutoPilotRunRequest(BaseModel):
    """자동화 실행 요청"""
    user_id: str = "default"
    include_messages: bool = True
    include_block: bool = True
    include_projection: bool = True


class NodeData(BaseModel):
    """노드 데이터"""
    id: str
    name: str
    synergy: float
    revenue: float = 0
    trend: float = 0


# ================================================================
# GLOBAL STATE
# ================================================================

# Auto-Pilot 시스템 인스턴스
_autopilot: Optional[AutoPilotSystem] = None


def get_autopilot() -> AutoPilotSystem:
    """Auto-Pilot 인스턴스 가져오기"""
    global _autopilot
    if _autopilot is None:
        _autopilot = AutoPilotSystem()
    return _autopilot


# ================================================================
# ENDPOINTS
# ================================================================

@router.get("/status")
async def get_autopilot_status():
    """
    자동 조종 상태 조회
    """
    autopilot = get_autopilot()
    dashboard = autopilot.get_dashboard_data()
    
    return {
        "status": "active",
        "config": {
            "golden_threshold": AutoPilotConfig.GOLDEN_THRESHOLD,
            "friction_threshold": AutoPilotConfig.FRICTION_THRESHOLD,
            "entropy_threshold": AutoPilotConfig.ENTROPY_THRESHOLD,
            "auto_reply_delay_hours": AutoPilotConfig.AUTO_REPLY_DELAY_HOURS,
        },
        "auto_reply": dashboard["auto_reply"],
        "auto_block": dashboard["auto_block"],
        "timestamp": datetime.now().isoformat(),
    }


@router.post("/run")
async def run_daily_automation(
    nodes: List[NodeData],
    messages: Optional[List[IncomingMessage]] = None,
):
    """
    일일 자동화 실행
    
    - 메시지 자동 응답
    - 엔트로피 노드 차단
    - 7일 시너지 예측
    """
    autopilot = get_autopilot()
    
    nodes_data = [
        {
            "id": n.id,
            "name": n.name,
            "synergy": n.synergy,
            "revenue": n.revenue,
            "trend": n.trend,
        }
        for n in nodes
    ]
    
    messages_data = None
    if messages:
        messages_data = [
            {
                "node_id": m.node_id,
                "node_name": m.node_name,
                "synergy": m.synergy,
                "content": m.content,
            }
            for m in messages
        ]
    
    results = autopilot.run_daily_automation(
        nodes=nodes_data,
        incoming_messages=messages_data,
    )
    
    return {
        "status": "success",
        "results": results,
    }


@router.post("/messages/process")
async def process_messages(request: MessageBatchRequest):
    """
    메시지 일괄 처리
    
    저시너지 노드 메시지에 대한 자동 응답 생성
    """
    autopilot = get_autopilot()
    
    messages = [
        {
            "node_id": m.node_id,
            "node_name": m.node_name,
            "synergy": m.synergy,
            "content": m.content,
        }
        for m in request.messages
    ]
    
    result = autopilot.auto_reply.process_incoming_messages(messages)
    
    return {
        "status": "success",
        "processed": result,
    }


@router.get("/pending")
async def get_pending_replies():
    """
    대기 중인 자동 응답 조회
    """
    autopilot = get_autopilot()
    pending = autopilot.auto_reply.get_pending_replies()
    
    return {
        "status": "success",
        "pending": pending,
    }


@router.post("/block")
async def block_node(request: BlockRequest):
    """
    노드 차단
    """
    autopilot = get_autopilot()
    
    blocked = autopilot.auto_block.block_node(
        node_id=request.node_id,
        node_name=request.node_name,
        synergy=request.synergy,
        reason=request.reason,
    )
    
    return {
        "status": "success",
        "blocked": {
            "id": blocked.id,
            "name": blocked.name,
            "synergy": blocked.synergy,
            "block_type": blocked.block_type.value,
            "review_at": blocked.review_at.isoformat(),
        },
    }


@router.delete("/block/{node_id}")
async def unblock_node(node_id: str):
    """
    노드 차단 해제
    """
    autopilot = get_autopilot()
    
    success = autopilot.auto_block.unblock_node(node_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"차단된 노드를 찾을 수 없습니다: {node_id}")
    
    return {
        "status": "success",
        "unblocked": node_id,
    }


@router.get("/blocked")
async def get_blocked_nodes():
    """
    차단된 노드 목록
    """
    autopilot = get_autopilot()
    
    blocked = autopilot.auto_block.blocked_nodes
    review_due = autopilot.auto_block.get_review_due()
    
    return {
        "status": "success",
        "blocked": [
            {
                "id": b.id,
                "name": b.name,
                "synergy": b.synergy,
                "block_type": b.block_type.value,
                "blocked_at": b.blocked_at.isoformat(),
                "review_at": b.review_at.isoformat(),
            }
            for b in blocked
        ],
        "review_due": [
            {
                "id": b.id,
                "name": b.name,
            }
            for b in review_due
        ],
    }


@router.post("/projection")
async def get_weekly_projection(nodes: List[NodeData]):
    """
    7일 시너지 예측
    """
    autopilot = get_autopilot()
    
    nodes_data = [
        {
            "id": n.id,
            "name": n.name,
            "synergy": n.synergy,
            "revenue": n.revenue,
            "trend": n.trend,
        }
        for n in nodes
    ]
    
    report = autopilot.projection.generate_weekly_report(nodes_data)
    
    return {
        "status": "success",
        "projection": {
            "generated_at": report.generated_at.isoformat(),
            "summary": {
                "total_nodes": report.total_nodes,
                "golden_projected_day7": report.golden_projected,
                "time_saved_hours": report.total_time_saved,
                "value_projection": report.value_projection,
            },
            "at_risk_nodes": report.at_risk_nodes,
            "rising_stars": report.rising_stars,
            "daily_forecast": report.daily_projections,
        },
    }


@router.get("/projection/node/{node_id}")
async def get_node_projection(
    node_id: str,
    node_name: str = "Unknown",
    synergy: float = 0.5
):
    """
    개별 노드 7일 예측
    """
    autopilot = get_autopilot()
    
    projections = autopilot.projection.project_single_node(
        node_id=node_id,
        node_name=node_name,
        current_synergy=synergy,
    )
    
    return {
        "status": "success",
        "node_id": node_id,
        "node_name": node_name,
        "current_synergy": synergy,
        "projections": [
            {
                "day": i + 1,
                "date": p.date.strftime("%Y-%m-%d"),
                "projected_synergy": p.projected_synergy,
                "trend": p.trend,
                "confidence": p.confidence,
                "recommended_action": p.recommended_action,
            }
            for i, p in enumerate(projections)
        ],
    }


@router.get("/rules")
async def get_auto_reply_rules():
    """
    자동 응답 규칙 조회
    """
    autopilot = get_autopilot()
    
    return {
        "status": "success",
        "rules": [
            {
                "id": r.id,
                "synergy_range": r.synergy_range,
                "action": r.action.value,
                "delay_hours": r.delay_hours,
                "template": r.template.value,
                "message": r.message,
                "enabled": r.enabled,
            }
            for r in autopilot.auto_reply.rules
        ],
    }


@router.get("/stats")
async def get_autopilot_stats():
    """
    자동화 통계
    """
    autopilot = get_autopilot()
    
    blocked_count = len(autopilot.auto_block.blocked_nodes)
    pending_replies = len(autopilot.auto_reply.pending_replies)
    
    time_saved_from_blocks = blocked_count * 2.5  # 시간
    time_saved_from_replies = pending_replies * 0.25  # 시간
    
    return {
        "status": "success",
        "automation_stats": {
            "blocked_nodes": blocked_count,
            "pending_replies": pending_replies,
            "time_saved_hours": time_saved_from_blocks + time_saved_from_replies,
        },
    }
