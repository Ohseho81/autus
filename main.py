from typing import List, Dict, Any, Optional

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Autus Twin Dev")

# 간단 헬스체크
@app.get("/health")
async def health():
    return {"status": "ok"}

# ===== Twin 모델 정의 =====

class TwinCitySummary(BaseModel):
    city_id: str
    score: float

class TwinGraphInfluenceNode(BaseModel):
    id: str
    type: str
    score: float

class TwinOverview(BaseModel):
    city_count: int
    talent_total: int
    active_packs: int
    retention_avg: float
    global_risk: float
    top_cities: List[TwinCitySummary]
    graph: Dict[str, Any]

class TwinCity(BaseModel):
    city_id: str
    population: Optional[int] = None
    talent_active: int
    packs: Dict[str, Any]
    risk: Dict[str, float]
    graph: Dict[str, Any]
    timeline: List[Dict[str, Any]]

class TwinUser(BaseModel):
    zero_id: str
    status: Dict[str, Any]
    opportunities: List[Dict[str, Any]]
    packs: Dict[str, Any]
    sovereign: Dict[str, Any]

class TwinGraphSummary(BaseModel):
    nodes: int
    edges: int
    type_distribution: Dict[str, int]
    influence_top: List[TwinGraphInfluenceNode]
    graph_health: Dict[str, Any]

# ===== Twin 엔드포인트 =====

@app.get("/twin/overview", response_model=TwinOverview)
async def get_twin_overview() -> TwinOverview:
    # TODO: 나중에 city_os, pack_os, graph_os 등과 실제 연결
    return TwinOverview(
        city_count=1,
        talent_total=100,
        active_packs=5,
        retention_avg=0.92,
        global_risk=0.1,
        top_cities=[TwinCitySummary(city_id="seoul", score=0.95)],
        graph={"nodes": 10, "edges": 20, "influence_top": []},
    )

@app.get("/twin/city/{city_id}", response_model=TwinCity)
async def get_twin_city(city_id: str) -> TwinCity:
    return TwinCity(
        city_id=city_id,
        population=None,
        talent_active=50,
        packs={"active": ["school", "visa"], "history": []},
        risk={"legal": 0.1, "social": 0.2},
        graph={"nodes": 5, "edges": 8, "top_nodes": []},
        timeline=[],
    )

@app.get("/twin/user/{zero_id}", response_model=TwinUser)
async def get_twin_user(zero_id: str) -> TwinUser:
    return TwinUser(
        zero_id=zero_id,
        status={"city": "seoul", "stage": "training"},
        opportunities=[{"city": "clark", "path": "job"}],
        packs={"active": ["school"], "history": []},
        sovereign={"last_rotation": None, "consent": []},
    )

@app.get("/twin/graph/summary", response_model=TwinGraphSummary)
async def get_twin_graph_summary() -> TwinGraphSummary:
    return TwinGraphSummary(
        nodes=10,
        edges=20,
        type_distribution={"city": 1, "employer": 3, "talent": 6},
        influence_top=[],
        graph_health={"connectivity": 0.8, "bottlenecks": [], "risk_index": 0.1},
    )
