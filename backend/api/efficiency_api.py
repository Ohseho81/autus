"""
AUTUS Efficiency Layer API v1.0
===============================

Compaction · Delta Stream · Shock Index · Hexagon Equilibrium

"AUTUS는 세상을 설명하지 않는다. 세상이 스스로 드러나게 만든다."
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import asyncio
import time
import base64

from core.efficiency import (
    CompactionLayer, CompactionPolicy,
    BinaryDeltaStream, DeltaMessageType,
    ShockIndex, ShockEvent,
    HexagonEquilibrium,
    get_compaction_layer, get_delta_stream, get_shock_index, get_hexagon_equilibrium,
    reset_efficiency_layer
)
from core.autus_spec import get_engine, Node, Motion


# ============================================================
# Router
# ============================================================

router = APIRouter(prefix="/api/efficiency", tags=["efficiency"])


# ============================================================
# Pydantic Models
# ============================================================

class ShockRequest(BaseModel):
    source: str = Field(..., description="충격 유형 또는 커스텀 이름")
    node_impacts: Optional[Dict[int, float]] = None
    magnitude: float = Field(0.5, ge=0.0, le=1.0)
    friction: float = Field(0.1, ge=0.0, le=1.0)
    decay_rate: float = Field(0.1, ge=0.01, le=1.0)


class HexagonUpdateRequest(BaseModel):
    target_state: List[float] = Field(..., min_items=6, max_items=6)


class DeltaEncodeRequest(BaseModel):
    node: int = Field(..., ge=0, le=5)
    motion: int = Field(..., ge=1, le=12)
    delta: float
    friction: float = 0.0


# ============================================================
# Root Endpoint
# ============================================================

@router.get("/")
async def root():
    """Efficiency Layer 정보"""
    return {
        "name": "AUTUS Efficiency Layer API",
        "version": "1.0.0",
        "components": {
            "compaction": "Motion Stream 자동 압축",
            "delta_stream": "Binary Delta 통신",
            "shock_index": "외부 충격 시뮬레이션",
            "hexagon": "6노드 평형 물리"
        },
        "endpoints": [
            "/compaction", "/delta", "/shock", "/hexagon", "/reset", "/ws"
        ]
    }


# ============================================================
# Compaction Endpoints
# ============================================================

@router.get("/compaction")
async def get_compaction_info():
    """압축 레이어 정보"""
    compactor = get_compaction_layer()
    return {
        "name": "Compaction Layer",
        "description": "Motion Stream 자동 합산(Merge)",
        "policies": [p.name for p in CompactionPolicy],
        "stats": compactor.get_stats()
    }


@router.get("/compaction/trend/{policy}")
async def get_trend_data(policy: str, node: Optional[int] = None):
    """추세 데이터 조회"""
    try:
        p = CompactionPolicy[policy.upper()]
    except KeyError:
        raise HTTPException(status_code=400, detail=f"Invalid policy: {policy}")
    
    compactor = get_compaction_layer()
    data = compactor.get_trend_data(p, node)
    return {
        "policy": policy.upper(),
        "node_filter": node,
        "count": len(data),
        "records": data
    }


@router.post("/compaction/ingest")
async def ingest_motion(node: int, delta: float, friction: float = 0.0):
    """Motion 수집"""
    compactor = get_compaction_layer()
    compactor.ingest(int(time.time()), node, delta, friction)
    return {"success": True, "message": "Motion ingested"}


# ============================================================
# Delta Stream Endpoints
# ============================================================

@router.get("/delta")
async def get_delta_info():
    """Delta Stream 정보"""
    return {
        "name": "Binary Delta Stream",
        "description": "변화량(Delta)만 통신, 네트워크 최소화",
        "message_types": [t.name for t in DeltaMessageType],
        "header_size": 11,
        "compression": True
    }


@router.post("/delta/encode")
async def encode_delta(request: DeltaEncodeRequest):
    """Delta 인코딩"""
    stream = get_delta_stream()
    encoded = stream.encode_motion(request.node, request.motion, request.delta, request.friction)
    
    return {
        "encoded_base64": base64.b64encode(encoded).decode(),
        "encoded_size": len(encoded),
        "raw_json_size": len(str(request.dict()).encode()),
        "stats": stream.get_bandwidth_stats(len(str(request.dict()).encode()), len(encoded))
    }


@router.post("/delta/decode")
async def decode_delta(encoded_base64: str):
    """Delta 디코딩"""
    stream = get_delta_stream()
    try:
        data = base64.b64decode(encoded_base64)
        decoded = stream.decode(data)
        return decoded
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/delta/state-sync")
async def get_state_sync():
    """현재 상태 동기화 메시지"""
    engine = get_engine()
    stream = get_delta_stream()
    
    state = [engine.state.get(node) for node in Node]
    encoded = stream.encode_state_sync(state)
    
    return {
        "state": [round(s, 4) for s in state],
        "encoded_base64": base64.b64encode(encoded).decode(),
        "encoded_size": len(encoded)
    }


# ============================================================
# Shock Index Endpoints
# ============================================================

@router.get("/shock")
async def get_shock_info():
    """충격 지수 정보"""
    shock_index = get_shock_index()
    return {
        "name": "Shock Index",
        "description": "외부 사건이 6개 노드에 미치는 영향",
        "templates": shock_index.get_templates(),
        "active_shocks": len(shock_index.active_shocks),
        "total_history": len(shock_index.history)
    }


@router.post("/shock/trigger")
async def trigger_shock(request: ShockRequest):
    """충격 발생"""
    shock_index = get_shock_index()
    hexagon = get_hexagon_equilibrium()
    engine = get_engine()
    
    # 충격 발생
    shock = shock_index.trigger_shock(
        source=request.source,
        node_impacts=request.node_impacts,
        magnitude=request.magnitude,
        friction=request.friction,
        decay_rate=request.decay_rate
    )
    
    # 헥사곤에 충격 적용
    hexagon.apply_shock(shock_index)
    
    # 엔진에도 Motion으로 적용
    for node_idx, delta in shock.node_impacts.items():
        motion = Motion.INPUT if delta > 0 else Motion.OUTPUT
        engine.apply_motion(Node(node_idx), motion, abs(delta) * shock.magnitude, shock.friction)
    
    return {
        "success": True,
        "shock": {
            "source": shock.source,
            "timestamp": shock.timestamp,
            "impacts": shock.node_impacts,
            "magnitude": shock.magnitude,
            "decay_rate": shock.decay_rate
        },
        "active_shocks": len(shock_index.active_shocks)
    }


@router.get("/shock/impacts")
async def get_current_impacts():
    """현재 누적 충격 영향"""
    shock_index = get_shock_index()
    impacts = shock_index.get_current_impacts()
    
    return {
        "impacts": {str(k): round(v, 4) for k, v in impacts.items()},
        "active_shocks": len(shock_index.active_shocks)
    }


@router.get("/shock/animation/{node}")
async def get_animation_params(node: int):
    """노드별 애니메이션 파라미터"""
    if node < 0 or node > 5:
        raise HTTPException(status_code=400, detail="Invalid node index (0-5)")
    
    shock_index = get_shock_index()
    return shock_index.get_animation_params(node)


@router.get("/shock/templates")
async def get_shock_templates():
    """충격 템플릿 목록"""
    shock_index = get_shock_index()
    return shock_index.get_templates()


# ============================================================
# Hexagon Equilibrium Endpoints
# ============================================================

@router.get("/hexagon")
async def get_hexagon_info():
    """헥사곤 평형 상태"""
    hexagon = get_hexagon_equilibrium()
    return hexagon.get_render_data()


@router.post("/hexagon/target")
async def update_hexagon_target(request: HexagonUpdateRequest):
    """헥사곤 목표 상태 업데이트"""
    hexagon = get_hexagon_equilibrium()
    hexagon.update_target(request.target_state)
    return {
        "success": True,
        "target": hexagon.target_state,
        "current": hexagon.current_state
    }


@router.post("/hexagon/step")
async def hexagon_step(dt: float = 0.016):
    """헥사곤 물리 시뮬레이션 1스텝"""
    hexagon = get_hexagon_equilibrium()
    hexagon.step(dt)
    return hexagon.get_render_data()


@router.get("/hexagon/sync")
async def hexagon_sync_with_engine():
    """엔진 상태와 헥사곤 동기화"""
    engine = get_engine()
    hexagon = get_hexagon_equilibrium()
    
    state = [engine.state.get(node) for node in Node]
    hexagon.update_target(state)
    
    # 10 스텝 시뮬레이션으로 부드럽게 전이
    for _ in range(10):
        hexagon.step(0.05)
    
    return hexagon.get_render_data()


# ============================================================
# Reset
# ============================================================

@router.post("/reset")
async def reset():
    """Efficiency Layer 리셋"""
    reset_efficiency_layer()
    return {"success": True, "message": "Efficiency Layer reset"}


# ============================================================
# WebSocket - Real-time Updates
# ============================================================

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """실시간 헥사곤 업데이트"""
    await websocket.accept()
    
    stream = get_delta_stream()
    hexagon = get_hexagon_equilibrium()
    engine = get_engine()
    
    try:
        while True:
            # 엔진 상태 동기화
            state = [engine.state.get(node) for node in Node]
            hexagon.update_target(state)
            hexagon.step(0.016)
            
            # 렌더링 데이터 전송
            render_data = hexagon.get_render_data()
            render_data['state'] = [round(s, 4) for s in state]
            render_data['gate'] = engine.get_evidence_gate().name
            
            await websocket.send_json(render_data)
            await asyncio.sleep(0.033)  # ~30 FPS
            
    except WebSocketDisconnect:
        pass

