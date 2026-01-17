"""
AUTUS Core Engine v14.0
========================
통합 Physics + K/I + 6D 엔진

기존 core/unified/*.py 11개 파일을 1개로 통합
"""

from dataclasses import dataclass, field
from enum import Enum, IntEnum
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
import math
import json
import logging

logger = logging.getLogger(__name__)

# ============================================
# Enums
# ============================================

class Physics(IntEnum):
    """6 Physics - 자본의 6가지 형태"""
    CAPITAL = 0      # 금융 자본
    KNOWLEDGE = 1    # 지식 자본
    TIME = 2         # 시간 자본
    NETWORK = 3      # 관계 자본
    REPUTATION = 4   # 평판 자본
    HEALTH = 5       # 건강 자본

class Motion(IntEnum):
    """12 Motion - 자본의 변화 동작"""
    ACQUIRE = 0      # 획득
    SPEND = 1        # 소비
    INVEST = 2       # 투자
    WITHDRAW = 3     # 회수
    LEND = 4         # 대출
    BORROW = 5       # 차입
    GIVE = 6         # 증여
    RECEIVE = 7      # 수령
    EXCHANGE = 8     # 교환
    TRANSFORM = 9    # 변환
    PROTECT = 10     # 보호
    RISK = 11        # 위험

class Domain(str, Enum):
    """4 Domains (K/I Physics)"""
    SURVIVE = "S"    # 생존
    GROW = "G"       # 성장
    RELATE = "R"     # 관계
    EXPRESS = "E"    # 표현

# ============================================
# Physics Info
# ============================================

PHYSICS_INFO = {
    Physics.CAPITAL: {
        "name_ko": "금융",
        "half_life_days": 365,
        "inertia": 0.9
    },
    Physics.KNOWLEDGE: {
        "name_ko": "지식",
        "half_life_days": 180,
        "inertia": 0.7
    },
    Physics.TIME: {
        "name_ko": "시간",
        "half_life_days": 1,
        "inertia": 0.0
    },
    Physics.NETWORK: {
        "name_ko": "관계",
        "half_life_days": 90,
        "inertia": 0.5
    },
    Physics.REPUTATION: {
        "name_ko": "평판",
        "half_life_days": 730,
        "inertia": 0.95
    },
    Physics.HEALTH: {
        "name_ko": "건강",
        "half_life_days": 30,
        "inertia": 0.3
    },
}

MOTION_INFO = {
    Motion.ACQUIRE: {"name_ko": "획득", "direction": 1},
    Motion.SPEND: {"name_ko": "소비", "direction": -1},
    Motion.INVEST: {"name_ko": "투자", "direction": -1},
    Motion.WITHDRAW: {"name_ko": "회수", "direction": 1},
    Motion.LEND: {"name_ko": "대출", "direction": -1},
    Motion.BORROW: {"name_ko": "차입", "direction": 1},
    Motion.GIVE: {"name_ko": "증여", "direction": -1},
    Motion.RECEIVE: {"name_ko": "수령", "direction": 1},
    Motion.EXCHANGE: {"name_ko": "교환", "direction": 0},
    Motion.TRANSFORM: {"name_ko": "변환", "direction": 0},
    Motion.PROTECT: {"name_ko": "보호", "direction": 0},
    Motion.RISK: {"name_ko": "위험", "direction": -1},
}

# ============================================
# Node (72 = 6 Physics × 12 Motion)
# ============================================

@dataclass
class Node:
    """72 노드 중 하나"""
    physics: Physics
    motion: Motion
    value: float = 0.0
    
    @property
    def id(self) -> str:
        return f"{self.physics.name}_{self.motion.name}"
    
    @property
    def index(self) -> int:
        return self.physics.value * 12 + self.motion.value

# ============================================
# K/I Node (48 = 4 Domain × 12 Types)
# ============================================

@dataclass
class KINode:
    """K/I 48노드"""
    domain: Domain
    node_type: str  # A-L
    k_value: float = 0.5  # 지식 계수
    i_value: float = 0.5  # 관계 계수
    
    @property
    def id(self) -> str:
        return f"{self.domain.value}_{self.node_type}"

# ============================================
# Unified Engine
# ============================================

class UnifiedEngine:
    """
    AUTUS 통합 엔진
    
    - 6 Physics × 12 Motion = 72 Nodes
    - K/I Physics: 48 Nodes + 144 Slots
    - 감쇠, 게이트, 투영 지원
    """
    
    def __init__(self, data_dir: str = "./autus_data"):
        self.data_dir = data_dir
        self._state = [0.0] * 72  # 72 노드 상태
        self._ki_state = {}  # K/I 노드 상태
        self._log: List[Dict] = []
        self._init_ki_nodes()
        logger.info("UnifiedEngine initialized")
    
    def _init_ki_nodes(self):
        """K/I 48노드 초기화"""
        node_types = "ABCDEFGHIJKL"
        for domain in Domain:
            for nt in node_types:
                node_id = f"{domain.value}_{nt}"
                self._ki_state[node_id] = KINode(
                    domain=domain,
                    node_type=nt,
                    k_value=0.5,
                    i_value=0.5
                )
    
    # ─────────────────────────────────────────
    # 6 Physics API
    # ─────────────────────────────────────────
    
    def get_state(self) -> List[float]:
        """72노드 상태 배열"""
        return self._state.copy()
    
    def get_state_dict(self) -> Dict[str, float]:
        """72노드 상태 딕셔너리"""
        result = {}
        for p in Physics:
            for m in Motion:
                idx = p.value * 12 + m.value
                result[f"{p.name}_{m.name}"] = round(self._state[idx], 4)
        return result
    
    def get_physics(self, physics: str) -> float:
        """단일 Physics 총합"""
        p = Physics[physics]
        start = p.value * 12
        return sum(self._state[start:start + 12])
    
    def apply(
        self,
        physics: Any,
        motion: Any,
        delta: float,
        friction: float = 0.1,
        source: str = ""
    ) -> Dict[str, Any]:
        """Motion 적용"""
        # 파싱
        if isinstance(physics, str):
            physics = Physics[physics]
        if isinstance(motion, str):
            motion = Motion[motion]
        
        idx = physics.value * 12 + motion.value
        
        # 적용
        effective_delta = delta * (1 - friction)
        old_value = self._state[idx]
        self._state[idx] = max(-1.0, min(1.0, old_value + effective_delta))
        
        # 로그
        event = {
            "timestamp": datetime.now().isoformat(),
            "physics": physics.name,
            "motion": motion.name,
            "delta": delta,
            "friction": friction,
            "old": old_value,
            "new": self._state[idx],
            "source": source
        }
        self._log.append(event)
        
        return {
            "node": f"{physics.name}_{motion.name}",
            "old_value": round(old_value, 4),
            "new_value": round(self._state[idx], 4),
            "effective_delta": round(effective_delta, 4)
        }
    
    def tick(self, hours: float = 24) -> Dict[str, float]:
        """시간 경과 (감쇠)"""
        decay = {}
        for p in Physics:
            half_life = PHYSICS_INFO[p]["half_life_days"] * 24  # hours
            factor = 0.5 ** (hours / half_life)
            
            start = p.value * 12
            for i in range(12):
                idx = start + i
                old = self._state[idx]
                self._state[idx] *= factor
                if old != 0:
                    decay[f"{p.name}_{i}"] = round(self._state[idx] - old, 6)
        
        return decay
    
    def project(self) -> List[float]:
        """6D → 9 UI Ports 투영"""
        # 간단한 3x3 매트릭스 투영
        ports = [0.0] * 9
        for i, val in enumerate(self._state[:6]):
            ports[i % 9] += val
        return [round(p, 4) for p in ports]
    
    def project_domains(self) -> Dict[str, float]:
        """6D → 3 Domains 투영"""
        return {
            "ECONOMIC": round(sum(self._state[0:24]) / 24, 4),
            "SOCIAL": round(sum(self._state[24:48]) / 24, 4),
            "PERSONAL": round(sum(self._state[48:72]) / 24, 4)
        }
    
    def evaluate_all_gates(self) -> Dict[str, Any]:
        """모든 Physics Gate 평가"""
        gates = {}
        for p in Physics:
            total = self.get_physics(p.name)
            gates[p.name] = {
                "value": round(total, 4),
                "status": "HIGH" if total > 0.5 else "LOW" if total < -0.5 else "NORMAL"
            }
        return gates
    
    # ─────────────────────────────────────────
    # K/I Physics API
    # ─────────────────────────────────────────
    
    def get_ki_state(self) -> Dict[str, Dict]:
        """K/I 48노드 상태"""
        return {
            nid: {"k": n.k_value, "i": n.i_value, "domain": n.domain.value}
            for nid, n in self._ki_state.items()
        }
    
    def update_ki(self, node_id: str, k_delta: float = 0, i_delta: float = 0):
        """K/I 노드 업데이트"""
        if node_id in self._ki_state:
            node = self._ki_state[node_id]
            node.k_value = max(0, min(1, node.k_value + k_delta))
            node.i_value = max(0, min(1, node.i_value + i_delta))
            return {"node_id": node_id, "k": node.k_value, "i": node.i_value}
        return None
    
    def calculate_ki_score(self) -> Dict[str, float]:
        """K/I 총점 계산"""
        total_k = sum(n.k_value for n in self._ki_state.values())
        total_i = sum(n.i_value for n in self._ki_state.values())
        
        return {
            "K_total": round(total_k, 2),
            "I_total": round(total_i, 2),
            "K_avg": round(total_k / 48, 4),
            "I_avg": round(total_i / 48, 4),
            "balance": round(total_k / max(total_i, 0.01), 4)
        }
    
    # ─────────────────────────────────────────
    # Utility
    # ─────────────────────────────────────────
    
    def reset(self):
        """상태 초기화"""
        self._state = [0.0] * 72
        self._init_ki_nodes()
        self._log.clear()
    
    def info(self) -> Dict[str, Any]:
        """엔진 정보"""
        return {
            "version": "14.0",
            "nodes_6p": 72,
            "nodes_ki": 48,
            "total_energy": round(sum(abs(v) for v in self._state), 4),
            "ki_score": self.calculate_ki_score(),
            "log_count": len(self._log)
        }


# ============================================
# Motion Event (외부 이벤트)
# ============================================

@dataclass
class MotionEvent:
    """외부에서 들어오는 이벤트"""
    physics: str
    motion: str
    delta: float
    source: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())


# ============================================
# Singleton
# ============================================

_engine: Optional[UnifiedEngine] = None

def get_engine(data_dir: str = "./autus_data") -> UnifiedEngine:
    """엔진 싱글톤"""
    global _engine
    if _engine is None:
        _engine = UnifiedEngine(data_dir)
    return _engine
