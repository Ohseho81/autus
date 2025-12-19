"""Influence Matrix - 6 Entity × 6 Axis Weight System"""
from typing import Dict, Literal

EntityType = Literal["HUM", "EDU", "EMP", "GOV", "CITY", "OPS"]
AxisType = Literal["DIR", "FOR", "GAP", "TEM", "UNC", "INT"]

DEFAULT_MATRIX: Dict[str, Dict[str, Dict[str, float]]] = {
    "EDU": {"HUM": {"DIR": 0.7, "FOR": 0.7, "GAP": 0.7, "TEM": 0.4, "UNC": 0.7, "INT": 0.4}},
    "EMP": {"HUM": {"DIR": 0.7, "FOR": 0.7, "GAP": 0.7, "TEM": 0.4, "UNC": 0.7, "INT": 0.4}},
    "GOV": {"HUM": {"DIR": 0.7, "FOR": 0.7, "GAP": 0.7, "TEM": 0.7, "UNC": 0.7, "INT": 0.4}},
    "CITY": {"HUM": {"DIR": 0.4, "FOR": 0.4, "GAP": 0.4, "TEM": 0.1, "UNC": 0.4, "INT": 0.1}},
    "OPS": {"HUM": {"DIR": 0.7, "FOR": 0.7, "GAP": 0.7, "TEM": 0.7, "UNC": 0.7, "INT": 0.7}},
}

class InfluenceMatrix:
    def __init__(self, matrix: Dict = None):
        self.matrix = matrix or DEFAULT_MATRIX.copy()
    
    def get_weight(self, source: EntityType, target: EntityType, axis: AxisType) -> float:
        try:
            return self.matrix[source][target][axis]
        except KeyError:
            return 0.1
    
    def set_weight(self, source: EntityType, target: EntityType, axis: AxisType, value: float):
        if source not in self.matrix:
            self.matrix[source] = {}
        if target not in self.matrix[source]:
            self.matrix[source][target] = {}
        self.matrix[source][target][axis] = max(0.0, min(1.0, value))
