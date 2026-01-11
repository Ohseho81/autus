"""
AUTUS Flow API - 자금 흐름 분석

기능:
- 노드 흐름 통계
- 경로 탐색 (shortest, maxflow, all)
- 병목 노드 탐지
- 흐름 행렬
- 제거 시뮬레이션
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

from engine.flow_engine import (
    FlowEngine,
    Flow,
    FlowType,
    FlowPath,
    FlowStats,
    BottleneckInfo,
    create_sample_flow_data,
)

router = APIRouter(prefix="/api/flow", tags=["flow"])

# ═══════════════════════════════════════════════════════════════
# 글로벌 상태
# ═══════════════════════════════════════════════════════════════

_engine: Optional[FlowEngine] = None


def get_engine() -> FlowEngine:
    """Engine 조회 (없으면 샘플 생성)"""
    global _engine
    if _engine is None:
        _engine = create_sample_flow_data()
    return _engine


# ═══════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════

class FlowItem(BaseModel):
    id: str
    source_id: str
    target_id: str
    amount: float
    flow_type: str
    timestamp: str
    description: str


class FlowStatsResponse(BaseModel):
    node_id: str
    total_inflow: float
    total_outflow: float
    net_flow: float
    inflow_count: int
    outflow_count: int
    flow_count: int
    top_source: str
    top_target: str
    flow_types: Dict[str, float]


class PathResponse(BaseModel):
    source_id: str
    target_id: str
    method: str
    found: bool
    path: Optional[Dict]


class BottleneckItem(BaseModel):
    node_id: str
    impact_score: float
    bridge_score: float
    in_nodes: int
    out_nodes: int
    through_flow: float


class BottlenecksResponse(BaseModel):
    threshold: float
    count: int
    bottlenecks: List[BottleneckItem]


class MatrixResponse(BaseModel):
    node_ids: List[str]
    matrix: Dict[str, Dict[str, float]]


class RemovalRequest(BaseModel):
    node_id: str


class RemovalResponse(BaseModel):
    removed_node: str
    removed_flows_count: int
    lost_amount: float
    affected_nodes: List[str]
    affected_nodes_count: int
    remaining_components: int
    is_disconnecting: bool
    largest_component_size: int


class AddFlowRequest(BaseModel):
    id: str
    source_id: str
    target_id: str
    amount: float
    flow_type: str = "trade"
    timestamp: str = ""
    description: str = ""


# ═══════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════

@router.get("/types")
async def get_flow_types():
    """흐름 유형 목록"""
    return {
        "types": [
            {"value": ft.value, "name": ft.name}
            for ft in FlowType
        ]
    }


@router.get("/stats")
async def get_overall_stats():
    """전체 흐름 통계"""
    engine = get_engine()
    
    aggregation = engine.aggregate_flows_by_type()
    total_amount = sum(a["total_amount"] for a in aggregation.values())
    
    return {
        "flow_count": len(engine.flows),
        "node_count": len(engine.nodes),
        "total_amount": total_amount,
        "by_type": aggregation,
    }


@router.get("/node/{node_id}/stats", response_model=FlowStatsResponse)
async def get_flow_stats(node_id: str):
    """노드 흐름 통계"""
    engine = get_engine()
    
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    stats = engine.get_flow_stats(node_id)
    
    return FlowStatsResponse(
        node_id=stats.node_id,
        total_inflow=stats.total_inflow,
        total_outflow=stats.total_outflow,
        net_flow=stats.net_flow,
        inflow_count=stats.inflow_count,
        outflow_count=stats.outflow_count,
        flow_count=stats.flow_count,
        top_source=stats.top_source,
        top_target=stats.top_target,
        flow_types=stats.flow_types,
    )


@router.get("/node/{node_id}/inflows")
async def get_inflows(node_id: str):
    """유입 흐름"""
    engine = get_engine()
    
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    inflows = engine.get_inflows(node_id)
    
    return {
        "node_id": node_id,
        "count": len(inflows),
        "total_amount": sum(f.amount for f in inflows),
        "flows": [f.to_dict() for f in sorted(inflows, key=lambda x: x.amount, reverse=True)],
    }


@router.get("/node/{node_id}/outflows")
async def get_outflows(node_id: str):
    """유출 흐름"""
    engine = get_engine()
    
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    outflows = engine.get_outflows(node_id)
    
    return {
        "node_id": node_id,
        "count": len(outflows),
        "total_amount": sum(f.amount for f in outflows),
        "flows": [f.to_dict() for f in sorted(outflows, key=lambda x: x.amount, reverse=True)],
    }


@router.get("/path/{source_id}/{target_id}", response_model=PathResponse)
async def find_path(
    source_id: str,
    target_id: str,
    method: str = Query(default="shortest", regex="^(shortest|maxflow|all)$"),
):
    """
    경로 탐색
    
    - shortest: Dijkstra 최단 경로
    - maxflow: 최대 유량 경로
    - all: 모든 경로 (최대 10개)
    """
    engine = get_engine()
    
    if source_id not in engine.nodes:
        raise HTTPException(status_code=404, detail=f"Source {source_id} not found")
    if target_id not in engine.nodes:
        raise HTTPException(status_code=404, detail=f"Target {target_id} not found")
    
    if method == "shortest":
        path = engine.find_shortest_path(source_id, target_id)
        return PathResponse(
            source_id=source_id,
            target_id=target_id,
            method=method,
            found=path is not None,
            path=path.to_dict() if path else None,
        )
    elif method == "maxflow":
        path = engine.find_max_flow_path(source_id, target_id)
        return PathResponse(
            source_id=source_id,
            target_id=target_id,
            method=method,
            found=path is not None,
            path=path.to_dict() if path else None,
        )
    else:  # all
        paths = engine.find_all_paths(source_id, target_id)
        return {
            "source_id": source_id,
            "target_id": target_id,
            "method": method,
            "found": len(paths) > 0,
            "path_count": len(paths),
            "paths": [p.to_dict() for p in paths],
        }


@router.get("/bottlenecks", response_model=BottlenecksResponse)
async def find_bottlenecks(threshold: float = Query(default=0.1, ge=0, le=1)):
    """
    병목 노드 탐지
    
    병목 조건: 영향도 > threshold OR (유입노드 > 2 AND 유출노드 > 2)
    """
    engine = get_engine()
    
    bottlenecks = engine.find_bottlenecks(threshold)
    
    items = [
        BottleneckItem(
            node_id=b.node_id,
            impact_score=b.impact_score,
            bridge_score=b.bridge_score,
            in_nodes=b.in_nodes,
            out_nodes=b.out_nodes,
            through_flow=b.through_flow,
        )
        for b in bottlenecks
    ]
    
    return BottlenecksResponse(
        threshold=threshold,
        count=len(items),
        bottlenecks=items,
    )


@router.get("/matrix")
async def get_flow_matrix(node_ids: str = Query(..., description="콤마로 구분된 노드 ID")):
    """
    흐름 행렬
    
    node_ids: 콤마로 구분된 노드 ID (예: usa,china,korea)
    """
    engine = get_engine()
    
    ids = [nid.strip() for nid in node_ids.split(",")]
    
    # 존재하는 노드만 필터
    valid_ids = [nid for nid in ids if nid in engine.nodes]
    
    if not valid_ids:
        raise HTTPException(status_code=400, detail="No valid node IDs provided")
    
    matrix = engine.get_flow_matrix(valid_ids)
    
    return MatrixResponse(
        node_ids=valid_ids,
        matrix=matrix,
    )


@router.post("/simulate/removal", response_model=RemovalResponse)
async def simulate_removal(request: RemovalRequest):
    """
    노드 제거 시뮬레이션
    
    노드를 제거했을 때의 영향 분석
    """
    engine = get_engine()
    
    result = engine.simulate_removal(request.node_id)
    
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    
    return RemovalResponse(
        removed_node=result["removed_node"],
        removed_flows_count=result["removed_flows_count"],
        lost_amount=result["lost_amount"],
        affected_nodes=result["affected_nodes"],
        affected_nodes_count=result["affected_nodes_count"],
        remaining_components=result["remaining_components"],
        is_disconnecting=result["is_disconnecting"],
        largest_component_size=result["largest_component_size"],
    )


@router.get("/top/{n}")
async def get_top_flows(n: int = 10):
    """TOP N 흐름 (금액 기준)"""
    engine = get_engine()
    
    top_flows = engine.get_top_flows(n)
    
    return {
        "count": len(top_flows),
        "flows": [f.to_dict() for f in top_flows],
    }


@router.post("/add")
async def add_flow(request: AddFlowRequest):
    """흐름 추가"""
    engine = get_engine()
    
    try:
        flow_type = FlowType(request.flow_type)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid flow_type. Valid: {[ft.value for ft in FlowType]}"
        )
    
    flow = Flow(
        id=request.id,
        source_id=request.source_id,
        target_id=request.target_id,
        amount=request.amount,
        flow_type=flow_type,
        timestamp=request.timestamp or datetime.now().isoformat(),
        description=request.description,
    )
    
    engine.add_flow(flow)
    
    return {
        "success": True,
        "flow": flow.to_dict(),
    }


@router.delete("/{flow_id}")
async def remove_flow(flow_id: str):
    """흐름 제거"""
    engine = get_engine()
    
    success = engine.remove_flow(flow_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Flow {flow_id} not found")
    
    return {"success": True, "removed_id": flow_id}


@router.get("/nodes")
async def get_all_nodes():
    """모든 노드 목록"""
    engine = get_engine()
    
    return {
        "count": len(engine.nodes),
        "nodes": list(engine.nodes),
    }

