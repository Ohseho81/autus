"""AlignmentFactor Engine v1.0"""
from dataclasses import dataclass
from typing import Dict

@dataclass
class AlignmentAxes:
    goal: float = 0.5
    time: float = 0.5
    incentive: float = 0.5
    risk: float = 0.5

DEFAULT_WEIGHTS = {"goal": 0.35, "time": 0.20, "incentive": 0.25, "risk": 0.20}
DOMAIN_WEIGHTS = {
    "ORG": {"goal": 0.35, "time": 0.20, "incentive": 0.25, "risk": 0.20},
    "CITY": {"goal": 0.30, "time": 0.25, "incentive": 0.20, "risk": 0.25},
    "NATION": {"goal": 0.25, "time": 0.20, "incentive": 0.20, "risk": 0.35},
}

def calc_alignment(axes, weights=None):
    w = weights or DEFAULT_WEIGHTS
    return max(0, min(1, axes.goal*w["goal"] + axes.time*w["time"] + axes.incentive*w["incentive"] + axes.risk*w["risk"]))

def calc_effective_external_pressure(pressure, alignment): return pressure * (1 - alignment)
def calc_contract_entropy_gain(unresolved, alignment): return unresolved * (1 - alignment)
def calc_universe_risk(pressure, entropy, alignment): return (pressure + entropy) * (1 - alignment)
