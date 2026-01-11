"""
═══════════════════════════════════════════════════════════════════════════════
🚀 AUTUS Engine v2.0
═══════════════════════════════════════════════════════════════════════════════

고성능 물리 엔진 v2.0
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum
import time
import math


class EngineMode(Enum):
    """엔진 모드"""
    REALTIME = "REALTIME"
    BATCH = "BATCH"
    SIMULATION = "SIMULATION"


@dataclass
class EngineConfig:
    """엔진 설정"""
    mode: EngineMode = EngineMode.REALTIME
    tick_rate: float = 1.0
    precision: int = 4
    cache_enabled: bool = True
    async_write: bool = True


@dataclass
class EngineState:
    """엔진 상태"""
    values: List[float]
    timestamp: int
    tick_count: int = 0
    energy: float = 0.0


@dataclass
class EngineEvent:
    """엔진 이벤트"""
    id: str
    type: str
    data: Dict[str, Any]
    timestamp: int = field(default_factory=lambda: int(time.time() * 1000))


class EngineV2:
    """AUTUS Engine v2.0"""
    
    VERSION = "2.0.0"
    NODE_COUNT = 72
    
    def __init__(self, config: Optional[EngineConfig] = None):
        self.config = config or EngineConfig()
        self._state = EngineState(
            values=[0.5] * self.NODE_COUNT,
            timestamp=int(time.time() * 1000),
        )
        self._events: List[EngineEvent] = []
        self._cache: Dict[str, Any] = {}
    
    @property
    def state(self) -> EngineState:
        return self._state
    
    def get_node(self, index: int) -> float:
        """노드 값 조회"""
        if 0 <= index < self.NODE_COUNT:
            return round(self._state.values[index], self.config.precision)
        return 0.0
    
    def set_node(self, index: int, value: float) -> bool:
        """노드 값 설정"""
        if 0 <= index < self.NODE_COUNT:
            self._state.values[index] = max(0.0, min(1.0, value))
            self._invalidate_cache()
            return True
        return False
    
    def apply_delta(self, index: int, delta: float) -> float:
        """델타 적용"""
        if 0 <= index < self.NODE_COUNT:
            old = self._state.values[index]
            new = max(0.0, min(1.0, old + delta))
            self._state.values[index] = new
            self._invalidate_cache()
            return new - old
        return 0.0
    
    def tick(self) -> Dict[str, Any]:
        """틱 실행"""
        self._state.tick_count += 1
        self._state.timestamp = int(time.time() * 1000)
        self._state.energy = sum(self._state.values)
        
        return {
            "tick": self._state.tick_count,
            "timestamp": self._state.timestamp,
            "energy": round(self._state.energy, self.config.precision),
        }
    
    def emit_event(self, event_type: str, data: Dict[str, Any]) -> EngineEvent:
        """이벤트 발행"""
        event = EngineEvent(
            id=f"e{len(self._events)}",
            type=event_type,
            data=data,
        )
        self._events.append(event)
        return event
    
    def get_events(self, n: int = 10) -> List[Dict]:
        """이벤트 조회"""
        return [
            {"id": e.id, "type": e.type, "data": e.data, "timestamp": e.timestamp}
            for e in self._events[-n:]
        ]
    
    def get_summary(self) -> Dict[str, Any]:
        """요약 조회"""
        return {
            "version": self.VERSION,
            "mode": self.config.mode.value,
            "node_count": self.NODE_COUNT,
            "tick_count": self._state.tick_count,
            "energy": round(self._state.energy, self.config.precision),
            "event_count": len(self._events),
        }
    
    def _invalidate_cache(self):
        """캐시 무효화"""
        if self.config.cache_enabled:
            self._cache.clear()
    
    def reset(self):
        """리셋"""
        self._state = EngineState(
            values=[0.5] * self.NODE_COUNT,
            timestamp=int(time.time() * 1000),
        )
        self._events.clear()
        self._cache.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# Exports
# ═══════════════════════════════════════════════════════════════════════════════

_engine: Optional[EngineV2] = None


def get_engine_v2() -> EngineV2:
    """엔진 v2 싱글턴"""
    global _engine
    if _engine is None:
        _engine = EngineV2()
    return _engine


# Aliases
Engine = EngineV2
get_engine = get_engine_v2

__all__ = [
    "EngineMode",
    "EngineConfig",
    "EngineState",
    "EngineEvent",
    "EngineV2",
    "Engine",
    "get_engine_v2",
    "get_engine",
]
