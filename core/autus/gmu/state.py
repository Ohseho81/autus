from dataclasses import dataclass, field
from typing import Dict, List
from enum import Enum

class GroveState(str, Enum):
    NORMAL = "normal"
    TENSION = "tension"
    INFLECTION = "inflection"
    TRANSITION_READY = "transition_ready"

@dataclass
class GMUState:
    id: str
    slots: Dict[str, float] = field(default_factory=dict)
    grove_state: GroveState = GroveState.NORMAL
    afterimage: List[Dict[str, float]] = field(default_factory=list)
    ledger_head: str = "GENESIS"
    commit_count: int = 0
    locked: bool = False
    
    def add_afterimage(self, slots: Dict[str, float], max_size: int = 8):
        self.afterimage.append(slots.copy())
        if len(self.afterimage) > max_size:
            self.afterimage.pop(0)
