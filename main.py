from typing import List, Dict, Any, Optional
import qrcode
import io
import base64

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from standard import WorkflowGraph
from protocols.memory.local_memory import LocalMemory
from protocols.auth.zero_auth import ZeroAuth

app = FastAPI(title="Autus Twin Dev")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    # 실제 WorkflowGraph 사용 (standard.py)
    sample_nodes = [
        {'id': '1', 'type': 'city', 'name': 'seoul'},
        {'id': '2', 'type': 'employer', 'name': 'samsung'},
        {'id': '3', 'type': 'employer', 'name': 'lg'},
        {'id': '4', 'type': 'talent', 'name': 'dev_001'},
        {'id': '5', 'type': 'talent', 'name': 'dev_002'},
    ]
    sample_edges = [
        {'source': '1', 'target': '2', 'type': 'hosts'},
        {'source': '1', 'target': '3', 'type': 'hosts'},
        {'source': '2', 'target': '4', 'type': 'employs'},
        {'source': '3', 'target': '5', 'type': 'employs'},
    ]
    
    graph = WorkflowGraph(nodes=sample_nodes, edges=sample_edges)
    
    if not graph.validate():
        return TwinGraphSummary(
            nodes=0, edges=0, type_distribution={},
            influence_top=[], graph_health={"error": "invalid graph"}
        )
    
    # 타입별 분포 계산
    type_dist = {}
    for node in graph.nodes:
        t = node.get('type', 'unknown')
        type_dist[t] = type_dist.get(t, 0) + 1
    
    return TwinGraphSummary(
        nodes=len(graph.nodes),
        edges=len(graph.edges),
        type_distribution=type_dist,
        influence_top=[
            TwinGraphInfluenceNode(id='1', type='city', score=0.95),
            TwinGraphInfluenceNode(id='2', type='employer', score=0.8),
        ],
        graph_health={"connectivity": 0.9, "bottlenecks": [], "risk_index": 0.05},
    )

# ===== Memory Protocol =====

@app.get("/twin/memory/summary")
async def get_memory_summary():
    """Get local memory summary (Privacy by Architecture)"""
    memory = LocalMemory()
    return memory.get_summary()

@app.post("/twin/memory/preference")
async def set_memory_preference(key: str, value: str):
    """Set a preference (stored locally only)"""
    memory = LocalMemory()
    memory.set_preference(key, value)
    return {"status": "saved", "key": key}

# ===== Zero Auth Protocol =====

@app.get("/twin/auth/identity")
async def get_auth_identity():
    """Generate new Zero Identity (Article I)"""
    auth = ZeroAuth()
    return auth.get_identity_info()

@app.get("/twin/auth/qr")
async def get_auth_qr():
    """Generate QR data for device sync"""
    auth = ZeroAuth()
    return {
        "zero_id": auth.zero_id,
        "qr_data": auth.generate_qr_data(expires_minutes=5),
        "expires_in": "5 minutes"
    }

@app.get("/twin/auth/coordinates/{zero_id}")
async def get_3d_coordinates(zero_id: str):
    """Get 3D coordinates for identity visualization"""
    # In real app, would lookup seed by zero_id
    auth = ZeroAuth()
    return {
        "zero_id": auth.zero_id,
        "coordinates": auth.get_3d_coordinates()
    }

@app.get("/twin/auth/qr-image")
async def get_qr_image():
    """Generate actual QR code image as base64"""
    auth = ZeroAuth()
    qr_data = auth.generate_qr_data(expires_minutes=5)
    
    # Generate QR image
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode()
    
    return {
        "zero_id": auth.zero_id,
        "qr_image": f"data:image/png;base64,{img_base64}",
        "expires_in": "5 minutes"
    }

# ===== Dev Packs Protocol (Article III) =====

@app.get("/twin/packs")
async def get_dev_packs():
    """Get available Dev Packs (Meta-Circular Development)"""
    # Sample dev packs based on AUTUS architecture
    packs = [
        {
            "id": "school",
            "name": "School Pack",
            "description": "Education pathway automation",
            "status": "active",
            "modules": ["enrollment", "curriculum", "certification"],
            "cities": ["seoul", "clark"]
        },
        {
            "id": "visa",
            "name": "Visa Pack",
            "description": "Immigration and mobility support",
            "status": "active",
            "modules": ["application", "tracking", "renewal"],
            "cities": ["clark", "dubai"]
        },
        {
            "id": "job",
            "name": "Job Pack",
            "description": "Employment and career matching",
            "status": "beta",
            "modules": ["matching", "interview", "onboarding"],
            "cities": ["seoul", "singapore"]
        },
        {
            "id": "health",
            "name": "Health Pack",
            "description": "Healthcare access and records",
            "status": "planned",
            "modules": ["insurance", "records", "appointments"],
            "cities": []
        }
    ]
    
    return {
        "total": len(packs),
        "active": len([p for p in packs if p["status"] == "active"]),
        "packs": packs
    }

@app.get("/twin/packs/{pack_id}")
async def get_pack_detail(pack_id: str):
    """Get specific pack details"""
    pack_data = {
        "school": {
            "id": "school",
            "name": "School Pack",
            "version": "1.2.0",
            "description": "Complete education pathway automation",
            "status": "active",
            "modules": [
                {"name": "enrollment", "status": "active", "usage": 89},
                {"name": "curriculum", "status": "active", "usage": 76},
                {"name": "certification", "status": "active", "usage": 92}
            ],
            "cities": ["seoul", "clark"],
            "users_active": 1247,
            "retention_rate": 0.94
        },
        "visa": {
            "id": "visa",
            "name": "Visa Pack",
            "version": "2.0.1",
            "description": "Immigration and mobility support",
            "status": "active",
            "modules": [
                {"name": "application", "status": "active", "usage": 95},
                {"name": "tracking", "status": "active", "usage": 88},
                {"name": "renewal", "status": "beta", "usage": 45}
            ],
            "cities": ["clark", "dubai"],
            "users_active": 832,
            "retention_rate": 0.91
        }
    }
    
    if pack_id not in pack_data:
        return {"error": "Pack not found", "pack_id": pack_id}
    
    return pack_data[pack_id]

@app.get("/twin/packs/user/{zero_id}")
async def get_user_packs(zero_id: str):
    """Get packs assigned to a user"""
    # In real app, would lookup by zero_id
    return {
        "zero_id": zero_id,
        "active_packs": ["school", "visa"],
        "completed_packs": [],
        "recommended_packs": ["job"],
        "pack_history": [
            {"pack_id": "school", "enrolled_at": "2024-01-15", "progress": 0.75},
            {"pack_id": "visa", "enrolled_at": "2024-03-20", "progress": 0.45}
        ]
    }

# ===== Article III: Meta-Circular Development =====

@app.get("/twin/packs/status")
async def get_packs_status():
    """Get development packs status (Article III)"""
    return {
        "meta_circular": True,
        "packs": {
            "architect_pack": {"status": "active", "purpose": "Plans features"},
            "codegen_pack": {"status": "active", "purpose": "Generates code"},
            "testgen_pack": {"status": "active", "purpose": "Writes tests"},
            "pipeline_pack": {"status": "active", "purpose": "Orchestrates workflow"}
        },
        "capabilities": [
            "AUTUS develops AUTUS",
            "AI-speed development",
            "Self-evolving system"
        ],
        "article": "III: Meta-Circular Development"
    }

@app.get("/twin/protocols/status")
async def get_protocols_status():
    """Get all AUTUS protocols status"""
    return {
        "protocols": {
            "identity": {"article": "I", "status": "active", "file": "protocols/auth/zero_auth.py"},
            "memory": {"article": "II", "status": "active", "file": "protocols/memory/local_memory.py"},
            "workflow": {"article": "V", "status": "active", "file": "standard.py"},
            "packs": {"article": "III", "status": "active", "type": "meta-circular"}
        },
        "constitution_compliance": "100%",
        "total_endpoints": 16
    }

# ===== Universe Layer (1-2-3-4 통합) =====

@app.get("/universe/overview")
async def get_universe_overview():
    """Complete 1-2-3-4-Universe overview"""
    auth = ZeroAuth()
    memory = LocalMemory()
    
    return {
        "layers": {
            "1_identity": {
                "zero_id": auth.zero_id,
                "coordinates": auth.get_3d_coordinates(),
                "question": "Who am I?"
            },
            "2_sovereign": {
                "summary": memory.get_summary(),
                "question": "What do I value?"
            },
            "3_worlds": {
                "cities": ["seoul", "clark", "kathmandu"],
                "count": 3,
                "question": "Where do I belong?"
            },
            "4_packs": {
                "active": ["school", "visa", "cmms", "admissions"],
                "count": 4,
                "question": "How do I act?"
            }
        },
        "universe": {
            "nodes": 12,
            "edges": 18,
            "connectivity": 0.85,
            "question": "Who am I connected to, and what am I changing?"
        },
        "model": "1-2-3-4-Universe",
        "philosophy": "Your Personal Operating System"
    }

# ===== Twin Definition: Information-Context-Intent-Impact =====

@app.get("/twin/definition")
async def twin_definition():
    """Official AUTUS Digital Twin Definition"""
    return {
        "twin": "AUTUS Digital Twin",
        "pillars": ["information", "context", "intent", "impact"],
        "definition": {
            "information": {
                "ko": "현실에서 수집되는 모든 상태·이벤트·속성 값",
                "en": "All states, events, and attributes collected from reality",
                "layer": "3_worlds"
            },
            "context": {
                "ko": "정보 간의 관계, 시간, 구조를 형성하는 그래프",
                "en": "Graph forming relationships, time, and structure between information",
                "layer": "2_sovereign + 3_worlds"
            },
            "intent": {
                "ko": "팩·사용자·도시가 달성하려는 목표와 정책",
                "en": "Goals and policies that packs, users, and cities aim to achieve",
                "layer": "1_identity + 4_packs"
            },
            "impact": {
                "ko": "행동이 세계에 미치는 파급효과와 결과 지표",
                "en": "Ripple effects and outcome metrics of actions on the world",
                "layer": "4_packs + universe"
            }
        },
        "loop": "Information → Context → Intent → Impact → Information",
        "purpose": "정보·맥락·의도·영향의 순환 OS",
        "mapping": {
            "1_identity": "intent",
            "2_sovereign": "context + intent", 
            "3_worlds": "information + context",
            "4_packs": "intent + impact",
            "universe": "impact"
        },
        "version": "1.0.0"
    }

# ===== Universe Graph with Four Pillars =====

@app.get("/universe/graph")
async def get_universe_graph():
    """Universe graph structured by Information-Context-Intent-Impact"""
    return {
        "pillars": {
            "information": {
                "nodes": [
                    {"id": "seoul", "type": "city", "data": "population: 10M"},
                    {"id": "clark", "type": "city", "data": "population: 500K"},
                    {"id": "kathmandu", "type": "city", "data": "population: 1.5M"}
                ],
                "count": 3
            },
            "context": {
                "edges": [
                    {"from": "seoul", "to": "clark", "relation": "talent_flow"},
                    {"from": "clark", "to": "kathmandu", "relation": "education_partnership"},
                    {"from": "kathmandu", "to": "seoul", "relation": "visa_program"}
                ],
                "count": 3
            },
            "intent": {
                "packs": [
                    {"id": "school", "goal": "Operate education systems"},
                    {"id": "visa", "goal": "Manage talent migration"},
                    {"id": "cmms", "goal": "Maintain facilities"},
                    {"id": "admissions", "goal": "Process applications"}
                ],
                "count": 4
            },
            "impact": {
                "metrics": [
                    {"id": "retention", "value": 0.85, "trend": "up"},
                    {"id": "talent_growth", "value": 0.12, "trend": "up"},
                    {"id": "efficiency", "value": 0.90, "trend": "stable"}
                ],
                "count": 3
            }
        },
        "loop": "Information → Context → Intent → Impact",
        "total_nodes": 13,
        "total_edges": 3,
        "health": 0.90
    }

# ===== Pack Engine API =====

import sys
sys.path.insert(0, '.')
from core.pack.runner import PackRunner

pack_runner = PackRunner()

@app.get("/packs/list")
async def list_packs():
    """List available packs"""
    return {
        "packs": pack_runner.list_packs(),
        "count": len(pack_runner.list_packs())
    }

@app.post("/packs/execute")
async def execute_pack(pack_name: str, inputs: dict):
    """Execute a pack with given inputs"""
    try:
        result = pack_runner.execute_pack(pack_name, inputs)
        return result
    except FileNotFoundError as e:
        return {"error": str(e), "status": "failed"}
    except Exception as e:
        return {"error": str(e), "status": "failed"}

@app.post("/packs/architect")
async def run_architect(feature_description: str):
    """Quick endpoint to run architect_pack"""
    result = pack_runner.execute_pack("architect_pack", {
        "feature_description": feature_description
    })
    return result

@app.post("/packs/codegen")
async def run_codegen(file_path: str, purpose: str):
    """Quick endpoint to run codegen_pack"""
    result = pack_runner.execute_pack("codegen_pack", {
        "file_path": file_path,
        "purpose": purpose
    })
    return result

# ===== Reality Events API =====
from api.reality_events import router as reality_router
app.include_router(reality_router)

# ===== Sovereign API (Layer 2) =====
from api.sovereign import router as sovereign_router
app.include_router(sovereign_router)

# ===== Sovereign Import API =====
from api.sovereign_import import router as sovereign_import_router
app.include_router(sovereign_import_router)

# ===== Me API (Role-based Personalized View) =====
from api.me import router as me_router
app.include_router(me_router)

# ===== God Mode API (Seho Only) =====
from api.god import router as god_router
app.include_router(god_router)
