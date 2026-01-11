"""
AUTUS Engine API v2.0
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

from engine_v2 import get_engine, State, Layer, PressureCard

router = APIRouter(prefix="/engine", tags=["Engine v2"])


# ============================================================================
# Schemas
# ============================================================================

class NodeValueInput(BaseModel):
    node_id: str
    value: float
    days_since_action: int = 0


class BatchUpdateInput(BaseModel):
    values: Dict[str, float]


class NodeStatus(BaseModel):
    id: str
    name: str
    layer: str
    value: Optional[float]
    pressure: float
    state: str
    kpi: str
    unit: str


class SystemStatus(BaseModel):
    equilibrium: float
    stability: float
    total_nodes: int
    critical_count: int


class CircuitStatus(BaseModel):
    name: str
    avg_pressure: float
    nodes: List[dict]


class PressureCardOutput(BaseModel):
    node_id: str
    node_name: str
    state: str
    value: str
    message: str
    timestamp: str


# ============================================================================
# Endpoints
# ============================================================================

@router.get("/status", response_model=SystemStatus)
async def get_system_status():
    """시스템 전체 상태 조회"""
    engine = get_engine()
    engine.compute_cycle()
    
    return SystemStatus(
        equilibrium=round(engine.calculate_equilibrium(), 3),
        stability=round(engine.system_stability(), 3),
        total_nodes=len(engine.nodes),
        critical_count=len(engine.get_critical_nodes())
    )


@router.get("/nodes", response_model=List[NodeStatus])
async def get_all_nodes():
    """전체 노드 상태 조회"""
    engine = get_engine()
    
    return [
        NodeStatus(
            id=n.id,
            name=n.name,
            layer=n.layer.value,
            value=n.value,
            pressure=round(n.pressure, 3),
            state=n.state.name,
            kpi=n.kpi,
            unit=n.unit
        )
        for n in engine.nodes.values()
    ]


@router.get("/nodes/{node_id}", response_model=NodeStatus)
async def get_node(node_id: str):
    """특정 노드 상태 조회"""
    engine = get_engine()
    
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    n = engine.nodes[node_id]
    return NodeStatus(
        id=n.id,
        name=n.name,
        layer=n.layer.value,
        value=n.value,
        pressure=round(n.pressure, 3),
        state=n.state.name,
        kpi=n.kpi,
        unit=n.unit
    )


@router.post("/nodes/update")
async def update_node(input: NodeValueInput):
    """노드 값 업데이트"""
    engine = get_engine()
    
    if input.node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail=f"Node {input.node_id} not found")
    
    engine.update_node_value(input.node_id, input.value, input.days_since_action)
    engine.compute_cycle()
    
    return {"success": True, "node_id": input.node_id}


@router.post("/nodes/batch-update")
async def batch_update_nodes(input: BatchUpdateInput):
    """노드 값 일괄 업데이트"""
    engine = get_engine()
    
    engine.update_all_values(input.values)
    engine.compute_cycle()
    
    return {"success": True, "updated_count": len(input.values)}


@router.get("/layers/{layer_name}")
async def get_layer_status(layer_name: str):
    """레이어별 상태 조회"""
    engine = get_engine()
    
    layer_map = {
        "finance": Layer.L1_FINANCE,
        "bio": Layer.L2_BIO,
        "ops": Layer.L3_OPS,
        "customer": Layer.L4_CUSTOMER,
        "external": Layer.L5_EXTERNAL,
    }
    
    if layer_name not in layer_map:
        raise HTTPException(status_code=404, detail=f"Layer {layer_name} not found")
    
    layer = layer_map[layer_name]
    pressures = engine.get_layer_pressures(layer)
    
    return {
        "layer": layer_name,
        "avg_pressure": round(sum(pressures.values()) / len(pressures), 3),
        "nodes": [
            {
                "id": nid,
                "name": engine.nodes[nid].name,
                "pressure": round(p, 3),
                "state": engine.nodes[nid].state.name
            }
            for nid, p in pressures.items()
        ]
    }


@router.get("/circuits/{circuit_name}", response_model=CircuitStatus)
async def get_circuit_status(circuit_name: str):
    """핵심 회로 상태 조회"""
    engine = get_engine()
    
    status = engine.get_circuit_status(circuit_name)
    if not status:
        raise HTTPException(status_code=404, detail=f"Circuit {circuit_name} not found")
    
    return CircuitStatus(
        name=status["name"],
        avg_pressure=round(status["avg_pressure"], 3),
        nodes=status["nodes"]
    )


@router.get("/top1", response_model=Optional[PressureCardOutput])
async def get_top1():
    """Top-1 압력 카드 조회"""
    engine = get_engine()
    engine.compute_cycle()
    
    card = engine.generate_output()
    if card is None:
        return None
    
    return PressureCardOutput(
        node_id=card.node_id,
        node_name=card.node_name,
        state=card.state.name,
        value=card.value,
        message=card.message,
        timestamp=card.timestamp.isoformat()
    )


@router.post("/compute")
async def compute_cycle():
    """물리 계산 실행"""
    engine = get_engine()
    engine.compute_cycle()
    
    return {
        "success": True,
        "equilibrium": round(engine.calculate_equilibrium(), 3),
        "stability": round(engine.system_stability(), 3),
        "critical_count": len(engine.get_critical_nodes())
    }


@router.get("/full")
async def get_full_state():
    """전체 엔진 상태 (JSON)"""
    engine = get_engine()
    engine.compute_cycle()
    
    return engine.to_dict()
