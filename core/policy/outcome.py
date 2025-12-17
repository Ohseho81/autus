"""
AUTUS Outcome Classification Module
Version: 1.0 (LOCKED)
Date: 2025-12-17

판정 결과: SUCCESS | NEAR_MISS | FAILURE | NEUTRAL
"""

from dataclasses import dataclass
from enum import Enum
from typing import Tuple, Optional, Dict, Any
from datetime import datetime, timezone
import hashlib
import json


# ═══════════════════════════════════════════════════════════════
# CONSTANTS (IMMUTABLE)
# ═══════════════════════════════════════════════════════════════

CRITICAL_THRESHOLD = 0.60
EPSILON = 0.05


# ═══════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════

class Outcome(Enum):
    SUCCESS = "SUCCESS"
    NEAR_MISS = "NEAR_MISS"
    FAILURE = "FAILURE"
    NEUTRAL = "NEUTRAL"


class Gate(Enum):
    GREEN = "GREEN"
    AMBER = "AMBER"
    RED = "RED"


# ═══════════════════════════════════════════════════════════════
# DATA CLASSES
# ═══════════════════════════════════════════════════════════════

@dataclass
class OutcomeResult:
    outcome: Outcome
    reason: str
    boundary_distance: Optional[float] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "outcome": self.outcome.value,
            "reason": self.reason,
            "boundary_distance": self.boundary_distance
        }


@dataclass
class ProofCapsule:
    """증거 저장 캡슐"""
    id: str
    timestamp: str
    action: str
    verdict: str
    risk_before: float
    risk_after: float
    recovery_before: float
    recovery_after: float
    outcome: str
    reason: str
    context_tag: str
    gate_before: str
    gate_after: str
    confidence: float
    payload_hash: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "action": self.action,
            "verdict": self.verdict,
            "risk_before": self.risk_before,
            "risk_after": self.risk_after,
            "recovery_delta": round(self.recovery_after - self.recovery_before, 4),
            "outcome": self.outcome,
            "reason": self.reason,
            "context_tag": self.context_tag,
            "gate_sequence": [self.gate_before, self.gate_after],
            "confidence": self.confidence,
            "payload_hash": self.payload_hash
        }


# ═══════════════════════════════════════════════════════════════
# CORE FUNCTIONS
# ═══════════════════════════════════════════════════════════════

def classify_outcome(
    risk_before: float,
    risk_after: float,
    recovery_before: float,
    recovery_after: float,
    gate_after: str
) -> OutcomeResult:
    """
    액션 결과 판정
    
    Args:
        risk_before: 액션 전 Risk (0–1)
        risk_after: 액션 후 Risk (0–1)
        recovery_before: 액션 전 Recovery (0–1)
        recovery_after: 액션 후 Recovery (0–1)
        gate_after: 액션 후 Gate (GREEN | AMBER | RED)
    
    Returns:
        OutcomeResult with outcome type and reason
    """
    
    # FAILURE: 상황 악화 또는 RED 진입
    if risk_after > risk_before:
        return OutcomeResult(
            outcome=Outcome.FAILURE,
            reason="risk_increased",
            boundary_distance=risk_after - CRITICAL_THRESHOLD
        )
    
    if gate_after == "RED":
        return OutcomeResult(
            outcome=Outcome.FAILURE,
            reason="gate_red",
            boundary_distance=risk_after - CRITICAL_THRESHOLD
        )
    
    if recovery_after < recovery_before:
        return OutcomeResult(
            outcome=Outcome.FAILURE,
            reason="recovery_decreased",
            boundary_distance=risk_after - CRITICAL_THRESHOLD
        )
    
    # NEAR_MISS: CRITICAL 경계 근접
    boundary_distance = abs(risk_after - CRITICAL_THRESHOLD)
    
    if boundary_distance <= EPSILON:
        return OutcomeResult(
            outcome=Outcome.NEAR_MISS,
            reason="critical_boundary",
            boundary_distance=boundary_distance
        )
    
    if risk_before > CRITICAL_THRESHOLD and risk_after <= CRITICAL_THRESHOLD:
        return OutcomeResult(
            outcome=Outcome.NEAR_MISS,
            reason="escaped_critical",
            boundary_distance=boundary_distance
        )
    
    # SUCCESS: 개선됨
    if risk_after < risk_before and recovery_after > recovery_before:
        return OutcomeResult(
            outcome=Outcome.SUCCESS,
            reason="improved",
            boundary_distance=boundary_distance
        )
    
    # NEUTRAL: 변화 없음
    return OutcomeResult(
        outcome=Outcome.NEUTRAL,
        reason="no_change",
        boundary_distance=boundary_distance
    )


def compute_gate(recovery: float, risk: float) -> str:
    """Gate 계산"""
    if risk > CRITICAL_THRESHOLD:
        return "AMBER"  # CRITICAL 강제 AMBER
    if recovery < 0.30:
        return "RED"
    if recovery < 0.60:
        return "AMBER"
    return "GREEN"


def should_store_proof(outcome: Outcome) -> bool:
    """Proof Capsule 저장 여부"""
    return outcome in [Outcome.NEAR_MISS, Outcome.FAILURE]


def get_retention_days(outcome: Outcome) -> int:
    """보관 기간 (일)"""
    retention = {
        Outcome.SUCCESS: 7,    # 통계만
        Outcome.NEAR_MISS: 30,
        Outcome.FAILURE: 90,
        Outcome.NEUTRAL: 7     # 통계만
    }
    return retention.get(outcome, 7)


def create_proof_capsule(
    action: str,
    verdict: str,
    risk_before: float,
    risk_after: float,
    recovery_before: float,
    recovery_after: float,
    gate_before: str,
    gate_after: str,
    confidence: float,
    outcome_result: OutcomeResult
) -> ProofCapsule:
    """Proof Capsule 생성"""
    
    # 타임스탬프
    timestamp = datetime.now(timezone.utc).isoformat()
    
    # 페이로드 해시 (원천 데이터 폐기 증명)
    payload = {
        "action": action,
        "verdict": verdict,
        "risk_before": risk_before,
        "risk_after": risk_after,
        "recovery_before": recovery_before,
        "recovery_after": recovery_after,
        "timestamp": timestamp
    }
    payload_hash = hashlib.sha256(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()[:16]
    
    # ID 생성
    capsule_id = f"PC_{timestamp[:10].replace('-', '')}_{payload_hash[:8]}"
    
    return ProofCapsule(
        id=capsule_id,
        timestamp=timestamp,
        action=action,
        verdict=verdict,
        risk_before=risk_before,
        risk_after=risk_after,
        recovery_before=recovery_before,
        recovery_after=recovery_after,
        outcome=outcome_result.outcome.value,
        reason=outcome_result.reason,
        context_tag=outcome_result.outcome.value,
        gate_before=gate_before,
        gate_after=gate_after,
        confidence=confidence,
        payload_hash=payload_hash
    )


# ═══════════════════════════════════════════════════════════════
# UI HELPERS
# ═══════════════════════════════════════════════════════════════

def get_outcome_icon(outcome: Outcome) -> str:
    """UI 아이콘"""
    icons = {
        Outcome.SUCCESS: "✓",
        Outcome.NEAR_MISS: "⚠",
        Outcome.FAILURE: "✗",
        Outcome.NEUTRAL: "○"
    }
    return icons.get(outcome, "?")


def format_log_message(
    action: str,
    outcome_result: OutcomeResult,
    timestamp: Optional[datetime] = None
) -> str:
    """ACTION LOG용 메시지 포맷"""
    ts = timestamp or datetime.now()
    time_str = ts.strftime("%H:%M:%S")
    icon = get_outcome_icon(outcome_result.outcome)
    
    reason_text = {
        "improved": "improved",
        "critical_boundary": "near boundary",
        "escaped_critical": "escaped critical",
        "risk_increased": "risk increased",
        "gate_red": "gate RED",
        "recovery_decreased": "recovery decreased",
        "no_change": "no change"
    }.get(outcome_result.reason, outcome_result.reason)
    
    return f"[{time_str}] {icon} LOCKED: {action.upper()} → {reason_text}"


# ═══════════════════════════════════════════════════════════════
# AGGREGATION
# ═══════════════════════════════════════════════════════════════

class OutcomeAggregator:
    """결과 집계"""
    
    def __init__(self):
        self.counts = {
            Outcome.SUCCESS: 0,
            Outcome.NEAR_MISS: 0,
            Outcome.FAILURE: 0,
            Outcome.NEUTRAL: 0
        }
        self.risk_deltas = []
        self.recovery_deltas = []
    
    def add(
        self,
        outcome: Outcome,
        risk_before: float,
        risk_after: float,
        recovery_before: float,
        recovery_after: float
    ):
        self.counts[outcome] += 1
        self.risk_deltas.append(risk_after - risk_before)
        self.recovery_deltas.append(recovery_after - recovery_before)
    
    def get_summary(self) -> Dict[str, Any]:
        total = sum(self.counts.values())
        failure_rate = self.counts[Outcome.FAILURE] / total if total > 0 else 0
        
        return {
            "total": total,
            "success": self.counts[Outcome.SUCCESS],
            "near_miss": self.counts[Outcome.NEAR_MISS],
            "failure": self.counts[Outcome.FAILURE],
            "neutral": self.counts[Outcome.NEUTRAL],
            "failure_rate": round(failure_rate, 4),
            "avg_risk_delta": round(sum(self.risk_deltas) / len(self.risk_deltas), 4) if self.risk_deltas else 0,
            "avg_recovery_delta": round(sum(self.recovery_deltas) / len(self.recovery_deltas), 4) if self.recovery_deltas else 0
        }
    
    def format_display(self) -> str:
        """L7 SYSTEM 표시용"""
        s = self.counts[Outcome.SUCCESS]
        n = self.counts[Outcome.NEAR_MISS]
        f = self.counts[Outcome.FAILURE]
        total = s + n + f
        rate = (f / total * 100) if total > 0 else 0
        return f"24h: ✓{s} ⚠{n} ✗{f} | fail rate: {rate:.1f}%"


# ═══════════════════════════════════════════════════════════════
# EXPORTS
# ═══════════════════════════════════════════════════════════════

__all__ = [
    "CRITICAL_THRESHOLD",
    "EPSILON",
    "Outcome",
    "Gate",
    "OutcomeResult",
    "ProofCapsule",
    "classify_outcome",
    "compute_gate",
    "should_store_proof",
    "get_retention_days",
    "create_proof_capsule",
    "get_outcome_icon",
    "format_log_message",
    "OutcomeAggregator"
]

