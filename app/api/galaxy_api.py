from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Table, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
from pydantic import BaseModel, Field
import json

from ..database import get_db

Base = declarative_base()

# Association table for galaxy-solar relationships
galaxy_solar_association = Table(
    'galaxy_solar',
    Base.metadata,
    Column('galaxy_id', Integer, ForeignKey('galaxies.id')),
    Column('solar_id', Integer, ForeignKey('solars.id')),
    Column('coupling', Float, default=1.0),
    Column('created_at', DateTime, default=datetime.utcnow)
)

class Galaxy(Base):
    """Galaxy entity representing a multi-system organization"""
    __tablename__ = "galaxies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    outer_entropy = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    solars = relationship("Solar", secondary=galaxy_solar_association, back_populates="galaxies")

class Solar(Base):
    """Solar entity representing individual decision-making units"""
    __tablename__ = "solars"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    entropy = Column(Float, default=0.0)
    decision_power = Column(Float, default=1.0)
    status = Column(String, default="active")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    galaxies = relationship("Galaxy", secondary=galaxy_solar_association, back_populates="solars")

# Pydantic models
class GalaxyCreate(BaseModel):
    """Schema for creating a new galaxy"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)

class SolarAdd(BaseModel):
    """Schema for adding a solar to a galaxy"""
    solar_id: int = Field(..., gt=0)
    coupling: float = Field(1.0, ge=0.0, le=10.0)

class GalaxyStatus(BaseModel):
    """Schema for galaxy status response"""
    id: int
    name: str
    description: Optional[str]
    outer_entropy: float
    solar_count: int
    average_solar_entropy: float
    total_decision_power: float
    active_solars: int
    created_at: datetime
    updated_at: datetime

class PropagationNode(BaseModel):
    """Schema for propagation graph nodes"""
    id: int
    name: str
    entropy: float
    decision_power: float
    status: str
    coupling: float

class PropagationEdge(BaseModel):
    """Schema for propagation graph edges"""
    source: int
    target: int
    weight: float
    entropy_flow: float

class PropagationGraph(BaseModel):
    """Schema for entropy propagation graph"""
    galaxy_id: int
    galaxy_name: str
    outer_entropy: float
    nodes: List[PropagationNode]
    edges: List[PropagationEdge]
    propagation_paths: List[Dict[str, Any]]

class GalaxyResponse(BaseModel):
    """Schema for galaxy response"""
    id: int
    name: str
    description: Optional[str]
    outer_entropy: float
    created_at: datetime
    updated_at: datetime

router = APIRouter(prefix="/galaxy", tags=["galaxy"])

def calculate_outer_entropy(db: Session, galaxy_id: int) -> float:
    """
    Calculate OuterEntropy = Σ(SolarEntropy × coupling)
    
    Args:
        db: Database session
        galaxy_id: Galaxy ID
        
    Returns:
        Calculated outer entropy value
    """
    query = text("""
        SELECT COALESCE(SUM(s.entropy * gs.coupling), 0.0) as outer_entropy
        FROM solars s
        JOIN galaxy_solar gs ON s.id = gs.solar_id
        WHERE gs.galaxy_id = :galaxy_id AND s.status = 'active'
    """)
    
    result = db.execute(query, {"galaxy_id": galaxy_id}).fetchone()
    return float(result.outer_entropy) if result else 0.0

def update_galaxy_entropy(db: Session, galaxy_id: int) -> None:
    """Update galaxy's outer entropy based on connected solars"""
    outer_entropy = calculate_outer_entropy(db, galaxy_id)
    
    galaxy = db.query(Galaxy).filter(Galaxy.id == galaxy_id).first()
    if galaxy:
        galaxy.outer_entropy = outer_entropy
        galaxy.updated_at = datetime.utcnow()
        db.commit()

@router.post("/create", response_model=GalaxyResponse, status_code=status.HTTP_201_CREATED)
async def create_galaxy(galaxy_data: GalaxyCreate, db: Session = Depends(get_db)):
    """
    Create a new galaxy (organization).
    
    A galaxy serves as a multi-system container that aggregates entropy
    from connected solars but has no decision-making power itself.
    """
    try:
        # Create new galaxy
        galaxy = Galaxy(
            name=galaxy_data.name,
            description=galaxy_data.description,
            outer_entropy=0.0
        )
        
        db.add(galaxy)
        db.commit()
        db.refresh(galaxy)
        
        return GalaxyResponse(
            id=galaxy.id,
            name=galaxy.name,
            description=galaxy.description,
            outer_entropy=galaxy.outer_entropy,
            created_at=galaxy.created_at,
            updated_at=galaxy.updated_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create galaxy: {str(e)}"
        )

@router.post("/{galaxy_id}/add_solar", status_code=status.HTTP_201_CREATED)
async def add_solar_to_galaxy(
    galaxy_id: int, 
    solar_data: SolarAdd, 
    db: Session = Depends(get_db)
):
    """
    Add a solar (user) to a galaxy with specified coupling strength.
    
    The coupling determines how much the solar's entropy contributes
    to the galaxy's outer entropy calculation.
    """
    # Verify galaxy exists
    galaxy = db.query(Galaxy).filter(Galaxy.id == galaxy_id).first()
    if not galaxy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Galaxy not found"
        )
    
    # Verify solar exists
    solar = db.query(Solar).filter(Solar.id == solar_data.solar_id).first()
    if not solar:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Solar not found"
        )
    
    # Check if solar is already in galaxy
    existing = db.execute(
        text("SELECT 1 FROM galaxy_solar WHERE galaxy_id = :gid AND solar_id = :sid"),
        {"gid": galaxy_id, "sid": solar_data.solar_id}
    ).fetchone()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solar already exists in galaxy"
        )
    
    try:
        # Add solar to galaxy with coupling
        db.execute(
            text("""
                INSERT INTO galaxy_solar (galaxy_id, solar_id, coupling, created_at)
                VALUES (:gid, :sid, :coupling, :created_at)
            """),
            {
                "gid": galaxy_id,
                "sid": solar_data.solar_id,
                "coupling": solar_data.coupling,
                "created_at": datetime.utcnow()
            }
        )
        
        db.commit()
        
        # Update galaxy's outer entropy
        update_galaxy_entropy(db, galaxy_id)
        
        return {
            "message": "Solar added to galaxy successfully",
            "galaxy_id": galaxy_id,
            "solar_id": solar_data.solar_id,
            "coupling": solar_data.coupling
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add solar to galaxy: {str(e)}"
        )

@router.get("/{galaxy_id}/status", response_model=GalaxyStatus)
async def get_galaxy_status(galaxy_id: int, db: Session = Depends(get_db)):
    """
    Get comprehensive status of a galaxy including aggregated metrics.
    
    Returns entropy aggregation, solar count, and decision power distribution.
    """
    # Get galaxy basic info
    galaxy = db.query(Galaxy).filter(Galaxy.id == galaxy_id).first()
    if not galaxy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Galaxy not found"
        )
    
    # Get aggregated statistics
    stats_query = text("""
        SELECT 
            COUNT(s.id) as solar_count,
            COALESCE(AVG(s.entropy), 0.0) as avg_entropy,
            COALESCE(SUM(s.decision_power), 0.0) as total_decision_power,
            COUNT(CASE WHEN s.status = 'active' THEN 1 END) as active_solars
        FROM solars s
        JOIN galaxy_solar gs ON s.id = gs.solar_id
        WHERE gs.galaxy_id = :galaxy_id
    """)
    
    stats = db.execute(stats_query, {"galaxy_id": galaxy_id}).fetchone()
    
    # Update outer entropy
    outer_entropy = calculate_outer_entropy(db, galaxy_id)
    
    return GalaxyStatus(
        id=galaxy.id,
        name=galaxy.name,
        description=galaxy.description,
        outer_entropy=outer_entropy,
        solar_count=int(stats.solar_count) if stats.solar_count else 0,
        average_solar_entropy=float(stats.avg_entropy) if stats.avg_entropy else 0.0,
        total_decision_power=float(stats.total_decision_power) if stats.total_decision_power else 0.0,
        active_solars=int(stats.active_solars) if stats.active_solars else 0,
        created_at=galaxy.created_at,
        updated_at=galaxy.updated_at
    )

@router.get("/{galaxy_id}/propagation", response_model=PropagationGraph)
async def get_propagation_graph(galaxy_id: int, db: Session = Depends(get_db)):
    """
    Get entropy propagation graph showing how problems spread across connected solars.
    
    Returns nodes (solars) and edges (coupling relationships) with entropy flow data.
    """
    # Verify galaxy exists
    galaxy = db.query(Galaxy).filter(Galaxy.id == galaxy_id).first()
    if not galaxy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Galaxy not found"
        )
    
    # Get all solars in galaxy with coupling info
    nodes_query = text("""
        SELECT 
            s.id, s.name, s.entropy, s.decision_power, s.status,
            gs.coupling
        FROM solars s
        JOIN galaxy_solar gs ON s.id = gs.solar_id
        WHERE gs.galaxy_id = :galaxy_id
        ORDER BY s.entropy DESC
    """)
    
    node_results = db.execute(nodes_query, {"galaxy_id": galaxy_id}).fetchall()
    
    # Build nodes
    nodes = []
    solar_map = {}
    
    for row in node_results:
        node = PropagationNode(
            id=row.id,
            name=row.name,
            entropy=float(row.entropy),
            decision_power=float(row.decision_power),
            status=row.status,
            coupling=float(row.coupling)
        )
        nodes.append(node)
        solar_map[row.id] = node
    
    # Build edges (entropy propagation between solars)
    edges = []
    propagation_paths = []
    
    # Create edges based on entropy influence
    for i, source_node in enumerate(nodes):
        for j, target_node in enumerate(nodes):
            if i != j and source_node.entropy > 0:
                # Calculate entropy flow based on coupling and entropy difference
                entropy_flow = (source_node.entropy * source_node.coupling * target_node.coupling) / 100
                
                if entropy_flow > 0.01:  # Only include significant flows
                    edge = PropagationEdge(
                        source=source_node.id,
                        target=target_node.id,
                        weight=source_node.coupling * target_node.coupling,
                        entropy_flow=entropy_flow
                    )
                    edges.append(edge)
    
    # Calculate propagation paths (high entropy to low entropy)
    high_entropy_nodes = [n for n in nodes if n.entropy > 1.0]
    low_entropy_nodes = [n for n in nodes if n.entropy < 0.5]
    
    for high_node in high_entropy_nodes:
        for low_node in low_entropy_nodes:
            if high_node.id != low_node.id:
                propagation_paths.append({
                    "source": high_node.name,
                    "target": low_node.name,
                    "entropy_delta": high_node.entropy - low_node.entropy,
                    "propagation_risk": min(high_node.entropy * high_node.coupling, 10.0),
                    "decision_power_ratio": low_node.decision_power / max(high_node.decision_power, 0.1)
                })
    
    # Sort propagation paths by risk
    propagation_paths.sort(key=lambda x: x["propagation_risk"], reverse=True)
    
    return PropagationGraph(
        galaxy_id=galaxy.id,
        galaxy_name=galaxy.name,
        outer_entropy=galaxy.outer_entropy,
        nodes=nodes,
        edges=edges,
        propagation_paths=propagation_paths[:10]  # Top 10 risk paths
    )