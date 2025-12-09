"""Lime Kernel Simulator - Run scenarios and validate vector changes"""
import json
from pathlib import Path
from typing import List, Dict

from .core.influence_matrix import InfluenceMatrix
from .core.profile_function import ProfileFunction
from .core.vector_engine import VectorEngine
from .core.event_engine import EventEngine, Entity, EVENT_DICTIONARY


class LimeSimulator:
    """Run LIME PASS simulations"""
    
    def __init__(self, country: str = "KR", industry: str = "education"):
        self.matrix = InfluenceMatrix()
        self.profile = ProfileFunction()
        self.vector_engine = VectorEngine(self.matrix, self.profile)
        self.event_engine = EventEngine(self.vector_engine, country, industry)
    
    def load_hum_seeds(self) -> List[Entity]:
        """Load HUM seed data from JSON"""
        path = Path(__file__).parent / "world" / "hum_seed.json"
        with open(path) as f:
            data = json.load(f)
        
        entities = []
        for e in data["entities"]:
            entity = Entity(id=e["id"], type="HUM", vector=e["vector"])
            self.event_engine.register_entity(entity)
            entities.append(entity)
        return entities
    
    def load_scenarios(self) -> Dict:
        """Load scenarios from JSON"""
        path = Path(__file__).parent / "scenarios" / "scenarios.json"
        with open(path) as f:
            return json.load(f)
    
    def run_scenario(self, entity_id: str, scenario_events: List[str]) -> Dict:
        """Run a scenario on an entity"""
        results = []
        for event_code in scenario_events:
            result = self.event_engine.process_event(entity_id, event_code)
            results.append(result)
        
        final_state = self.event_engine.get_state(entity_id)
        return {
            "entity_id": entity_id,
            "events_processed": len(results),
            "final_state": final_state,
            "history": results
        }
    
    def check_settlement(self, entity_id: str) -> Dict:
        """Check if entity achieved settlement criteria"""
        state = self.event_engine.get_state(entity_id)
        if "error" in state:
            return state
        
        v = state["vector"]
        criteria = {
            "DIR >= 1.0": v.get("DIR", 0) >= 1.0,
            "GAP <= 0.15": v.get("GAP", 1) <= 0.15,
            "UNC <= 0.30": v.get("UNC", 1) <= 0.30,
            "INT >= 0.50": v.get("INT", 0) >= 0.50,
        }
        
        return {
            "entity_id": entity_id,
            "vector": v,
            "criteria": criteria,
            "settled": all(criteria.values()),
            "progress": state["progress"]
        }


def run_full_simulation():
    """Run full simulation with all scenarios"""
    print("=" * 60)
    print("LIME KERNEL SIMULATION v1.0")
    print("=" * 60)
    
    sim = LimeSimulator(country="KR", industry="education")
    entities = sim.load_hum_seeds()
    scenarios = sim.load_scenarios()
    
    print(f"\n✅ Loaded {len(entities)} HUM entities")
    print(f"✅ Loaded {len(scenarios['scenarios'])} scenarios")
    print(f"✅ Event Dictionary: {len(EVENT_DICTIONARY)} events")
    
    # Run each scenario on first entity (HUM:001)
    print("\n" + "=" * 60)
    print("SCENARIO SIMULATIONS (HUM:001 - Maria Santos)")
    print("=" * 60)
    
    for scenario in scenarios["scenarios"][:5]:  # Run first 5 scenarios
        # Reset entity for each scenario
        sim2 = LimeSimulator(country="KR", industry="education")
        sim2.load_hum_seeds()
        
        result = sim2.run_scenario("HUM:001", scenario["events"])
        settlement = sim2.check_settlement("HUM:001")
        
        print(f"\n📌 {scenario['name']} ({scenario['id']})")
        print(f"   Events: {len(scenario['events'])}")
        print(f"   Progress: {settlement['progress']}%")
        print(f"   Settled: {'✅ YES' if settlement['settled'] else '❌ NO'}")
        print(f"   Vector: DIR={settlement['vector']['DIR']:.2f}, GAP={settlement['vector']['GAP']:.2f}, UNC={settlement['vector']['UNC']:.2f}")
    
    print("\n" + "=" * 60)
    print("SIMULATION COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    run_full_simulation()
