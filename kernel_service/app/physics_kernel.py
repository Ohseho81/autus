"""
THE HOLY TRINITY ENGINE (Python Backend)
Core Physics Laws: Inertia, Action-Reaction, Energy Conservation

This module handles ONLY physics attributes.
Raw data is NEVER stored or processed here.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from enum import Enum
import math

# ================================================================
# CONSTANTS
# ================================================================

SYSTEM_EFFICIENCY = 0.85  # 85% efficiency
GRAVITY_CONSTANT = 9.8
PLANCK_THRESHOLD = 0.001  # Minimum meaningful change


# ================================================================
# PHYSICS ATTRIBUTE SCHEMA
# The ONLY data types accepted by this kernel
# ================================================================

class PhysicsAttribute(Enum):
    NODE_MASS = "node_mass"
    CONNECTION_GRAVITY = "connection_gravity"
    FRICTION_COEFFICIENT = "friction_coefficient"
    POTENTIAL_ENERGY = "potential_energy"
    KINETIC_ENERGY = "kinetic_energy"
    ENTROPY_LEVEL = "entropy_level"
    STABILITY_INDEX = "stability_index"
    INFLUENCE_RADIUS = "influence_radius"
    DECAY_RATE = "decay_rate"
    RESONANCE_FREQUENCY = "resonance_frequency"


@dataclass
class PhysicsNode:
    """Physics-only node representation. No raw data fields."""
    node_mass: float = 1.0
    connection_gravity: float = 0.5
    friction_coefficient: float = 0.3
    potential_energy: float = 0.0
    kinetic_energy: float = 0.0
    entropy_level: float = 0.2
    stability_index: float = 0.5
    influence_radius: float = 10.0
    decay_rate: float = 0.01
    resonance_frequency: float = 1.0
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "node_mass": self.node_mass,
            "connection_gravity": self.connection_gravity,
            "friction_coefficient": self.friction_coefficient,
            "potential_energy": self.potential_energy,
            "kinetic_energy": self.kinetic_energy,
            "entropy_level": self.entropy_level,
            "stability_index": self.stability_index,
            "influence_radius": self.influence_radius,
            "decay_rate": self.decay_rate,
            "resonance_frequency": self.resonance_frequency
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "PhysicsNode":
        return cls(
            node_mass=float(data.get("node_mass", 1.0)),
            connection_gravity=float(data.get("connection_gravity", 0.5)),
            friction_coefficient=float(data.get("friction_coefficient", 0.3)),
            potential_energy=float(data.get("potential_energy", 0.0)),
            kinetic_energy=float(data.get("kinetic_energy", 0.0)),
            entropy_level=float(data.get("entropy_level", 0.2)),
            stability_index=float(data.get("stability_index", 0.5)),
            influence_radius=float(data.get("influence_radius", 10.0)),
            decay_rate=float(data.get("decay_rate", 0.01)),
            resonance_frequency=float(data.get("resonance_frequency", 1.0))
        )


# ================================================================
# THE HOLY TRINITY ENGINE
# ================================================================

class PhysicsKernel:
    """
    Core physics engine implementing the three fundamental laws.
    Accepts ONLY physics attributes, never raw data.
    """
    
    def __init__(self):
        self.total_energy: float = 0.0
        self.energy_history: List[Dict] = []
    
    # ================================================================
    # LAW 1: INERTIA (관성)
    # ================================================================
    
    def calculate_inertia(self, node: PhysicsNode) -> float:
        """
        Calculate inertia - resistance to change.
        Higher mass + higher friction = harder to move.
        """
        return node.node_mass * node.friction_coefficient
    
    def calculate_inertia_break(self, mass: float, resistance: float) -> float:
        """
        Calculate minimum force needed to break inertia.
        F = m * a * resistance (Newton's Second Law variant)
        """
        return mass * resistance * GRAVITY_CONSTANT
    
    def can_overcome_inertia(self, node: PhysicsNode, force: float) -> bool:
        """Check if applied force overcomes inertia."""
        inertia = self.calculate_inertia(node)
        threshold = self.calculate_inertia_break(inertia, 1.0)
        return force >= threshold
    
    # ================================================================
    # LAW 2: ACTION-REACTION (작용-반작용)
    # ================================================================
    
    def apply_reaction(self, force: float) -> Dict[str, float]:
        """
        Calculate reaction from applied force.
        Returns the "money output" or value generated.
        """
        reaction_value = force * SYSTEM_EFFICIENCY
        return {
            "money_output": reaction_value,
            "energy_consumed": force * (1 - SYSTEM_EFFICIENCY),
            "efficiency": SYSTEM_EFFICIENCY
        }
    
    def get_reaction_yield(
        self, 
        action_vector: float, 
        efficiency: float = SYSTEM_EFFICIENCY
    ) -> float:
        """Get reaction yield with custom efficiency."""
        return action_vector * efficiency
    
    def calculate_mutual_reaction(
        self, 
        node_a: PhysicsNode, 
        node_b: PhysicsNode, 
        force: float
    ) -> Dict[str, float]:
        """Calculate bidirectional reaction between two nodes."""
        mass_ratio = node_a.node_mass / max(node_b.node_mass, 0.001)
        
        return {
            "node_a_acceleration": force / max(node_a.node_mass, 0.001),
            "node_b_acceleration": -force / max(node_b.node_mass, 0.001),
            "node_a_change": force * (1 / mass_ratio),
            "node_b_change": force * mass_ratio,
            "equilibrium": abs(mass_ratio - 1) < PLANCK_THRESHOLD
        }
    
    # ================================================================
    # LAW 3: ENERGY CONSERVATION (에너지 보전)
    # ================================================================
    
    def track_total_energy(self, nodes: List[PhysicsNode]) -> float:
        """Track total energy across all nodes."""
        total = sum(
            node.potential_energy + node.kinetic_energy 
            for node in nodes
        )
        
        self.total_energy = total
        self.energy_history.append({
            "value": total,
            "timestamp": None  # Client provides timestamp
        })
        
        # Keep only last 100 records
        if len(self.energy_history) > 100:
            self.energy_history.pop(0)
        
        return total
    
    def conservation_audit(
        self, 
        initial_energy: float, 
        current_state: Dict[str, float]
    ) -> Dict[str, Any]:
        """
        Audit energy conservation - detect leakage.
        Returns leakage amount if energy is not conserved.
        """
        current_total = sum(current_state.values())
        leakage = initial_energy - current_total
        
        return {
            "initial": initial_energy,
            "current": current_total,
            "leakage": max(leakage, 0),
            "efficiency": current_total / max(initial_energy, 0.001),
            "is_conserved": abs(leakage) < PLANCK_THRESHOLD * initial_energy,
            "warning": "HIGH_LEAKAGE" if leakage > initial_energy * 0.1 else None
        }
    
    def transform_energy(
        self, 
        node: PhysicsNode, 
        from_type: str, 
        to_type: str, 
        amount: float
    ) -> PhysicsNode:
        """Transform energy between types."""
        from_attr = getattr(node, from_type, 0)
        to_attr = getattr(node, to_type, 0)
        
        actual = min(from_attr, amount)
        transformed = actual * SYSTEM_EFFICIENCY
        
        # Create new node with transformed energy
        new_node_dict = node.to_dict()
        new_node_dict[from_type] = from_attr - actual
        new_node_dict[to_type] = to_attr + transformed
        
        return PhysicsNode.from_dict(new_node_dict)
    
    # ================================================================
    # COMPOSITE CALCULATIONS
    # ================================================================
    
    def calculate_gravity(self, node: PhysicsNode, distance: float) -> float:
        """Calculate node's gravitational influence."""
        return (GRAVITY_CONSTANT * node.node_mass) / (distance * distance + 0.1)
    
    def calculate_connection_gravity(
        self, 
        node_a: PhysicsNode, 
        node_b: PhysicsNode, 
        distance: float = 1.0
    ) -> float:
        """Calculate connection strength between nodes."""
        return (GRAVITY_CONSTANT * node_a.node_mass * node_b.node_mass) / (distance * distance)
    
    def get_system_health(self, nodes: List[PhysicsNode]) -> Dict[str, Any]:
        """Get system health metrics."""
        if not nodes:
            return {"error": "No nodes provided"}
        
        energy = self.track_total_energy(nodes)
        avg_inertia = sum(self.calculate_inertia(n) for n in nodes) / len(nodes)
        
        return {
            "total_energy": energy,
            "average_inertia": avg_inertia,
            "stability": 1 / (1 + avg_inertia),
            "efficiency": SYSTEM_EFFICIENCY,
            "node_count": len(nodes)
        }


# ================================================================
# ELON PHYSICS ENGINE (Alternative API)
# ================================================================

class ElonPhysicsEngine:
    """
    Alternative interface matching the JavaScript API.
    """
    
    def __init__(self):
        self.kernel = PhysicsKernel()
    
    def calculate_inertia_break(self, mass: float, resistance: float) -> float:
        """Calculate minimum force to break inertia."""
        return mass * resistance * GRAVITY_CONSTANT
    
    def get_reaction_yield(
        self, 
        action_vector: float, 
        efficiency: float = SYSTEM_EFFICIENCY
    ) -> float:
        """Calculate reaction yield from action."""
        return action_vector * efficiency
    
    def conservation_audit(
        self, 
        initial_energy: float, 
        current_state: Dict[str, float]
    ) -> float:
        """
        Audit for energy leakage.
        Returns leakage amount (0 if conserved).
        """
        current_total = sum(current_state.values())
        leakage = initial_energy - current_total
        return max(leakage, 0)
    
    def apply_force(self, node: PhysicsNode, force: float) -> Dict[str, Any]:
        """Apply force to node and get result."""
        if self.kernel.can_overcome_inertia(node, force):
            return self.kernel.apply_reaction(force)
        return {"money_output": 0, "blocked_by": "inertia"}


# ================================================================
# PHYSICS MAP UPDATE HANDLER
# Processes ONLY physics updates from clients
# ================================================================

class PhysicsMapHandler:
    """
    Handler for physics map updates.
    Accepts ONLY physics attributes from client processors.
    """
    
    def __init__(self):
        self.kernel = PhysicsKernel()
        self.physics_maps: Dict[str, Dict] = {}
    
    def validate_physics_update(self, update: Dict) -> bool:
        """
        Validate that update contains ONLY physics attributes.
        Rejects any raw data fields.
        """
        allowed_keys = {attr.value for attr in PhysicsAttribute}
        allowed_keys.update({"_processed_on", "_timestamp", "_source_ref"})
        
        physics_data = update.get("physics", {})
        
        for key in physics_data.keys():
            if key not in allowed_keys and not key.startswith("_"):
                return False
        
        return True
    
    def process_update(self, source_ref: str, update: Dict) -> Dict:
        """
        Process physics update from client.
        
        Args:
            source_ref: Hashed source reference (not actual ID)
            update: Physics-only update from client processor
        
        Returns:
            Processing result with new state
        """
        if not self.validate_physics_update(update):
            return {"error": "Invalid update: contains non-physics data"}
        
        physics = update.get("physics", {})
        node = PhysicsNode.from_dict(physics)
        
        # Apply physics calculations
        inertia = self.kernel.calculate_inertia(node)
        health = self.kernel.get_system_health([node])
        
        # Store in physics map
        self.physics_maps[source_ref] = {
            "node": node.to_dict(),
            "metrics": {
                "inertia": inertia,
                "health": health
            },
            "updated_at": update.get("timestamp")
        }
        
        return {
            "success": True,
            "source_ref": source_ref,
            "metrics": {
                "inertia": inertia,
                **health
            },
            "_raw_data_stored": False  # Confirm no raw data
        }
    
    def get_physics_map(self, source_ref: str) -> Optional[Dict]:
        """Get physics map for a source."""
        return self.physics_maps.get(source_ref)
    
    def get_aggregate_metrics(self) -> Dict:
        """Get aggregate metrics across all physics maps."""
        if not self.physics_maps:
            return {"error": "No physics maps"}
        
        nodes = [
            PhysicsNode.from_dict(m["node"]) 
            for m in self.physics_maps.values()
        ]
        
        return self.kernel.get_system_health(nodes)


# ================================================================
# BRIDGE METADATA SCHEMA (For Central DB)
# ================================================================

@dataclass
class BridgeMetadata:
    """
    Metadata about data bridge - the ONLY thing stored in central DB.
    Contains NO raw data, NO credentials.
    """
    bridge_id: str
    storage_type: str  # local, gdrive, dropbox, etc.
    access_path: str   # Where to find data (path/endpoint)
    auth_method: str   # oauth, api_key, local
    auth_token_ref: str  # Reference to encrypted token, NOT the token
    permissions: List[str]
    created_at: int
    last_accessed: Optional[int] = None
    access_count: int = 0
    status: str = "active"
    
    # Explicit flags
    _data_retained: bool = False
    _credentials_stored: bool = False
    
    def to_dict(self) -> Dict:
        return {
            "bridge_id": self.bridge_id,
            "storage_type": self.storage_type,
            "access_path": self.access_path,
            "auth_method": self.auth_method,
            "auth_token_ref": self.auth_token_ref,
            "permissions": self.permissions,
            "created_at": self.created_at,
            "last_accessed": self.last_accessed,
            "access_count": self.access_count,
            "status": self.status,
            "_data_retained": self._data_retained,
            "_credentials_stored": self._credentials_stored
        }




