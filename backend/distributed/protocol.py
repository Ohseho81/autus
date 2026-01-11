"""
AUTUS Protocol v2.1
====================

Local ↔ Cloud 통신 프로토콜

Upstream (Local → Cloud):
- 익명화된 메타데이터만 전송
- 압력, 상관관계, 상태, 회로 활성화

Downstream (Cloud → Local):
- 물리 상수만 전송 (k, W, ε)
- 조기 경보 패턴
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional
from datetime import datetime
import json


class Cohort(Enum):
    """사용자 코호트 분류"""
    ENTREPRENEUR_EARLY = "entrepreneur_early_stage"
    ENTREPRENEUR_GROWTH = "entrepreneur_growth_stage"
    EMPLOYEE_JUNIOR = "employee_junior"
    EMPLOYEE_SENIOR = "employee_senior"
    FREELANCER = "freelancer"
    EXECUTIVE = "executive"
    STUDENT = "student"
    RETIREE = "retiree"


@dataclass
class NodeStat:
    """노드 통계 (익명화)"""
    node_id: str
    avg_pressure_24h: float
    max_pressure_24h: float
    min_pressure_24h: float = 0.0
    phase_shift_count: int = 0
    current_state: str = "IGNORABLE"
    days_since_action: int = 0
    
    def to_dict(self) -> dict:
        return {
            "node_id": self.node_id,
            "avg_pressure_24h": round(self.avg_pressure_24h, 4),
            "max_pressure_24h": round(self.max_pressure_24h, 4),
            "min_pressure_24h": round(self.min_pressure_24h, 4),
            "phase_shift_count": self.phase_shift_count,
            "current_state": self.current_state,
            "days_since_action": self.days_since_action
        }


@dataclass
class EdgeCorrelation:
    """엣지 상관관계 (관측된 강도)"""
    edge_id: str
    source: str
    target: str
    observed_strength: float
    propagation_delay_hours: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "edge_id": self.edge_id,
            "source": self.source,
            "target": self.target,
            "observed_strength": round(self.observed_strength, 4),
            "propagation_delay_hours": round(self.propagation_delay_hours, 2)
        }


@dataclass
class UpstreamPacket:
    """
    Local → Cloud 패킷
    
    포함되는 것 (익명화):
    - 압력 (정규화된 0~1)
    - 상관관계 강도
    - 상태 분포
    - 회로 활성화 빈도
    
    포함되지 않는 것:
    - 실제 현금 금액
    - 실제 수면 시간
    - 개인 식별 정보
    - Raw 데이터 어떤 것도
    """
    device_id: str  # 익명화된 해시
    timestamp: str
    cohort: str
    
    node_stats: List[Dict] = field(default_factory=list)
    edge_correlations: List[Dict] = field(default_factory=list)
    circuit_activations: Dict[str, int] = field(default_factory=dict)
    system_stability: float = 0.0
    
    def to_dict(self) -> dict:
        return {
            "device_id": self.device_id,
            "timestamp": self.timestamp,
            "cohort": self.cohort,
            "node_stats": self.node_stats,
            "edge_correlations": self.edge_correlations,
            "circuit_activations": self.circuit_activations,
            "system_stability": round(self.system_stability, 4)
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)
    
    @classmethod
    def from_dict(cls, data: dict) -> "UpstreamPacket":
        return cls(
            device_id=data.get("device_id", ""),
            timestamp=data.get("timestamp", ""),
            cohort=data.get("cohort", ""),
            node_stats=data.get("node_stats", []),
            edge_correlations=data.get("edge_correlations", []),
            circuit_activations=data.get("circuit_activations", {}),
            system_stability=data.get("system_stability", 0.0)
        )


@dataclass
class EarlyWarningPattern:
    """조기 경보 패턴"""
    trigger: str  # 예: "n09 < 5.0 AND n18 > 30"
    boost_edge: str
    boost_factor: float
    description: str = ""
    
    def to_dict(self) -> dict:
        return {
            "trigger": self.trigger,
            "boost_edge": self.boost_edge,
            "boost_factor": self.boost_factor,
            "description": self.description
        }


@dataclass
class DownstreamPacket:
    """
    Cloud → Local 패킷
    
    물리 상수만 전송:
    - calibrated_k: 보정된 전도도
    - target_W: 목표 가중치
    - entropy_delta: 엔트로피 변화
    """
    version: str
    timestamp: str
    
    global_constants: Dict = field(default_factory=dict)
    cohort_constants: Dict = field(default_factory=dict)
    external_entropy: Dict[str, float] = field(default_factory=dict)
    early_warning: Dict = field(default_factory=dict)
    
    def to_dict(self) -> dict:
        return {
            "version": self.version,
            "timestamp": self.timestamp,
            "global_constants": self.global_constants,
            "cohort_constants": self.cohort_constants,
            "external_entropy": self.external_entropy,
            "early_warning": self.early_warning
        }
    
    def to_json(self) -> str:
        return json.dumps(self.to_dict(), indent=2, ensure_ascii=False)
    
    @classmethod
    def from_dict(cls, data: dict) -> "DownstreamPacket":
        return cls(
            version=data.get("version", "2.1.0"),
            timestamp=data.get("timestamp", ""),
            global_constants=data.get("global_constants", {}),
            cohort_constants=data.get("cohort_constants", {}),
            external_entropy=data.get("external_entropy", {}),
            early_warning=data.get("early_warning", {})
        )


# ============================================================================
# 3-Tier Calibration 공식
# ============================================================================

class CalibrationWeights:
    """
    3-Tier Calibration 가중치
    
    W_effective = α × W_global + β × W_cohort + γ × W_personal
    
    기본값:
    - α (Global): 0.2  - 전체 사용자 평균
    - β (Cohort): 0.3  - 유사 그룹 평균
    - γ (Personal): 0.5 - 개인 특성 (가장 강함)
    """
    
    DEFAULT_GLOBAL = 0.2
    DEFAULT_COHORT = 0.3
    DEFAULT_PERSONAL = 0.5
    
    def __init__(
        self,
        global_weight: float = DEFAULT_GLOBAL,
        cohort_weight: float = DEFAULT_COHORT,
        personal_weight: float = DEFAULT_PERSONAL
    ):
        # 정규화 (합이 1이 되도록)
        total = global_weight + cohort_weight + personal_weight
        self.alpha = global_weight / total
        self.beta = cohort_weight / total
        self.gamma = personal_weight / total
    
    def calibrate(
        self,
        global_value: float,
        cohort_value: float,
        personal_value: float
    ) -> float:
        """
        3-Tier 가중 평균 계산
        
        개인 데이터가 없으면 cohort로 fallback,
        cohort도 없으면 global로 fallback
        """
        return (
            self.alpha * global_value +
            self.beta * cohort_value +
            self.gamma * personal_value
        )
    
    def to_dict(self) -> dict:
        return {
            "global": self.alpha,
            "cohort": self.beta,
            "personal": self.gamma
        }


# ============================================================================
# 보안 검증
# ============================================================================

def validate_upstream_privacy(packet: UpstreamPacket) -> bool:
    """
    Upstream 패킷 프라이버시 검증
    
    절대 포함되면 안 되는 것:
    - 실제 금액
    - 실제 시간
    - PII (이름, 이메일 등)
    """
    # device_id는 해시여야 함 (16자 이하 hex)
    if len(packet.device_id) > 64 or not all(c in '0123456789abcdef' for c in packet.device_id.lower()):
        return False
    
    # node_stats에 실제 값이 없어야 함
    for stat in packet.node_stats:
        # value 필드가 있으면 안 됨
        if "value" in stat or "raw_value" in stat:
            return False
        # 압력은 0~1 범위여야 함
        if stat.get("avg_pressure_24h", 0) > 1.0:
            return False
    
    return True


def sanitize_upstream(packet: UpstreamPacket) -> UpstreamPacket:
    """
    Upstream 패킷 정화 (만약을 위해)
    """
    sanitized_stats = []
    for stat in packet.node_stats:
        clean_stat = {
            "node_id": stat.get("node_id"),
            "avg_pressure_24h": min(1.0, max(0.0, stat.get("avg_pressure_24h", 0))),
            "max_pressure_24h": min(1.0, max(0.0, stat.get("max_pressure_24h", 0))),
            "phase_shift_count": stat.get("phase_shift_count", 0),
            "current_state": stat.get("current_state", "IGNORABLE"),
            "days_since_action": stat.get("days_since_action", 0)
        }
        sanitized_stats.append(clean_stat)
    
    return UpstreamPacket(
        device_id=packet.device_id[:16],  # 16자로 제한
        timestamp=packet.timestamp,
        cohort=packet.cohort,
        node_stats=sanitized_stats,
        edge_correlations=packet.edge_correlations,
        circuit_activations=packet.circuit_activations,
        system_stability=min(1.0, max(0.0, packet.system_stability))
    )
