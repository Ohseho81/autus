"""
AUTUS Multi-Scale API

줌 레벨에 따른 계층적 Keyman 탐색

| Level | Scale    | 노드 단위      | Zoom Range |
|-------|----------|---------------|------------|
| L0    | World    | 국가/기관      | 0-3        |
| L1    | Country  | 도시/재벌      | 4-6        |
| L2    | City     | 구역/기업      | 7-10       |
| L3    | District | 건물/인물      | 11-14      |
| L4    | Block    | 개인          | 15+        |
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from datetime import datetime

from engine.scale_engine import (
    MultiScaleEngine,
    ScaleLevel,
    ScaleNode,
    ScaleFlow,
    Bounds,
    create_sample_multiscale_data,
)

router = APIRouter(prefix="/api/scale", tags=["scale"])

# ═══════════════════════════════════════════════════════════════
# 글로벌 상태
# ═══════════════════════════════════════════════════════════════

_engine: Optional[MultiScaleEngine] = None


def get_engine() -> MultiScaleEngine:
    """Engine 조회 (없으면 샘플 생성)"""
    global _engine
    if _engine is None:
        _engine = create_sample_multiscale_data()
    return _engine


# ═══════════════════════════════════════════════════════════════
# Pydantic 모델
# ═══════════════════════════════════════════════════════════════

class LevelInfo(BaseModel):
    level: str
    name: str
    zoom_range: List[int]
    description: str


class LevelsResponse(BaseModel):
    levels: List[LevelInfo]
    zoom_mapping: Dict[str, str]


class NodeItem(BaseModel):
    id: str
    name: str
    level: str
    lat: float
    lng: float
    ki_score: float
    keyman_types: List[str]
    total_mass: float
    total_flow: float
    node_count: int
    parent_id: Optional[str]
    children_count: int
    sector: str
    flag: str
    icon: str


class NodesResponse(BaseModel):
    level: str
    count: int
    nodes: List[NodeItem]


class NodeDetailResponse(BaseModel):
    id: str
    name: str
    level: str
    lat: float
    lng: float
    bounds: Optional[List[float]]
    ki_score: float
    keyman_types: List[str]
    total_mass: float
    total_flow: float
    node_count: int
    parent_id: Optional[str]
    parent_name: Optional[str]
    children_count: int
    top_keyman_id: Optional[str]
    sector: str
    flag: str
    icon: str


class PathToRootResponse(BaseModel):
    node_id: str
    path: List[NodeItem]
    depth: int


class FlowItem(BaseModel):
    source_id: str
    target_id: str
    source_level: str
    target_level: str
    amount: float
    flow_type: str


class FlowResponse(BaseModel):
    from_level: str
    to_level: str
    flows: List[FlowItem]
    total_amount: float


class BoundsRequest(BaseModel):
    sw_lat: float
    sw_lng: float
    ne_lat: float
    ne_lng: float
    zoom: int


class BoundsResponse(BaseModel):
    level: str
    bounds: List[float]
    zoom: int
    count: int
    nodes: List[NodeItem]


# ═══════════════════════════════════════════════════════════════
# API 엔드포인트
# ═══════════════════════════════════════════════════════════════

@router.get("/levels", response_model=LevelsResponse)
async def get_levels():
    """
    스케일 레벨 정의
    
    | Level | Scale    | Zoom Range |
    |-------|----------|------------|
    | L0    | World    | 0-3        |
    | L1    | Country  | 4-6        |
    | L2    | City     | 7-10       |
    | L3    | District | 11-14      |
    | L4    | Block    | 15+        |
    """
    levels = [
        LevelInfo(
            level="L0", name="World", zoom_range=[0, 3],
            description="국가/기관 단위 - 세계적 Keyman"
        ),
        LevelInfo(
            level="L1", name="Country", zoom_range=[4, 6],
            description="도시/재벌 단위 - 국가 내 Keyman"
        ),
        LevelInfo(
            level="L2", name="City", zoom_range=[7, 10],
            description="구역/기업 단위 - 도시 내 Keyman"
        ),
        LevelInfo(
            level="L3", name="District", zoom_range=[11, 14],
            description="건물/인물 단위 - 구역 내 Keyman"
        ),
        LevelInfo(
            level="L4", name="Block", zoom_range=[15, 20],
            description="개인 단위 - 최소 Keyman"
        ),
    ]
    
    zoom_mapping = {
        str(i): ScaleLevel.from_zoom(i).value
        for i in range(21)
    }
    
    return LevelsResponse(levels=levels, zoom_mapping=zoom_mapping)


@router.get("/{level}/nodes", response_model=NodesResponse)
async def get_nodes_at_level(
    level: str,
    limit: int = Query(default=50, ge=1, le=200),
):
    """
    레벨별 노드 조회
    """
    try:
        scale_level = ScaleLevel(level)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid level. Valid: L0, L1, L2, L3, L4"
        )
    
    engine = get_engine()
    nodes = engine.get_nodes_at_level(scale_level)[:limit]
    
    items = [
        NodeItem(
            id=n.id,
            name=n.name,
            level=n.level.value,
            lat=n.lat,
            lng=n.lng,
            ki_score=round(n.ki_score, 4),
            keyman_types=n.keyman_types,
            total_mass=n.total_mass,
            total_flow=n.total_flow,
            node_count=n.node_count,
            parent_id=n.parent_id,
            children_count=len(n.children_ids),
            sector=n.sector,
            flag=n.flag,
            icon=n.icon,
        )
        for n in nodes
    ]
    
    return NodesResponse(level=level, count=len(items), nodes=items)


@router.get("/{level}/keyman/{n}")
async def get_keyman_at_level(level: str, n: int = 10):
    """
    레벨별 TOP N Keyman
    """
    try:
        scale_level = ScaleLevel(level)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid level")
    
    engine = get_engine()
    keyman = engine.get_keyman_at_level(scale_level, n)
    
    return {
        "level": level,
        "top_n": n,
        "keyman": [
            {
                "rank": i + 1,
                "id": k.id,
                "name": k.name,
                "ki_score": round(k.ki_score, 4),
                "keyman_types": k.keyman_types,
                "total_flow": k.total_flow,
                "sector": k.sector,
            }
            for i, k in enumerate(keyman)
        ],
    }


@router.get("/node/{node_id}", response_model=NodeDetailResponse)
async def get_node_detail(node_id: str):
    """
    노드 상세 정보
    """
    engine = get_engine()
    node = engine.get_node(node_id)
    
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    # 부모 이름
    parent_name = None
    if node.parent_id:
        parent = engine.get_node(node.parent_id)
        if parent:
            parent_name = parent.name
    
    return NodeDetailResponse(
        id=node.id,
        name=node.name,
        level=node.level.value,
        lat=node.lat,
        lng=node.lng,
        bounds=node.bounds.to_list() if node.bounds else None,
        ki_score=round(node.ki_score, 4),
        keyman_types=node.keyman_types,
        total_mass=node.total_mass,
        total_flow=node.total_flow,
        node_count=node.node_count,
        parent_id=node.parent_id,
        parent_name=parent_name,
        children_count=len(node.children_ids),
        top_keyman_id=node.top_keyman_id,
        sector=node.sector,
        flag=node.flag,
        icon=node.icon,
    )


@router.get("/node/{node_id}/children")
async def get_node_children(node_id: str):
    """
    하위 노드 조회 (Zoom In)
    """
    engine = get_engine()
    node = engine.get_node(node_id)
    
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    children = engine.zoom_in(node_id)
    
    return {
        "parent_id": node_id,
        "parent_name": node.name,
        "parent_level": node.level.value,
        "child_level": node.level.child_level.value if node.level.child_level else None,
        "count": len(children),
        "children": [
            {
                "id": c.id,
                "name": c.name,
                "level": c.level.value,
                "ki_score": round(c.ki_score, 4),
                "keyman_types": c.keyman_types,
                "lat": c.lat,
                "lng": c.lng,
            }
            for c in sorted(children, key=lambda x: x.ki_score, reverse=True)
        ],
    }


@router.get("/node/{node_id}/parent")
async def get_node_parent(node_id: str):
    """
    상위 노드 조회 (Zoom Out)
    """
    engine = get_engine()
    node = engine.get_node(node_id)
    
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    parent = engine.zoom_out(node_id)
    
    if not parent:
        return {
            "node_id": node_id,
            "node_name": node.name,
            "parent": None,
            "message": "This is a root node"
        }
    
    return {
        "node_id": node_id,
        "node_name": node.name,
        "parent": {
            "id": parent.id,
            "name": parent.name,
            "level": parent.level.value,
            "ki_score": round(parent.ki_score, 4),
            "keyman_types": parent.keyman_types,
            "lat": parent.lat,
            "lng": parent.lng,
        },
    }


@router.get("/node/{node_id}/path-to-root", response_model=PathToRootResponse)
async def get_path_to_root(node_id: str):
    """
    최상위까지 경로
    """
    engine = get_engine()
    
    if not engine.get_node(node_id):
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    
    path = engine.get_path_to_root(node_id)
    
    items = [
        NodeItem(
            id=n.id,
            name=n.name,
            level=n.level.value,
            lat=n.lat,
            lng=n.lng,
            ki_score=round(n.ki_score, 4),
            keyman_types=n.keyman_types,
            total_mass=n.total_mass,
            total_flow=n.total_flow,
            node_count=n.node_count,
            parent_id=n.parent_id,
            children_count=len(n.children_ids),
            sector=n.sector,
            flag=n.flag,
            icon=n.icon,
        )
        for n in path
    ]
    
    return PathToRootResponse(
        node_id=node_id,
        path=items,
        depth=len(items),
    )


@router.get("/flow/{from_level}/{to_level}", response_model=FlowResponse)
async def get_flow_between_levels(from_level: str, to_level: str):
    """
    레벨 간 자금 흐름
    """
    try:
        from_scale = ScaleLevel(from_level)
        to_scale = ScaleLevel(to_level)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid level")
    
    engine = get_engine()
    flows = engine.get_flow_between_levels(from_scale, to_scale)
    
    items = [
        FlowItem(
            source_id=f.source_id,
            target_id=f.target_id,
            source_level=f.source_level.value,
            target_level=f.target_level.value,
            amount=f.amount,
            flow_type=f.flow_type,
        )
        for f in flows
    ]
    
    return FlowResponse(
        from_level=from_level,
        to_level=to_level,
        flows=items,
        total_amount=sum(f.amount for f in flows),
    )


@router.post("/bounds", response_model=BoundsResponse)
async def get_nodes_in_bounds(request: BoundsRequest):
    """
    지도 영역 내 노드 조회
    
    줌 레벨에 따라 자동으로 스케일 레벨 결정
    """
    engine = get_engine()
    
    # 줌 → 스케일 레벨
    scale_level = ScaleLevel.from_zoom(request.zoom)
    
    # 영역 생성
    bounds = Bounds(
        sw_lat=request.sw_lat,
        sw_lng=request.sw_lng,
        ne_lat=request.ne_lat,
        ne_lng=request.ne_lng,
    )
    
    # 노드 조회
    nodes = engine.get_nodes_at_level(scale_level, bounds)
    
    items = [
        NodeItem(
            id=n.id,
            name=n.name,
            level=n.level.value,
            lat=n.lat,
            lng=n.lng,
            ki_score=round(n.ki_score, 4),
            keyman_types=n.keyman_types,
            total_mass=n.total_mass,
            total_flow=n.total_flow,
            node_count=n.node_count,
            parent_id=n.parent_id,
            children_count=len(n.children_ids),
            sector=n.sector,
            flag=n.flag,
            icon=n.icon,
        )
        for n in nodes
    ]
    
    return BoundsResponse(
        level=scale_level.value,
        bounds=bounds.to_list(),
        zoom=request.zoom,
        count=len(items),
        nodes=items,
    )


@router.get("/stats")
async def get_stats():
    """전체 통계"""
    engine = get_engine()
    
    stats = {}
    for level in ScaleLevel:
        stats[level.value] = engine.get_level_stats(level)
    
    return {
        "levels": stats,
        "total_nodes": sum(s["count"] for s in stats.values()),
        "zoom_mapping": {
            "0-3": "L0 (World)",
            "4-6": "L1 (Country)",
            "7-10": "L2 (City)",
            "11-14": "L3 (District)",
            "15+": "L4 (Block)",
        },
    }


@router.get("/hierarchy/{root_id}")
async def get_hierarchy(root_id: str, max_depth: int = Query(default=3, ge=1, le=5)):
    """
    계층 트리 조회
    """
    engine = get_engine()
    root = engine.get_node(root_id)
    
    if not root:
        raise HTTPException(status_code=404, detail=f"Node {root_id} not found")
    
    def build_tree(node_id: str, depth: int) -> Dict:
        node = engine.get_node(node_id)
        if not node:
            return None
        
        tree = {
            "id": node.id,
            "name": node.name,
            "level": node.level.value,
            "ki_score": round(node.ki_score, 4),
            "keyman_types": node.keyman_types,
        }
        
        if depth > 0:
            children = engine.zoom_in(node_id)
            if children:
                tree["children"] = [
                    build_tree(c.id, depth - 1)
                    for c in sorted(children, key=lambda x: x.ki_score, reverse=True)[:10]
                ]
        
        return tree
    
    return {
        "root_id": root_id,
        "max_depth": max_depth,
        "hierarchy": build_tree(root_id, max_depth),
    }

