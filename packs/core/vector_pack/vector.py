from dataclasses import dataclass, field
from typing import Dict, Optional
from datetime import datetime

@dataclass
class Vector6D:
    dir: float = 0.5
    for_: float = 0.5
    gap: float = 0.5
    unc: float = 0.5
    tem: float = 0.5
    int_: float = 0.5
    
    def __post_init__(self):
        for attr in ['dir', 'for_', 'gap', 'unc', 'tem', 'int_']:
            setattr(self, attr, max(0.0, min(1.0, getattr(self, attr))))
    
    def to_dict(self) -> Dict[str, float]:
        return {"DIR": self.dir, "FOR": self.for_, "GAP": self.gap, 
                "UNC": self.unc, "TEM": self.tem, "INT": self.int_}
    
    @classmethod
    def from_dict(cls, d: Dict) -> "Vector6D":
        return cls(d.get("DIR", d.get("dir", 0.5)), d.get("FOR", d.get("for_", 0.5)),
                   d.get("GAP", d.get("gap", 0.5)), d.get("UNC", d.get("unc", 0.5)),
                   d.get("TEM", d.get("tem", 0.5)), d.get("INT", d.get("int_", 0.5)))
    
    @classmethod
    def default(cls): return cls()
    
    def __add__(self, o): return Vector6D(self.dir+o.dir, self.for_+o.for_, self.gap+o.gap, self.unc+o.unc, self.tem+o.tem, self.int_+o.int_)
    def __mul__(self, s): return Vector6D(self.dir*s, self.for_*s, self.gap*s, self.unc*s, self.tem*s, self.int_*s)
    def decay(self, l=0.1): return self * (1.0 - l)
    def apply_delta(self, delta, l=0.1): return self.decay(l) + delta
    def risk_score(self): return 0.3 * self.gap + 0.4 * self.unc + 0.3 * (1.0 - self.int_)
    def j_score_100(self): return round(((self.dir + self.for_ + (1-self.gap) + (1-self.unc) + (1-self.tem) + self.int_) / 6) * 100)

@dataclass
class VectorState:
    vector: Vector6D
    entity_id: str
    entity_type: str
    domain: str = "GENERAL"
    phase: str = "INIT"
    version: int = 1
    
    def to_dict(self):
        return {"entity_id": self.entity_id, "entity_type": self.entity_type, "domain": self.domain,
                "phase": self.phase, "vector": self.vector.to_dict(), "j_score": self.vector.j_score_100(), "version": self.version}
    
    def apply_event(self, delta, l=0.1):
        new_v = self.vector.apply_delta(delta, l)
        new_v = Vector6D(max(0,min(1,new_v.dir)), max(0,min(1,new_v.for_)), max(0,min(1,new_v.gap)),
                        max(0,min(1,new_v.unc)), max(0,min(1,new_v.tem)), max(0,min(1,new_v.int_)))
        return VectorState(new_v, self.entity_id, self.entity_type, self.domain, self.phase, self.version+1)

class DeltaTemplates:
    POSITIVE_SMALL = Vector6D(0.05, 0.03, -0.05, -0.03, 0, 0.02)
    POSITIVE_MEDIUM = Vector6D(0.10, 0.08, -0.10, -0.08, 0, 0.05)
    DOCUMENT_APPROVED = Vector6D(0.05, 0.05, -0.10, -0.10, -0.05, 0.05)
    DOCUMENT_REJECTED = Vector6D(-0.10, -0.05, 0.10, 0.10, 0.05, -0.05)
