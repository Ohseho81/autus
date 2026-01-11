"""
AUTUS API v1.0
==============

6 Physics Nodes × 12 Physical Motions × 6 Collectors × 5 UI

"AUTUS는 세상을 설명하지 않는다. 세상이 스스로 드러나게 만든다."
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import time

from core.autus_spec import (
    PhysicsEngine, Projector, get_engine, reset_engine,
    Node, Motion, Collector, UIComponent, EvidenceGate,
    MOTION_META, COLLECTOR_NODE_MAP, PROJECTION_MAP,
    NODE_COUNT, MOTION_COUNT
)


# ============================================================
# Router
# ============================================================

router = APIRouter(prefix="/api/autus", tags=["autus"])


# ============================================================
# Pydantic Models
# ============================================================

class MotionRequest(BaseModel):
    node: int = Field(..., ge=0, le=5, description="노드 인덱스 (0-5)")
    motion: int = Field(..., ge=1, le=12, description="모션 유형 (1-12)")
    delta: float = Field(..., ge=-1.0, le=1.0, description="변화량 [-1, 1]")
    friction: float = Field(0.0, ge=0.0, le=1.0, description="마찰 [0, 1]")
    timestamp: Optional[int] = None


class BatchMotionRequest(BaseModel):
    motions: List[MotionRequest]


# ============================================================
# Endpoints
# ============================================================

@router.get("/")
async def autus_root():
    """AUTUS API 정보"""
    return {
        "name": "AUTUS API",
        "version": "1.0.0",
        "structure": {
            "nodes": NODE_COUNT,
            "motions": MOTION_COUNT,
            "collectors": len(Collector),
            "ui_components": len(UIComponent),
        },
        "philosophy": "AUTUS는 세상을 설명하지 않는다. 세상이 스스로 드러나게 만든다.",
        "invariants": [
            "동일 입력 → 동일 출력",
            "Motion 불변성",
            "상태 연속성",
            "물리 한계 준수"
        ]
    }


@router.get("/structure")
async def get_structure():
    """전체 구조"""
    return {
        "nodes": [
            {"id": node.value, "name": node.name}
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
            {
                "id": col.value,
                "name": col.name,
                "default_node": COLLECTOR_NODE_MAP[col].name
            }
            for col in Collector
        ],
        "ui_components": [
            {"id": ui.value, "name": ui.name}
            for ui in UIComponent
        ]
    }


@router.get("/state")
async def get_state():
    """전체 상태"""
    engine = get_engine()
    return engine.get_state()


@router.get("/nodes")
async def get_nodes():
    """6개 노드 상태"""
    engine = get_engine()
    return engine.get_nodes_detail()


@router.get("/nodes/{node_id}")
async def get_node(node_id: int):
    """단일 노드 상태"""
    if node_id < 0 or node_id > 5:
        raise HTTPException(status_code=400, detail="Invalid node_id (0-5)")
    
    engine = get_engine()
    node = Node(node_id)
    
    return {
        "id": node.value,
        "name": node.name,
        "value": round(engine.state.get(node), 4),
        "percent": round(engine.state.get(node) * 100, 1),
        "projections": list(PROJECTION_MAP[node].keys()),
    }


@router.post("/motion")
async def apply_motion(request: MotionRequest):
    """Motion 적용 (커널 유일한 입력점)"""
    engine = get_engine()
    
    node = Node(request.node)
    motion = Motion(request.motion)
    timestamp = request.timestamp or int(time.time())
    
    result = engine.apply_motion(
        node=node,
        motion=motion,
        delta=request.delta,
        friction=request.friction,
        timestamp=timestamp
    )
    
    return result


@router.post("/batch")
async def apply_batch(request: BatchMotionRequest):
    """배치 Motion 적용"""
    engine = get_engine()
    results = []
    
    for req in request.motions:
        node = Node(req.node)
        motion = Motion(req.motion)
        timestamp = req.timestamp or int(time.time())
        
        result = engine.apply_motion(
            node=node,
            motion=motion,
            delta=req.delta,
            friction=req.friction,
            timestamp=timestamp
        )
        results.append(result)
    
    return {
        "processed": len(results),
        "state": engine.get_state(),
    }


@router.get("/gate")
async def get_gate():
    """Evidence Gate 상태"""
    engine = get_engine()
    projector = Projector(engine)
    return projector.gate_indicator()


@router.get("/motions")
async def get_motions():
    """12개 Motion 정보"""
    return [
        {
            "id": motion.value,
            "name": motion.name,
            **MOTION_META[motion]
        }
        for motion in Motion
    ]


@router.get("/log")
async def get_log(limit: int = 20):
    """Motion Log"""
    engine = get_engine()
    records = list(engine.motion_log.records[-limit:])
    return [r.to_dict() for r in reversed(records)]


# ============================================================
# UI Projections
# ============================================================

@router.get("/ui/overview")
async def ui_overview():
    """UI Component 1: State Overview"""
    engine = get_engine()
    projector = Projector(engine)
    return projector.state_overview()


@router.get("/ui/trend")
async def ui_trend(last_n: int = 20):
    """UI Component 2: Trend View"""
    engine = get_engine()
    projector = Projector(engine)
    return projector.trend_view(last_n)


@router.get("/ui/stream")
async def ui_stream(last_n: int = 10):
    """UI Component 3: Motion Stream"""
    engine = get_engine()
    projector = Projector(engine)
    return projector.motion_stream(last_n)


@router.get("/ui/gate")
async def ui_gate():
    """UI Component 4: Gate Indicator"""
    engine = get_engine()
    projector = Projector(engine)
    return projector.gate_indicator()


@router.get("/ui/action")
async def ui_action():
    """UI Component 5: Action Panel"""
    engine = get_engine()
    projector = Projector(engine)
    return projector.action_panel()


# ============================================================
# Control
# ============================================================

@router.post("/reset")
async def reset():
    """엔진 리셋"""
    engine = reset_engine()
    return {
        "success": True,
        "message": "Engine reset to initial state",
        "state": engine.get_state()
    }

