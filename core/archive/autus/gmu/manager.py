from typing import Dict, Optional, List
from .state import GMUState

class GMUManager:
    def __init__(self):
        self._gmus: Dict[str, GMUState] = {}
    
    def create(self, gmu_id: str) -> GMUState:
        if gmu_id in self._gmus:
            raise ValueError(f"GMU {gmu_id} exists")
        state = GMUState(id=gmu_id)
        self._gmus[gmu_id] = state
        return state
    
    def get(self, gmu_id: str) -> GMUState:
        return self._gmus[gmu_id]
    
    def exists(self, gmu_id: str) -> bool:
        return gmu_id in self._gmus
    
    def list_ids(self) -> List[str]:
        return list(self._gmus.keys())
    
    def count(self) -> int:
        return len(self._gmus)

_manager = None
def get_manager() -> GMUManager:
    global _manager
    if _manager is None:
        _manager = GMUManager()
    return _manager
