from enum import Enum
class GroveState(str, Enum):
    NORMAL="normal"; TENSION="tension"; INFLECTION="inflection"; TRANSITION_READY="transition_ready"
class GroveLayer:
    def __init__(self): self.points = 0
    def accumulate(self, success):
        if success: self.points += 1
        if self.points >= 3:
            self.points = 0
            return {"type": "TRANSITION_READY"}
        return {"type": "GROWING", "progress": self.points/3}
