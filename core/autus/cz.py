class CZLayer:
    def __init__(self):
        self.modes = ['SEED', 'GROWTH', 'SCALE', 'DOMINANCE']
        self.idx = 0
    def evaluate(self, grove, state, nadella):
        if grove.get("type") != "TRANSITION_READY": return {"action": "MONITOR"}
        if not nadella["allow_expansion"]: return {"action": "REJECT", "reason": "Nadella Veto"}
        if state["integrity"] < 85: return {"action": "REJECT", "reason": "Low Integrity"}
        if self.idx < len(self.modes)-1:
            self.idx += 1
            return {"action": "TRANSITION", "mode": self.modes[self.idx], "cost": 30, "replication": self.modes[self.idx]=="SCALE"}
        return {"action": "MAX_LEVEL"}
