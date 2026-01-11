"""
AUTUS Kernel API v2.0
=====================

6 Physics × 12 Motion × 6 Collector × 5 Projection 커널 API
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time

from core.kernel import (
    AUTUSKernel, get_kernel, reset_kernel,
    Node, Motion, Collector, Projection,
    MotionEvent, NODE_META, MOTION_META
)


# ============================================================
# Router
# ============================================================

router = APIRouter(prefix="/api/kernel", tags=["kernel"])


# ============================================================
# Pydantic Models
# ============================================================

class MotionEventRequest(BaseModel):
    from_node: Optional[int] = Field(None, ge=0, le=5, description="출발 노드 (0-5, None=외부)")
    to_node: Optional[int] = Field(None, ge=0, le=5, description="도착 노드 (0-5, None=외부)")
    delta: float = Field(..., ge=-1.0, le=1.0, description="변화량 [-1, 1]")
    friction: float = Field(0.1, ge=0.0, le=1.0, description="저항 [0, 1]")
    timestamp: Optional[int] = None
    collector: Optional[int] = Field(None, ge=0, le=5)
    raw_type: Optional[str] = None


class BatchEventRequest(BaseModel):
    events: List[MotionEventRequest]


# ============================================================
# Endpoints
# ============================================================

@router.get("/")
async def kernel_root():
    """커널 정보"""
    return {
        "name": "AUTUS Kernel API",
        "version": "2.0.0",
        "structure": {
            "nodes": 6,
            "motions": 12,
            "collectors": 6,
            "projections": 5,
        },
        "delta_order": ["decay", "friction", "motion_delta", "clamp"],
        "description": "6-12-6-5 불변 커널 (v2.0 최적화)"
    }


@router.get("/structure")
async def get_structure():
    """커널 구조"""
    return {
        "nodes": [
            {
                "id": node.value,
                "name": node.name,
                **NODE_META[node]
            }
            for node in Node
        ],
        "motions": [
            {
                "id": motion.value,
                "name": motion.name,
                **MOTION_META[motion]
            }
            for motion in Motion
        ],
        "collectors": [
            {"id": ct.value, "name": ct.name}
            for ct in Collector
        ],
        "projections": [
            {"id": pt.value, "name": pt.name}
            for pt in Projection
        ]
    }


@router.get("/state")
async def get_state():
    """전체 상태"""
    kernel = get_kernel()
    return kernel.get_state()


@router.get("/nodes")
async def get_nodes():
    """6개 노드 상태"""
    kernel = get_kernel()
    state = kernel.get_state()
    
    result = []
    for node in Node:
        node_state = state["nodes"][node.name]
        result.append({
            "id": node.value,
            "name": node.name,
            **NODE_META[node],
            **node_state
        })
    
    return result


@router.get("/nodes/{node_id}")
async def get_node(node_id: int):
    """단일 노드 상태"""
    if node_id < 0 or node_id > 5:
        raise HTTPException(status_code=400, detail="Invalid node_id (0-5)")
    
    kernel = get_kernel()
    node = Node(node_id)
    state = kernel.get_state()
    node_state = state["nodes"][node.name]
    
    return {
        "id": node.value,
        "name": node.name,
        **NODE_META[node],
        **node_state
    }


@router.post("/event")
async def apply_event(request: MotionEventRequest):
    """모션 이벤트 적용"""
    kernel = get_kernel()
    
    from_node = Node(request.from_node) if request.from_node is not None else None
    to_node = Node(request.to_node) if request.to_node is not None else None
    collector = Collector(request.collector) if request.collector is not None else None
    timestamp = request.timestamp or int(time.time())
    
    event = MotionEvent(
        from_node=from_node,
        to_node=to_node,
        delta=request.delta,
        friction=request.friction,
        timestamp=timestamp,
        collector=collector,
        raw_type=request.raw_type
    )
    
    result = kernel.apply_event(event)
    result["event"] = event.to_dict()
    
    return result


@router.post("/batch")
async def apply_batch(request: BatchEventRequest):
    """배치 이벤트 적용"""
    kernel = get_kernel()
    
    events = []
    now = int(time.time())
    
    for i, req in enumerate(request.events):
        from_node = Node(req.from_node) if req.from_node is not None else None
        to_node = Node(req.to_node) if req.to_node is not None else None
        collector = Collector(req.collector) if req.collector is not None else None
        timestamp = req.timestamp or (now + i)
        
        events.append(MotionEvent(
            from_node=from_node,
            to_node=to_node,
            delta=req.delta,
            friction=req.friction,
            timestamp=timestamp,
            collector=collector,
            raw_type=req.raw_type
        ))
    
    return kernel.apply_batch(events)


@router.get("/projection/{projection_type}")
async def get_projection(projection_type: str):
    """UI 투영 데이터"""
    kernel = get_kernel()
    
    try:
        pt = Projection[projection_type.upper()]
    except KeyError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid projection type. Valid: {[p.name for p in Projection]}"
        )
    
    return kernel.get_projection(pt)


@router.get("/projections")
async def get_all_projections():
    """모든 투영 데이터"""
    kernel = get_kernel()
    return {
        pt.name: kernel.get_projection(pt)
        for pt in Projection
    }


@router.get("/matrix")
async def get_matrix():
    """6×12 Node-Motion 매트릭스"""
    kernel = get_kernel()
    return kernel.get_matrix()


@router.get("/summary")
async def get_summary():
    """커널 요약"""
    kernel = get_kernel()
    return kernel.get_summary()


@router.post("/reset")
async def reset():
    """커널 리셋"""
    kernel = reset_kernel()
    return {
        "success": True,
        "message": "Kernel reset to v2.0",
        "state": kernel.get_state()
    }


@router.get("/motions")
async def get_motions():
    """12개 모션 정보"""
    return [
        {
            "id": motion.value,
            "name": motion.name,
            **MOTION_META[motion]
        }
        for motion in Motion
    ]


@router.get("/collectors")
async def get_collectors():
    """6개 Collector 정보"""
    return [
        {"id": ct.value, "name": ct.name}
        for ct in Collector
    ]


@router.get("/log")
async def get_log(limit: int = 20):
    """이벤트 로그"""
    kernel = get_kernel()
    events = kernel.event_log[-limit:]
    return [e.to_dict() for e in reversed(events)]


@router.post("/lock")
async def lock_kernel():
    """커널 잠금"""
    kernel = get_kernel()
    kernel.state.locked = True
    return {"success": True, "locked": True}


@router.post("/unlock")
async def unlock_kernel():
    """커널 잠금 해제"""
    kernel = get_kernel()
    kernel.state.locked = False
    return {"success": True, "locked": False}
