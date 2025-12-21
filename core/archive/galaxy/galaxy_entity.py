"""
AUTUS Galaxy - Multi-Solar System
Solar → Galaxy 연동 수식

Attraction: e_j' = e_j - δ, e_i' = e_i + δ
Repulsion: block propagation
Orbit Shift: priority weight change
"""
from dataclasses import dataclass, field
from typing import Dict, List
from core.solar.physics import SolarEngine

@dataclass
class GalaxyEntity:
    """
    Galaxy = Collection of Solars
    국소 붕괴 허용, 전면 붕괴 금지
    """
    id: str = "GALAXY_001"
    solars: Dict[str, SolarEngine] = field(default_factory=dict)
    
    def add_solar(self, solar_id: str) -> Dict:
        """Add new Solar to Galaxy"""
        self.solars[solar_id] = SolarEngine()
        return {"galaxy": self.id, "solar_added": solar_id, "total": len(self.solars)}
    
    def get_solar(self, solar_id: str) -> SolarEngine:
        """Get Solar by ID"""
        if solar_id not in self.solars:
            self.solars[solar_id] = SolarEngine()
        return self.solars[solar_id]
    
    def transfer_entropy(self, from_id: str, to_id: str, delta: float) -> Dict:
        """
        Entropy Transfer between Solars
        에너지 보존: Σ entropy = constant
        """
        if from_id not in self.solars or to_id not in self.solars:
            return {"error": "Solar not found"}
        
        from_solar = self.solars[from_id]
        to_solar = self.solars[to_id]
        
        # Transfer
        from_solar.state.entropy = max(0, from_solar.state.entropy - delta)
        to_solar.state.entropy += delta
        
        # Update stability
        from_solar._update_derived()
        to_solar._update_derived()
        
        return {
            "from": {from_id: from_solar.status()},
            "to": {to_id: to_solar.status()},
            "delta": delta
        }
    
    def status(self) -> Dict:
        """Galaxy status"""
        total_entropy = sum(s.state.entropy for s in self.solars.values())
        collapsed = [sid for sid, s in self.solars.items() if s.state.stability == "COLLAPSE"]
        
        return {
            "id": self.id,
            "solar_count": len(self.solars),
            "total_entropy": round(total_entropy, 4),
            "collapsed_solars": collapsed,
            "galaxy_stable": len(collapsed) < len(self.solars) * 0.5
        }

# Singleton
_galaxy = GalaxyEntity()

def get_galaxy() -> GalaxyEntity:
    return _galaxy
