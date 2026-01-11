"""
═══════════════════════════════════════════════════════════════════════════════
🛡️ AUTUS Self-Protection Circuits (자기 보호 회로)
═══════════════════════════════════════════════════════════════════════════════

관찰자 효과를 차단하고 시스템의 평형을 유지하는 자기 보호 메커니즘

핵심 원리:
- 과도한 관찰(접근)을 감지하고 차단
- 노드 동결 및 에너지 분산
- 마찰 계수 자동 조절
- 엔트로피 임계값 기반 필터링

"관찰자조차 시스템을 교란할 수 없다"
═══════════════════════════════════════════════════════════════════════════════
"""

import hashlib
import time
import threading
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Callable, Any
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict
import secrets


# ═══════════════════════════════════════════════════════════════════════════════
# 상수 및 설정
# ═══════════════════════════════════════════════════════════════════════════════

class CircuitState(Enum):
    """회로 상태"""
    OPEN = "open"           # 정상 작동
    HALF_OPEN = "half_open"  # 부분 제한
    CLOSED = "closed"       # 완전 차단
    FROZEN = "frozen"       # 동결


class ThreatLevel(Enum):
    """위협 레벨"""
    NONE = 0
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4


class ObservationType(Enum):
    """관찰 유형"""
    READ = "read"
    WRITE = "write"
    QUERY = "query"
    EXPORT = "export"
    DEBUG = "debug"
    ADMIN = "admin"


# 물리적 상수 (1:12:144 프랙탈 구조)
FRACTAL_RATIO = {
    "core": 1,
    "domains": 12,
    "indicators": 144,
}

# 엔트로피 임계값
ENTROPY_THRESHOLDS = {
    "normal": 0.3,
    "warning": 0.5,
    "critical": 0.7,
    "maximum": 1.0,
}

# 관찰 빈도 제한 (초당)
OBSERVATION_LIMITS = {
    ObservationType.READ: 100,
    ObservationType.WRITE: 50,
    ObservationType.QUERY: 30,
    ObservationType.EXPORT: 5,
    ObservationType.DEBUG: 10,
    ObservationType.ADMIN: 3,
}


# ═══════════════════════════════════════════════════════════════════════════════
# 데이터 구조
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class ObservationLog:
    """관찰 로그"""
    observer_id: str
    observation_type: ObservationType
    target_node: str
    timestamp: datetime
    encrypted_details: str  # 암호화된 상세 정보
    threat_score: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "observer_hash": hashlib.sha256(self.observer_id.encode()).hexdigest()[:8],
            "type": self.observation_type.value,
            "target": self.target_node,
            "timestamp": self.timestamp.isoformat(),
            "threat_score": self.threat_score,
        }


@dataclass
class NodeProtection:
    """노드 보호 상태"""
    node_id: str
    circuit_state: CircuitState = CircuitState.OPEN
    threat_level: ThreatLevel = ThreatLevel.NONE
    energy_level: float = 1.0
    friction_coefficient: float = 0.0
    last_observation: Optional[datetime] = None
    observation_count: int = 0
    lock_until: Optional[datetime] = None
    
    def is_accessible(self) -> bool:
        """접근 가능 여부"""
        if self.circuit_state == CircuitState.CLOSED:
            return False
        if self.circuit_state == CircuitState.FROZEN:
            return False
        if self.lock_until and datetime.utcnow() < self.lock_until:
            return False
        return True
    
    def to_dict(self) -> Dict:
        return {
            "node_id": self.node_id,
            "state": self.circuit_state.value,
            "threat_level": self.threat_level.name,
            "energy": self.energy_level,
            "friction": self.friction_coefficient,
            "accessible": self.is_accessible(),
            "observation_count": self.observation_count,
        }


@dataclass
class EntropyFilter:
    """엔트로피 필터"""
    filter_id: str
    threshold: float
    active: bool = True
    filtered_count: int = 0
    passed_count: int = 0
    
    def should_filter(self, data_entropy: float) -> bool:
        """필터링 여부 결정"""
        if not self.active:
            return False
        
        if data_entropy > self.threshold:
            self.filtered_count += 1
            return True
        else:
            self.passed_count += 1
            return False


# ═══════════════════════════════════════════════════════════════════════════════
# 관찰자 효과 탐지기
# ═══════════════════════════════════════════════════════════════════════════════

class ObserverEffectDetector:
    """
    관찰자 효과 탐지기
    
    시스템이 과도하게 관찰되면 마찰(friction)이 발생
    이를 감지하고 방어 조치 실행
    """
    
    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self._observations: Dict[str, List[ObservationLog]] = defaultdict(list)
        self._observer_scores: Dict[str, float] = defaultdict(float)
        self._lock = threading.Lock()
    
    def record_observation(
        self,
        observer_id: str,
        observation_type: ObservationType,
        target_node: str,
        details: str = "",
    ) -> ObservationLog:
        """관찰 기록"""
        with self._lock:
            # 암호화된 상세 정보
            encrypted = hashlib.sha256(
                f"{observer_id}:{details}:{secrets.token_hex(8)}".encode()
            ).hexdigest()
            
            log = ObservationLog(
                observer_id=observer_id,
                observation_type=observation_type,
                target_node=target_node,
                timestamp=datetime.utcnow(),
                encrypted_details=encrypted,
            )
            
            # 위협 점수 계산
            log.threat_score = self._calculate_threat_score(observer_id, observation_type)
            
            # 저장
            self._observations[target_node].append(log)
            self._observer_scores[observer_id] += log.threat_score
            
            # 오래된 로그 정리
            self._cleanup_old_logs(target_node)
            
            return log
    
    def _calculate_threat_score(
        self,
        observer_id: str,
        observation_type: ObservationType,
    ) -> float:
        """위협 점수 계산"""
        base_score = {
            ObservationType.READ: 0.1,
            ObservationType.WRITE: 0.3,
            ObservationType.QUERY: 0.2,
            ObservationType.EXPORT: 0.5,
            ObservationType.DEBUG: 0.4,
            ObservationType.ADMIN: 0.6,
        }.get(observation_type, 0.1)
        
        # 누적 점수 가중치
        accumulated = self._observer_scores.get(observer_id, 0)
        multiplier = 1 + (accumulated / 10)
        
        return min(base_score * multiplier, 1.0)
    
    def _cleanup_old_logs(self, target_node: str):
        """오래된 로그 정리"""
        cutoff = datetime.utcnow() - timedelta(seconds=self.window_seconds)
        self._observations[target_node] = [
            log for log in self._observations[target_node]
            if log.timestamp > cutoff
        ]
    
    def get_observation_rate(self, target_node: str) -> float:
        """관찰 빈도 (초당)"""
        with self._lock:
            self._cleanup_old_logs(target_node)
            count = len(self._observations[target_node])
            return count / self.window_seconds
    
    def detect_anomaly(self, target_node: str) -> Dict:
        """이상 탐지"""
        rate = self.get_observation_rate(target_node)
        
        # 관찰 유형별 분포
        type_counts = defaultdict(int)
        for log in self._observations[target_node]:
            type_counts[log.observation_type.value] += 1
        
        # 이상 판단
        anomaly_score = 0.0
        reasons = []
        
        # 과도한 관찰
        if rate > 10:
            anomaly_score += 0.5
            reasons.append(f"High observation rate: {rate:.2f}/s")
        
        # 위험한 관찰 유형
        dangerous_types = ["export", "debug", "admin"]
        for dt in dangerous_types:
            if type_counts.get(dt, 0) > 5:
                anomaly_score += 0.3
                reasons.append(f"Multiple {dt} observations")
        
        return {
            "target_node": target_node,
            "observation_rate": rate,
            "type_distribution": dict(type_counts),
            "anomaly_score": min(anomaly_score, 1.0),
            "is_anomaly": anomaly_score > 0.5,
            "reasons": reasons,
        }
    
    def get_observer_threat(self, observer_id: str) -> ThreatLevel:
        """관찰자 위협 레벨"""
        score = self._observer_scores.get(observer_id, 0)
        
        if score >= 10:
            return ThreatLevel.CRITICAL
        elif score >= 5:
            return ThreatLevel.HIGH
        elif score >= 2:
            return ThreatLevel.MEDIUM
        elif score >= 0.5:
            return ThreatLevel.LOW
        else:
            return ThreatLevel.NONE


# ═══════════════════════════════════════════════════════════════════════════════
# 자기 보호 회로
# ═══════════════════════════════════════════════════════════════════════════════

class SelfProtectionCircuit:
    """
    자기 보호 회로 (Circuit Breaker + Self-Healing)
    
    기능:
    1. 노드 보호 상태 관리
    2. 관찰자 효과 차단
    3. 에너지 분산
    4. 엔트로피 기반 필터링
    """
    
    def __init__(self):
        self.detector = ObserverEffectDetector()
        self._nodes: Dict[str, NodeProtection] = {}
        self._filters: Dict[str, EntropyFilter] = {}
        self._lock = threading.Lock()
        
        # 기본 36개 노드 초기화
        self._initialize_nodes()
    
    def _initialize_nodes(self):
        """36개 노드 초기화"""
        for i in range(1, 37):
            node_id = f"n{i:02d}"
            self._nodes[node_id] = NodeProtection(node_id=node_id)
        
        # 기본 엔트로피 필터
        self._filters["global"] = EntropyFilter(
            filter_id="global",
            threshold=ENTROPY_THRESHOLDS["warning"],
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 접근 제어
    # ─────────────────────────────────────────────────────────────────────────
    
    def request_access(
        self,
        observer_id: str,
        node_id: str,
        observation_type: ObservationType,
    ) -> Dict:
        """접근 요청"""
        with self._lock:
            # 노드 존재 확인
            if node_id not in self._nodes:
                return {"granted": False, "reason": "Node not found"}
            
            node = self._nodes[node_id]
            
            # 접근 가능 여부 확인
            if not node.is_accessible():
                return {
                    "granted": False,
                    "reason": f"Node is {node.circuit_state.value}",
                    "retry_after": (
                        (node.lock_until - datetime.utcnow()).seconds
                        if node.lock_until else None
                    ),
                }
            
            # 관찰 기록
            log = self.detector.record_observation(
                observer_id=observer_id,
                observation_type=observation_type,
                target_node=node_id,
            )
            
            # 노드 상태 업데이트
            node.last_observation = log.timestamp
            node.observation_count += 1
            
            # 위협 평가
            observer_threat = self.detector.get_observer_threat(observer_id)
            anomaly = self.detector.detect_anomaly(node_id)
            
            # 방어 조치 결정
            if observer_threat.value >= ThreatLevel.HIGH.value:
                self._apply_protection(node_id, observer_id, "high_threat")
                return {
                    "granted": False,
                    "reason": "Observer threat level too high",
                    "threat_level": observer_threat.name,
                }
            
            if anomaly["is_anomaly"]:
                self._apply_protection(node_id, observer_id, "anomaly")
                return {
                    "granted": False,
                    "reason": "Anomalous observation pattern detected",
                    "anomaly_score": anomaly["anomaly_score"],
                }
            
            # 빈도 제한 확인
            limit = OBSERVATION_LIMITS.get(observation_type, 100)
            rate = self.detector.get_observation_rate(node_id)
            
            if rate > limit:
                return {
                    "granted": False,
                    "reason": "Rate limit exceeded",
                    "current_rate": rate,
                    "limit": limit,
                }
            
            # 접근 허용
            return {
                "granted": True,
                "node_id": node_id,
                "friction": node.friction_coefficient,
                "observation_id": log.encrypted_details[:8],
            }
    
    def _apply_protection(self, node_id: str, observer_id: str, reason: str):
        """보호 조치 적용"""
        node = self._nodes[node_id]
        
        # 마찰 계수 증가
        node.friction_coefficient = min(node.friction_coefficient + 0.2, 1.0)
        
        # 위협 레벨 증가
        if node.threat_level.value < ThreatLevel.CRITICAL.value:
            node.threat_level = ThreatLevel(node.threat_level.value + 1)
        
        # 심각한 경우 회로 상태 변경
        if node.threat_level.value >= ThreatLevel.HIGH.value:
            node.circuit_state = CircuitState.HALF_OPEN
        
        if node.threat_level.value >= ThreatLevel.CRITICAL.value:
            node.circuit_state = CircuitState.CLOSED
            node.lock_until = datetime.utcnow() + timedelta(minutes=5)
    
    # ─────────────────────────────────────────────────────────────────────────
    # 노드 동결/해제
    # ─────────────────────────────────────────────────────────────────────────
    
    def freeze_node(self, node_id: str, duration_minutes: int = 10) -> bool:
        """노드 동결"""
        with self._lock:
            if node_id not in self._nodes:
                return False
            
            node = self._nodes[node_id]
            node.circuit_state = CircuitState.FROZEN
            node.lock_until = datetime.utcnow() + timedelta(minutes=duration_minutes)
            
            return True
    
    def unfreeze_node(self, node_id: str) -> bool:
        """노드 동결 해제"""
        with self._lock:
            if node_id not in self._nodes:
                return False
            
            node = self._nodes[node_id]
            node.circuit_state = CircuitState.OPEN
            node.lock_until = None
            node.threat_level = ThreatLevel.NONE
            
            return True
    
    # ─────────────────────────────────────────────────────────────────────────
    # 에너지 분산
    # ─────────────────────────────────────────────────────────────────────────
    
    def distribute_energy(self, source_node: str, amount: float) -> Dict:
        """에너지 분산 (라플라시안 확산)"""
        with self._lock:
            if source_node not in self._nodes:
                return {"success": False, "reason": "Source node not found"}
            
            source = self._nodes[source_node]
            
            # 에너지 부족 확인
            if source.energy_level < amount:
                return {"success": False, "reason": "Insufficient energy"}
            
            # 인접 노드에 균등 분산 (6개 이웃)
            node_num = int(source_node[1:])
            neighbors = []
            
            for offset in [-6, -1, 1, 6]:
                neighbor_num = node_num + offset
                if 1 <= neighbor_num <= 36:
                    neighbor_id = f"n{neighbor_num:02d}"
                    if neighbor_id in self._nodes:
                        neighbors.append(neighbor_id)
            
            if not neighbors:
                return {"success": False, "reason": "No neighbors to distribute to"}
            
            # 분산
            per_neighbor = amount / len(neighbors)
            source.energy_level -= amount
            
            distribution = {}
            for neighbor_id in neighbors:
                neighbor = self._nodes[neighbor_id]
                neighbor.energy_level = min(neighbor.energy_level + per_neighbor, 1.0)
                distribution[neighbor_id] = per_neighbor
            
            return {
                "success": True,
                "source": source_node,
                "distributed": distribution,
                "remaining_energy": source.energy_level,
            }
    
    # ─────────────────────────────────────────────────────────────────────────
    # 엔트로피 필터링
    # ─────────────────────────────────────────────────────────────────────────
    
    def filter_by_entropy(self, data: bytes, threshold: float = None) -> Dict:
        """엔트로피 기반 필터링"""
        # 데이터 엔트로피 계산
        entropy = self._calculate_entropy(data)
        
        # 임계값
        threshold = threshold or ENTROPY_THRESHOLDS["warning"]
        
        # 필터링 결정
        should_filter = entropy > threshold
        
        # 글로벌 필터 업데이트
        global_filter = self._filters.get("global")
        if global_filter:
            global_filter.should_filter(entropy)
        
        return {
            "entropy": entropy,
            "threshold": threshold,
            "filtered": should_filter,
            "reason": (
                "Data entropy exceeds threshold (likely noise)"
                if should_filter else "Data entropy within acceptable range"
            ),
        }
    
    def _calculate_entropy(self, data: bytes) -> float:
        """Shannon 엔트로피 계산"""
        if not data:
            return 0.0
        
        # 바이트 빈도 계산
        freq = defaultdict(int)
        for byte in data:
            freq[byte] += 1
        
        # 확률 및 엔트로피
        length = len(data)
        entropy = 0.0
        
        import math
        for count in freq.values():
            prob = count / length
            if prob > 0:
                entropy -= prob * math.log2(prob)
        
        # 0~1로 정규화 (최대 8비트)
        return entropy / 8.0
    
    # ─────────────────────────────────────────────────────────────────────────
    # 1:12:144 구조 검증
    # ─────────────────────────────────────────────────────────────────────────
    
    def validate_fractal_structure(self, data: Dict) -> Dict:
        """1:12:144 프랙탈 구조 검증"""
        results = {
            "valid": True,
            "structure": {},
            "violations": [],
        }
        
        # 코어 (1)
        if "core" not in data:
            results["valid"] = False
            results["violations"].append("Missing core element")
        else:
            results["structure"]["core"] = 1
        
        # 도메인 (12)
        domains = data.get("domains", [])
        if len(domains) != 12:
            results["valid"] = False
            results["violations"].append(f"Expected 12 domains, got {len(domains)}")
        results["structure"]["domains"] = len(domains)
        
        # 지표 (144)
        indicators = data.get("indicators", [])
        if len(indicators) != 144:
            results["valid"] = False
            results["violations"].append(f"Expected 144 indicators, got {len(indicators)}")
        results["structure"]["indicators"] = len(indicators)
        
        # 비율 확인
        if results["valid"]:
            ratio_valid = (
                results["structure"]["domains"] == 12 * results["structure"]["core"]
                and results["structure"]["indicators"] == 12 * results["structure"]["domains"]
            )
            if not ratio_valid:
                results["valid"] = False
                results["violations"].append("Fractal ratio 1:12:144 violated")
        
        return results
    
    # ─────────────────────────────────────────────────────────────────────────
    # 상태 조회
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_node_status(self, node_id: str) -> Optional[Dict]:
        """노드 상태 조회"""
        node = self._nodes.get(node_id)
        return node.to_dict() if node else None
    
    def get_all_status(self) -> Dict:
        """전체 상태 조회"""
        with self._lock:
            nodes_status = {
                node_id: node.to_dict()
                for node_id, node in self._nodes.items()
            }
            
            # 요약 통계
            states = defaultdict(int)
            threats = defaultdict(int)
            total_energy = 0.0
            
            for node in self._nodes.values():
                states[node.circuit_state.value] += 1
                threats[node.threat_level.name] += 1
                total_energy += node.energy_level
            
            return {
                "total_nodes": len(self._nodes),
                "states": dict(states),
                "threat_levels": dict(threats),
                "total_energy": total_energy,
                "average_energy": total_energy / len(self._nodes),
                "filters_active": len([f for f in self._filters.values() if f.active]),
            }
    
    def get_security_report(self) -> Dict:
        """보안 리포트"""
        with self._lock:
            # 위험 노드
            at_risk = [
                node.to_dict() for node in self._nodes.values()
                if node.threat_level.value >= ThreatLevel.MEDIUM.value
            ]
            
            # 동결된 노드
            frozen = [
                node.to_dict() for node in self._nodes.values()
                if node.circuit_state == CircuitState.FROZEN
            ]
            
            # 필터 통계
            filter_stats = {}
            for fid, f in self._filters.items():
                filter_stats[fid] = {
                    "filtered": f.filtered_count,
                    "passed": f.passed_count,
                    "filter_rate": (
                        f.filtered_count / (f.filtered_count + f.passed_count)
                        if (f.filtered_count + f.passed_count) > 0 else 0
                    ),
                }
            
            return {
                "timestamp": datetime.utcnow().isoformat(),
                "at_risk_nodes": at_risk,
                "frozen_nodes": frozen,
                "filter_statistics": filter_stats,
                "recommendations": self._generate_recommendations(),
            }
    
    def _generate_recommendations(self) -> List[str]:
        """보안 권고 생성"""
        recommendations = []
        
        # 위험 노드 확인
        high_risk = sum(
            1 for n in self._nodes.values()
            if n.threat_level.value >= ThreatLevel.HIGH.value
        )
        if high_risk > 0:
            recommendations.append(
                f"⚠️ {high_risk} nodes at high risk - consider manual review"
            )
        
        # 에너지 불균형
        energies = [n.energy_level for n in self._nodes.values()]
        if energies:
            min_e, max_e = min(energies), max(energies)
            if max_e - min_e > 0.5:
                recommendations.append(
                    "⚡ Energy imbalance detected - consider redistribution"
                )
        
        # 동결 노드
        frozen_count = sum(
            1 for n in self._nodes.values()
            if n.circuit_state == CircuitState.FROZEN
        )
        if frozen_count > 3:
            recommendations.append(
                f"🔒 {frozen_count} nodes frozen - review attack patterns"
            )
        
        if not recommendations:
            recommendations.append("✅ System operating normally")
        
        return recommendations


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글턴 및 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

_circuit: Optional[SelfProtectionCircuit] = None


def get_protection_circuit() -> SelfProtectionCircuit:
    """보호 회로 싱글턴"""
    global _circuit
    if _circuit is None:
        _circuit = SelfProtectionCircuit()
    return _circuit


def request_node_access(observer_id: str, node_id: str, op_type: str) -> Dict:
    """노드 접근 요청 (편의 함수)"""
    circuit = get_protection_circuit()
    obs_type = ObservationType(op_type) if op_type in [e.value for e in ObservationType] else ObservationType.READ
    return circuit.request_access(observer_id, node_id, obs_type)


def filter_noise(data: bytes) -> Dict:
    """노이즈 필터링 (편의 함수)"""
    circuit = get_protection_circuit()
    return circuit.filter_by_entropy(data)


# ═══════════════════════════════════════════════════════════════════════════════
# 레거시 호환성 (기존 코드와 호환)
# ═══════════════════════════════════════════════════════════════════════════════

# 기존 LAYERS 정의 (6개 물리 레이어)
LAYERS = {
    "BIO": {"id": "BIO", "name": "생체", "nodes": ["n01", "n02", "n03", "n04", "n05", "n06"]},
    "CAPITAL": {"id": "CAPITAL", "name": "자본", "nodes": ["n07", "n08", "n09", "n10", "n11", "n12"]},
    "COGNITION": {"id": "COGNITION", "name": "인지", "nodes": ["n13", "n14", "n15", "n16", "n17", "n18"]},
    "RELATION": {"id": "RELATION", "name": "관계", "nodes": ["n19", "n20", "n21", "n22", "n23", "n24"]},
    "ENVIRONMENT": {"id": "ENVIRONMENT", "name": "환경", "nodes": ["n25", "n26", "n27", "n28", "n29", "n30"]},
    "LEGACY": {"id": "LEGACY", "name": "유산", "nodes": ["n31", "n32", "n33", "n34", "n35", "n36"]},
}

# 기존 CIRCUITS 정의 (12개 회로)
CIRCUITS = {
    "C01_HEALTH": {"id": "C01", "name": "건강", "nodes": ["n01", "n02", "n03"]},
    "C02_FITNESS": {"id": "C02", "name": "체력", "nodes": ["n04", "n05", "n06"]},
    "C03_INCOME": {"id": "C03", "name": "수입", "nodes": ["n07", "n08", "n09"]},
    "C04_WEALTH": {"id": "C04", "name": "자산", "nodes": ["n10", "n11", "n12"]},
    "C05_LEARNING": {"id": "C05", "name": "학습", "nodes": ["n13", "n14", "n15"]},
    "C06_MASTERY": {"id": "C06", "name": "숙련", "nodes": ["n16", "n17", "n18"]},
    "C07_FAMILY": {"id": "C07", "name": "가족", "nodes": ["n19", "n20", "n21"]},
    "C08_NETWORK": {"id": "C08", "name": "네트워크", "nodes": ["n22", "n23", "n24"]},
    "C09_DWELLING": {"id": "C09", "name": "거주", "nodes": ["n25", "n26", "n27"]},
    "C10_WORKPLACE": {"id": "C10", "name": "직장", "nodes": ["n28", "n29", "n30"]},
    "C11_PURPOSE": {"id": "C11", "name": "목적", "nodes": ["n31", "n32", "n33"]},
    "C12_IMPACT": {"id": "C12", "name": "영향", "nodes": ["n34", "n35", "n36"]},
}

CIRCUIT_IDS = list(CIRCUITS.keys())

# 기존 INFLUENCE_MATRIX (노드 간 영향 관계)
INFLUENCE_MATRIX = {
    # BIO -> CAPITAL (건강이 좋으면 수입 증가)
    "n01": ["n07", "n13"],  # 체력 -> 월수입, 학습시간
    "n02": ["n01", "n03"],  # 면역력 -> 체력, 수면
    "n03": ["n01", "n17"],  # 수면 -> 체력, 창의력
    # CAPITAL -> ENVIRONMENT
    "n07": ["n10", "n25"],  # 월수입 -> 자산, 주거
    "n10": ["n25", "n27"],  # 자산 -> 주거, 안전
    # COGNITION -> LEGACY
    "n16": ["n35", "n36"],  # 전문기술 -> 멘토링, 지식전수
    "n17": ["n18", "n31"],  # 창의력 -> 문제해결, 인생목표
    # RELATION -> CAPITAL
    "n23": ["n08", "n11"],  # 네트워크 -> 부수입, 투자수익
    # LEGACY -> BIO
    "n31": ["n01", "n33"],  # 인생목표 -> 체력, 영성
}


def get_outgoing_influences(node_id: str) -> List[str]:
    """노드에서 나가는 영향 관계 조회"""
    return INFLUENCE_MATRIX.get(node_id, [])


def get_incoming_influences(node_id: str) -> List[str]:
    """노드로 들어오는 영향 관계 조회"""
    incoming = []
    for source, targets in INFLUENCE_MATRIX.items():
        if node_id in targets:
            incoming.append(source)
    return incoming


def get_circuit_nodes(circuit_id: str) -> List[str]:
    """회로의 노드 목록 조회"""
    circuit = CIRCUITS.get(circuit_id)
    if circuit:
        return circuit.get("nodes", [])
    return []


def get_layer_nodes(layer_id: str) -> List[str]:
    """레이어의 노드 목록 조회"""
    layer = LAYERS.get(layer_id)
    if layer:
        return layer.get("nodes", [])
    return []


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Classes
    "SelfProtectionCircuit",
    "ObserverEffectDetector",
    "NodeProtection",
    "ObservationLog",
    "EntropyFilter",
    # Enums
    "CircuitState",
    "ThreatLevel",
    "ObservationType",
    # Constants
    "FRACTAL_RATIO",
    "ENTROPY_THRESHOLDS",
    # Legacy Constants
    "LAYERS",
    "CIRCUITS",
    "CIRCUIT_IDS",
    "INFLUENCE_MATRIX",
    # Functions
    "get_protection_circuit",
    "request_node_access",
    "filter_noise",
    # Legacy Functions
    "get_outgoing_influences",
    "get_incoming_influences",
    "get_circuit_nodes",
    "get_layer_nodes",
]
