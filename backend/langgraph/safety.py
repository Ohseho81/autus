"""
AUTUS Safety Guard
==================
Bounded Autonomy 구현
- ΔṠ 임계값 모니터링
- Inertia Debt 관리
- Scale Lock 감지
- Human Escalation
"""

from typing import Literal
from dataclasses import dataclass
from datetime import datetime

from .state import AutusState, GateResult, SafetyStatus, WorkflowConfig


@dataclass
class SafetyCheckResult:
    """Safety 체크 결과"""
    status: SafetyStatus
    gate_result: GateResult
    gate_score: float
    reason: str
    should_continue: bool
    cooldown_seconds: float = 0


class SafetyGuard:
    """
    Safety Guard
    ============
    모든 에이전트 실행 전/후에 안전성 검사
    """
    
    def __init__(self, config: WorkflowConfig | None = None):
        self.config = config or WorkflowConfig()
    
    def check(self, state: AutusState) -> SafetyCheckResult:
        """안전성 검사"""
        
        delta_s = state.get("delta_s_dot", 0)
        inertia = state.get("inertia_debt", 0)
        scale_lock = state.get("scale_lock_violated", False)
        loop_count = state.get("loop_count", 0)
        
        # 1. Scale Lock 위반 체크 (최우선)
        if scale_lock:
            return SafetyCheckResult(
                status=SafetyStatus.HALT,
                gate_result=GateResult.LOCK,
                gate_score=10.0,
                reason="Scale Lock violated",
                should_continue=False,
            )
        
        # 2. 최대 루프 초과 체크
        if loop_count >= self.config.max_loop_count:
            return SafetyCheckResult(
                status=SafetyStatus.HALT,
                gate_result=GateResult.LOCK,
                gate_score=10.0,
                reason=f"Max loop count ({self.config.max_loop_count}) exceeded",
                should_continue=False,
            )
        
        # 3. Gate Score 계산
        gate_score = self._calculate_gate_score(delta_s, inertia)
        gate_result = self._determine_gate_result(gate_score)
        
        # 4. ΔṠ 임계값 체크
        if delta_s > self.config.delta_s_threshold:
            return SafetyCheckResult(
                status=SafetyStatus.HUMAN_ESCALATION,
                gate_result=gate_result,
                gate_score=gate_score,
                reason=f"ΔṠ ({delta_s:.2f}) > threshold ({self.config.delta_s_threshold})",
                should_continue=False,
                cooldown_seconds=300,  # 5분 쿨다운
            )
        
        # 5. Inertia Debt 체크
        if inertia > self.config.inertia_debt_threshold:
            return SafetyCheckResult(
                status=SafetyStatus.THROTTLE,
                gate_result=gate_result,
                gate_score=gate_score,
                reason=f"Inertia Debt ({inertia:.1f}) > threshold ({self.config.inertia_debt_threshold})",
                should_continue=True,  # 계속은 하되 속도 제한
                cooldown_seconds=60,
            )
        
        # 6. Gate 결과에 따른 처리
        if gate_result == GateResult.LOCK:
            return SafetyCheckResult(
                status=SafetyStatus.HALT,
                gate_result=gate_result,
                gate_score=gate_score,
                reason="Gate LOCK - action blocked",
                should_continue=False,
            )
        
        if gate_result == GateResult.BOUNCE:
            return SafetyCheckResult(
                status=SafetyStatus.THROTTLE,
                gate_result=gate_result,
                gate_score=gate_score,
                reason="Gate BOUNCE - retry with delay",
                should_continue=True,
                cooldown_seconds=30,
            )
        
        if gate_result == GateResult.RING:
            return SafetyCheckResult(
                status=SafetyStatus.CONTINUE,
                gate_result=gate_result,
                gate_score=gate_score,
                reason="Gate RING - proceed with caution",
                should_continue=True,
            )
        
        # 7. PASS
        return SafetyCheckResult(
            status=SafetyStatus.CONTINUE,
            gate_result=GateResult.PASS,
            gate_score=gate_score,
            reason="All checks passed",
            should_continue=True,
        )
    
    def _calculate_gate_score(self, delta_s: float, inertia: float) -> float:
        """Gate Score 계산 (0-10)"""
        # 가중 평균
        score = (delta_s * 5) + (inertia * 0.5)
        return min(10.0, max(0.0, score))
    
    def _determine_gate_result(self, score: float) -> GateResult:
        """Gate 결과 판정"""
        if score < self.config.gate_pass_threshold:
            return GateResult.PASS
        elif score < self.config.gate_ring_threshold:
            return GateResult.RING
        elif score < self.config.gate_bounce_threshold:
            return GateResult.BOUNCE
        else:
            return GateResult.LOCK


def check_safety(state: AutusState, config: WorkflowConfig | None = None) -> dict:
    """
    Safety Guard 노드 함수
    LangGraph 노드로 사용
    """
    guard = SafetyGuard(config)
    result = guard.check(state)
    
    return {
        "safety_status": result.status.value,
        "gate_result": result.gate_result.value,
        "gate_score": result.gate_score,
        "cooldown_remaining": result.cooldown_seconds,
        "escalation_reason": result.reason if not result.should_continue else "",
        "messages": [{
            "role": "system",
            "content": f"[Safety] {result.gate_result.value} (score: {result.gate_score:.1f}) - {result.reason}",
        }],
    }


def get_next_node(state: AutusState) -> Literal["continue", "throttle", "human_escalation", "halt"]:
    """
    Safety 결과에 따른 다음 노드 결정
    LangGraph conditional edge용
    """
    status = state.get("safety_status", "continue")
    
    if status == SafetyStatus.HALT.value:
        return "halt"
    elif status == SafetyStatus.HUMAN_ESCALATION.value:
        return "human_escalation"
    elif status == SafetyStatus.THROTTLE.value:
        return "throttle"
    else:
        return "continue"
