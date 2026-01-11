"""
═══════════════════════════════════════════════════════════════════════════════
🌌 AUTUS v2.1 - Core Module
═══════════════════════════════════════════════════════════════════════════════
"""

from .types import *
from .nodes import ALL_NODES, NODE_IDS, NODE_COUNT, NODES_BY_LAYER, DEFAULT_NODE_VALUES
from .circuits import LAYERS, CIRCUITS, CIRCUIT_IDS, INFLUENCE_MATRIX
from .algorithms import (
    calculate_pressure,
    determine_state,
    get_state_color,
    get_pressure_color,
    create_node,
    update_node_value,
    get_top1_node,
    get_top_n_nodes,
    get_danger_nodes,
    calculate_equilibrium,
    calculate_stability,
    calculate_system_stats,
    calculate_circuit_value,
    calculate_all_circuits,
    propagate_influence,
    run_simulation,
    detect_fire,
    get_fire_nodes,
    initialize_all_nodes,
)

__version__ = "2.1"
__all__ = [
    # Types
    "NodeSpec", "Node", "NodeState", "NodeHistory",
    "LayerSpec", "LayerId", 
    "CircuitSpec", "Circuit", "CircuitId",
    "InfluenceLink",
    "MissionType", "MissionStatus", "Mission", "MissionTemplate",
    "AlertLevel", "Alert",
    "SystemStats", "Settings",
    "SimulationScenario", "SimulationResult",
    
    # Data
    "ALL_NODES", "NODE_IDS", "NODE_COUNT", "NODES_BY_LAYER", "DEFAULT_NODE_VALUES",
    "LAYERS", "CIRCUITS", "CIRCUIT_IDS", "INFLUENCE_MATRIX",
    
    # Functions
    "calculate_pressure", "determine_state",
    "create_node", "update_node_value",
    "get_top1_node", "get_top_n_nodes", "get_danger_nodes",
    "calculate_equilibrium", "calculate_stability", "calculate_system_stats",
    "calculate_all_circuits", "propagate_influence", "run_simulation",
    "detect_fire", "get_fire_nodes", "initialize_all_nodes",
]
