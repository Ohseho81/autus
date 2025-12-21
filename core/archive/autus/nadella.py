import math
from typing import Dict, Any
class NadellaLayer:
    def assess(self, state: Dict[str, Any], task_type: str) -> Dict[str, Any]:
        integrity = state.get("integrity", 100.0)
        gmu_count = state.get("gmu_count", 1)
        talent_density = integrity / max(1.0, math.log2(gmu_count + 1))
        empathy = 1.2 if task_type == 'PEOPLE' and talent_density > 80 else 1.0
        return {"talent_density": talent_density, "empathy_factor": empathy, "allow_expansion": talent_density >= 70, "logs": []}
