"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS - Task Solution Engine (4단계 파이프라인)
═══════════════════════════════════════════════════════════════════════════════

4단계 프로세스:
  Stage 1: 수집 (Collection) - 업무 정의 및 분류
  Stage 2: 재정의 (Redesign) - 자동화 파이프라인 설계
  Stage 3: 자동화 (Automate) - 실행 및 모니터링
  Stage 4: 삭제화 (Eliminate) - 자연 소멸 및 재배치

물리 엔진: K(효율) / I(상호작용) / Ω(엔트로피)
"""

from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from uuid import UUID, uuid4
import math
import logging

from .models_v2 import (
    UserType, TaskLayer, TaskGroup, MassActionQuadrant,
    TaskStatus, TriggerType, TypeParameter,
    PhysicsMetrics, TaskDefinitionV2, UserTaskV2,
    AutomationPipeline, ExecutionResult, EliminationEvaluation,
    AutomationRule, ConditionType, ActionType,
    DashboardData, PersonalizationRecommendation,
    KStatus, IStatus, OmegaStatus,
)
from .common_engines import engine_registry, CommonEngine

logger = logging.getLogger("autus.solution_engine")


# ═══════════════════════════════════════════════════════════════════════════════
# 물리 엔진 (K/I/Ω 계산)
# ═══════════════════════════════════════════════════════════════════════════════

class PhysicsEngine:
    """K/I/Ω 물리 엔진"""
    
    # 타입별 가중치
    TYPE_WEIGHTS = {
        UserType.INDIVIDUAL: {"k": 1.0, "i": 0.8, "omega": 1.0},
        UserType.SMALL_TEAM: {"k": 0.9, "i": 1.2, "omega": 1.0},
        UserType.SMB: {"k": 0.8, "i": 1.3, "omega": 0.9},
        UserType.ENTERPRISE: {"k": 0.7, "i": 1.5, "omega": 0.8},
        UserType.NATION: {"k": 0.6, "i": 1.8, "omega": 0.7},
        UserType.GLOBAL: {"k": 0.5, "i": 2.0, "omega": 0.6},
    }
    
    def calculate_k(
        self,
        actual_output: float,
        expected_output: float,
        resource_input: float,
        time_input: float,
        user_type: UserType = UserType.INDIVIDUAL
    ) -> float:
        """
        K = (실제 산출 / 예상 산출) × (1 / 자원 투입) × (1 / 시간 투입)
        K > 1: 번영 (효율 증가)
        K < 1: 쇠퇴 (효율 감소)
        """
        if expected_output == 0 or resource_input == 0 or time_input == 0:
            return 1.0
        
        weight = self.TYPE_WEIGHTS[user_type]["k"]
        
        output_ratio = actual_output / expected_output
        resource_eff = 1 / (resource_input + 0.01)
        time_eff = 1 / (time_input + 0.01)
        
        k = output_ratio * math.sqrt(resource_eff * time_eff) * weight
        return max(0.1, min(3.0, k))
    
    def calculate_i(
        self,
        response_rate: float,
        cycle_time: float,
        collaboration_score: float,
        user_type: UserType = UserType.INDIVIDUAL
    ) -> float:
        """
        I = 상호작용 강도
        I > 0: 시너지
        I < 0: 마찰
        """
        weight = self.TYPE_WEIGHTS[user_type]["i"]
        
        time_factor = 1 / (cycle_time + 1)
        raw_i = (
            response_rate * 0.4 +
            time_factor * 0.3 +
            (collaboration_score + 1) / 2 * 0.3
        ) * 2 - 1
        
        return max(-1.0, min(1.0, raw_i * weight))
    
    def calculate_omega(
        self,
        error_count: int,
        backlog_count: int,
        rework_count: int,
        total_volume: int
    ) -> float:
        """
        Ω = 엔트로피 (혼란도)
        Ω → 0: 질서 (안정)
        Ω → 1: 혼란 (불안정)
        """
        if total_volume == 0:
            return 0.3  # 기본값
        
        error_rate = error_count / total_volume
        backlog_rate = backlog_count / (total_volume + 1)
        rework_rate = rework_count / total_volume
        
        omega = (error_rate * 0.4 + backlog_rate * 0.35 + rework_rate * 0.25)
        return max(0.0, min(1.0, omega))
    
    def update_metrics(
        self,
        current: PhysicsMetrics,
        execution_context: Dict[str, Any],
        smoothing: float = 0.3
    ) -> PhysicsMetrics:
        """실행 결과로 메트릭 업데이트 (지수이동평균)"""
        
        # 새 값 계산
        new_k = self.calculate_k(
            actual_output=execution_context.get("actual_output", 1),
            expected_output=execution_context.get("expected_output", 1),
            resource_input=execution_context.get("resource_input", 1),
            time_input=execution_context.get("time_input", 1)
        )
        
        new_i = self.calculate_i(
            response_rate=execution_context.get("response_rate", 0.5),
            cycle_time=execution_context.get("cycle_time", 1),
            collaboration_score=execution_context.get("collaboration_score", 0)
        )
        
        new_omega = self.calculate_omega(
            error_count=execution_context.get("error_count", 0),
            backlog_count=execution_context.get("backlog_count", 0),
            rework_count=execution_context.get("rework_count", 0),
            total_volume=execution_context.get("total_volume", 1)
        )
        
        # 지수이동평균 적용
        return PhysicsMetrics(
            k_efficiency=smoothing * new_k + (1 - smoothing) * current.k_efficiency,
            i_interaction=smoothing * new_i + (1 - smoothing) * current.i_interaction,
            omega_entropy=smoothing * new_omega + (1 - smoothing) * current.omega_entropy,
            timestamp=datetime.now()
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 1: 수집 (Collection)
# ═══════════════════════════════════════════════════════════════════════════════

class Stage1_Collection:
    """1단계: 수집 - 업무 발견 및 정의"""
    
    def __init__(self):
        self.tasks: Dict[str, TaskDefinitionV2] = {}
    
    def collect_task(
        self,
        task_id: str,
        task_name_ko: str,
        task_name_en: str,
        layer: TaskLayer,
        category: str,
        group: Optional[TaskGroup] = None,
        type_variants: Optional[List[Dict]] = None,
        trigger_type: TriggerType = TriggerType.EVENT_BASED,
        inputs: Optional[List[str]] = None,
        outputs: Optional[List[str]] = None,
        current_metrics: Optional[Dict] = None,
        **kwargs
    ) -> TaskDefinitionV2:
        """업무 수집 및 정의"""
        
        # 그룹 자동 분류
        if group is None:
            group = self._classify_group(category, layer)
        
        # 4분면 자동 분류
        quadrant = self._classify_quadrant(group, layer)
        
        # 타입 파라미터 변환
        variants = []
        if type_variants:
            for tv in type_variants:
                variants.append(TypeParameter(
                    type_code=tv.get("code", "A"),
                    type_name=tv.get("name", "Default"),
                    parameters=tv.get("params", {}),
                    thresholds=tv.get("thresholds", {})
                ))
        
        task = TaskDefinitionV2(
            task_id=task_id,
            name_ko=task_name_ko,
            name_en=task_name_en,
            layer=layer,
            group=group,
            quadrant=quadrant,
            category=category,
            type_variants=variants,
            trigger_type=trigger_type,
            inputs=inputs or [],
            outputs=outputs or [],
            avg_duration_minutes=current_metrics.get("duration", 0) if current_metrics else 0,
            avg_cost=current_metrics.get("cost", 0) if current_metrics else 0,
            error_rate=current_metrics.get("error_rate", 0) if current_metrics else 0,
            **kwargs
        )
        
        self.tasks[task_id] = task
        logger.info(f"✓ Collected: {task_id} ({task_name_ko})")
        return task
    
    def _classify_group(self, category: str, layer: TaskLayer) -> TaskGroup:
        """카테고리로 그룹 분류"""
        group_map = {
            "AUTH": TaskGroup.IT_OPERATIONS,
            "NOTIFY": TaskGroup.HIGH_REPEAT_STRUCTURED,
            "LOG": TaskGroup.HIGH_REPEAT_STRUCTURED,
            "DATA": TaskGroup.HIGH_REPEAT_STRUCTURED,
            "SCHEDULE": TaskGroup.HIGH_REPEAT_STRUCTURED,
            "ENERGY": TaskGroup.STRATEGY_JUDGMENT,
            "FINANCE": TaskGroup.FINANCE_ACCOUNTING,
            "HR": TaskGroup.HR_PERSONNEL,
            "SALES": TaskGroup.CUSTOMER_SALES,
            "MARKETING": TaskGroup.CUSTOMER_SALES,
            "IT": TaskGroup.IT_OPERATIONS,
            "OPERATIONS": TaskGroup.HIGH_REPEAT_STRUCTURED,
            "LEGAL": TaskGroup.SEMI_STRUCTURED_DOC,
            "SUPPORT": TaskGroup.CUSTOMER_SALES,
        }
        return group_map.get(category, TaskGroup.HIGH_REPEAT_STRUCTURED)
    
    def _classify_quadrant(self, group: TaskGroup, layer: TaskLayer) -> MassActionQuadrant:
        """그룹과 레이어로 4분면 분류"""
        if layer == TaskLayer.DOMAIN:
            if group in [TaskGroup.STRATEGY_JUDGMENT, TaskGroup.FINANCE_ACCOUNTING]:
                return MassActionQuadrant.CRITICAL
            return MassActionQuadrant.HEAVY
        elif layer == TaskLayer.COMMON:
            return MassActionQuadrant.HEAVY
        else:  # EDGE
            if group in [TaskGroup.CUSTOMER_SALES, TaskGroup.APPROVAL_WORKFLOW]:
                return MassActionQuadrant.FLUID
            return MassActionQuadrant.ROUTINE


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 2: 재정의 (Redesign)
# ═══════════════════════════════════════════════════════════════════════════════

class Stage2_Redesign:
    """2단계: 재정의 - 자동화 파이프라인 설계"""
    
    def __init__(self):
        self.pipelines: Dict[str, AutomationPipeline] = {}
    
    def redesign_task(self, task: TaskDefinitionV2) -> AutomationPipeline:
        """업무 재정의 및 파이프라인 설계"""
        
        # Core 단계 생성
        core_steps = self._generate_core_steps(task)
        
        # 공식 정의
        k_formula = self._generate_k_formula(task)
        i_formula = self._generate_i_formula(task)
        omega_formula = self._generate_omega_formula(task)
        
        # 자동화 설정
        pipeline = AutomationPipeline(
            task_id=task.task_id,
            core_steps=core_steps,
            k_formula=k_formula,
            i_formula=i_formula,
            omega_formula=omega_formula,
            input_automation=self._design_input_automation(task),
            logic_automation=self._design_logic_automation(task),
            action_automation=self._design_action_automation(task),
            feedback_automation=self._design_feedback_automation(task),
            elimination_conditions=self._define_elimination_conditions(),
            elimination_method=self._determine_elimination_method(task),
            empty_slot_action="reallocate_to_high_k_tasks"
        )
        
        self.pipelines[task.task_id] = pipeline
        logger.info(f"✓ Redesigned: {task.task_id}")
        return pipeline
    
    def _generate_core_steps(self, task: TaskDefinitionV2) -> List[str]:
        """Core 단계 생성"""
        steps = ["trigger_detect"]
        
        group_steps = {
            TaskGroup.HIGH_REPEAT_STRUCTURED: ["validate", "process", "store"],
            TaskGroup.SEMI_STRUCTURED_DOC: ["ocr_parse", "structure", "validate", "extract"],
            TaskGroup.APPROVAL_WORKFLOW: ["validate", "policy_check", "route_approval"],
            TaskGroup.CUSTOMER_SALES: ["enrich", "score", "route", "engage"],
            TaskGroup.FINANCE_ACCOUNTING: ["validate", "calculate", "reconcile", "post"],
            TaskGroup.HR_PERSONNEL: ["validate", "checklist", "provision", "notify"],
            TaskGroup.IT_OPERATIONS: ["classify", "prioritize", "route", "monitor"],
            TaskGroup.STRATEGY_JUDGMENT: ["analyze", "model", "recommend"]
        }
        
        steps.extend(group_steps.get(task.group, ["process"]))
        steps.append("feedback_capture")
        return steps
    
    def _generate_k_formula(self, task: TaskDefinitionV2) -> str:
        formulas = {
            TaskGroup.HIGH_REPEAT_STRUCTURED: "completed / time * (1 - error_rate)",
            TaskGroup.SEMI_STRUCTURED_DOC: "processed_docs / review_time * accuracy",
            TaskGroup.APPROVAL_WORKFLOW: "approved / total_time * compliance_rate",
            TaskGroup.CUSTOMER_SALES: "converted / scored * avg_deal_value",
            TaskGroup.FINANCE_ACCOUNTING: "collected / billed * (1 / dso)",
            TaskGroup.HR_PERSONNEL: "onboarded / total_time * satisfaction",
            TaskGroup.IT_OPERATIONS: "sla_met / tickets * (1 / resolution_time)",
            TaskGroup.STRATEGY_JUDGMENT: "accepted / proposed * margin_impact"
        }
        return formulas.get(task.group, "output / input")
    
    def _generate_i_formula(self, task: TaskDefinitionV2) -> str:
        return "response_rate * (1 / cycle_time) * collaboration_score"
    
    def _generate_omega_formula(self, task: TaskDefinitionV2) -> str:
        return "(error_rate * 0.4) + (backlog_rate * 0.35) + (rework_rate * 0.25)"
    
    def _design_input_automation(self, task: TaskDefinitionV2) -> Dict:
        return {
            "source": "webhook" if task.trigger_type == TriggerType.EVENT_BASED else "scheduler",
            "parser": "ocr" if task.layer == TaskLayer.EDGE else "structured",
            "validation": "schema_based"
        }
    
    def _design_logic_automation(self, task: TaskDefinitionV2) -> Dict:
        needs_ml = task.group in [TaskGroup.CUSTOMER_SALES, TaskGroup.IT_OPERATIONS, TaskGroup.STRATEGY_JUDGMENT]
        return {
            "engine": "ml_hybrid" if needs_ml else "rule_based",
            "fallback": "human_review",
            "confidence_threshold": 0.8
        }
    
    def _design_action_automation(self, task: TaskDefinitionV2) -> Dict:
        return {
            "execution_mode": "auto" if task.quadrant == MassActionQuadrant.ROUTINE else "supervised",
            "notification": ["slack", "email"],
            "retry_policy": {"max_retries": 3, "backoff": "exponential"}
        }
    
    def _design_feedback_automation(self, task: TaskDefinitionV2) -> Dict:
        return {
            "collection_interval": "per_execution",
            "metrics_update": "exponential_moving_average",
            "alert_threshold": {"k": 0.5, "omega": 0.7}
        }
    
    def _define_elimination_conditions(self) -> List[str]:
        return [
            "k_efficiency < 0.3 for 5 consecutive cycles",
            "omega_entropy > 0.8 for 3 consecutive cycles",
            "i_interaction < -0.5 sustained"
        ]
    
    def _determine_elimination_method(self, task: TaskDefinitionV2) -> str:
        methods = {
            MassActionQuadrant.ROUTINE: "auto_deprecate",
            MassActionQuadrant.FLUID: "merge_into_parent",
            MassActionQuadrant.HEAVY: "simplify_or_outsource",
            MassActionQuadrant.CRITICAL: "human_review_required"
        }
        return methods.get(task.quadrant, "manual")


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 3: 자동화 (Automate)
# ═══════════════════════════════════════════════════════════════════════════════

class Stage3_Automate:
    """3단계: 자동화 - 실행 및 모니터링"""
    
    def __init__(self, physics_engine: PhysicsEngine):
        self.physics = physics_engine
        self.execution_history: List[ExecutionResult] = []
    
    def execute_task(
        self,
        task: TaskDefinitionV2,
        pipeline: AutomationPipeline,
        input_data: Dict[str, Any],
        type_code: Optional[str] = None
    ) -> ExecutionResult:
        """업무 실행"""
        
        execution_id = f"{task.task_id}_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        started_at = datetime.now()
        
        try:
            # 타입 파라미터 로드
            type_param = None
            if type_code:
                type_param = task.get_type_variant(type_code)
            
            # Core 단계 실행
            result_data = input_data.copy()
            for step in pipeline.core_steps:
                result_data = self._execute_step(step, result_data, type_param)
            
            completed_at = datetime.now()
            duration_ms = int((completed_at - started_at).total_seconds() * 1000)
            
            result = ExecutionResult(
                task_id=task.task_id,
                execution_id=execution_id,
                started_at=started_at,
                completed_at=completed_at,
                success=True,
                output_data=result_data,
                actual_duration_ms=duration_ms,
                quality_score=result_data.get("quality_score", 1.0)
            )
            
        except Exception as e:
            completed_at = datetime.now()
            result = ExecutionResult(
                task_id=task.task_id,
                execution_id=execution_id,
                started_at=started_at,
                completed_at=completed_at,
                success=False,
                error_message=str(e),
                actual_duration_ms=int((completed_at - started_at).total_seconds() * 1000)
            )
        
        self.execution_history.append(result)
        return result
    
    def _execute_step(
        self,
        step: str,
        data: Dict,
        type_param: Optional[TypeParameter]
    ) -> Dict[str, Any]:
        """개별 단계 실행"""
        
        step_engine_map = {
            "trigger_detect": None,
            "ocr_parse": "ocr_parsing",
            "validate": "rule_engine",
            "policy_check": "rule_engine",
            "structure": "rule_engine",
            "extract": "ocr_parsing",
            "route_approval": "approval_workflow",
            "route": "notification_router",
            "score": "ml_scoring",
            "classify": "ml_scoring",
            "prioritize": "rule_engine",
            "calculate": "rule_engine",
            "monitor": "sla_timer",
            "analyze": "ml_scoring",
            "model": "ml_scoring",
            "recommend": "ml_scoring",
            "process": "rule_engine",
            "engage": "notification_router",
            "notify": "notification_router",
            "feedback_capture": "feedback_loop"
        }
        
        engine_name = step_engine_map.get(step)
        if engine_name:
            engine_result = engine_registry.execute(engine_name, data)
            data.update(engine_result)
        
        data["_last_step"] = step
        return data
    
    def update_user_task_metrics(
        self,
        user_task: UserTaskV2,
        result: ExecutionResult,
        context: Dict[str, Any]
    ) -> PhysicsMetrics:
        """실행 결과로 메트릭 업데이트"""
        
        new_metrics = self.physics.update_metrics(
            current=user_task.metrics,
            execution_context=context
        )
        
        # 히스토리 저장
        user_task.metrics_history.append(user_task.metrics)
        if len(user_task.metrics_history) > 100:
            user_task.metrics_history = user_task.metrics_history[-100:]
        
        user_task.metrics = new_metrics
        user_task.updated_at = datetime.now()
        
        # 상태 전환
        user_task.status = new_metrics.status
        
        return new_metrics


# ═══════════════════════════════════════════════════════════════════════════════
# Stage 4: 삭제화 (Eliminate)
# ═══════════════════════════════════════════════════════════════════════════════

class Stage4_Eliminate:
    """4단계: 삭제화 - 자연 소멸 및 재배치"""
    
    def __init__(self):
        self.elimination_log: List[Dict] = []
        self.elimination_queue: List[str] = []
    
    def evaluate_elimination(
        self,
        user_task: UserTaskV2,
        pipeline: AutomationPipeline
    ) -> EliminationEvaluation:
        """삭제 필요성 평가"""
        
        metrics = user_task.metrics
        should_eliminate = False
        reasons = []
        
        # 조건 체크
        if metrics.k_efficiency < 0.3:
            should_eliminate = True
            reasons.append(f"K={metrics.k_efficiency:.2f} < 0.3")
        
        if metrics.omega_entropy > 0.8:
            should_eliminate = True
            reasons.append(f"Ω={metrics.omega_entropy:.2f} > 0.8")
        
        if metrics.i_interaction < -0.5:
            should_eliminate = True
            reasons.append(f"I={metrics.i_interaction:.2f} < -0.5")
        
        return EliminationEvaluation(
            task_id=user_task.task_id,
            should_eliminate=should_eliminate,
            reasons=reasons,
            method=pipeline.elimination_method if should_eliminate else None,
            empty_slot_action=pipeline.empty_slot_action if should_eliminate else None,
            current_metrics={
                "k": metrics.k_efficiency,
                "i": metrics.i_interaction,
                "omega": metrics.omega_entropy
            }
        )
    
    def execute_elimination(
        self,
        user_task: UserTaskV2,
        evaluation: EliminationEvaluation
    ) -> Dict[str, Any]:
        """삭제 실행"""
        
        if not evaluation.should_eliminate:
            return {"status": "skipped", "reason": "elimination not required"}
        
        method = evaluation.method
        
        if method == "auto_deprecate":
            result = self._auto_deprecate(user_task)
        elif method == "merge_into_parent":
            result = self._merge_into_parent(user_task)
        elif method == "simplify_or_outsource":
            result = self._simplify(user_task)
        else:
            result = {"status": "pending_review", "requires_human": True}
        
        # 로그 기록
        self.elimination_log.append({
            "task_id": user_task.task_id,
            "method": method,
            "result": result,
            "timestamp": datetime.now().isoformat(),
            "metrics": evaluation.current_metrics
        })
        
        return result
    
    def _auto_deprecate(self, user_task: UserTaskV2) -> Dict:
        user_task.status = TaskStatus.ELIMINATED
        user_task.metrics = PhysicsMetrics(k_efficiency=0, i_interaction=0, omega_entropy=1)
        return {"status": "deprecated", "task_id": user_task.task_id}
    
    def _merge_into_parent(self, user_task: UserTaskV2) -> Dict:
        user_task.status = TaskStatus.MERGED
        return {"status": "merged", "task_id": user_task.task_id}
    
    def _simplify(self, user_task: UserTaskV2) -> Dict:
        user_task.automation_level = max(0, user_task.automation_level - 30)
        return {"status": "simplified", "task_id": user_task.task_id}
    
    def suggest_reallocation(
        self,
        eliminated_tasks: List[UserTaskV2],
        active_tasks: List[UserTaskV2]
    ) -> List[Dict]:
        """빈 슬롯 재배치 제안"""
        
        # K값 기준 상위 업무에 리소스 재배치
        sorted_active = sorted(
            active_tasks,
            key=lambda t: t.metrics.k_efficiency,
            reverse=True
        )
        
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


# ═══════════════════════════════════════════════════════════════════════════════
# 마스터 솔루션 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class TaskSolutionEngine:
    """570개 업무 솔루션 마스터 엔진"""
    
    def __init__(self):
        # 물리 엔진
        self.physics = PhysicsEngine()
        
        # 4단계 파이프라인
        self.stage1 = Stage1_Collection()
        self.stage2 = Stage2_Redesign()
        self.stage3 = Stage3_Automate(self.physics)
        self.stage4 = Stage4_Eliminate()
        
        # 저장소
        self.tasks: Dict[str, TaskDefinitionV2] = {}
        self.pipelines: Dict[str, AutomationPipeline] = {}
        self.user_tasks: Dict[Tuple[UUID, str], UserTaskV2] = {}
        
        # 기본 규칙
        self.rules: List[AutomationRule] = self._init_default_rules()
    
    def _init_default_rules(self) -> List[AutomationRule]:
        return [
            AutomationRule(
                rule_id="R001",
                condition_type=ConditionType.K_THRESHOLD,
                condition_operator="<",
                condition_value=0.8,
                action_type=ActionType.ADJUST_AUTOMATION,
                action_params={"delta": -20},
                priority=3
            ),
            AutomationRule(
                rule_id="R002",
                condition_type=ConditionType.K_THRESHOLD,
                condition_operator=">",
                condition_value=1.2,
                action_type=ActionType.ADJUST_AUTOMATION,
                action_params={"delta": 20},
                priority=4
            ),
            AutomationRule(
                rule_id="R003",
                condition_type=ConditionType.OMEGA_THRESHOLD,
                condition_operator=">",
                condition_value=0.7,
                action_type=ActionType.NOTIFY,
                action_params={"message": "High entropy detected"},
                priority=2
            ),
            AutomationRule(
                rule_id="R004",
                condition_type=ConditionType.OMEGA_THRESHOLD,
                condition_operator=">",
                condition_value=0.85,
                action_type=ActionType.ELIMINATE,
                action_params={"queue": True},
                priority=1
            ),
        ]
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 1: 수집
    # ─────────────────────────────────────────────────────────────────────────
    
    def register_task(self, task_config: Dict) -> TaskDefinitionV2:
        """업무 등록"""
        task = self.stage1.collect_task(**task_config)
        self.tasks[task.task_id] = task
        return task
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 2: 재정의
    # ─────────────────────────────────────────────────────────────────────────
    
    def design_automation(self, task_id: str) -> AutomationPipeline:
        """자동화 파이프라인 설계"""
        task = self.tasks.get(task_id)
        if not task:
            raise ValueError(f"Task not found: {task_id}")
        
        pipeline = self.stage2.redesign_task(task)
        self.pipelines[task_id] = pipeline
        return pipeline
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 3: 자동화
    # ─────────────────────────────────────────────────────────────────────────
    
    def initialize_user_tasks(
        self,
        entity_id: UUID,
        user_type: UserType = UserType.INDIVIDUAL
    ) -> List[UserTaskV2]:
        """사용자 업무 초기화"""
        initialized = []
        
        for task in self.tasks.values():
            if user_type not in task.enabled_types:
                continue
            
            user_task = UserTaskV2(
                entity_id=entity_id,
                task_id=task.task_id,
                user_type=user_type,
                metrics=PhysicsMetrics(
                    k_efficiency=task.base_k,
                    i_interaction=task.base_i,
                    omega_entropy=task.base_omega
                ),
                automation_level=task.automation_level,
                status=TaskStatus.ACTIVE
            )
            
            self.user_tasks[(entity_id, task.task_id)] = user_task
            initialized.append(user_task)
        
        return initialized
    
    def execute(
        self,
        entity_id: UUID,
        task_id: str,
        input_data: Dict,
        type_code: Optional[str] = None
    ) -> ExecutionResult:
        """업무 실행"""
        task = self.tasks.get(task_id)
        pipeline = self.pipelines.get(task_id)
        user_task = self.user_tasks.get((entity_id, task_id))
        
        if not all([task, pipeline, user_task]):
            raise ValueError(f"Task setup incomplete: {task_id}")
        
        # 실행
        result = self.stage3.execute_task(task, pipeline, input_data, type_code)
        
        # 통계 업데이트
        user_task.execution_count += 1
        if result.success:
            user_task.success_count += 1
        else:
            user_task.failure_count += 1
        user_task.last_executed_at = datetime.now()
        
        # 메트릭 업데이트
        context = {
            "actual_output": 1 if result.success else 0,
            "expected_output": 1,
            "resource_input": result.resource_used or 1,
            "time_input": result.actual_duration_ms / 60000,
            "error_count": 0 if result.success else 1,
            "total_volume": 1
        }
        
        new_metrics = self.stage3.update_user_task_metrics(user_task, result, context)
        
        result.new_k = new_metrics.k_efficiency
        result.new_i = new_metrics.i_interaction
        result.new_omega = new_metrics.omega_entropy
        
        # 규칙 평가
        self._evaluate_rules(user_task)
        
        return result
    
    def _evaluate_rules(self, user_task: UserTaskV2):
        """자동화 규칙 평가"""
        m = user_task.metrics
        
        for rule in self.rules:
            if rule.evaluate(m.k_efficiency, m.i_interaction, m.omega_entropy):
                self._execute_rule_action(rule, user_task)
    
    def _execute_rule_action(self, rule: AutomationRule, user_task: UserTaskV2):
        """규칙 액션 실행"""
        if rule.action_type == ActionType.ADJUST_AUTOMATION:
            delta = rule.action_params.get("delta", 0)
            user_task.automation_level = max(0, min(100, user_task.automation_level + delta))
        elif rule.action_type == ActionType.ELIMINATE:
            self.stage4.elimination_queue.append(user_task.task_id)
    
    # ─────────────────────────────────────────────────────────────────────────
    # Stage 4: 삭제화
    # ─────────────────────────────────────────────────────────────────────────
    
    def run_elimination_cycle(self, entity_id: UUID) -> List[Dict]:
        """삭제 사이클 실행"""
        results = []
        
        user_tasks = [
            ut for (eid, _), ut in self.user_tasks.items()
            if eid == entity_id
        ]
        
        for user_task in user_tasks:
            pipeline = self.pipelines.get(user_task.task_id)
            if not pipeline:
                continue
            
            evaluation = self.stage4.evaluate_elimination(user_task, pipeline)
            
            if evaluation.should_eliminate:
                result = self.stage4.execute_elimination(user_task, evaluation)
                results.append({
                    "task_id": user_task.task_id,
                    "evaluation": evaluation.dict(),
                    "result": result
                })
        
        return results
    
    # ─────────────────────────────────────────────────────────────────────────
    # 대시보드
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_dashboard(self, entity_id: Optional[UUID] = None) -> DashboardData:
        """대시보드 데이터"""
        if entity_id:
            tasks = [
                ut for (eid, _), ut in self.user_tasks.items()
                if eid == entity_id
            ]
        else:
            tasks = list(self.user_tasks.values())
        
        if not tasks:
            return DashboardData(
                total_tasks=0,
                avg_k=1.0, avg_i=0.0, avg_omega=0.3, avg_health_score=70.0
            )
        
        by_status = {}
        by_group = {}
        by_quadrant = {}
        by_layer = {}
        k_sum = i_sum = omega_sum = health_sum = 0
        
        for ut in tasks:
            task_def = self.tasks.get(ut.task_id)
            if not task_def:
                continue
            
            # 상태별
            status = ut.status.value
            by_status[status] = by_status.get(status, 0) + 1
            
            # 그룹별
            group = task_def.group.value
            by_group[group] = by_group.get(group, 0) + 1
            
            # 4분면별
            quadrant = task_def.quadrant.value
            by_quadrant[quadrant] = by_quadrant.get(quadrant, 0) + 1
            
            # 레이어별
            layer = task_def.layer.value
            by_layer[layer] = by_layer.get(layer, 0) + 1
            
            # 메트릭 합계
            k_sum += ut.metrics.k_efficiency
            i_sum += ut.metrics.i_interaction
            omega_sum += ut.metrics.omega_entropy
            health_sum += ut.metrics.health_score
        
        total = len(tasks)
        return DashboardData(
            total_tasks=total,
            by_status=by_status,
            by_group=by_group,
            by_quadrant=by_quadrant,
            by_layer=by_layer,
            avg_k=round(k_sum / total, 3),
            avg_i=round(i_sum / total, 3),
            avg_omega=round(omega_sum / total, 3),
            avg_health_score=round(health_sum / total, 1),
            elimination_queue=len(self.stage4.elimination_queue)
        )
    
    def get_recommendations(
        self,
        entity_id: UUID
    ) -> List[PersonalizationRecommendation]:
        """개인화 추천"""
        recommendations = []
        
        user_tasks = [
            ut for (eid, _), ut in self.user_tasks.items()
            if eid == entity_id
        ]
        
        for ut in user_tasks:
            task_def = self.tasks.get(ut.task_id)
            if not task_def:
                continue
            
            m = ut.metrics
            
            # K 기반 추천
            if m.k_efficiency < 0.5:
                recommendations.append(PersonalizationRecommendation(
                    task_id=ut.task_id,
                    task_name=task_def.name_ko,
                    current_status=ut.status,
                    recommendation_type="decrease_automation",
                    reason=f"K={m.k_efficiency:.2f} 낮음: 자동화 강도 줄여 피로 방지",
                    current_k=m.k_efficiency,
                    current_i=m.i_interaction,
                    current_omega=m.omega_entropy,
                    expected_k_change=0.1,
                    expected_energy_saving=0.2
                ))
            elif m.k_efficiency > 1.5:
                recommendations.append(PersonalizationRecommendation(
                    task_id=ut.task_id,
                    task_name=task_def.name_ko,
                    current_status=ut.status,
                    recommendation_type="increase_automation",
                    reason=f"K={m.k_efficiency:.2f} 높음: 완전 자동화 추천",
                    current_k=m.k_efficiency,
                    current_i=m.i_interaction,
                    current_omega=m.omega_entropy,
                    expected_k_change=0.05,
                    expected_energy_saving=0.5
                ))
            
            # Ω 기반 추천
            if m.omega_entropy > 0.7:
                recommendations.append(PersonalizationRecommendation(
                    task_id=ut.task_id,
                    task_name=task_def.name_ko,
                    current_status=ut.status,
                    recommendation_type="simplify",
                    reason=f"Ω={m.omega_entropy:.2f} 높음: 프로세스 간소화 필요",
                    current_k=m.k_efficiency,
                    current_i=m.i_interaction,
                    current_omega=m.omega_entropy,
                    expected_k_change=0.15,
                    expected_energy_saving=0.3
                ))
            
            # I 기반 추천
            if m.i_interaction < -0.3:
                recommendations.append(PersonalizationRecommendation(
                    task_id=ut.task_id,
                    task_name=task_def.name_ko,
                    current_status=ut.status,
                    recommendation_type="eliminate",
                    reason=f"I={m.i_interaction:.2f} 마찰 높음: 삭제 검토",
                    current_k=m.k_efficiency,
                    current_i=m.i_interaction,
                    current_omega=m.omega_entropy,
                    expected_k_change=0.0,
                    expected_energy_saving=0.8
                ))
        
        return recommendations
