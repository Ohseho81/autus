"""
AUTUS Task Solution Engine
570개 업무 솔루션화 프로세스 알고리즘

4단계 파이프라인: 수집(Collection) → 재정의(Redesign) → 자동화(Automate) → 삭제화(Eliminate)
물리 엔진: K(효율) / I(상호작용) / Ω(엔트로피) 실시간 계산
"""

from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Optional
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
import json
import math


# =============================================================================
# 1. ENUMS & CONSTANTS
# =============================================================================

class TaskGroup(Enum):
    """8그룹 분류"""
    HIGH_REPEAT_STRUCTURED = "고반복_정형"
    SEMI_STRUCTURED_DOC = "반구조화_문서"
    APPROVAL_WORKFLOW = "승인_워크플로"
    CUSTOMER_SALES = "고객_영업"
    FINANCE_ACCOUNTING = "재무_회계"
    HR_PERSONNEL = "HR_인사"
    IT_OPERATIONS = "IT_운영"
    STRATEGY_JUDGMENT = "전략_판단"


class TaskLayer(Enum):
    """3대 레이어"""
    COMMON_ENGINE = "공통엔진"      # 50개 (9%)
    DOMAIN_LOGIC = "도메인로직"     # 120개 (21%)
    EDGE_CONNECTOR = "엣지커넥터"   # 400개 (70%)


class MassActionQuadrant(Enum):
    """물리적 4분면"""
    CRITICAL = "고질량_고상호"   # 핵심 전략
    HEAVY = "고질량_저상호"      # 대규모 연산
    FLUID = "저질량_고상호"      # 소통/알림
    ROUTINE = "저질량_저상호"    # 단순 반복


class TaskStatus(Enum):
    """업무 상태"""
    ACTIVE = "active"
    OPTIMIZING = "optimizing"
    DECLINING = "declining"
    ELIMINATED = "eliminated"
    MERGED = "merged"


class TriggerType(Enum):
    """트리거 유형"""
    TIME_BASED = "time"          # 날짜/주기
    EVENT_BASED = "event"        # 이벤트 발생
    CONDITION_BASED = "condition" # 조건 충족
    MANUAL = "manual"            # 수동 트리거


# =============================================================================
# 2. CORE DATA MODELS
# =============================================================================

@dataclass
class TypeParameter:
    """타입별 파라미터 세트"""
    type_code: str
    type_name: str
    parameters: dict[str, Any]
    thresholds: dict[str, float] = field(default_factory=dict)
    
    def get(self, key: str, default: Any = None) -> Any:
        return self.parameters.get(key, default)


@dataclass
class PhysicsMetrics:
    """물리 지표 (K/I/Ω)"""
    k_efficiency: float = 1.0      # K: 효율 (1.0 = 중립, >1 번영, <1 쇠퇴)
    i_interaction: float = 0.0     # I: 상호작용 강도 (-1 ~ +1)
    omega_entropy: float = 0.5     # Ω: 엔트로피 (0 = 질서, 1 = 혼란)
    
    timestamp: datetime = field(default_factory=datetime.now)
    
    @property
    def health_score(self) -> float:
        """종합 건강 점수 (0-100)"""
        k_score = min(self.k_efficiency / 2, 1) * 40  # 40점 만점
        i_score = (self.i_interaction + 1) / 2 * 30   # 30점 만점
        o_score = (1 - self.omega_entropy) * 30       # 30점 만점
        return k_score + i_score + o_score
    
    @property
    def status(self) -> TaskStatus:
        """상태 판정"""
        if self.k_efficiency < 0.3 or self.omega_entropy > 0.8:
            return TaskStatus.ELIMINATED
        elif self.k_efficiency < 0.7:
            return TaskStatus.DECLINING
        elif self.k_efficiency < 1.0:
            return TaskStatus.OPTIMIZING
        return TaskStatus.ACTIVE
    
    def should_eliminate(self) -> bool:
        return self.k_efficiency < 0.3 and self.omega_entropy > 0.7


@dataclass
class TaskDefinition:
    """업무 정의 (수집 단계 산출물)"""
    task_id: str
    task_name: str
    task_name_en: str
    
    # 분류
    group: TaskGroup
    layer: TaskLayer
    quadrant: MassActionQuadrant
    
    # 타입 분류
    types: list[TypeParameter] = field(default_factory=list)
    
    # 트리거
    trigger_type: TriggerType = TriggerType.EVENT_BASED
    trigger_conditions: list[str] = field(default_factory=list)
    
    # Input/Output
    inputs: list[str] = field(default_factory=list)
    outputs: list[str] = field(default_factory=list)
    
    # 현재 상태
    avg_duration_minutes: float = 0
    avg_cost: float = 0
    error_rate: float = 0
    
    # 물리 지표
    metrics: PhysicsMetrics = field(default_factory=PhysicsMetrics)
    metrics_history: list[PhysicsMetrics] = field(default_factory=list)


@dataclass
class AutomationPipeline:
    """자동화 파이프라인 (재정의 단계 산출물)"""
    task_id: str
    
    # Core Engine (타입 무관 공통 로직)
    core_steps: list[str] = field(default_factory=list)
    
    # K/I/Ω 계산 공식
    k_formula: str = ""
    i_formula: str = ""
    omega_formula: str = ""
    
    # 자동화 설정
    input_automation: dict[str, Any] = field(default_factory=dict)
    logic_automation: dict[str, Any] = field(default_factory=dict)
    action_automation: dict[str, Any] = field(default_factory=dict)
    feedback_automation: dict[str, Any] = field(default_factory=dict)
    
    # 삭제 조건
    elimination_conditions: list[str] = field(default_factory=list)
    elimination_method: str = ""
    empty_slot_action: str = ""


@dataclass 
class ExecutionResult:
    """실행 결과"""
    task_id: str
    execution_id: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    
    success: bool = False
    output_data: dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    
    # 측정값
    actual_duration: float = 0
    resource_used: float = 0
    quality_score: float = 0
    
    def to_metrics_input(self) -> dict:
        """물리 지표 계산용 입력 생성"""
        return {
            "duration": self.actual_duration,
            "success": self.success,
            "quality": self.quality_score,
            "resource": self.resource_used
        }


# =============================================================================
# 3. COMMON ENGINE MODULES (공통 엔진)
# =============================================================================

class CommonEngine(ABC):
    """공통 엔진 베이스 클래스"""
    
    @abstractmethod
    def execute(self, input_data: dict) -> dict:
        pass
    
    @abstractmethod
    def get_name(self) -> str:
        pass


class OCRParsingEngine(CommonEngine):
    """OCR/문서 파싱 엔진"""
    
    def get_name(self) -> str:
        return "ocr_parsing"
    
    def execute(self, input_data: dict) -> dict:
        """
        input_data: {
            "document": bytes or path,
            "document_type": "pdf" | "image" | "email",
            "extract_fields": ["field1", "field2"]
        }
        """
        # 실제 구현: AWS Textract, Google DocAI 등 연동
        return {
            "extracted_text": "",
            "structured_data": {},
            "confidence": 0.0
        }


class RuleEngine(CommonEngine):
    """규칙 엔진"""
    
    def __init__(self):
        self.rules: list[dict] = []
    
    def get_name(self) -> str:
        return "rule_engine"
    
    def add_rule(self, condition: str, action: str, priority: int = 0):
        self.rules.append({
            "condition": condition,
            "action": action,
            "priority": priority
        })
        self.rules.sort(key=lambda r: r["priority"], reverse=True)
    
    def execute(self, input_data: dict) -> dict:
        """규칙 평가 및 액션 결정"""
        matched_rules = []
        for rule in self.rules:
            if self._evaluate_condition(rule["condition"], input_data):
                matched_rules.append(rule)
        
        return {
            "matched_rules": matched_rules,
            "recommended_action": matched_rules[0]["action"] if matched_rules else None
        }
    
    def _evaluate_condition(self, condition: str, data: dict) -> bool:
        # 간단한 조건 평가 (실제로는 더 복잡한 파서 필요)
        try:
            return eval(condition, {"__builtins__": {}}, data)
        except:
            return False


class ApprovalWorkflowEngine(CommonEngine):
    """승인 워크플로 엔진"""
    
    def get_name(self) -> str:
        return "approval_workflow"
    
    def execute(self, input_data: dict) -> dict:
        """
        input_data: {
            "item_value": float,
            "item_type": str,
            "requester": str,
            "approval_matrix": {...}
        }
        """
        value = input_data.get("item_value", 0)
        matrix = input_data.get("approval_matrix", {})
        
        # 승인 레벨 결정
        approval_level = "auto"
        for threshold, level in sorted(matrix.items()):
            if value >= float(threshold):
                approval_level = level
        
        return {
            "approval_level": approval_level,
            "approvers": self._get_approvers(approval_level),
            "auto_approve": approval_level == "auto"
        }
    
    def _get_approvers(self, level: str) -> list[str]:
        # 실제 구현: 조직도 연동
        return []


class NotificationRouter(CommonEngine):
    """알림/라우팅 엔진"""
    
    def get_name(self) -> str:
        return "notification_router"
    
    def execute(self, input_data: dict) -> dict:
        """
        input_data: {
            "notification_type": "email" | "slack" | "sms" | "push",
            "recipients": [...],
            "message": str,
            "priority": "low" | "normal" | "high" | "urgent"
        }
        """
        return {
            "sent": True,
            "channel": input_data.get("notification_type"),
            "recipient_count": len(input_data.get("recipients", []))
        }


class MLScoringEngine(CommonEngine):
    """ML 스코어링 엔진"""
    
    def get_name(self) -> str:
        return "ml_scoring"
    
    def execute(self, input_data: dict) -> dict:
        """
        input_data: {
            "model_type": "lead_scoring" | "classification" | "prediction",
            "features": {...},
            "model_id": str
        }
        """
        # 실제 구현: MLflow, SageMaker 등 연동
        return {
            "score": 0.0,
            "confidence": 0.0,
            "factors": []
        }


class SLATimerEngine(CommonEngine):
    """SLA 타이머 엔진"""
    
    def get_name(self) -> str:
        return "sla_timer"
    
    def execute(self, input_data: dict) -> dict:
        """
        input_data: {
            "sla_hours": float,
            "started_at": datetime,
            "priority": str
        }
        """
        started = input_data.get("started_at", datetime.now())
        sla_hours = input_data.get("sla_hours", 24)
        deadline = started + timedelta(hours=sla_hours)
        
        remaining = (deadline - datetime.now()).total_seconds() / 3600
        
        return {
            "deadline": deadline.isoformat(),
            "remaining_hours": max(0, remaining),
            "breached": remaining < 0,
            "urgency": "critical" if remaining < 1 else "warning" if remaining < 4 else "normal"
        }


class FeedbackLoopEngine(CommonEngine):
    """피드백 루프 엔진"""
    
    def get_name(self) -> str:
        return "feedback_loop"
    
    def execute(self, input_data: dict) -> dict:
        """
        input_data: {
            "execution_result": ExecutionResult,
            "expected_metrics": {...},
            "actual_metrics": {...}
        }
        """
        expected = input_data.get("expected_metrics", {})
        actual = input_data.get("actual_metrics", {})
        
        # 편차 계산
        deviations = {}
        for key in expected:
            if key in actual:
                deviations[key] = actual[key] - expected[key]
        
        # 조정 제안
        adjustments = self._calculate_adjustments(deviations)
        
        return {
            "deviations": deviations,
            "adjustments": adjustments,
            "requires_attention": any(abs(d) > 0.2 for d in deviations.values())
        }
    
    def _calculate_adjustments(self, deviations: dict) -> dict:
        adjustments = {}
        for key, deviation in deviations.items():
            if abs(deviation) > 0.1:
                adjustments[key] = -deviation * 0.5  # 50% 보정
        return adjustments


# =============================================================================
# 4. PHYSICS ENGINE (물리 엔진)
# =============================================================================

class PhysicsEngine:
    """K/I/Ω 물리 엔진"""
    
    def calculate_k(self, 
                    actual_output: float,
                    expected_output: float,
                    resource_input: float,
                    time_input: float) -> float:
        """
        K = (실제 산출 / 예상 산출) × (1 / 자원 투입) × (1 / 시간 투입)
        K > 1: 번영 (효율 증가)
        K < 1: 쇠퇴 (효율 감소)
        """
        if expected_output == 0 or resource_input == 0 or time_input == 0:
            return 1.0
        
        output_ratio = actual_output / expected_output
        resource_efficiency = 1 / (resource_input + 0.01)
        time_efficiency = 1 / (time_input + 0.01)
        
        # 정규화 (0.1 ~ 3.0 범위)
        k = output_ratio * math.sqrt(resource_efficiency * time_efficiency)
        return max(0.1, min(3.0, k))
    
    def calculate_i(self,
                    response_rate: float,
                    cycle_time: float,
                    collaboration_score: float) -> float:
        """
        I = 상호작용 강도
        I > 0: 시너지 (협력적)
        I < 0: 마찰 (비협력적)
        """
        # 응답률: 0-1
        # 사이클 타임: 낮을수록 좋음 (역수 사용)
        # 협업 점수: -1 ~ +1
        
        time_factor = 1 / (cycle_time + 1)
        i = (response_rate * 0.4 + time_factor * 0.3 + (collaboration_score + 1) / 2 * 0.3) * 2 - 1
        return max(-1.0, min(1.0, i))
    
    def calculate_omega(self,
                        error_count: int,
                        backlog_count: int,
                        rework_count: int,
                        total_volume: int) -> float:
        """
        Ω = 엔트로피 (혼란도)
        Ω → 0: 질서 (안정)
        Ω → 1: 혼란 (불안정)
        """
        if total_volume == 0:
            return 0.5
        
        error_rate = error_count / total_volume
        backlog_rate = backlog_count / (total_volume + 1)
        rework_rate = rework_count / total_volume
        
        omega = (error_rate * 0.4 + backlog_rate * 0.35 + rework_rate * 0.25)
        return max(0.0, min(1.0, omega))
    
    def update_metrics(self, 
                       current: PhysicsMetrics,
                       execution_result: ExecutionResult,
                       context: dict) -> PhysicsMetrics:
        """실행 결과로 메트릭 업데이트"""
        
        # K 계산
        new_k = self.calculate_k(
            actual_output=context.get("actual_output", 1),
            expected_output=context.get("expected_output", 1),
            resource_input=execution_result.resource_used,
            time_input=execution_result.actual_duration
        )
        
        # I 계산
        new_i = self.calculate_i(
            response_rate=context.get("response_rate", 0.5),
            cycle_time=context.get("cycle_time", 1),
            collaboration_score=context.get("collaboration_score", 0)
        )
        
        # Ω 계산
        new_omega = self.calculate_omega(
            error_count=context.get("error_count", 0),
            backlog_count=context.get("backlog_count", 0),
            rework_count=context.get("rework_count", 0),
            total_volume=context.get("total_volume", 1)
        )
        
        # 지수이동평균 적용 (α = 0.3)
        alpha = 0.3
        return PhysicsMetrics(
            k_efficiency=alpha * new_k + (1 - alpha) * current.k_efficiency,
            i_interaction=alpha * new_i + (1 - alpha) * current.i_interaction,
            omega_entropy=alpha * new_omega + (1 - alpha) * current.omega_entropy,
            timestamp=datetime.now()
        )


# =============================================================================
# 5. FOUR-STAGE PIPELINE (4단계 파이프라인)
# =============================================================================

class Stage1_Collection:
    """1단계: 수집 (Discovery & Aggregation)"""
    
    def __init__(self):
        self.tasks: dict[str, TaskDefinition] = {}
    
    def collect_task(self, 
                     task_id: str,
                     task_name: str,
                     task_name_en: str,
                     group: TaskGroup,
                     layer: TaskLayer,
                     types: list[dict],
                     trigger_type: TriggerType,
                     trigger_conditions: list[str],
                     inputs: list[str],
                     outputs: list[str],
                     current_metrics: dict) -> TaskDefinition:
        """업무 수집 및 정의"""
        
        # 4분면 자동 분류
        quadrant = self._classify_quadrant(group, layer)
        
        # 타입 파라미터 생성
        type_params = [
            TypeParameter(
                type_code=t["code"],
                type_name=t["name"],
                parameters=t.get("params", {}),
                thresholds=t.get("thresholds", {})
            ) for t in types
        ]
        
        task = TaskDefinition(
            task_id=task_id,
            task_name=task_name,
            task_name_en=task_name_en,
            group=group,
            layer=layer,
            quadrant=quadrant,
            types=type_params,
            trigger_type=trigger_type,
            trigger_conditions=trigger_conditions,
            inputs=inputs,
            outputs=outputs,
            avg_duration_minutes=current_metrics.get("duration", 0),
            avg_cost=current_metrics.get("cost", 0),
            error_rate=current_metrics.get("error_rate", 0)
        )
        
        self.tasks[task_id] = task
        return task
    
    def _classify_quadrant(self, group: TaskGroup, layer: TaskLayer) -> MassActionQuadrant:
        """그룹과 레이어로 4분면 분류"""
        
        # 매핑 로직
        if layer == TaskLayer.DOMAIN_LOGIC:
            if group in [TaskGroup.STRATEGY_JUDGMENT, TaskGroup.FINANCE_ACCOUNTING]:
                return MassActionQuadrant.CRITICAL
            return MassActionQuadrant.HEAVY
        elif layer == TaskLayer.COMMON_ENGINE:
            return MassActionQuadrant.HEAVY
        else:  # EDGE_CONNECTOR
            if group in [TaskGroup.CUSTOMER_SALES, TaskGroup.APPROVAL_WORKFLOW]:
                return MassActionQuadrant.FLUID
            return MassActionQuadrant.ROUTINE
    
    def get_all_tasks(self) -> list[TaskDefinition]:
        return list(self.tasks.values())
    
    def export_to_json(self) -> str:
        """JSON 내보내기"""
        return json.dumps(
            {tid: self._task_to_dict(t) for tid, t in self.tasks.items()},
            ensure_ascii=False,
            indent=2
        )
    
    def _task_to_dict(self, task: TaskDefinition) -> dict:
        return {
            "task_id": task.task_id,
            "task_name": task.task_name,
            "task_name_en": task.task_name_en,
            "group": task.group.value,
            "layer": task.layer.value,
            "quadrant": task.quadrant.value,
            "types": [{"code": t.type_code, "name": t.type_name, "params": t.parameters} 
                      for t in task.types],
            "trigger_type": task.trigger_type.value,
            "inputs": task.inputs,
            "outputs": task.outputs
        }


class Stage2_Redesign:
    """2단계: 재정의 (Analysis & Redesign)"""
    
    def __init__(self, common_engines: dict[str, CommonEngine]):
        self.engines = common_engines
        self.pipelines: dict[str, AutomationPipeline] = {}
    
    def redesign_task(self, task: TaskDefinition) -> AutomationPipeline:
        """업무 재정의 및 파이프라인 설계"""
        
        # Core Engine 단계 생성
        core_steps = self._generate_core_steps(task)
        
        # K/I/Ω 공식 정의
        k_formula = self._generate_k_formula(task)
        i_formula = self._generate_i_formula(task)
        omega_formula = self._generate_omega_formula(task)
        
        # 자동화 설정 생성
        input_auto = self._design_input_automation(task)
        logic_auto = self._design_logic_automation(task)
        action_auto = self._design_action_automation(task)
        feedback_auto = self._design_feedback_automation(task)
        
        # 삭제 조건 정의
        elim_conditions = self._define_elimination_conditions(task)
        
        pipeline = AutomationPipeline(
            task_id=task.task_id,
            core_steps=core_steps,
            k_formula=k_formula,
            i_formula=i_formula,
            omega_formula=omega_formula,
            input_automation=input_auto,
            logic_automation=logic_auto,
            action_automation=action_auto,
            feedback_automation=feedback_auto,
            elimination_conditions=elim_conditions,
            elimination_method=self._determine_elimination_method(task),
            empty_slot_action=self._determine_empty_slot_action(task)
        )
        
        self.pipelines[task.task_id] = pipeline
        return pipeline
    
    def _generate_core_steps(self, task: TaskDefinition) -> list[str]:
        """공통 로직 단계 생성"""
        steps = ["trigger_detect"]
        
        # 그룹별 핵심 단계 추가
        group_steps = {
            TaskGroup.HIGH_REPEAT_STRUCTURED: ["data_extract", "validate", "process", "store"],
            TaskGroup.SEMI_STRUCTURED_DOC: ["ocr_parse", "structure", "validate", "extract"],
            TaskGroup.APPROVAL_WORKFLOW: ["validate", "policy_check", "route_approval", "execute"],
            TaskGroup.CUSTOMER_SALES: ["enrich", "score", "route", "engage"],
            TaskGroup.FINANCE_ACCOUNTING: ["validate", "calculate", "reconcile", "post"],
            TaskGroup.HR_PERSONNEL: ["validate", "checklist", "provision", "notify"],
            TaskGroup.IT_OPERATIONS: ["classify", "prioritize", "route", "monitor"],
            TaskGroup.STRATEGY_JUDGMENT: ["analyze", "model", "recommend", "present"]
        }
        
        steps.extend(group_steps.get(task.group, ["process"]))
        steps.append("feedback_capture")
        
        return steps
    
    def _generate_k_formula(self, task: TaskDefinition) -> str:
        """K 계산 공식 생성"""
        formulas = {
            TaskGroup.HIGH_REPEAT_STRUCTURED: "completed_count / input_time * (1 - error_rate)",
            TaskGroup.SEMI_STRUCTURED_DOC: "processed_docs / review_time * accuracy",
            TaskGroup.APPROVAL_WORKFLOW: "approved_count / total_time * compliance_rate",
            TaskGroup.CUSTOMER_SALES: "converted / scored * avg_deal_value",
            TaskGroup.FINANCE_ACCOUNTING: "collected / billed * (1 / dso_normalized)",
            TaskGroup.HR_PERSONNEL: "onboarded / total_time * satisfaction",
            TaskGroup.IT_OPERATIONS: "sla_met / total_tickets * (1 / avg_resolution)",
            TaskGroup.STRATEGY_JUDGMENT: "accepted / proposed * margin_impact"
        }
        return formulas.get(task.group, "output / input")
    
    def _generate_i_formula(self, task: TaskDefinition) -> str:
        """I 계산 공식 생성"""
        return "response_rate * (1 / cycle_time) * collaboration_score"
    
    def _generate_omega_formula(self, task: TaskDefinition) -> str:
        """Ω 계산 공식 생성"""
        return "(error_rate * 0.4) + (backlog_rate * 0.35) + (rework_rate * 0.25)"
    
    def _design_input_automation(self, task: TaskDefinition) -> dict:
        """입력 자동화 설계"""
        return {
            "source": "webhook" if task.trigger_type == TriggerType.EVENT_BASED else "scheduler",
            "parser": "ocr" if task.layer == TaskLayer.EDGE_CONNECTOR else "structured",
            "validation": "schema_based"
        }
    
    def _design_logic_automation(self, task: TaskDefinition) -> dict:
        """로직 자동화 설계"""
        needs_ml = task.group in [TaskGroup.CUSTOMER_SALES, TaskGroup.IT_OPERATIONS, TaskGroup.STRATEGY_JUDGMENT]
        return {
            "engine": "ml_hybrid" if needs_ml else "rule_based",
            "fallback": "human_review",
            "confidence_threshold": 0.8
        }
    
    def _design_action_automation(self, task: TaskDefinition) -> dict:
        """액션 자동화 설계"""
        return {
            "execution_mode": "auto" if task.quadrant == MassActionQuadrant.ROUTINE else "supervised",
            "notification": ["email", "slack"],
            "retry_policy": {"max_retries": 3, "backoff": "exponential"}
        }
    
    def _design_feedback_automation(self, task: TaskDefinition) -> dict:
        """피드백 자동화 설계"""
        return {
            "collection_interval": "per_execution",
            "metrics_update": "exponential_moving_average",
            "alert_threshold": {"k": 0.5, "omega": 0.7},
            "retraining_trigger": "weekly"
        }
    
    def _define_elimination_conditions(self, task: TaskDefinition) -> list[str]:
        """삭제 조건 정의"""
        return [
            "k_efficiency < 0.3 for 5 consecutive cycles",
            "omega_entropy > 0.8 for 3 consecutive cycles",
            "i_interaction < -0.5 sustained"
        ]
    
    def _determine_elimination_method(self, task: TaskDefinition) -> str:
        """삭제 방식 결정"""
        methods = {
            MassActionQuadrant.ROUTINE: "auto_deprecate",
            MassActionQuadrant.FLUID: "merge_into_parent",
            MassActionQuadrant.HEAVY: "simplify_or_outsource",
            MassActionQuadrant.CRITICAL: "human_review_required"
        }
        return methods.get(task.quadrant, "manual")
    
    def _determine_empty_slot_action(self, task: TaskDefinition) -> str:
        """빈 슬롯 처리 방식 결정"""
        return "reallocate_to_high_k_tasks"


class Stage3_Automate:
    """3단계: 자동화 (Execute & Monitor)"""
    
    def __init__(self, 
                 common_engines: dict[str, CommonEngine],
                 physics_engine: PhysicsEngine):
        self.engines = common_engines
        self.physics = physics_engine
        self.execution_history: list[ExecutionResult] = []
    
    def execute_task(self, 
                     task: TaskDefinition,
                     pipeline: AutomationPipeline,
                     input_data: dict,
                     type_code: str) -> ExecutionResult:
        """업무 실행"""
        
        execution_id = f"{task.task_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        started_at = datetime.now()
        
        try:
            # 타입 파라미터 로드
            type_param = next((t for t in task.types if t.type_code == type_code), None)
            if not type_param:
                raise ValueError(f"Unknown type: {type_code}")
            
            # Core 단계 실행
            result_data = input_data.copy()
            for step in pipeline.core_steps:
                result_data = self._execute_step(step, result_data, type_param)
            
            result = ExecutionResult(
                task_id=task.task_id,
                execution_id=execution_id,
                started_at=started_at,
                completed_at=datetime.now(),
                success=True,
                output_data=result_data,
                actual_duration=(datetime.now() - started_at).total_seconds() / 60,
                quality_score=result_data.get("quality_score", 1.0)
            )
            
        except Exception as e:
            result = ExecutionResult(
                task_id=task.task_id,
                execution_id=execution_id,
                started_at=started_at,
                completed_at=datetime.now(),
                success=False,
                error_message=str(e)
            )
        
        self.execution_history.append(result)
        return result
    
    def _execute_step(self, step: str, data: dict, type_param: TypeParameter) -> dict:
        """개별 단계 실행"""
        
        # 단계별 엔진 매핑
        step_engine_map = {
            "trigger_detect": None,  # 이미 트리거됨
            "ocr_parse": "ocr_parsing",
            "data_extract": "ocr_parsing",
            "validate": "rule_engine",
            "policy_check": "rule_engine",
            "structure": "rule_engine",
            "extract": "ocr_parsing",
            "route_approval": "approval_workflow",
            "route": "notification_router",
            "score": "ml_scoring",
            "enrich": None,
            "classify": "ml_scoring",
            "prioritize": "rule_engine",
            "calculate": "rule_engine",
            "reconcile": "rule_engine",
            "post": None,
            "checklist": "rule_engine",
            "provision": None,
            "notify": "notification_router",
            "monitor": "sla_timer",
            "analyze": "ml_scoring",
            "model": "ml_scoring",
            "recommend": "ml_scoring",
            "present": None,
            "process": "rule_engine",
            "store": None,
            "execute": None,
            "engage": "notification_router",
            "feedback_capture": "feedback_loop"
        }
        
        engine_name = step_engine_map.get(step)
        if engine_name and engine_name in self.engines:
            engine_result = self.engines[engine_name].execute(data)
            data.update(engine_result)
        
        data["last_step"] = step
        return data
    
    def update_task_metrics(self, 
                            task: TaskDefinition,
                            result: ExecutionResult,
                            context: dict) -> PhysicsMetrics:
        """실행 결과로 메트릭 업데이트"""
        
        new_metrics = self.physics.update_metrics(
            current=task.metrics,
            execution_result=result,
            context=context
        )
        
        # 히스토리 저장
        task.metrics_history.append(task.metrics)
        task.metrics = new_metrics
        
        return new_metrics


class Stage4_Eliminate:
    """4단계: 삭제화 (Eliminate & Iterate)"""
    
    def __init__(self):
        self.elimination_log: list[dict] = []
    
    def evaluate_elimination(self, 
                             task: TaskDefinition,
                             pipeline: AutomationPipeline) -> dict:
        """삭제 필요성 평가"""
        
        metrics = task.metrics
        
        # 조건 체크
        should_eliminate = False
        reasons = []
        
        if metrics.k_efficiency < 0.3:
            should_eliminate = True
            reasons.append(f"K={metrics.k_efficiency:.2f} < 0.3")
        
        if metrics.omega_entropy > 0.8:
            should_eliminate = True
            reasons.append(f"Ω={metrics.omega_entropy:.2f} > 0.8")
        
        if metrics.i_interaction < -0.5:
            should_eliminate = True
            reasons.append(f"I={metrics.i_interaction:.2f} < -0.5")
        
        return {
            "task_id": task.task_id,
            "should_eliminate": should_eliminate,
            "reasons": reasons,
            "method": pipeline.elimination_method if should_eliminate else None,
            "empty_slot_action": pipeline.empty_slot_action if should_eliminate else None,
            "current_metrics": {
                "k": metrics.k_efficiency,
                "i": metrics.i_interaction,
                "omega": metrics.omega_entropy
            }
        }
    
    def execute_elimination(self, 
                            task: TaskDefinition,
                            evaluation: dict) -> dict:
        """삭제 실행"""
        
        if not evaluation["should_eliminate"]:
            return {"status": "skipped", "reason": "elimination not required"}
        
        method = evaluation["method"]
        
        if method == "auto_deprecate":
            result = self._auto_deprecate(task)
        elif method == "merge_into_parent":
            result = self._merge_into_parent(task)
        elif method == "simplify_or_outsource":
            result = self._simplify_or_outsource(task)
        else:
            result = {"status": "pending_review", "requires_human": True}
        
        # 로그 기록
        log_entry = {
            "task_id": task.task_id,
            "method": method,
            "result": result,
            "timestamp": datetime.now().isoformat(),
            "metrics_at_elimination": evaluation["current_metrics"]
        }
        self.elimination_log.append(log_entry)
        
        return result
    
    def _auto_deprecate(self, task: TaskDefinition) -> dict:
        """자동 폐기"""
        task.metrics = PhysicsMetrics(k_efficiency=0, i_interaction=0, omega_entropy=1)
        return {"status": "deprecated", "task_id": task.task_id}
    
    def _merge_into_parent(self, task: TaskDefinition) -> dict:
        """상위 업무로 병합"""
        return {"status": "merged", "task_id": task.task_id, "merge_target": "parent_task"}
    
    def _simplify_or_outsource(self, task: TaskDefinition) -> dict:
        """간소화 또는 외부 위임"""
        return {"status": "simplified", "task_id": task.task_id, "action": "outsource_candidate"}
    
    def suggest_reallocation(self, 
                             eliminated_tasks: list[TaskDefinition],
                             active_tasks: list[TaskDefinition]) -> list[dict]:
        """빈 슬롯 재배치 제안"""
        
        # K값 기준 상위 업무에 리소스 재배치
        sorted_active = sorted(active_tasks, key=lambda t: t.metrics.k_efficiency, reverse=True)
        
        suggestions = []
        for elim_task in eliminated_tasks:
            if sorted_active:
                target = sorted_active[0]
                suggestions.append({
                    "from_task": elim_task.task_id,
                    "to_task": target.task_id,
                    "reason": f"Reallocate to high-K task (K={target.metrics.k_efficiency:.2f})"
                })
        
        return suggestions


# =============================================================================
# 6. MASTER ORCHESTRATOR (마스터 오케스트레이터)
# =============================================================================

class TaskSolutionEngine:
    """570개 업무 솔루션 마스터 엔진"""
    
    def __init__(self):
        # 공통 엔진 초기화
        self.common_engines = {
            "ocr_parsing": OCRParsingEngine(),
            "rule_engine": RuleEngine(),
            "approval_workflow": ApprovalWorkflowEngine(),
            "notification_router": NotificationRouter(),
            "ml_scoring": MLScoringEngine(),
            "sla_timer": SLATimerEngine(),
            "feedback_loop": FeedbackLoopEngine()
        }
        
        # 물리 엔진
        self.physics = PhysicsEngine()
        
        # 4단계 파이프라인
        self.stage1 = Stage1_Collection()
        self.stage2 = Stage2_Redesign(self.common_engines)
        self.stage3 = Stage3_Automate(self.common_engines, self.physics)
        self.stage4 = Stage4_Eliminate()
        
        # 저장소
        self.tasks: dict[str, TaskDefinition] = {}
        self.pipelines: dict[str, AutomationPipeline] = {}
    
    def register_task(self, task_config: dict) -> TaskDefinition:
        """업무 등록 (Stage 1)"""
        task = self.stage1.collect_task(
            task_id=task_config["task_id"],
            task_name=task_config["task_name"],
            task_name_en=task_config["task_name_en"],
            group=TaskGroup(task_config["group"]),
            layer=TaskLayer(task_config["layer"]),
            types=task_config.get("types", []),
            trigger_type=TriggerType(task_config.get("trigger_type", "event")),
            trigger_conditions=task_config.get("trigger_conditions", []),
            inputs=task_config.get("inputs", []),
            outputs=task_config.get("outputs", []),
            current_metrics=task_config.get("current_metrics", {})
        )
        
        self.tasks[task.task_id] = task
        return task
    
    def design_automation(self, task_id: str) -> AutomationPipeline:
        """자동화 설계 (Stage 2)"""
        task = self.tasks.get(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")
        
        pipeline = self.stage2.redesign_task(task)
        self.pipelines[task_id] = pipeline
        return pipeline
    
    def execute(self, task_id: str, input_data: dict, type_code: str) -> ExecutionResult:
        """실행 (Stage 3)"""
        task = self.tasks.get(task_id)
        pipeline = self.pipelines.get(task_id)
        
        if not task or not pipeline:
            raise ValueError(f"Task or pipeline not found: {task_id}")
        
        return self.stage3.execute_task(task, pipeline, input_data, type_code)
    
    def evaluate_health(self, task_id: str) -> dict:
        """건강 상태 평가"""
        task = self.tasks.get(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")
        
        return {
            "task_id": task_id,
            "health_score": task.metrics.health_score,
            "status": task.metrics.status.value,
            "metrics": {
                "k": task.metrics.k_efficiency,
                "i": task.metrics.i_interaction,
                "omega": task.metrics.omega_entropy
            }
        }
    
    def run_elimination_cycle(self) -> list[dict]:
        """삭제 사이클 실행 (Stage 4)"""
        results = []
        
        for task_id, task in self.tasks.items():
            pipeline = self.pipelines.get(task_id)
            if not pipeline:
                continue
            
            evaluation = self.stage4.evaluate_elimination(task, pipeline)
            
            if evaluation["should_eliminate"]:
                result = self.stage4.execute_elimination(task, evaluation)
                results.append({
                    "task_id": task_id,
                    "evaluation": evaluation,
                    "result": result
                })
        
        return results
    
    def get_dashboard_data(self) -> dict:
        """대시보드 데이터"""
        total = len(self.tasks)
        
        if total == 0:
            return {"total": 0, "by_status": {}, "by_group": {}, "avg_metrics": {}}
        
        by_status = {}
        by_group = {}
        k_sum = i_sum = omega_sum = 0
        
        for task in self.tasks.values():
            # 상태별
            status = task.metrics.status.value
            by_status[status] = by_status.get(status, 0) + 1
            
            # 그룹별
            group = task.group.value
            by_group[group] = by_group.get(group, 0) + 1
            
            # 메트릭 합계
            k_sum += task.metrics.k_efficiency
            i_sum += task.metrics.i_interaction
            omega_sum += task.metrics.omega_entropy
        
        return {
            "total": total,
            "by_status": by_status,
            "by_group": by_group,
            "avg_metrics": {
                "k": k_sum / total,
                "i": i_sum / total,
                "omega": omega_sum / total
            }
        }
    
    def export_all(self) -> str:
        """전체 내보내기"""
        export_data = {
            "tasks": {tid: self.stage1._task_to_dict(t) for tid, t in self.tasks.items()},
            "dashboard": self.get_dashboard_data(),
            "elimination_log": self.stage4.elimination_log
        }
        return json.dumps(export_data, ensure_ascii=False, indent=2)


# =============================================================================
# 7. SAMPLE USAGE & TESTING
# =============================================================================

def create_sample_tasks() -> TaskSolutionEngine:
    """샘플 업무 생성"""
    
    engine = TaskSolutionEngine()
    
    # 8개 대표 업무 등록
    sample_tasks = [
        {
            "task_id": "TASK_001",
            "task_name": "송장 처리",
            "task_name_en": "Invoice Processing",
            "group": "고반복_정형",
            "layer": "엣지커넥터",
            "trigger_type": "event",
            "types": [
                {"code": "A", "name": "단순전달형", "params": {"validation": "skip", "approval": "auto", "threshold": 500}},
                {"code": "B", "name": "검증형", "params": {"validation": "po_match", "approval": "auto_if_match", "tolerance": 0.02}},
                {"code": "C", "name": "다중승인형", "params": {"validation": "po_match", "approval": "multi_level"}}
            ],
            "inputs": ["invoice_document", "po_data", "vendor_info"],
            "outputs": ["payment_request", "accounting_entry"],
            "current_metrics": {"duration": 20, "cost": 15, "error_rate": 0.04}
        },
        {
            "task_id": "TASK_002",
            "task_name": "계약서 검토",
            "task_name_en": "Contract Review",
            "group": "반구조화_문서",
            "layer": "도메인로직",
            "trigger_type": "event",
            "types": [
                {"code": "A", "name": "표준계약", "params": {"depth": "shallow", "auto_approve": 0.9}},
                {"code": "B", "name": "상대방양식", "params": {"depth": "deep", "flag_nonstandard": True}},
                {"code": "C", "name": "협상계약", "params": {"depth": "full", "version_control": True}},
                {"code": "D", "name": "갱신계약", "params": {"depth": "diff_only"}}
            ],
            "inputs": ["contract_document", "previous_contracts", "negotiation_terms"],
            "outputs": ["approval_status", "risk_report"],
            "current_metrics": {"duration": 180, "cost": 200, "error_rate": 0.02}
        },
        {
            "task_id": "TASK_003",
            "task_name": "경비 승인",
            "task_name_en": "Expense Approval",
            "group": "승인_워크플로",
            "layer": "엣지커넥터",
            "trigger_type": "event",
            "types": [
                {"code": "A", "name": "소액정기", "params": {"limit": 50, "approval": "auto", "monthly_cap": 500}},
                {"code": "B", "name": "출장경비", "params": {"limit": "policy", "approval": "manager", "pre_approval": True}},
                {"code": "C", "name": "프로젝트경비", "params": {"limit": "budget_pct", "approval": "pm"}},
                {"code": "D", "name": "예외경비", "params": {"limit": None, "approval": "l2_plus", "justification": "required"}}
            ],
            "inputs": ["receipt", "expense_reason", "project_code", "budget_balance"],
            "outputs": ["approval_status", "reimbursement_request"],
            "current_metrics": {"duration": 10, "cost": 8, "error_rate": 0.08}
        },
        {
            "task_id": "TASK_004",
            "task_name": "리드 스코어링",
            "task_name_en": "Lead Scoring",
            "group": "고객_영업",
            "layer": "도메인로직",
            "trigger_type": "event",
            "types": [
                {"code": "A", "name": "인바운드", "params": {"weight_behavior": 0.6, "weight_firmographic": 0.4, "threshold": 70}},
                {"code": "B", "name": "아웃바운드", "params": {"weight_response": 0.7, "weight_firmographic": 0.3, "threshold": 50}},
                {"code": "C", "name": "레퍼럴", "params": {"weight_referrer": 0.5, "weight_firmographic": 0.5, "threshold": 60}},
                {"code": "D", "name": "리사이클", "params": {"weight_reactivation": 0.8, "weight_history": 0.2, "threshold": 40}}
            ],
            "inputs": ["contact_info", "behavior_data", "firmographic_data", "history"],
            "outputs": ["score", "grade", "assigned_rep", "next_action"],
            "current_metrics": {"duration": 5, "cost": 3, "error_rate": 0.15}
        },
        {
            "task_id": "TASK_005",
            "task_name": "청구/수금",
            "task_name_en": "Billing & Collection",
            "group": "재무_회계",
            "layer": "도메인로직",
            "trigger_type": "event",
            "types": [
                {"code": "A", "name": "단건형", "params": {"trigger": "event", "reminder_days": [7, 14, 30], "escalation": "negotiation"}},
                {"code": "B", "name": "구독형", "params": {"trigger": "monthly", "reminder_days": [3, 7], "escalation": "churn_warning"}},
                {"code": "C", "name": "사용량형", "params": {"trigger": "cutoff", "reminder_days": [5, 10], "escalation": "service_limit"}},
                {"code": "D", "name": "마일스톤형", "params": {"trigger": "milestone", "reminder_days": [0, 7], "escalation": "work_stop"}}
            ],
            "inputs": ["contract_terms", "delivery_data", "customer_info", "payment_method"],
            "outputs": ["invoice", "collection_status", "ar_report"],
            "current_metrics": {"duration": 30, "cost": 25, "error_rate": 0.05}
        },
        {
            "task_id": "TASK_006",
            "task_name": "온보딩",
            "task_name_en": "Employee Onboarding",
            "group": "HR_인사",
            "layer": "도메인로직",
            "trigger_type": "event",
            "types": [
                {"code": "A", "name": "정규직", "params": {"docs": "full", "accounts": "all", "equipment": "full", "training_days": 5}},
                {"code": "B", "name": "계약직", "params": {"docs": "essential", "accounts": "limited", "equipment": "minimal", "training_days": 2}},
                {"code": "C", "name": "인턴", "params": {"docs": "essential", "accounts": "limited", "equipment": "shared", "training_days": 3}},
                {"code": "D", "name": "원격", "params": {"docs": "esign", "accounts": "cloud_only", "equipment": "ship", "training_days": "async"}}
            ],
            "inputs": ["employee_info", "department", "role", "equipment_request"],
            "outputs": ["accounts_created", "equipment_assigned", "training_completed", "first_task"],
            "current_metrics": {"duration": 480, "cost": 500, "error_rate": 0.10}
        },
        {
            "task_id": "TASK_007",
            "task_name": "티켓 라우팅",
            "task_name_en": "Ticket Routing",
            "group": "IT_운영",
            "layer": "엣지커넥터",
            "trigger_type": "event",
            "types": [
                {"code": "A", "name": "IT헬프데스크", "params": {"categories": ["system", "network", "account", "other"], "sla_hours": [4, 8, 24, 48]}},
                {"code": "B", "name": "고객지원", "params": {"categories": ["technical", "billing", "general", "complaint"], "sla_hours": [1, 4, 24, 24]}},
                {"code": "C", "name": "버그이슈", "params": {"categories": ["critical", "major", "minor"], "sla_hours": [2, 8, "sprint"]}},
                {"code": "D", "name": "시설총무", "params": {"categories": ["urgent", "normal", "scheduled"], "sla_hours": [2, 24, "scheduled"]}}
            ],
            "inputs": ["ticket_content", "requester_info", "urgency", "category"],
            "outputs": ["assigned_agent", "estimated_resolution", "escalation_path"],
            "current_metrics": {"duration": 5, "cost": 4, "error_rate": 0.20}
        },
        {
            "task_id": "TASK_008",
            "task_name": "가격 책정",
            "task_name_en": "Pricing Decision",
            "group": "전략_판단",
            "layer": "도메인로직",
            "trigger_type": "event",
            "types": [
                {"code": "A", "name": "표준가격", "params": {"basis": "cost_plus", "adjustment": "quarterly", "approval": "auto"}},
                {"code": "B", "name": "견적가격", "params": {"basis": "value_based", "adjustment": "per_deal", "approval": "sales_manager"}},
                {"code": "C", "name": "동적가격", "params": {"basis": "algorithm", "adjustment": "realtime", "approval": "within_range"}},
                {"code": "D", "name": "번들할인", "params": {"basis": "anchor_discount", "adjustment": "per_campaign", "approval": "marketing"}}
            ],
            "inputs": ["cost_data", "competitor_prices", "customer_segment", "demand_data"],
            "outputs": ["proposed_price", "margin_analysis", "approval_request"],
            "current_metrics": {"duration": 60, "cost": 80, "error_rate": 0.12}
        }
    ]
    
    # 등록 및 파이프라인 설계
    for task_config in sample_tasks:
        task = engine.register_task(task_config)
        engine.design_automation(task.task_id)
        print(f"✓ Registered: {task.task_id} - {task.task_name}")
    
    return engine


if __name__ == "__main__":
    print("=" * 60)
    print("AUTUS Task Solution Engine")
    print("570개 업무 솔루션화 프로세스")
    print("=" * 60)
    
    # 엔진 초기화 및 샘플 업무 생성
    engine = create_sample_tasks()
    
    print("\n" + "=" * 60)
    print("Dashboard Data")
    print("=" * 60)
    
    dashboard = engine.get_dashboard_data()
    print(f"Total Tasks: {dashboard['total']}")
    print(f"By Status: {dashboard['by_status']}")
    print(f"By Group: {dashboard['by_group']}")
    print(f"Avg Metrics: K={dashboard['avg_metrics']['k']:.2f}, I={dashboard['avg_metrics']['i']:.2f}, Ω={dashboard['avg_metrics']['omega']:.2f}")
    
    print("\n" + "=" * 60)
    print("Sample Execution: Invoice Processing (Type A)")
    print("=" * 60)
    
    # 샘플 실행
    result = engine.execute(
        task_id="TASK_001",
        input_data={
            "invoice_document": "sample_invoice.pdf",
            "po_data": {"po_number": "PO-001", "amount": 1000},
            "vendor_info": {"name": "Vendor A", "id": "V001"}
        },
        type_code="A"
    )
    
    print(f"Execution ID: {result.execution_id}")
    print(f"Success: {result.success}")
    print(f"Duration: {result.actual_duration:.2f} min")
    
    # 건강 상태 체크
    health = engine.evaluate_health("TASK_001")
    print(f"\nHealth Score: {health['health_score']:.1f}")
    print(f"Status: {health['status']}")
    print(f"Metrics: K={health['metrics']['k']:.2f}, I={health['metrics']['i']:.2f}, Ω={health['metrics']['omega']:.2f}")
