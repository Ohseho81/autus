from .hastings import HastingsLayer
from .nadella import NadellaLayer
from .grove import GroveLayer
from .cz import CZLayer

class AutusPipeline:
    def __init__(self):
        self.state = {"integrity": 100, "energy": 100, "mode": "SEED", "gmu_count": 1}
        self.layers = {
            "hastings": HastingsLayer(),
            "nadella": NadellaLayer(),
            "grove": GroveLayer(),
            "cz": CZLayer()
        }
    
    def process(self, text: str):
        logs = []
        task = "WORK"
        if "사람" in text: task = "PEOPLE"
        elif "돈" in text: task = "MONEY"
        elif "성장" in text: task = "GROWTH_HACK"
        
        parsed = {"raw": text, "type": task, "ir": {"pressure": 0.5}}
        
        # 1. Hastings
        insp = self.layers["hastings"].inspect(parsed)
        if not insp["valid"]: return {"success": False, "logs": ["BLOCKED: Noise"]}
        
        # 2. Nadella
        nadella = self.layers["nadella"].assess(self.state, task)
        self.state["integrity"] = min(100, self.state["integrity"] + (1 if task=="PEOPLE" else 0))
        
        # 3. Grove
        grove = self.layers["grove"].accumulate(True)
        visual = None
        
        if grove["type"] == "TRANSITION_READY":
            cz = self.layers["cz"].evaluate(grove, self.state, nadella)
            if cz["action"] == "TRANSITION":
                self.state["mode"] = cz["mode"]
                self.state["energy"] -= cz["cost"]
                if cz.get("replication"): self.state["gmu_count"] *= 2
                visual = "TRANSITION"
                logs.append(f"CZ: Expanded to {cz['mode']}")
        else:
            logs.append(f"GROVE: Charging {grove.get('progress',0)*100:.0f}%")
            
        logs.append(f"EXEC: {task}")
        return {"success": True, "state": self.state, "logs": logs, "parsed": parsed, "visualEffect": visual}
