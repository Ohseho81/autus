from dataclasses import dataclass, field
from typing import Dict, Callable
import time

@dataclass
class StateLock:
    state: Dict[str, float] = field(default_factory=dict)
    shift: Dict[str, float] = field(default_factory=dict)
    last_lock_time: float = 0
    lock_count: int = 0
    
    def accumulate_shift(self, delta: Dict[str, float]):
        for k, v in delta.items():
            self.shift[k] = self.shift.get(k, 0) + v
    
    def execute_lock(self, on_afterimage: Callable = None) -> Dict:
        prev_state = self.state.copy()
        for k, v in self.shift.items():
            self.state[k] = max(0, min(2, self.state.get(k, 0) + v))
        if on_afterimage:
            on_afterimage(prev_state)
        self.shift = {}
        self.last_lock_time = time.time()
        self.lock_count += 1
        return {"prev": prev_state, "new": self.state.copy()}
