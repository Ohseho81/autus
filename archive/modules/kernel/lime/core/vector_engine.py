"""Vector Engine - 6-Axis Vector Update System"""
from typing import Dict
from .influence_matrix import InfluenceMatrix, EntityType, AxisType
from .profile_function import ProfileFunction, CountryCode, IndustryCode

Vector = Dict[AxisType, float]

class VectorEngine:
    def __init__(self, matrix: InfluenceMatrix, profile: ProfileFunction):
        self.matrix = matrix
        self.profile = profile
    
    def apply_delta(self, source: EntityType, target: EntityType, 
                    delta: Vector, country: CountryCode, industry: IndustryCode) -> Vector:
        """Apply event delta from source to target with profile adjustments"""
        result: Vector = {}
        for axis, d in delta.items():
            base_w = self.matrix.get_weight(source, target, axis)
            w_adj = self.profile.adjusted_weight(base_w, country, industry, source, target, axis)
            result[axis] = d * w_adj
        return result
    
    def update_vector(self, current: Vector, delta: Vector) -> Vector:
        """Update current vector with delta, clamping to [0, 2]"""
        result = current.copy()
        for axis, d in delta.items():
            result[axis] = max(0.0, min(2.0, result.get(axis, 0.0) + d))
        return result
