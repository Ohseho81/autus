"""
AUTUS Physics API
Semantic Neutrality Compliant

Node = 사람/기업/국가
Motion = 돈/시간/가치
All motion toward Origin
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import uuid4, UUID
import asyncio
import math
import random

# ============================================
# Models
# ============================================

class State(BaseModel):
    delta: float = Field(..., ge=0, le=1, description="ΔGoal - distance to goal")
    mu: float = Field(..., ge=0, le=1, description="Friction coefficient")
    rho: float = Field(..., ge=0, le=1, description="Momentum")
    sigma: float = Field(..., ge=0, description="Variance")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class VectorInput(BaseModel):
    delta_v: float = Field(..., ge=-1, le=1, description="Vector change")


class StateTransition(BaseModel):
    previous: State
    current: State
    delta_v_applied: float
    equation_used: str = "S(t+1) = S(t) + ρ·Δv − μ·|v|"


class Node(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    r: float = Field(..., gt=0, description="Distance from Origin")
    theta: float = Field(..., ge=0, le=2*math.pi, description="Angle in radians")
    mass: float = Field(..., gt=0, description="Node mass")
    velocity: float = Field(default=0.005, description="Orbital velocity")
    flow: float = Field(default=0.0, description="Flow toward Origin")
    level: int = Field(..., ge=1, le=3, description="Proximity level")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @staticmethod
    def calculate_level(r: float) -> int:
        if r < 80:
            return 1
        elif r < 140:
            return 2
        else:
            return 3


class NodeCreate(BaseModel):
    r: float = Field(..., gt=0)
    theta: float = Field(..., ge=0, le=2*math.pi)
    mass: float = Field(..., gt=0)


class NodeUpdate(BaseModel):
    r: Optional[float] = Field(None, gt=0)
    theta: Optional[float] = Field(None, ge=0, le=2*math.pi)
    mass: Optional[float] = Field(None, gt=0)
    velocity: Optional[float] = None


class Motion(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    angle: float
    progress: float = Field(..., ge=0, le=1)
    intensity: float = Field(..., ge=0, le=1)
    start_r: float
    source_node_id: Optional[UUID] = None


class Goal(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    anchor: str = Field(..., max_length=500, description="Goal text (stored as-is)")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    state: State


class GoalCreate(BaseModel):
    anchor: str = Field(..., max_length=500)


# ============================================
# Physics Engine
# ============================================

class PhysicsEngine:
    def __init__(self):
        self.state = State(delta=0.68, mu=0.23, rho=0.81, sigma=0.12)
        self.nodes: dict[UUID, Node] = {}
        self.motions: list[Motion] = []
        self.goal: Optional[Goal] = None
        self._init_default_nodes()
        self._init_default_motions()

    def _init_default_nodes(self):
        """Initialize default nodes at different proximity levels"""
        # L1 nodes (r < 80)
        for i in range(5):
            node = Node(
                r=50 + random.random() * 25,
                theta=(i * 2 * math.pi) / 5 + random.random() * 0.3,
                mass=1.5 + random.random() * 1.5,
                velocity=0.008 + random.random() * 0.004,
                level=1
            )
            self.nodes[node.id] = node
        
        # L2 nodes (80 <= r < 140)
        for i in range(8):
            node = Node(
                r=90 + random.random() * 40,
                theta=(i * 2 * math.pi) / 8 + random.random() * 0.2,
                mass=0.8 + random.random() * 1.0,
                velocity=0.005 + random.random() * 0.003,
                level=2
            )
            self.nodes[node.id] = node
        
        # L3 nodes (r >= 140)
        for i in range(12):
            node = Node(
                r=150 + random.random() * 45,
                theta=(i * 2 * math.pi) / 12 + random.random() * 0.15,
                mass=0.3 + random.random() * 0.6,
                velocity=0.003 + random.random() * 0.002,
                level=3
            )
            self.nodes[node.id] = node

    def _init_default_motions(self):
        """Initialize motions flowing toward Origin"""
        for _ in range(24):
            self.motions.append(Motion(
                angle=random.random() * 2 * math.pi,
                progress=random.random(),
                intensity=0.3 + random.random() * 0.7,
                start_r=80 + random.random() * 140
            ))

    def apply_vector(self, delta_v: float) -> StateTransition:
        """Apply state transition: S(t+1) = S(t) + ρ·Δv − μ·|v|"""
        previous = self.state.model_copy()
        
        # Physics equation
        new_rho = max(0, min(1, self.state.rho + delta_v * 0.1))
        new_delta = max(0, min(1, 
            self.state.delta - self.state.rho * 0.01 + self.state.mu * 0.005
        ))
        
        self.state = State(
            delta=new_delta,
            mu=self.state.mu,
            rho=new_rho,
            sigma=self.state.sigma
        )
        
        return StateTransition(
            previous=previous,
            current=self.state,
            delta_v_applied=delta_v
        )

    def get_flow_rate(self) -> float:
        """Calculate aggregate flow rate toward Origin"""
        if not self.motions:
            return 0.0
        return sum(m.intensity * m.progress for m in self.motions) / len(self.motions)

    def update_motions(self):
        """Update motion progress (called periodically)"""
        for motion in self.motions:
            motion.progress += 0.004 * motion.intensity * self.state.rho
            if motion.progress >= 1:
                motion.progress = 0
                motion.angle = random.random() * 2 * math.pi
                motion.start_r = 80 + random.random() * 140


# Global engine instance
engine = PhysicsEngine()


# ============================================
# Router
# ============================================

from fastapi import APIRouter

router = APIRouter(prefix="/v1", tags=["physics"])


# State Endpoints
@router.get("/state", response_model=State)
async def get_state():
    """Get current physical state"""
    return engine.state


@router.post("/state/vector", response_model=StateTransition)
async def apply_vector(input: VectorInput):
    """Apply vector input to state"""
    return engine.apply_vector(input.delta_v)


@router.get("/physics/equation")
async def get_equation():
    """Get state transition equation"""
    return {
        "equation": "S(t+1) = S(t) + ρ·Δv − μ·|v|",
        "variables": {
            "S": "State vector",
            "rho": "Momentum coefficient",
            "mu": "Friction coefficient",
            "delta_v": "Vector input"
        }
    }


# Node Endpoints
@router.get("/nodes")
async def list_nodes(
    level: Optional[int] = Query(None, ge=1, le=3),
    r_min: Optional[float] = Query(None, ge=0),
    r_max: Optional[float] = Query(None, ge=0)
):
    """List all nodes (사람/기업/국가)"""
    nodes = list(engine.nodes.values())
    
    if level is not None:
        nodes = [n for n in nodes if n.level == level]
    if r_min is not None:
        nodes = [n for n in nodes if n.r >= r_min]
    if r_max is not None:
        nodes = [n for n in nodes if n.r <= r_max]
    
    return {"nodes": nodes, "count": len(nodes)}


@router.get("/nodes/{node_id}", response_model=Node)
async def get_node(node_id: UUID):
    """Get node by ID"""
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    return engine.nodes[node_id]


@router.post("/nodes", response_model=Node, status_code=201)
async def create_node(data: NodeCreate):
    """Create a new node"""
    node = Node(
        r=data.r,
        theta=data.theta,
        mass=data.mass,
        level=Node.calculate_level(data.r)
    )
    engine.nodes[node.id] = node
    return node


@router.patch("/nodes/{node_id}", response_model=Node)
async def update_node(node_id: UUID, data: NodeUpdate):
    """Update node physical properties"""
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    
    node = engine.nodes[node_id]
    update_data = data.model_dump(exclude_unset=True)
    
    for key, value in update_data.items():
        setattr(node, key, value)
    
    if 'r' in update_data:
        node.level = Node.calculate_level(node.r)
    
    node.updated_at = datetime.utcnow()
    return node


@router.delete("/nodes/{node_id}", status_code=204)
async def delete_node(node_id: UUID):
    """Remove node"""
    if node_id not in engine.nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    del engine.nodes[node_id]


# Motion Endpoints
@router.get("/motions")
async def list_motions():
    """Get current motions (돈/시간/가치 flows)"""
    return {
        "motions": engine.motions,
        "flow_rate": engine.get_flow_rate()
    }


# Goal Endpoints
@router.get("/goal", response_model=Goal)
async def get_goal():
    """Get current goal"""
    if engine.goal is None:
        raise HTTPException(status_code=404, detail="No goal set")
    return engine.goal


@router.put("/goal", response_model=Goal)
async def set_goal(data: GoalCreate):
    """Set or update goal (resets coordinate system)"""
    engine.goal = Goal(
        anchor=data.anchor,
        state=engine.state
    )
    return engine.goal


# ============================================
# WebSocket for Motion Streaming
# ============================================

async def motion_stream_handler(websocket: WebSocket):
    """WebSocket handler for real-time motion updates"""
    await websocket.accept()
    
    try:
        while True:
            engine.update_motions()
            
            await websocket.send_json({
                "type": "motion_update",
                "data": {
                    "motions": [m.model_dump(mode='json') for m in engine.motions],
                    "flow_rate": engine.get_flow_rate()
                },
                "timestamp": datetime.utcnow().isoformat()
            })
            
            await asyncio.sleep(0.05)  # 20 FPS
    except WebSocketDisconnect:
        pass


# Export for main app
__all__ = ['router', 'engine', 'motion_stream_handler']
