"""
═══════════════════════════════════════════════════════════════════════════════
🎯 AUTUS v3.0 - Unified Engine (통합 엔진)
═══════════════════════════════════════════════════════════════════════════════

"무슨 존재가 될지는 당신이 정한다.
 그 존재를 유지하는 일은 우리가 한다."

6 Physics × 12 Motion = 72 Nodes
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union
from enum import IntEnum, Enum
from datetime import datetime
import json
import os
import time
import math


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Physics (6가지)
# ═══════════════════════════════════════════════════════════════════════════════

class Physics(IntEnum):
    """6가지 물리 차원"""
    BIO = 0           # 생체/에너지
    CAPITAL = 1       # 자본/자산
    COGNITION = 2     # 인지/지식
    RELATION = 3      # 관계
    ENVIRONMENT = 4   # 환경
    LEGACY = 5        # 유산/지속성


PHYSICS_INFO: Dict[Physics, Dict[str, Any]] = {
    Physics.BIO: {
        "name_ko": "바이오",
        "half_life_days": 1.0,
        "inertia": 0.8,
        "description": "신체/에너지 상태"
    },
    Physics.CAPITAL: {
        "name_ko": "자본",
        "half_life_days": 30.0,
        "inertia": 0.5,
        "description": "재무/자산 상태"
    },
    Physics.COGNITION: {
        "name_ko": "인지",
        "half_life_days": 7.0,
        "inertia": 0.6,
        "description": "지식/학습 상태"
    },
    Physics.RELATION: {
        "name_ko": "관계",
        "half_life_days": 14.0,
        "inertia": 0.7,
        "description": "인간관계 상태"
    },
    Physics.ENVIRONMENT: {
        "name_ko": "환경",
        "half_life_days": 90.0,
        "inertia": 0.4,
        "description": "환경/공간 상태"
    },
    Physics.LEGACY: {
        "name_ko": "유산",
        "half_life_days": 365.0,
        "inertia": 0.3,
        "description": "지속성/유산 상태"
    },
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Motion (12가지)
# ═══════════════════════════════════════════════════════════════════════════════

class Motion(IntEnum):
    """12가지 모션 유형"""
    # SURVIVE (0-3)
    CONSUME = 0       # 소비
    REST = 1          # 휴식
    MOVE = 2          # 이동
    PROTECT = 3       # 보호
    
    # GROW (4-7)
    ACQUIRE = 4       # 획득
    CREATE = 5        # 창조
    LEARN = 6         # 학습
    PRACTICE = 7      # 연습
    
    # CONNECT (8-11)
    BOND = 8          # 유대
    EXCHANGE = 9      # 교환
    NURTURE = 10      # 양육
    EXPRESS = 11      # 표현


MOTION_INFO: Dict[Motion, Dict[str, Any]] = {
    Motion.CONSUME: {"name_ko": "소비", "category": "SURVIVE"},
    Motion.REST: {"name_ko": "휴식", "category": "SURVIVE"},
    Motion.MOVE: {"name_ko": "이동", "category": "SURVIVE"},
    Motion.PROTECT: {"name_ko": "보호", "category": "SURVIVE"},
    Motion.ACQUIRE: {"name_ko": "획득", "category": "GROW"},
    Motion.CREATE: {"name_ko": "창조", "category": "GROW"},
    Motion.LEARN: {"name_ko": "학습", "category": "GROW"},
    Motion.PRACTICE: {"name_ko": "연습", "category": "GROW"},
    Motion.BOND: {"name_ko": "유대", "category": "CONNECT"},
    Motion.EXCHANGE: {"name_ko": "교환", "category": "CONNECT"},
    Motion.NURTURE: {"name_ko": "양육", "category": "CONNECT"},
    Motion.EXPRESS: {"name_ko": "표현", "category": "CONNECT"},
}


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 UI Port & Domain
# ═══════════════════════════════════════════════════════════════════════════════

class UIPort(IntEnum):
    """9개 UI 포트"""
    HEALTH = 0
    WEALTH = 1
    WISDOM = 2
    LOVE = 3
    HOME = 4
    LEGACY = 5
    ENERGY = 6
    GROWTH = 7
    IMPACT = 8


class Domain(IntEnum):
    """3개 도메인"""
    SURVIVE = 0
    GROW = 1
    CONNECT = 2


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Node & Motion Event
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Node:
    """72 노드 중 하나"""
    id: str
    physics: Physics
    motion: Motion
    index: int
    
    @property
    def physics_value(self) -> float:
        return 0.5  # 기본값


@dataclass
class MotionEvent:
    """모션 이벤트"""
    timestamp: int
    physics: int
    motion: int
    delta: float
    friction: float = 0.1
    source: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "timestamp": self.timestamp,
            "physics": self.physics,
            "motion": self.motion,
            "delta": self.delta,
            "friction": self.friction,
            "source": self.source,
        }


@dataclass
class GateResult:
    """Gate 평가 결과"""
    physics: str
    passed: bool
    confidence: float
    display_mode: str
    motion_count: int
    last_motion_age_days: float
    
    def to_dict(self) -> Dict:
        return {
            "physics": self.physics,
            "passed": self.passed,
            "confidence": self.confidence,
            "display_mode": self.display_mode,
            "motion_count": self.motion_count,
            "last_motion_age_days": self.last_motion_age_days,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Node Registry
# ═══════════════════════════════════════════════════════════════════════════════

class NodeRegistry:
    """72개 노드 레지스트리"""
    
    def __init__(self):
        self.nodes: Dict[str, Node] = {}
        self._create_nodes()
    
    def _create_nodes(self):
        """72개 노드 생성 (6 Physics × 12 Motion)"""
        index = 0
        for p in Physics:
            for m in Motion:
                node_id = f"n{index:02d}"
                self.nodes[node_id] = Node(
                    id=node_id,
                    physics=p,
                    motion=m,
                    index=index,
                )
                index += 1


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 Unified Engine
# ═══════════════════════════════════════════════════════════════════════════════

class UnifiedEngine:
    """
    AUTUS 통합 엔진
    
    72 Nodes = 6 Physics × 12 Motion
    """
    VERSION = "2.0.0"
    
    def __init__(self, data_dir: str = "./autus_data"):
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
        # 상태
        self._state = [0.5] * 6  # 6 Physics 초기값
        self._motion_counts = [0] * 72
        self._motion_log: List[MotionEvent] = []
        self._last_ts = int(time.time() * 1000)
        
        # 감쇠율 계산
        self._decay = [
            math.log(2) / PHYSICS_INFO[p]["half_life_days"]
            for p in Physics
        ]
        self._inertia = [PHYSICS_INFO[p]["inertia"] for p in Physics]
        
        # 레지스트리
        self.registry = NodeRegistry()
        
        # 캐시
        self._gate_cache: Dict[str, Any] = {}
        self._projection_cache: Dict[str, Any] = {}
        
        # 버퍼
        self._motion_buffer: List[MotionEvent] = []
        self._async_write = True
        self._buffer_flush_threshold = 10
        self._buffer_flush_interval = 5.0
        self._last_checkpoint_ts = 0
        self._last_log_offset = 0
        
        # 로드
        self._load_state()
    
    # ─────────────────────────────────────────────────────────────
    # State
    # ─────────────────────────────────────────────────────────────
    
    def get_state(self) -> List[float]:
        """6 Physics 상태 반환"""
        return self._state.copy()
    
    def get_state_dict(self) -> Dict[str, float]:
        """Dict 형태로 반환"""
        return {p.name: round(self._state[p.value], 4) for p in Physics}
    
    def get_physics(self, physics: Union[str, int]) -> float:
        """단일 Physics 값"""
        if isinstance(physics, str):
            physics = Physics[physics].value
        return self._state[physics]
    
    # ─────────────────────────────────────────────────────────────
    # Motion
    # ─────────────────────────────────────────────────────────────
    
    def apply(
        self,
        physics: Union[str, int],
        motion: Union[str, int],
        delta: float,
        friction: float = 0.1,
        source: str = ""
    ) -> Dict:
        """Motion 적용"""
        # 인덱스 변환
        if isinstance(physics, str):
            physics = Physics[physics].value
        if isinstance(motion, str):
            motion = Motion[motion].value
        
        # 이벤트 생성
        event = MotionEvent(
            timestamp=int(time.time() * 1000),
            physics=physics,
            motion=motion,
            delta=delta,
            friction=friction,
            source=source,
        )
        
        # 관성 적용
        effective_delta = delta * (1 - self._inertia[physics] * friction)
        
        # 상태 업데이트
        old_value = self._state[physics]
        new_value = max(0, min(1, old_value + effective_delta))
        self._state[physics] = new_value
        
        # 모션 카운트
        node_index = physics * 12 + motion
        self._motion_counts[node_index] += 1
        
        # 로그
        self._motion_log.append(event)
        self._motion_buffer.append(event)
        self._last_ts = event.timestamp
        
        # 캐시 무효화
        self._invalidate_caches()
        
        # 저장
        self._save_state()
        
        return {
            "success": True,
            "node": f"n{node_index:02d}",
            "source": source or f"{Physics(physics).name}.{Motion(motion).name}",
            "effects": {
                Physics(physics).name: {
                    "before": round(old_value, 4),
                    "after": round(new_value, 4),
                    "delta": round(new_value - old_value, 4),
                }
            }
        }
    
    def tick(self) -> Dict[str, float]:
        """시간 경과 (감쇠)"""
        decay = {}
        for p in Physics:
            old = self._state[p.value]
            self._state[p.value] *= math.exp(-self._decay[p.value])
            decay[p.name] = round(old - self._state[p.value], 6)
        
        self._invalidate_caches()
        self._save_state()
        
        return decay
    
    def get_recent_motions(self, n: int = 10) -> List[Dict]:
        """최근 Motion 조회"""
        return [m.to_dict() for m in self._motion_log[-n:]]
    
    # ─────────────────────────────────────────────────────────────
    # Nodes
    # ─────────────────────────────────────────────────────────────
    
    def get_node(self, node_id: str) -> Optional[Dict]:
        """노드 조회"""
        node = self.registry.nodes.get(node_id)
        if not node:
            return None
        
        return {
            "id": node.id,
            "physics": node.physics.name,
            "motion": node.motion.name,
            "physics_value": round(self._state[node.physics.value], 4),
            "motion_count": self._motion_counts[node.index],
        }
    
    # ─────────────────────────────────────────────────────────────
    # Projection
    # ─────────────────────────────────────────────────────────────
    
    def project(self) -> Dict[str, float]:
        """6D → 9 UI Ports"""
        s = self._state
        return {
            UIPort.HEALTH.name: round((s[0] + s[4]) / 2, 4),
            UIPort.WEALTH.name: round(s[1], 4),
            UIPort.WISDOM.name: round(s[2], 4),
            UIPort.LOVE.name: round(s[3], 4),
            UIPort.HOME.name: round(s[4], 4),
            UIPort.LEGACY.name: round(s[5], 4),
            UIPort.ENERGY.name: round(s[0], 4),
            UIPort.GROWTH.name: round((s[1] + s[2]) / 2, 4),
            UIPort.IMPACT.name: round((s[3] + s[5]) / 2, 4),
        }
    
    def project_domains(self) -> Dict[str, float]:
        """6D → 3 Domains"""
        s = self._state
        return {
            Domain.SURVIVE.name: round((s[0] + s[4]) / 2, 4),
            Domain.GROW.name: round((s[1] + s[2]) / 2, 4),
            Domain.CONNECT.name: round((s[3] + s[5]) / 2, 4),
        }
    
    # ─────────────────────────────────────────────────────────────
    # Gates
    # ─────────────────────────────────────────────────────────────
    
    def evaluate_gate(self, physics: str) -> GateResult:
        """단일 Gate 평가"""
        p = Physics[physics]
        value = self._state[p.value]
        
        # 해당 Physics의 Motion 카운트
        start_idx = p.value * 12
        motion_count = sum(self._motion_counts[start_idx:start_idx + 12])
        
        # 마지막 Motion 시간
        last_motion_age = 999.0
        for m in reversed(self._motion_log):
            if m.physics == p.value:
                last_motion_age = (time.time() * 1000 - m.timestamp) / (1000 * 60 * 60 * 24)
                break
        
        # 신뢰도 계산
        confidence = min(1.0, motion_count / 10)
        
        # 표시 모드
        if confidence < 0.3:
            display_mode = "INSUFFICIENT"
        elif value >= 0.7:
            display_mode = "STRONG"
        elif value >= 0.4:
            display_mode = "MODERATE"
        else:
            display_mode = "WEAK"
        
        return GateResult(
            physics=physics,
            passed=value >= 0.5,
            confidence=round(confidence, 4),
            display_mode=display_mode,
            motion_count=motion_count,
            last_motion_age_days=round(last_motion_age, 2),
        )
    
    def evaluate_all_gates(self) -> Dict[str, Dict]:
        """모든 Gate 평가"""
        return {
            p.name: self.evaluate_gate(p.name).to_dict()
            for p in Physics
        }
    
    # ─────────────────────────────────────────────────────────────
    # Info
    # ─────────────────────────────────────────────────────────────
    
    def info(self) -> Dict:
        """엔진 정보"""
        return {
            "version": self.VERSION,
            "total_nodes": 72,
            "physics_count": 6,
            "motion_count": 12,
            "state": self.get_state_dict(),
            "total_energy": round(sum(self._state), 4),
            "motion_counts": {
                p.name: sum(self._motion_counts[p.value * 12:(p.value + 1) * 12])
                for p in Physics
            },
            "data_dir": self.data_dir,
            "gate_cache": {"enabled": True},
            "projection_cache": {"enabled": True},
            "writer": {"async": self._async_write},
        }
    
    # ─────────────────────────────────────────────────────────────
    # Persistence
    # ─────────────────────────────────────────────────────────────
    
    def _load_state(self):
        """상태 로드"""
        state_file = os.path.join(self.data_dir, "state.json")
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f:
                    data = json.load(f)
                    self._state = data.get("state", self._state)
                    self._motion_counts = data.get("motion_counts", self._motion_counts)
                    self._last_ts = data.get("last_ts", self._last_ts)
            except:
                pass
    
    def _save_state(self, force: bool = False):
        """상태 저장"""
        state_file = os.path.join(self.data_dir, "state.json")
        data = {
            "state": self._state,
            "motion_counts": self._motion_counts,
            "last_ts": self._last_ts,
        }
        with open(state_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def _invalidate_caches(self):
        """캐시 무효화"""
        self._gate_cache.clear()
        self._projection_cache.clear()
    
    # ─────────────────────────────────────────────────────────────
    # Snapshots
    # ─────────────────────────────────────────────────────────────
    
    def list_snapshots(self) -> List[Dict]:
        """스냅샷 목록"""
        snapshot_dir = os.path.join(self.data_dir, "snapshots")
        if not os.path.exists(snapshot_dir):
            return []
        
        snapshots = []
        for f in os.listdir(snapshot_dir):
            if f.endswith(".json"):
                snapshots.append({
                    "name": f,
                    "path": os.path.join(snapshot_dir, f),
                })
        return snapshots
    
    def snapshot_state(self) -> str:
        """스냅샷 생성"""
        snapshot_dir = os.path.join(self.data_dir, "snapshots")
        os.makedirs(snapshot_dir, exist_ok=True)
        
        ts = int(time.time())
        path = os.path.join(snapshot_dir, f"snapshot_{ts}.json")
        
        data = {
            "timestamp": ts,
            "state": self._state,
            "motion_counts": self._motion_counts,
        }
        
        with open(path, 'w') as f:
            json.dump(data, f, indent=2)
        
        return path
    
    def _snapshot_path(self, ts: int) -> str:
        return os.path.join(self.data_dir, "snapshots", f"snapshot_{ts}.json")
    
    def _load_snapshot(self, path: str):
        """스냅샷 로드"""
        with open(path, 'r') as f:
            data = json.load(f)
            self._state = data.get("state", self._state)
            self._motion_counts = data.get("motion_counts", self._motion_counts)
    
    # ─────────────────────────────────────────────────────────────
    # Checkpoints
    # ─────────────────────────────────────────────────────────────
    
    def list_checkpoints(self) -> List[Dict]:
        """체크포인트 목록"""
        return []
    
    def create_checkpoint(self) -> str:
        """체크포인트 생성"""
        return self.snapshot_state()
    
    # ─────────────────────────────────────────────────────────────
    # Replay
    # ─────────────────────────────────────────────────────────────
    
    def replay(self) -> int:
        """이벤트 소싱 재생"""
        return len(self._motion_log)
    
    def reset(self):
        """상태 초기화"""
        self._state = [0.5] * 6
        self._motion_counts = [0] * 72
        self._motion_log.clear()
        self._motion_buffer.clear()
        self._invalidate_caches()
        self._save_state()
