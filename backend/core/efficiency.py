"""
═══════════════════════════════════════════════════════════════════════════════
📊 AUTUS Efficiency Module (효율성 분석)
═══════════════════════════════════════════════════════════════════════════════

업무 효율성 분석 엔진
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class EfficiencyLevel(Enum):
    """효율성 레벨"""
    CRITICAL = "CRITICAL"     # 긴급 개선 필요
    LOW = "LOW"               # 낮음
    MEDIUM = "MEDIUM"         # 보통
    HIGH = "HIGH"             # 높음
    OPTIMAL = "OPTIMAL"       # 최적


@dataclass
class EfficiencyMetric:
    """효율성 메트릭"""
    name: str
    value: float              # 0-100
    level: EfficiencyLevel
    trend: float = 0.0        # 변화율
    benchmark: float = 50.0   # 벤치마크


@dataclass
class TaskEfficiency:
    """업무 효율성"""
    task_id: str
    name: str
    time_spent: float         # 시간 (분)
    time_estimated: float     # 예상 시간
    efficiency_score: float   # 0-100
    bottlenecks: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


@dataclass
class TeamEfficiency:
    """팀 효율성"""
    team_id: str
    name: str
    members: int
    overall_score: float      # 0-100
    task_completion_rate: float
    collaboration_score: float
    capacity_utilization: float


@dataclass
class EfficiencyReport:
    """효율성 리포트"""
    generated_at: datetime
    overall_score: float
    metrics: List[EfficiencyMetric]
    tasks: List[TaskEfficiency]
    recommendations: List[str]


class EfficiencyEngine:
    """효율성 분석 엔진"""
    
    def __init__(self):
        self._metrics: Dict[str, EfficiencyMetric] = {}
        self._tasks: List[TaskEfficiency] = []
        self._history: List[EfficiencyReport] = []
    
    def analyze_task(
        self,
        task_id: str,
        name: str,
        time_spent: float,
        time_estimated: float
    ) -> TaskEfficiency:
        """업무 효율성 분석"""
        # 효율성 점수 계산
        if time_estimated > 0:
            ratio = time_spent / time_estimated
            if ratio <= 0.8:
                score = 100
            elif ratio <= 1.0:
                score = 80 + (1 - ratio) * 100
            elif ratio <= 1.5:
                score = 50 + (1.5 - ratio) * 60
            else:
                score = max(0, 50 - (ratio - 1.5) * 50)
        else:
            score = 50
        
        # 병목 및 제안 생성
        bottlenecks = []
        suggestions = []
        
        if time_spent > time_estimated * 1.5:
            bottlenecks.append("예상 시간 초과")
            suggestions.append("업무 분할 또는 자동화 검토")
        
        task = TaskEfficiency(
            task_id=task_id,
            name=name,
            time_spent=time_spent,
            time_estimated=time_estimated,
            efficiency_score=round(score, 2),
            bottlenecks=bottlenecks,
            suggestions=suggestions,
        )
        
        self._tasks.append(task)
        return task
    
    def calculate_overall(self) -> float:
        """전체 효율성 계산"""
        if not self._tasks:
            return 50.0
        
        scores = [t.efficiency_score for t in self._tasks]
        return round(sum(scores) / len(scores), 2)
    
    def generate_report(self) -> EfficiencyReport:
        """리포트 생성"""
        overall = self.calculate_overall()
        
        # 메트릭 생성
        metrics = [
            EfficiencyMetric(
                name="전체 효율성",
                value=overall,
                level=self._get_level(overall),
            ),
            EfficiencyMetric(
                name="업무 완료율",
                value=len([t for t in self._tasks if t.efficiency_score >= 50]) / max(len(self._tasks), 1) * 100,
                level=EfficiencyLevel.MEDIUM,
            ),
        ]
        
        # 추천 생성
        recommendations = []
        if overall < 50:
            recommendations.append("전반적인 업무 프로세스 검토 필요")
        if any(t.efficiency_score < 30 for t in self._tasks):
            recommendations.append("저효율 업무 자동화 검토")
        
        report = EfficiencyReport(
            generated_at=datetime.now(),
            overall_score=overall,
            metrics=metrics,
            tasks=self._tasks.copy(),
            recommendations=recommendations,
        )
        
        self._history.append(report)
        return report
    
    def _get_level(self, score: float) -> EfficiencyLevel:
        """점수에서 레벨 결정"""
        if score >= 90:
            return EfficiencyLevel.OPTIMAL
        elif score >= 70:
            return EfficiencyLevel.HIGH
        elif score >= 50:
            return EfficiencyLevel.MEDIUM
        elif score >= 30:
            return EfficiencyLevel.LOW
        else:
            return EfficiencyLevel.CRITICAL
    
    def get_trends(self) -> Dict[str, float]:
        """트렌드 조회"""
        if len(self._history) < 2:
            return {}
        
        latest = self._history[-1].overall_score
        previous = self._history[-2].overall_score
        
        return {
            "current": latest,
            "previous": previous,
            "change": latest - previous,
            "change_percent": ((latest - previous) / max(previous, 1)) * 100,
        }
    
    def reset(self):
        """리셋"""
        self._metrics.clear()
        self._tasks.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# Singleton
# ═══════════════════════════════════════════════════════════════════════════════

_engine: Optional[EfficiencyEngine] = None


def get_efficiency_engine() -> EfficiencyEngine:
    """엔진 싱글턴"""
    global _engine
    if _engine is None:
        _engine = EfficiencyEngine()
    return _engine


def analyze_efficiency(
    task_id: str,
    name: str,
    time_spent: float,
    time_estimated: float
) -> TaskEfficiency:
    """업무 효율성 분석 (편의 함수)"""
    return get_efficiency_engine().analyze_task(
        task_id, name, time_spent, time_estimated
    )


def get_efficiency_report() -> EfficiencyReport:
    """리포트 생성 (편의 함수)"""
    return get_efficiency_engine().generate_report()


# ═══════════════════════════════════════════════════════════════════════════════
# Compaction Layer (Motion Stream 압축)
# ═══════════════════════════════════════════════════════════════════════════════

class CompactionPolicy(Enum):
    """압축 정책"""
    MINUTE = "MINUTE"
    HOURLY = "HOURLY"
    DAILY = "DAILY"


@dataclass
class CompactionRecord:
    """압축 레코드"""
    timestamp: int
    node: int
    delta_sum: float
    friction_avg: float
    count: int


class CompactionLayer:
    """Motion Stream 압축 레이어"""
    
    def __init__(self):
        self._buffer: List[Dict] = []
        self._compressed: Dict[CompactionPolicy, List[CompactionRecord]] = {
            p: [] for p in CompactionPolicy
        }
        self._stats = {"ingested": 0, "compressed": 0}
    
    def ingest(self, timestamp: int, node: int, delta: float, friction: float = 0.0):
        """Motion 수집"""
        self._buffer.append({
            "timestamp": timestamp,
            "node": node,
            "delta": delta,
            "friction": friction,
        })
        self._stats["ingested"] += 1
        
        # 버퍼가 100개 이상이면 자동 압축
        if len(self._buffer) >= 100:
            self._compress()
    
    def _compress(self):
        """압축 실행"""
        if not self._buffer:
            return
        
        # 노드별 그룹화 후 합산
        by_node: Dict[int, List[Dict]] = {}
        for item in self._buffer:
            node = item["node"]
            if node not in by_node:
                by_node[node] = []
            by_node[node].append(item)
        
        # 압축 레코드 생성
        for node, items in by_node.items():
            record = CompactionRecord(
                timestamp=items[-1]["timestamp"],
                node=node,
                delta_sum=sum(i["delta"] for i in items),
                friction_avg=sum(i["friction"] for i in items) / len(items),
                count=len(items),
            )
            self._compressed[CompactionPolicy.MINUTE].append(record)
        
        self._stats["compressed"] += len(self._buffer)
        self._buffer.clear()
    
    def get_trend_data(self, policy: CompactionPolicy, node: Optional[int] = None) -> List[dict]:
        """추세 데이터 조회"""
        data = self._compressed.get(policy, [])
        if node is not None:
            data = [r for r in data if r.node == node]
        return [
            {
                "timestamp": r.timestamp,
                "node": r.node,
                "delta_sum": r.delta_sum,
                "count": r.count,
            }
            for r in data[-100:]  # 최근 100개
        ]
    
    def get_stats(self) -> dict:
        """통계"""
        return {
            **self._stats,
            "buffer_size": len(self._buffer),
            "records": {p.name: len(v) for p, v in self._compressed.items()},
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Binary Delta Stream (변화량 통신)
# ═══════════════════════════════════════════════════════════════════════════════

class DeltaMessageType(Enum):
    """Delta 메시지 타입"""
    MOTION = 0x01
    STATE_SYNC = 0x02
    HEARTBEAT = 0x03


class BinaryDeltaStream:
    """바이너리 델타 스트림"""
    
    def __init__(self):
        self._sequence = 0
    
    def encode_motion(self, node: int, motion: int, delta: float, friction: float = 0.0) -> bytes:
        """모션 인코딩"""
        import struct
        
        self._sequence += 1
        
        # 헤더 (11 bytes): type(1) + seq(4) + node(1) + motion(1) + delta(4)
        data = struct.pack(
            ">BIBHF",
            DeltaMessageType.MOTION.value,
            self._sequence,
            node,
            motion,
            delta,
        )
        return data
    
    def encode_state_sync(self, state: List[float]) -> bytes:
        """상태 동기화 인코딩"""
        import struct
        
        self._sequence += 1
        
        # 헤더 + 6개 float
        header = struct.pack(">BI", DeltaMessageType.STATE_SYNC.value, self._sequence)
        values = struct.pack(">6f", *state[:6])
        
        return header + values
    
    def decode(self, data: bytes) -> dict:
        """디코딩"""
        import struct
        
        msg_type = data[0]
        
        if msg_type == DeltaMessageType.MOTION.value:
            _, seq, node, motion, delta = struct.unpack(">BIBHF", data[:11])
            return {
                "type": "MOTION",
                "sequence": seq,
                "node": node,
                "motion": motion,
                "delta": delta,
            }
        elif msg_type == DeltaMessageType.STATE_SYNC.value:
            _, seq = struct.unpack(">BI", data[:5])
            state = struct.unpack(">6f", data[5:29])
            return {
                "type": "STATE_SYNC",
                "sequence": seq,
                "state": list(state),
            }
        
        return {"type": "UNKNOWN"}
    
    def get_bandwidth_stats(self, raw_size: int, encoded_size: int) -> dict:
        """대역폭 통계"""
        return {
            "raw_size": raw_size,
            "encoded_size": encoded_size,
            "compression_ratio": round(encoded_size / max(raw_size, 1), 4),
            "savings_percent": round((1 - encoded_size / max(raw_size, 1)) * 100, 2),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Shock Index (충격 지수)
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ShockEvent:
    """충격 이벤트"""
    source: str
    timestamp: float
    node_impacts: Dict[int, float]
    magnitude: float
    friction: float
    decay_rate: float
    remaining_strength: float = 1.0


class ShockIndex:
    """충격 지수 관리"""
    
    # 충격 템플릿
    TEMPLATES = {
        "market_crash": {0: -0.3, 1: -0.2, 2: 0.1, 3: -0.1, 4: 0.0, 5: -0.4},
        "health_crisis": {0: -0.4, 1: -0.1, 2: -0.2, 3: -0.3, 4: -0.2, 5: -0.5},
        "promotion": {0: 0.2, 1: 0.3, 2: 0.1, 3: 0.4, 4: 0.1, 5: 0.5},
        "investment_gain": {0: 0.5, 1: 0.0, 2: 0.1, 3: 0.2, 4: 0.0, 5: 0.3},
    }
    
    def __init__(self):
        self.active_shocks: List[ShockEvent] = []
        self.history: List[ShockEvent] = []
    
    def trigger_shock(
        self,
        source: str,
        node_impacts: Optional[Dict[int, float]] = None,
        magnitude: float = 0.5,
        friction: float = 0.1,
        decay_rate: float = 0.1,
    ) -> ShockEvent:
        """충격 발생"""
        import time
        
        # 템플릿 사용 또는 커스텀
        if node_impacts is None:
            node_impacts = self.TEMPLATES.get(source, {i: 0.1 for i in range(6)})
        
        shock = ShockEvent(
            source=source,
            timestamp=time.time(),
            node_impacts=node_impacts,
            magnitude=magnitude,
            friction=friction,
            decay_rate=decay_rate,
        )
        
        self.active_shocks.append(shock)
        self.history.append(shock)
        
        return shock
    
    def get_current_impacts(self) -> Dict[int, float]:
        """현재 누적 충격 영향"""
        import time
        
        impacts = {i: 0.0 for i in range(6)}
        now = time.time()
        
        for shock in self.active_shocks:
            elapsed = now - shock.timestamp
            decay = max(0, 1 - elapsed * shock.decay_rate)
            shock.remaining_strength = decay
            
            if decay <= 0:
                continue
            
            for node, impact in shock.node_impacts.items():
                impacts[node] += impact * shock.magnitude * decay
        
        # 비활성 충격 제거
        self.active_shocks = [s for s in self.active_shocks if s.remaining_strength > 0]
        
        return impacts
    
    def get_animation_params(self, node: int) -> dict:
        """노드별 애니메이션 파라미터"""
        impacts = self.get_current_impacts()
        impact = impacts.get(node, 0)
        
        return {
            "node": node,
            "impact": impact,
            "shake_amplitude": abs(impact) * 10,
            "glow_intensity": max(0, impact) * 2,
            "pulse_speed": 1 + abs(impact) * 3,
        }
    
    def get_templates(self) -> dict:
        """템플릿 목록"""
        return {
            name: {
                "name": name.replace("_", " ").title(),
                "impacts": impacts,
            }
            for name, impacts in self.TEMPLATES.items()
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Hexagon Equilibrium (6노드 평형)
# ═══════════════════════════════════════════════════════════════════════════════

class HexagonEquilibrium:
    """헥사곤 평형 물리 시뮬레이션"""
    
    def __init__(self):
        self.current_state = [0.5] * 6
        self.target_state = [0.5] * 6
        self.velocity = [0.0] * 6
        
        # 물리 파라미터
        self.spring_k = 2.0      # 스프링 상수
        self.damping = 0.5      # 감쇠
        self.mass = 1.0         # 질량
    
    def update_target(self, target: List[float]):
        """목표 상태 업데이트"""
        self.target_state = [max(0, min(1, t)) for t in target[:6]]
    
    def step(self, dt: float = 0.016):
        """물리 시뮬레이션 1스텝"""
        for i in range(6):
            # 스프링 힘: F = -k * (x - target)
            displacement = self.current_state[i] - self.target_state[i]
            spring_force = -self.spring_k * displacement
            
            # 감쇠 힘: F = -c * v
            damping_force = -self.damping * self.velocity[i]
            
            # 가속도: a = F / m
            acceleration = (spring_force + damping_force) / self.mass
            
            # 속도 & 위치 업데이트 (Verlet)
            self.velocity[i] += acceleration * dt
            self.current_state[i] += self.velocity[i] * dt
            
            # 경계 클램핑
            self.current_state[i] = max(0, min(1, self.current_state[i]))
    
    def apply_shock(self, shock_index: ShockIndex):
        """충격 적용"""
        impacts = shock_index.get_current_impacts()
        for i, impact in impacts.items():
            if 0 <= i < 6:
                self.velocity[i] += impact * 0.5
    
    def get_render_data(self) -> dict:
        """렌더링 데이터"""
        import math
        
        # 헥사곤 좌표 계산
        points = []
        for i in range(6):
            angle = math.pi / 2 + (2 * math.pi * i / 6)
            radius = self.current_state[i]
            points.append({
                "x": round(math.cos(angle) * radius, 4),
                "y": round(math.sin(angle) * radius, 4),
                "value": round(self.current_state[i], 4),
                "velocity": round(self.velocity[i], 4),
            })
        
        return {
            "points": points,
            "center": {"x": 0, "y": 0},
            "energy": sum(v ** 2 for v in self.velocity) / 2,
            "equilibrium": all(abs(v) < 0.01 for v in self.velocity),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# Singletons for Efficiency Layer
# ═══════════════════════════════════════════════════════════════════════════════

_compaction: Optional[CompactionLayer] = None
_delta_stream: Optional[BinaryDeltaStream] = None
_shock_index: Optional[ShockIndex] = None
_hexagon: Optional[HexagonEquilibrium] = None


def get_compaction_layer() -> CompactionLayer:
    global _compaction
    if _compaction is None:
        _compaction = CompactionLayer()
    return _compaction


def get_delta_stream() -> BinaryDeltaStream:
    global _delta_stream
    if _delta_stream is None:
        _delta_stream = BinaryDeltaStream()
    return _delta_stream


def get_shock_index() -> ShockIndex:
    global _shock_index
    if _shock_index is None:
        _shock_index = ShockIndex()
    return _shock_index


def get_hexagon_equilibrium() -> HexagonEquilibrium:
    global _hexagon
    if _hexagon is None:
        _hexagon = HexagonEquilibrium()
    return _hexagon


def reset_efficiency_layer():
    """효율성 레이어 리셋"""
    global _compaction, _delta_stream, _shock_index, _hexagon
    _compaction = CompactionLayer()
    _delta_stream = BinaryDeltaStream()
    _shock_index = ShockIndex()
    _hexagon = HexagonEquilibrium()
