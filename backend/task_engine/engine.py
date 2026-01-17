"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS - K/I/r 개인화 엔진
═══════════════════════════════════════════════════════════════════════════════

핵심 로직:
  - K (개인 상수): 성공률 × 에너지 효율
  - I (상호호환 상수): 노드 간 시너지 분석
  - r (지수): 최근 30일 대비 변화율

자동화 오케스트레이터:
  - K/I/r 기반 규칙 평가
  - 외부 툴 트리거 (Databricks, UiPath, Zapier 등)
"""

from typing import Optional, Dict, List, Any, Tuple
from datetime import datetime, timedelta
from uuid import UUID, uuid4
import math
import asyncio
import logging

from .models import (
    UserType, TaskLayer, TaskStatus,
    TaskDefinition, UserTask, KIRSnapshot, KIRInput,
    AutomationRule, ActionType, ConditionType,
    TaskExecution, TaskExecuteRequest, TaskExecuteResponse,
    TaskSummary, PersonalizationRecommendation,
    KStatus, IStatus, RStatus,
)
from .common_tasks import COMMON_ENGINE_50

logger = logging.getLogger("autus.task_engine")


# ═══════════════════════════════════════════════════════════════════════════════
# K/I/r 계산기
# ═══════════════════════════════════════════════════════════════════════════════

class KIRCalculator:
    """K/I/r 상수 계산기"""
    
    # 타입별 가중치 조정
    TYPE_WEIGHTS = {
        UserType.INDIVIDUAL: {"k_weight": 1.0, "i_weight": 0.8, "r_weight": 1.0},
        UserType.SMALL_TEAM: {"k_weight": 0.9, "i_weight": 1.2, "r_weight": 1.0},
        UserType.SMB: {"k_weight": 0.8, "i_weight": 1.3, "r_weight": 0.9},
        UserType.ENTERPRISE: {"k_weight": 0.7, "i_weight": 1.5, "r_weight": 0.8},
        UserType.NATION: {"k_weight": 0.6, "i_weight": 1.8, "r_weight": 0.7},
        UserType.GLOBAL: {"k_weight": 0.5, "i_weight": 2.0, "r_weight": 0.6},
    }
    
    @classmethod
    def calculate_k(
        cls,
        success_rate: float,
        energy_efficiency: float,
        user_type: UserType = UserType.INDIVIDUAL,
        current_k: float = 1.0,
        smoothing: float = 0.7
    ) -> float:
        """
        K 상수 계산
        
        K = (성공률 × 에너지 효율) × 타입 가중치
        스무딩 적용으로 급격한 변화 방지
        """
        weight = cls.TYPE_WEIGHTS[user_type]["k_weight"]
        
        # 새로운 K 계산
        raw_k = success_rate * energy_efficiency * weight
        
        # 스무딩 (급격한 변화 방지)
        new_k = current_k * smoothing + raw_k * (1 - smoothing)
        
        # 범위 제한 [0.1, 2.0]
        return max(0.1, min(2.0, new_k))
    
    @classmethod
    def calculate_i(
        cls,
        synergy_scores: List[float],
        user_type: UserType = UserType.INDIVIDUAL,
        current_i: float = 0.0,
        smoothing: float = 0.8
    ) -> float:
        """
        I 상수 계산 (상호호환 상수)
        
        I = Σ(시너지 점수) / N × 타입 가중치
        양수: 시너지, 음수: 갈등
        """
        if not synergy_scores:
            return current_i
        
        weight = cls.TYPE_WEIGHTS[user_type]["i_weight"]
        
        # 평균 시너지
        avg_synergy = sum(synergy_scores) / len(synergy_scores)
        raw_i = avg_synergy * weight
        
        # 스무딩
        new_i = current_i * smoothing + raw_i * (1 - smoothing)
        
        # 범위 제한 [-1.0, 1.0]
        return max(-1.0, min(1.0, new_i))
    
    @classmethod
    def calculate_r(
        cls,
        current_k: float,
        previous_k: float,
        days: int = 30,
        user_type: UserType = UserType.INDIVIDUAL
    ) -> float:
        """
        r 지수 계산 (쇠퇴/성장율)
        
        r = (K_current - K_previous) / K_previous / days × 타입 가중치
        양수: 성장, 음수: 쇠퇴
        """
        if previous_k <= 0 or days <= 0:
            return 0.0
        
        weight = cls.TYPE_WEIGHTS[user_type]["r_weight"]
        
        # 일간 변화율
        daily_change = (current_k - previous_k) / previous_k / days
        raw_r = daily_change * weight
        
        # 범위 제한 [-0.1, 0.1]
        return max(-0.1, min(0.1, raw_r))
    
    @classmethod
    def calculate_all(
        cls,
        inputs: KIRInput,
        current: KIRSnapshot,
        user_type: UserType = UserType.INDIVIDUAL
    ) -> Tuple[float, float, float]:
        """K, I, r 전체 계산"""
        new_k = cls.calculate_k(
            success_rate=inputs.success_rate,
            energy_efficiency=inputs.energy_efficiency,
            user_type=user_type,
            current_k=current.k_value
        )
        
        new_i = cls.calculate_i(
            synergy_scores=[inputs.synergy_score],
            user_type=user_type,
            current_i=current.i_value
        )
        
        new_r = cls.calculate_r(
            current_k=new_k,
            previous_k=current.k_value,
            user_type=user_type
        )
        
        return new_k, new_i, new_r
    
    @classmethod
    def get_status(cls, k: float, i: float, r: float) -> Dict[str, str]:
        """K/I/r 상태 판정"""
        # K 상태
        if k >= 1.2:
            k_status = KStatus.THRIVING
        elif k >= 0.8:
            k_status = KStatus.STABLE
        elif k >= 0.5:
            k_status = KStatus.STRUGGLING
        else:
            k_status = KStatus.CRITICAL
        
        # I 상태
        if i >= 0.3:
            i_status = IStatus.HIGH_SYNERGY
        elif i >= 0:
            i_status = IStatus.NEUTRAL
        elif i >= -0.3:
            i_status = IStatus.LOW_CONFLICT
        else:
            i_status = IStatus.HIGH_CONFLICT
        
        # r 상태
        if r >= 0.05:
            r_status = RStatus.GROWING
        elif r >= -0.02:
            r_status = RStatus.STABLE
        elif r >= -0.05:
            r_status = RStatus.DECLINING
        else:
            r_status = RStatus.DECAYING
        
        return {
            "k_status": k_status.value,
            "i_status": i_status.value,
            "r_status": r_status.value,
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 자동화 오케스트레이터
# ═══════════════════════════════════════════════════════════════════════════════

class AutomationOrchestrator:
    """
    자동화 오케스트레이터
    
    AUTUS는 "관조자·계산기" 역할만 수행
    실제 자동화는 외부 툴 API 호출로 위임
    """
    
    # 외부 툴 설정
    EXTERNAL_TOOLS = {
        "databricks": {
            "type": "analytics",
            "base_url": "https://databricks.com/api",
            "actions": ["workflow", "notebook", "job"]
        },
        "uipath": {
            "type": "rpa",
            "base_url": "https://cloud.uipath.com/api",
            "actions": ["process", "queue", "asset"]
        },
        "zapier": {
            "type": "integration",
            "base_url": "https://hooks.zapier.com",
            "actions": ["webhook", "zap"]
        },
        "slack": {
            "type": "notification",
            "base_url": "https://slack.com/api",
            "actions": ["message", "interactive"]
        },
    }
    
    # 기본 규칙
    DEFAULT_RULES: List[AutomationRule] = [
        # K < 0.8 시 자동화 레벨 감소
        AutomationRule(
            condition_type=ConditionType.K_THRESHOLD,
            condition_operator="<",
            condition_value=0.8,
            action_type=ActionType.ADJUST_AUTOMATION,
            action_params={"delta": -20, "min": 20},
            priority=3
        ),
        # K > 1.2 시 자동화 레벨 증가
        AutomationRule(
            condition_type=ConditionType.K_THRESHOLD,
            condition_operator=">",
            condition_value=1.2,
            action_type=ActionType.ADJUST_AUTOMATION,
            action_params={"delta": 20, "max": 100},
            priority=4
        ),
        # I < -0.3 시 경고
        AutomationRule(
            condition_type=ConditionType.I_THRESHOLD,
            condition_operator="<",
            condition_value=-0.3,
            action_type=ActionType.NOTIFY,
            action_params={"type": "warning", "message": "Negative synergy detected"},
            priority=2
        ),
        # r < -0.05 시 소멸 큐 추가
        AutomationRule(
            condition_type=ConditionType.R_DECAY,
            condition_operator="<",
            condition_value=-0.05,
            action_type=ActionType.ELIMINATE,
            action_params={"queue": True, "days_to_eliminate": 30},
            priority=1
        ),
    ]
    
    def __init__(self, rules: Optional[List[AutomationRule]] = None):
        self.rules = rules or self.DEFAULT_RULES
        self._tool_clients: Dict[str, Any] = {}
    
    def evaluate_rules(
        self,
        k: float,
        i: float,
        r: float,
        entity_id: Optional[UUID] = None,
        task_id: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        규칙 평가 및 액션 반환
        
        Returns:
            [{"rule": AutomationRule, "triggered": bool, "action": {...}}]
        """
        results = []
        
        # 우선순위 순 정렬
        sorted_rules = sorted(self.rules, key=lambda r: r.priority)
        
        for rule in sorted_rules:
            # 엔티티/태스크 필터
            if rule.entity_id and rule.entity_id != entity_id:
                continue
            if rule.task_id and rule.task_id != task_id:
                continue
            
            # 조건 평가
            triggered = rule.evaluate(k, i, r)
            
            if triggered:
                action = self._prepare_action(rule, k, i, r)
                results.append({
                    "rule": rule,
                    "triggered": True,
                    "action": action
                })
        
        return results
    
    def _prepare_action(
        self,
        rule: AutomationRule,
        k: float,
        i: float,
        r: float
    ) -> Dict[str, Any]:
        """액션 준비"""
        action = {
            "type": rule.action_type.value,
            "params": rule.action_params.copy(),
            "context": {"k": k, "i": i, "r": r}
        }
        
        if rule.action_type == ActionType.ADJUST_AUTOMATION:
            delta = rule.action_params.get("delta", 0)
            action["description"] = f"자동화 레벨 {delta:+d}% 조정"
            
        elif rule.action_type == ActionType.ELIMINATE:
            days = rule.action_params.get("days_to_eliminate", 30)
            action["description"] = f"{days}일 후 자연 소멸 예정"
            
        elif rule.action_type == ActionType.NOTIFY:
            action["description"] = rule.action_params.get("message", "알림")
            
        elif rule.action_type == ActionType.TRIGGER_TOOL:
            tool = rule.action_params.get("tool", "unknown")
            action["description"] = f"{tool} 트리거"
        
        return action
    
    async def execute_action(
        self,
        action: Dict[str, Any],
        entity_id: UUID,
        task_id: str
    ) -> Dict[str, Any]:
        """
        액션 실행 (외부 툴 호출)
        
        AUTUS는 지휘만 하고, 실제 작업은 외부 툴에 위임
        """
        action_type = action["type"]
        params = action["params"]
        
        result = {
            "success": False,
            "action_type": action_type,
            "executed_at": datetime.now().isoformat()
        }
        
        try:
            if action_type == "ADJUST_AUTOMATION":
                # 자동화 레벨 조정 (내부)
                result["success"] = True
                result["delta"] = params.get("delta", 0)
                
            elif action_type == "NOTIFY":
                # 알림 발송 (Slack 등)
                result["success"] = True
                result["message"] = params.get("message", "")
                
            elif action_type == "TRIGGER_TOOL":
                # 외부 툴 호출
                tool = params.get("tool")
                if tool in self.EXTERNAL_TOOLS:
                    # 실제로는 HTTP 호출
                    result["success"] = True
                    result["tool"] = tool
                    result["endpoint"] = self.EXTERNAL_TOOLS[tool]["base_url"]
                else:
                    result["error"] = f"Unknown tool: {tool}"
                    
            elif action_type == "ELIMINATE":
                # 소멸 큐 추가
                result["success"] = True
                result["queued"] = True
                result["days_to_eliminate"] = params.get("days_to_eliminate", 30)
            
            else:
                result["error"] = f"Unknown action type: {action_type}"
                
        except Exception as e:
            result["error"] = str(e)
            logger.error(f"Action execution failed: {e}")
        
        return result
    
    def get_recommendations(
        self,
        user_tasks: List[UserTask],
        user_type: UserType
    ) -> List[PersonalizationRecommendation]:
        """
        개인화 추천 생성
        
        K/I/r 기반으로 각 업무에 대한 최적화 추천
        """
        recommendations = []
        
        for task in user_tasks:
            k, i, r = task.personal_k, task.personal_i, task.personal_r
            
            # K 기반 추천
            if k < 0.5:
                recommendations.append(PersonalizationRecommendation(
                    task_id=task.task_id,
                    task_name=task.task_id,
                    current_status=task.status,
                    recommendation_type="decrease_automation",
                    reason=f"K={k:.2f} 낮음: 자동화 강도 줄여 피로 방지",
                    current_k=k,
                    current_i=i,
                    current_r=r,
                    expected_k_change=0.1,
                    expected_energy_saving=0.2
                ))
            elif k > 1.5:
                recommendations.append(PersonalizationRecommendation(
                    task_id=task.task_id,
                    task_name=task.task_id,
                    current_status=task.status,
                    recommendation_type="increase_automation",
                    reason=f"K={k:.2f} 높음: 완전 자동화 추천",
                    current_k=k,
                    current_i=i,
                    current_r=r,
                    expected_k_change=0.05,
                    expected_energy_saving=0.5
                ))
            
            # I 기반 추천
            if i < -0.3:
                recommendations.append(PersonalizationRecommendation(
                    task_id=task.task_id,
                    task_name=task.task_id,
                    current_status=task.status,
                    recommendation_type="eliminate",
                    reason=f"I={i:.2f} 갈등 높음: 관계 업무 우선 삭제 추천",
                    current_k=k,
                    current_i=i,
                    current_r=r,
                    expected_k_change=0.0,
                    expected_energy_saving=0.8
                ))
            
            # r 기반 추천
            if r < -0.05:
                recommendations.append(PersonalizationRecommendation(
                    task_id=task.task_id,
                    task_name=task.task_id,
                    current_status=task.status,
                    recommendation_type="eliminate",
                    reason=f"r={r:.3f} 쇠퇴 중: 자연 소멸 대기",
                    current_k=k,
                    current_i=i,
                    current_r=r,
                    expected_k_change=0.0,
                    expected_energy_saving=1.0
                ))
        
        return recommendations


# ═══════════════════════════════════════════════════════════════════════════════
# 업무 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class TaskEngine:
    """
    570개 업무 통합 엔진
    
    "관조자·계산기" 역할:
    - K/I/r 상수 발견 및 계산
    - 외부 툴 자동 트리거 (지휘)
    - 개인화 추천 생성
    """
    
    def __init__(self):
        self.calculator = KIRCalculator()
        self.orchestrator = AutomationOrchestrator()
        
        # 메모리 저장소 (실제로는 DB)
        self._task_definitions: Dict[str, TaskDefinition] = {
            t.task_id: t for t in COMMON_ENGINE_50
        }
        self._user_tasks: Dict[Tuple[UUID, str], UserTask] = {}
        self._kir_history: List[KIRSnapshot] = []
        self._executions: List[TaskExecution] = []
    
    # ─────────────────────────────────────────────────────────────────────────
    # 업무 관리
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_task_definition(self, task_id: str) -> Optional[TaskDefinition]:
        """업무 정의 조회"""
        return self._task_definitions.get(task_id)
    
    def get_all_definitions(self, layer: Optional[TaskLayer] = None) -> List[TaskDefinition]:
        """전체 업무 정의 조회"""
        defs = list(self._task_definitions.values())
        if layer:
            defs = [d for d in defs if d.layer == layer]
        return defs
    
    def get_user_task(self, entity_id: UUID, task_id: str) -> Optional[UserTask]:
        """사용자 업무 상태 조회"""
        return self._user_tasks.get((entity_id, task_id))
    
    def initialize_user_tasks(
        self,
        entity_id: UUID,
        user_type: UserType = UserType.INDIVIDUAL
    ) -> List[UserTask]:
        """
        사용자용 업무 초기화
        
        타입에 맞는 업무만 활성화하고 개인화된 K/I/r 설정
        """
        initialized = []
        
        for task_def in self._task_definitions.values():
            # 타입 체크
            if user_type not in task_def.enabled_types:
                continue
            
            # 개인화된 상수 설정
            user_task = UserTask(
                entity_id=entity_id,
                task_id=task_def.task_id,
                user_type=user_type,
                personal_k=task_def.base_k,
                personal_i=task_def.base_i,
                personal_r=task_def.base_r,
                automation_level=task_def.automation_level,
                status=TaskStatus.ACTIVE
            )
            
            self._user_tasks[(entity_id, task_def.task_id)] = user_task
            initialized.append(user_task)
        
        logger.info(f"Initialized {len(initialized)} tasks for entity {entity_id}")
        return initialized
    
    # ─────────────────────────────────────────────────────────────────────────
    # K/I/r 계산
    # ─────────────────────────────────────────────────────────────────────────
    
    def update_kir(
        self,
        entity_id: UUID,
        task_id: str,
        inputs: KIRInput,
        reason: str = "execution"
    ) -> KIRSnapshot:
        """K/I/r 업데이트"""
        user_task = self.get_user_task(entity_id, task_id)
        if not user_task:
            raise ValueError(f"Task not found: {entity_id}/{task_id}")
        
        # 현재 값
        current = KIRSnapshot(
            entity_id=entity_id,
            task_id=task_id,
            k_value=user_task.personal_k,
            i_value=user_task.personal_i,
            r_value=user_task.personal_r
        )
        
        # 새 값 계산
        new_k, new_i, new_r = self.calculator.calculate_all(
            inputs=inputs,
            current=current,
            user_type=user_task.user_type
        )
        
        # 스냅샷 생성
        snapshot = KIRSnapshot(
            entity_id=entity_id,
            task_id=task_id,
            k_value=new_k,
            i_value=new_i,
            r_value=new_r,
            delta_k=new_k - current.k_value,
            delta_i=new_i - current.i_value,
            delta_r=new_r - current.r_value,
            trigger_reason=reason
        )
        
        # 업데이트
        user_task.personal_k = new_k
        user_task.personal_i = new_i
        user_task.personal_r = new_r
        user_task.updated_at = datetime.now()
        
        # 상태 전환
        if new_r < -0.05:
            user_task.status = TaskStatus.DECAYING
        elif user_task.status == TaskStatus.DECAYING and new_r >= -0.02:
            user_task.status = TaskStatus.ACTIVE
        
        # 히스토리 저장
        self._kir_history.append(snapshot)
        
        return snapshot
    
    # ─────────────────────────────────────────────────────────────────────────
    # 업무 실행
    # ─────────────────────────────────────────────────────────────────────────
    
    async def execute_task(
        self,
        request: TaskExecuteRequest
    ) -> TaskExecuteResponse:
        """업무 실행"""
        start_time = datetime.now()
        
        user_task = self.get_user_task(request.entity_id, request.task_id)
        task_def = self.get_task_definition(request.task_id)
        
        if not user_task or not task_def:
            raise ValueError(f"Task not found: {request.task_id}")
        
        # 실행 기록
        execution = TaskExecution(
            execution_id=uuid4(),
            entity_id=request.entity_id,
            task_id=request.task_id,
            execution_type=request.execution_type,
            external_tool=task_def.external_tool,
            success=True,  # 기본값
            energy_consumed=task_def.energy_cost,
            started_at=start_time
        )
        
        try:
            # 외부 툴 호출 시뮬레이션
            if task_def.external_tool and task_def.api_endpoint:
                # 실제로는 HTTP 호출
                await asyncio.sleep(0.1)  # 시뮬레이션
            
            execution.completed_at = datetime.now()
            execution.duration_ms = int((execution.completed_at - start_time).total_seconds() * 1000)
            execution.success = True
            
            # K/I/r 영향 계산
            execution.k_impact = 0.01 if execution.success else -0.02
            execution.i_impact = task_def.base_i * 0.1
            execution.r_impact = 0.001 if execution.success else -0.002
            
        except Exception as e:
            execution.success = False
            execution.error_message = str(e)
            execution.k_impact = -0.05
            execution.completed_at = datetime.now()
            execution.duration_ms = int((execution.completed_at - start_time).total_seconds() * 1000)
        
        # 통계 업데이트
        user_task.execution_count += 1
        if execution.success:
            user_task.success_count += 1
        else:
            user_task.failure_count += 1
        user_task.total_energy_spent += execution.energy_consumed
        user_task.last_executed_at = datetime.now()
        
        # K/I/r 업데이트
        success_rate = user_task.success_count / max(user_task.execution_count, 1)
        energy_efficiency = 1.0 / max(user_task.total_energy_spent / max(user_task.success_count, 1), 0.1)
        
        inputs = KIRInput(
            success_rate=success_rate,
            energy_efficiency=min(2.0, energy_efficiency),
            synergy_score=task_def.base_i
        )
        
        snapshot = self.update_kir(
            entity_id=request.entity_id,
            task_id=request.task_id,
            inputs=inputs,
            reason="execution"
        )
        
        # 자동화 규칙 평가
        triggered_rules = self.orchestrator.evaluate_rules(
            k=snapshot.k_value,
            i=snapshot.i_value,
            r=snapshot.r_value,
            entity_id=request.entity_id,
            task_id=request.task_id
        )
        
        # 액션 실행
        for rule_result in triggered_rules:
            if rule_result["triggered"]:
                await self.orchestrator.execute_action(
                    action=rule_result["action"],
                    entity_id=request.entity_id,
                    task_id=request.task_id
                )
        
        # 실행 기록 저장
        self._executions.append(execution)
        
        return TaskExecuteResponse(
            success=execution.success,
            execution_id=execution.execution_id,
            task_id=request.task_id,
            result=execution.result_data,
            error=execution.error_message,
            k_impact=execution.k_impact,
            i_impact=execution.i_impact,
            r_impact=execution.r_impact,
            new_k=snapshot.k_value,
            new_i=snapshot.i_value,
            new_r=snapshot.r_value,
            duration_ms=execution.duration_ms
        )
    
    # ─────────────────────────────────────────────────────────────────────────
    # 분석 & 리포트
    # ─────────────────────────────────────────────────────────────────────────
    
    def get_summary(self, entity_id: UUID) -> TaskSummary:
        """업무 요약"""
        user_tasks = [
            t for (eid, _), t in self._user_tasks.items()
            if eid == entity_id
        ]
        
        if not user_tasks:
            return TaskSummary(
                total_tasks=0,
                active_tasks=0,
                decaying_tasks=0,
                eliminated_tasks=0,
                avg_k=1.0,
                avg_i=0.0,
                avg_r=0.0,
                layer_breakdown={},
                category_breakdown={}
            )
        
        # 상태별 카운트
        active = sum(1 for t in user_tasks if t.status == TaskStatus.ACTIVE)
        decaying = sum(1 for t in user_tasks if t.status == TaskStatus.DECAYING)
        eliminated = sum(1 for t in user_tasks if t.status == TaskStatus.ELIMINATED)
        
        # 평균 K/I/r
        avg_k = sum(t.personal_k for t in user_tasks) / len(user_tasks)
        avg_i = sum(t.personal_i for t in user_tasks) / len(user_tasks)
        avg_r = sum(t.personal_r for t in user_tasks) / len(user_tasks)
        
        # 레이어/카테고리 분해
        layer_breakdown = {}
        category_breakdown = {}
        
        for task in user_tasks:
            task_def = self.get_task_definition(task.task_id)
            if task_def:
                layer_breakdown[task_def.layer.value] = layer_breakdown.get(task_def.layer.value, 0) + 1
                category_breakdown[task_def.category] = category_breakdown.get(task_def.category, 0) + 1
        
        return TaskSummary(
            total_tasks=len(user_tasks),
            active_tasks=active,
            decaying_tasks=decaying,
            eliminated_tasks=eliminated,
            avg_k=round(avg_k, 3),
            avg_i=round(avg_i, 3),
            avg_r=round(avg_r, 4),
            layer_breakdown=layer_breakdown,
            category_breakdown=category_breakdown
        )
    
    def get_recommendations(
        self,
        entity_id: UUID
    ) -> List[PersonalizationRecommendation]:
        """개인화 추천 조회"""
        user_tasks = [
            t for (eid, _), t in self._user_tasks.items()
            if eid == entity_id
        ]
        
        if not user_tasks:
            return []
        
        user_type = user_tasks[0].user_type if user_tasks else UserType.INDIVIDUAL
        return self.orchestrator.get_recommendations(user_tasks, user_type)
