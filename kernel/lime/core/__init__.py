"""Lime Kernel Core v2.0 - Enhanced Vector Engine"""
from .influence_matrix import InfluenceMatrix, EntityType, AxisType
from .profile_function import ProfileFunction
from .vector_engine import VectorEngine
from .event_engine import EventEngine
from .enhanced_vector_engine import (
    EnhancedVectorEngine, VectorUpdate, SettlementCheck,
    CALIBRATED_MATRIX, CROSS_AXIS_CORRELATIONS, TEMPORAL_CONFIG, AXES
)

__version__ = "2.0.0"
__all__ = [
    "InfluenceMatrix", "EntityType", "AxisType",
    "ProfileFunction", "VectorEngine", "EventEngine",
    "EnhancedVectorEngine", "VectorUpdate", "SettlementCheck",
    "CALIBRATED_MATRIX", "CROSS_AXIS_CORRELATIONS", "TEMPORAL_CONFIG", "AXES"
]
