from typing import List, Dict, Any
from dataclasses import dataclass, field

@dataclass
class RingBuffer:
    capacity: int = 8
    buffer: List[Dict[str, Any]] = field(default_factory=list)
    weights: List[float] = field(default_factory=list)
    
    def push(self, item: Dict[str, Any]):
        self.weights = [w * 0.78 for w in self.weights]
        self.buffer.append(item)
        self.weights.append(1.0)
        if len(self.buffer) > self.capacity:
            self.buffer.pop(0)
            self.weights.pop(0)
    
    def get_latest(self, n: int = 1) -> List[Dict]:
        return self.buffer[-n:]
    
    def size(self) -> int:
        return len(self.buffer)
