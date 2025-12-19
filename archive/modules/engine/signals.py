"""ExternalSolar Signals Engine v1.0"""
from dataclasses import dataclass
from typing import Dict, List
import statistics

@dataclass
class ExternalSignals:
    regulation: float = 0.0
    budget: float = 0.0
    sentiment: float = 0.0
    market: float = 0.0
    
    def to_list(self): return [self.regulation, self.budget, self.sentiment, self.market]
    def to_dict(self): return {"R": self.regulation, "B": self.budget, "S": self.sentiment, "M": self.market}

SIGNAL_WEIGHTS = {
    "ORG": {"regulation": 0.30, "budget": 0.25, "sentiment": 0.15, "market": 0.30},
    "CITY": {"regulation": 0.35, "budget": 0.20, "sentiment": 0.30, "market": 0.15},
    "NATION": {"regulation": 0.45, "budget": 0.20, "sentiment": 0.20, "market": 0.15},
}

def get_signal_weights(domain): return SIGNAL_WEIGHTS.get(domain, {"regulation": 0.25, "budget": 0.25, "sentiment": 0.25, "market": 0.25})

def calc_external_pressure(signals, domain=None):
    w = get_signal_weights(domain)
    return signals.regulation*w["regulation"] + signals.budget*w["budget"] + signals.sentiment*w["sentiment"] + signals.market*w["market"]

def calc_coordination_entropy(signals, alignment):
    return statistics.variance(signals.to_list()) * (1 - alignment) if len(signals.to_list()) >= 2 else 0.0

def calc_effective_pressure(pressure, alignment): return pressure * (1 - alignment)
