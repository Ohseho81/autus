"""
AUTUS Core Spec (Compatibility Layer)
=====================================

이 파일은 레거시 API와의 호환성을 위한 브릿지입니다.
실제 구현은 core.unified.unified_engine을 사용합니다.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from enum import IntEnum
import time
import math


# ═══════════════════════════════════════════════════════════════════════════════
# Constants
# ═══════════════════════════════════════════════════════════════════════════════

NODE_COUNT = 6
MOTION_COUNT = 12


# ═══════════════════════════════════════════════════════════════════════════════
# Enums
# ═══════════════════════════════════════════════════════════════════════════════

class Node(IntEnum):
    """6개 물리 노드"""
    BIO = 0
    CAPITAL = 1
    COGNITION = 2
    RELATION = 3
    ENVIRONMENT = 4
    LEGACY = 5


class Motion(IntEnum):
    """12가지 모션"""
    CONSUME = 1
    REST = 2
    MOVE = 3
    PROTECT = 4
    ACQUIRE = 5
    CREATE = 6
    LEARN = 7
    PRACTICE = 8
    BOND = 9
    EXCHANGE = 10
    NURTURE = 11
    EXPRESS = 12


class Collector(IntEnum):
    """6가지 수집기"""
    PASSIVE = 0
    ACTIVE = 1
    SOCIAL = 2
    FINANCIAL = 3
    HEALTH = 4
    ENVIRONMENT = 5


class UIComponent(IntEnum):
    """5가지 UI 컴포넌트"""
    DASHBOARD = 0
    TIMELINE = 1
    NETWORK = 2
    GOALS = 3
    SETTINGS = 4


# ═══════════════════════════════════════════════════════════════════════════════
# Metadata
# ═══════════════════════════════════════════════════════════════════════════════

MOTION_META = {
    Motion.CONSUME: {"name": "소비", "category": "SURVIVE"},
    Motion.REST: {"name": "휴식", "category": "SURVIVE"},
    Motion.MOVE: {"name": "이동", "category": "SURVIVE"},
    Motion.PROTECT: {"name": "보호", "category": "SURVIVE"},
    Motion.ACQUIRE: {"name": "획득", "category": "GROW"},
    Motion.CREATE: {"name": "창조", "category": "GROW"},
    Motion.LEARN: {"name": "학습", "category": "GROW"},
    Motion.PRACTICE: {"name": "연습", "category": "GROW"},
    Motion.BOND: {"name": "유대", "category": "CONNECT"},
    Motion.EXCHANGE: {"name": "교환", "category": "CONNECT"},
    Motion.NURTURE: {"name": "양육", "category": "CONNECT"},
    Motion.EXPRESS: {"name": "표현", "category": "CONNECT"},
}

COLLECTOR_NODE_MAP = {
    Collector.PASSIVE: [Node.BIO],
    Collector.ACTIVE: [Node.COGNITION],
    Collector.SOCIAL: [Node.RELATION],
    Collector.FINANCIAL: [Node.CAPITAL],
    Collector.HEALTH: [Node.BIO, Node.ENVIRONMENT],
    Collector.ENVIRONMENT: [Node.ENVIRONMENT],
}

PROJECTION_MAP = {
    "health": [Node.BIO, Node.ENVIRONMENT],
    "wealth": [Node.CAPITAL],
    "wisdom": [Node.COGNITION],
    "love": [Node.RELATION],
    "legacy": [Node.LEGACY],
}


# ═══════════════════════════════════════════════════════════════════════════════
# Evidence Gate
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EvidenceGate:
    """Evidence Gate"""
    node: Node
    passed: bool
    confidence: float
    reason: str


# ═══════════════════════════════════════════════════════════════════════════════
# Physics Engine
# ═══════════════════════════════════════════════════════════════════════════════

class PhysicsEngine:
    """AUTUS 물리 엔진"""
    
    def __init__(self):
        self._state = [0.5] * NODE_COUNT
        self._motion_counts = [[0] * MOTION_COUNT for _ in range(NODE_COUNT)]
        self._motion_log: List[Dict] = []
        
        # 감쇠율 (반감기 기반)
        half_lives = [1.0, 30.0, 7.0, 14.0, 90.0, 365.0]
        self._decay = [math.log(2) / hl for hl in half_lives]
        
        # 관성
        self._inertia = [0.8, 0.5, 0.6, 0.7, 0.4, 0.3]
    
    def get_state(self) -> List[float]:
        return self._state.copy()
    
    def get_node(self, node: int) -> float:
        return self._state[node]
    
    def apply_motion(
        self, 
        node: int, 
        motion: int, 
        delta: float, 
        friction: float = 0.0,
        timestamp: Optional[int] = None
    ) -> Dict:
        """모션 적용"""
        ts = timestamp or int(time.time() * 1000)
        
        # 관성 적용
        effective_delta = delta * (1 - self._inertia[node] * friction)
        
        # 상태 업데이트
        old = self._state[node]
        self._state[node] = max(0, min(1, old + effective_delta))
        
        # 모션 카운트
        self._motion_counts[node][motion - 1] += 1
        
        # 로그
        event = {
            "timestamp": ts,
            "node": node,
            "motion": motion,
            "delta": delta,
            "friction": friction,
            "before": old,
            "after": self._state[node],
        }
        self._motion_log.append(event)
        
        return {
            "success": True,
            "event": event,
        }
    
    def tick(self, days: float = 1.0) -> Dict[str, float]:
        """시간 경과"""
        decay = {}
        for i, d in enumerate(self._decay):
            old = self._state[i]
            self._state[i] *= math.exp(-d * days)
            decay[Node(i).name] = round(old - self._state[i], 6)
        return decay
    
    def evaluate_gate(self, node: int) -> EvidenceGate:
        """Gate 평가"""
        value = self._state[node]
        motion_count = sum(self._motion_counts[node])
        confidence = min(1.0, motion_count / 10)
        
        return EvidenceGate(
            node=Node(node),
            passed=value >= 0.5,
            confidence=round(confidence, 4),
            reason=f"Value: {value:.2f}, Motions: {motion_count}",
        )
    
    def get_motion_log(self, n: int = 10) -> List[Dict]:
        return self._motion_log[-n:]
    
    def reset(self):
        self._state = [0.5] * NODE_COUNT
        self._motion_counts = [[0] * MOTION_COUNT for _ in range(NODE_COUNT)]
        self._motion_log.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# Projector
# ═══════════════════════════════════════════════════════════════════════════════

class Projector:
    """상태 프로젝터"""
    
    def __init__(self, engine: PhysicsEngine):
        self.engine = engine
    
    def project(self, target: str) -> float:
        """특정 타겟으로 프로젝션"""
        nodes = PROJECTION_MAP.get(target, [])
        if not nodes:
            return 0.0
        
        state = self.engine.get_state()
        values = [state[n.value] for n in nodes]
        return sum(values) / len(values)
    
    def project_all(self) -> Dict[str, float]:
        """모든 타겟 프로젝션"""
        return {
            target: round(self.project(target), 4)
            for target in PROJECTION_MAP
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Singleton
# ═══════════════════════════════════════════════════════════════════════════════

_engine: Optional[PhysicsEngine] = None


def get_engine() -> PhysicsEngine:
    """엔진 싱글턴"""
    global _engine
    if _engine is None:
        _engine = PhysicsEngine()
    return _engine


def reset_engine():
    """엔진 리셋"""
    global _engine
    if _engine:
        _engine.reset()
    else:
        _engine = PhysicsEngine()
