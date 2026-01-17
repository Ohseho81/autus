"""
AUTUS API Backend
FastAPI Server for Geo-Causal Digital Twin Integration
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from enum import Enum
import asyncio
import json
import math
import uuid

# ============================================
# APP INITIALIZATION
# ============================================

app = FastAPI(
    title="AUTUS API",
    description="Operating System of Reality - Geo-Causal Digital Twin API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# DATA MODELS
# ============================================

class NodeType(str, Enum):
    TASK = "task"
    CAPITAL = "capital"
    CONTRACT = "contract"
    REGULATION = "regulation"
    RESOURCE = "resource"

class GateState(str, Enum):
    NONE = "NONE"
    RING = "RING"
    LOCK = "LOCK"
    AFTERIMAGE = "AFTERIMAGE"

class GeoNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    type: NodeType
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    mass: float = Field(..., ge=0, le=10, description="K value")
    psi: float = Field(..., ge=0, le=1, description="Irreversibility")
    interaction: float = Field(default=0.5, ge=0, le=1)
    entropy_sensitivity: float = Field(default=0.5, ge=0, le=1)
    inertia_debt: float = Field(default=0, ge=0)
    boundary_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class GeoEdge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    from_node: str
    to_node: str
    weight: float = Field(default=1.0, ge=0, le=10)
    cross_boundary: bool = False

class Boundary(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    polygon: List[List[float]]  # [[lng, lat], ...]
    attenuation: float = Field(default=0.5, ge=0, le=1)

class SimParams(BaseModel):
    alpha: float = Field(default=0.0006, description="Distance decay")
    beta: float = Field(default=0.5, description="Boundary attenuation")
    gamma: float = Field(default=0.3, description="Density amplification")
    lambda_: float = Field(default=0.1, alias="lambda", description="Natural decay")
    theta: float = Field(default=0.7, description="Gate threshold")
    delta_t: float = Field(default=0.1, description="Time step")

class SimFrame(BaseModel):
    node_id: str
    wave_radius: float
    color_temp: float
    inertia_halo: float
    gate_state: GateState
    delta_s: float
    impact_value: float

class SimResult(BaseModel):
    frames: List[SimFrame]
    total_entropy: float
    extinct_nodes: List[str]
    amplify_nodes: List[str]
    cascade_nodes: List[str]
    gate_triggered: bool
    timestamp: datetime

class GravityPreset(BaseModel):
    id: str
    name: str
    category: Literal["region", "domain"]
    params: SimParams
    description: str

# ============================================
# IN-MEMORY DATA STORE
# ============================================

class DataStore:
    def __init__(self):
        self.nodes: Dict[str, GeoNode] = {}
        self.edges: Dict[str, GeoEdge] = {}
        self.boundaries: Dict[str, Boundary] = {}
        self.presets: Dict[str, GravityPreset] = {}
        self.current_params: SimParams = SimParams()
        self._init_presets()
        self._init_sample_data()
    
    def _init_presets(self):
        """Initialize gravity presets"""
        presets = [
            GravityPreset(
                id="seoul",
                name="Seoul Metro",
                category="region",
                params=SimParams(alpha=0.0008, beta=0.5, gamma=0.4, theta=0.7),
                description="High density urban area"
            ),
            GravityPreset(
                id="rural",
                name="Rural Area",
                category="region",
                params=SimParams(alpha=0.0003, beta=0.7, gamma=0.1, theta=0.8),
                description="Low density rural area"
            ),
            GravityPreset(
                id="industrial",
                name="Industrial",
                category="region",
                params=SimParams(alpha=0.0006, beta=0.5, gamma=0.3, theta=0.7),
                description="Industrial zone"
            ),
            GravityPreset(
                id="global",
                name="Global",
                category="region",
                params=SimParams(alpha=0.0001, beta=0.3, gamma=0.2, theta=0.6),
                description="Global scale operations"
            ),
            GravityPreset(
                id="finance",
                name="Finance",
                category="domain",
                params=SimParams(alpha=0.0005, beta=0.4, gamma=0.3, theta=0.6),
                description="Financial operations (high ψ)"
            ),
            GravityPreset(
                id="tech",
                name="Tech",
                category="domain",
                params=SimParams(alpha=0.0007, beta=0.6, gamma=0.35, theta=0.9),
                description="Technology sector"
            ),
            GravityPreset(
                id="legal",
                name="Legal",
                category="domain",
                params=SimParams(alpha=0.0004, beta=0.3, gamma=0.25, theta=0.4),
                description="Legal operations (very high ψ)"
            ),
            GravityPreset(
                id="ops",
                name="Operations",
                category="domain",
                params=SimParams(alpha=0.0008, beta=0.6, gamma=0.4, theta=0.8),
                description="General operations"
            ),
        ]
        for p in presets:
            self.presets[p.id] = p
    
    def _init_sample_data(self):
        """Initialize sample nodes for Korea"""
        sample_nodes = [
            GeoNode(id="hq", name="본사 운영", type=NodeType.TASK, lat=37.5665, lng=126.9780, mass=9.2, psi=0.92, entropy_sensitivity=0.85),
            GeoNode(id="gangnam", name="강남 지사", type=NodeType.TASK, lat=37.4979, lng=127.0276, mass=7.5, psi=0.78, entropy_sensitivity=0.72),
            GeoNode(id="pangyo", name="판교 R&D", type=NodeType.TASK, lat=37.3947, lng=127.1119, mass=6.8, psi=0.65, entropy_sensitivity=0.68),
            GeoNode(id="incheon", name="인천 물류", type=NodeType.RESOURCE, lat=37.4563, lng=126.7052, mass=5.5, psi=0.55, entropy_sensitivity=0.60),
            GeoNode(id="suwon", name="수원 법무", type=NodeType.CONTRACT, lat=37.2636, lng=127.0286, mass=4.8, psi=0.88, entropy_sensitivity=0.52),
            GeoNode(id="capital", name="주요 자금", type=NodeType.CAPITAL, lat=37.5172, lng=127.0473, mass=8.5, psi=0.95, entropy_sensitivity=0.90),
            GeoNode(id="contract", name="핵심 계약", type=NodeType.CONTRACT, lat=37.5045, lng=127.0245, mass=7.8, psi=0.85, entropy_sensitivity=0.75),
            GeoNode(id="busan", name="부산 지점", type=NodeType.TASK, lat=35.1796, lng=129.0756, mass=4.2, psi=0.45, entropy_sensitivity=0.48),
            GeoNode(id="daegu", name="대구 지점", type=NodeType.TASK, lat=35.8714, lng=128.6014, mass=3.8, psi=0.42, entropy_sensitivity=0.45),
            GeoNode(id="jeju", name="제주 휴양", type=NodeType.RESOURCE, lat=33.4996, lng=126.5312, mass=2.5, psi=0.25, entropy_sensitivity=0.30),
            GeoNode(id="tokyo", name="Tokyo Office", type=NodeType.TASK, lat=35.6762, lng=139.6503, mass=5.2, psi=0.68, entropy_sensitivity=0.62),
            GeoNode(id="singapore", name="Singapore Hub", type=NodeType.CAPITAL, lat=1.3521, lng=103.8198, mass=6.0, psi=0.72, entropy_sensitivity=0.70),
        ]
        for n in sample_nodes:
            self.nodes[n.id] = n
        
        # Sample edges
        sample_edges = [
            GeoEdge(id="e1", from_node="hq", to_node="gangnam", weight=0.9),
            GeoEdge(id="e2", from_node="hq", to_node="pangyo", weight=0.8),
            GeoEdge(id="e3", from_node="hq", to_node="capital", weight=0.95),
            GeoEdge(id="e4", from_node="gangnam", to_node="suwon", weight=0.7),
            GeoEdge(id="e5", from_node="pangyo", to_node="suwon", weight=0.6),
            GeoEdge(id="e6", from_node="hq", to_node="incheon", weight=0.5),
            GeoEdge(id="e7", from_node="hq", to_node="busan", weight=0.4),
            GeoEdge(id="e8", from_node="hq", to_node="tokyo", weight=0.6, cross_boundary=True),
            GeoEdge(id="e9", from_node="capital", to_node="singapore", weight=0.7, cross_boundary=True),
        ]
        for e in sample_edges:
            self.edges[e.id] = e
        
        # Sample boundary (Seoul Metro)
        seoul_boundary = Boundary(
            id="seoul_metro",
            name="Seoul Metropolitan Area",
            polygon=[
                [126.7, 37.7], [127.2, 37.7], [127.3, 37.4],
                [127.2, 37.2], [126.7, 37.2], [126.5, 37.4], [126.7, 37.7]
            ],
            attenuation=0.5
        )
        self.boundaries[seoul_boundary.id] = seoul_boundary

# Global store
store = DataStore()

# ============================================
# PHYSICS CALCULATIONS
# ============================================

def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate haversine distance in meters"""
    R = 6371000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lng2 - lng1)
    
    a = math.sin(delta_phi/2)**2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    
    return R * c

def point_in_polygon(point: List[float], polygon: List[List[float]]) -> bool:
    """Ray casting algorithm for point-in-polygon test"""
    x, y = point
    n = len(polygon)
    inside = False
    
    j = n - 1
    for i in range(n):
        xi, yi = polygon[i]
        xj, yj = polygon[j]
        
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi) + xi):
            inside = not inside
        j = i
    
    return inside

def run_simulation(focus_id: str, t: float = 0.5) -> SimResult:
    """Run simulation from focus node"""
    if focus_id not in store.nodes:
        raise HTTPException(status_code=404, detail=f"Node {focus_id} not found")
    
    focus = store.nodes[focus_id]
    params = store.current_params
    nodes = list(store.nodes.values())
    
    frames: List[SimFrame] = []
    extinct_nodes: List[str] = []
    amplify_nodes: List[str] = []
    cascade_nodes: List[str] = []
    total_entropy = 0.0
    gate_triggered = False
    
    for node in nodes:
        # Distance
        distance = haversine(focus.lat, focus.lng, node.lat, node.lng)
        
        # Base impact
        impact = focus.mass * math.exp(-params.alpha * distance)
        
        # Boundary attenuation
        for boundary in store.boundaries.values():
            focus_in = point_in_polygon([focus.lng, focus.lat], boundary.polygon)
            node_in = point_in_polygon([node.lng, node.lat], boundary.polygon)
            if focus_in != node_in:
                impact *= boundary.attenuation
        
        # Density amplification
        nearby = sum(1 for n in nodes if n.id != node.id and haversine(node.lat, node.lng, n.lat, n.lng) < 5000)
        density = nearby / 10
        impact *= (1 + params.gamma * density)
        
        # Time response
        impact *= 1 / (1 + math.exp(-10 * (t - 0.5)))
        
        # Entropy
        delta_s = impact * node.mass * node.entropy_sensitivity * params.delta_t
        total_entropy += delta_s
        
        # Update debt
        node.inertia_debt = max(0, node.inertia_debt + delta_s - params.lambda_)
        
        # Gate state (CONSTITUTION)
        gate_state = GateState.NONE
        if node.inertia_debt > params.theta * 1.5:
            gate_state = GateState.AFTERIMAGE
            extinct_nodes.append(node.id)
        elif delta_s > params.theta:
            gate_state = GateState.LOCK
            gate_triggered = True
            cascade_nodes.append(node.id)
        elif delta_s > params.theta * 0.8:
            gate_state = GateState.RING
            amplify_nodes.append(node.id)
        
        frames.append(SimFrame(
            node_id=node.id,
            wave_radius=distance * t,
            color_temp=min(1, delta_s / params.theta),
            inertia_halo=min(1, node.inertia_debt / (params.theta * 1.5)),
            gate_state=gate_state,
            delta_s=delta_s,
            impact_value=impact
        ))
    
    return SimResult(
        frames=frames,
        total_entropy=total_entropy,
        extinct_nodes=extinct_nodes,
        amplify_nodes=amplify_nodes,
        cascade_nodes=cascade_nodes,
        gate_triggered=gate_triggered,
        timestamp=datetime.utcnow()
    )

# ============================================
# API ROUTES
# ============================================

@app.get("/")
async def root():
    return {
        "name": "AUTUS API",
        "version": "2.0.0",
        "status": "operational",
        "principle": "NO RECOMMENDATION · OBSERVATION ONLY"
    }

# --- Nodes ---

@app.get("/nodes", response_model=List[GeoNode])
async def get_nodes():
    """Get all nodes"""
    return list(store.nodes.values())

@app.get("/nodes/{node_id}", response_model=GeoNode)
async def get_node(node_id: str):
    """Get single node by ID"""
    if node_id not in store.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    return store.nodes[node_id]

@app.post("/nodes", response_model=GeoNode)
async def create_node(node: GeoNode):
    """Create new node"""
    store.nodes[node.id] = node
    return node

@app.put("/nodes/{node_id}", response_model=GeoNode)
async def update_node(node_id: str, node: GeoNode):
    """Update existing node"""
    if node_id not in store.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    node.id = node_id
    node.updated_at = datetime.utcnow()
    store.nodes[node_id] = node
    return node

@app.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    """Delete node"""
    if node_id not in store.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    del store.nodes[node_id]
    return {"deleted": node_id}

# --- Edges ---

@app.get("/edges", response_model=List[GeoEdge])
async def get_edges():
    """Get all edges"""
    return list(store.edges.values())

@app.post("/edges", response_model=GeoEdge)
async def create_edge(edge: GeoEdge):
    """Create new edge"""
    store.edges[edge.id] = edge
    return edge

# --- Boundaries ---

@app.get("/boundaries", response_model=List[Boundary])
async def get_boundaries():
    """Get all boundaries"""
    return list(store.boundaries.values())

@app.post("/boundaries", response_model=Boundary)
async def create_boundary(boundary: Boundary):
    """Create new boundary"""
    store.boundaries[boundary.id] = boundary
    return boundary

# --- Presets ---

@app.get("/presets", response_model=List[GravityPreset])
async def get_presets(category: Optional[str] = None):
    """Get gravity presets"""
    presets = list(store.presets.values())
    if category:
        presets = [p for p in presets if p.category == category]
    return presets

@app.get("/presets/{preset_id}", response_model=GravityPreset)
async def get_preset(preset_id: str):
    """Get single preset"""
    if preset_id not in store.presets:
        raise HTTPException(status_code=404, detail="Preset not found")
    return store.presets[preset_id]

@app.post("/presets/{preset_id}/apply")
async def apply_preset(preset_id: str):
    """Apply preset to current simulation parameters"""
    if preset_id not in store.presets:
        raise HTTPException(status_code=404, detail="Preset not found")
    preset = store.presets[preset_id]
    store.current_params = preset.params
    return {"applied": preset_id, "params": preset.params}

# --- Parameters ---

@app.get("/params", response_model=SimParams)
async def get_params():
    """Get current simulation parameters"""
    return store.current_params

@app.put("/params", response_model=SimParams)
async def update_params(params: SimParams):
    """Update simulation parameters"""
    store.current_params = params
    return params

# --- Simulation ---

@app.post("/simulate/{focus_id}", response_model=SimResult)
async def simulate(focus_id: str, t: float = Query(default=0.5, ge=0, le=1)):
    """Run simulation from focus node"""
    return run_simulation(focus_id, t)

@app.post("/simulate/{focus_id}/steps")
async def simulate_steps(focus_id: str, steps: int = Query(default=10, ge=1, le=100)):
    """Run multi-step simulation"""
    results = []
    for i in range(steps):
        t = (i + 1) / steps
        results.append(run_simulation(focus_id, t))
    return results

# --- Gate Constitution (Read-Only) ---

@app.get("/constitution")
async def get_constitution():
    """Get Gate Constitution (immutable rules)"""
    return {
        "rules": [
            {
                "id": "§1",
                "name": "AUTO_LOCK",
                "condition": "IF ΔṠ > θ THEN LOCK",
                "description": "Entropy acceleration exceeds threshold triggers automatic gate lock"
            },
            {
                "id": "§2",
                "name": "AFTERIMAGE",
                "condition": "IF D > 1.5θ THEN AFTERIMAGE",
                "description": "Inertia debt exceeding 1.5× threshold creates irreversible trace"
            },
            {
                "id": "§3",
                "name": "BOUNDARY_EFFECT",
                "condition": "CROSS_BOUNDARY → β × IMPACT",
                "description": "Cross-boundary impact attenuated by β coefficient"
            },
            {
                "id": "§4",
                "name": "OBSERVATION_ONLY",
                "condition": "APPLY_BUTTON = NULL",
                "description": "Simulation is observation-only; direct manipulation prohibited"
            }
        ],
        "immutable": True,
        "principle": "NO RECOMMENDATION · OBSERVATION ONLY"
    }

# --- System Status ---

@app.get("/status")
async def get_status():
    """Get system status"""
    total_nodes = len(store.nodes)
    total_edges = len(store.edges)
    total_boundaries = len(store.boundaries)
    
    total_mass = sum(n.mass for n in store.nodes.values())
    avg_psi = sum(n.psi for n in store.nodes.values()) / total_nodes if total_nodes > 0 else 0
    total_debt = sum(n.inertia_debt for n in store.nodes.values())
    
    return {
        "status": "operational",
        "nodes": total_nodes,
        "edges": total_edges,
        "boundaries": total_boundaries,
        "total_mass": round(total_mass, 2),
        "avg_psi": round(avg_psi, 3),
        "total_inertia_debt": round(total_debt, 3),
        "current_params": store.current_params,
        "timestamp": datetime.utcnow()
    }

# ============================================
# WEBSOCKET FOR REAL-TIME UPDATES
# ============================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_json(message)

manager = ConnectionManager()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            
            if data.get("type") == "SIMULATE":
                focus_id = data.get("focus_id")
                t = data.get("t", 0.5)
                result = run_simulation(focus_id, t)
                await websocket.send_json({
                    "type": "SIMULATION_RESULT",
                    "result": result.dict()
                })
            
            elif data.get("type") == "SUBSCRIBE_STATUS":
                status = await get_status()
                await websocket.send_json({
                    "type": "STATUS",
                    "data": status
                })
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
