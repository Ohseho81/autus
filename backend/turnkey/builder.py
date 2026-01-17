"""
AUTUS Turnkey Solution Builder
4단계 프레임워크 빌더
"""

from typing import Optional
from .models import (
    TriggerType,
    ChainResult,
    LegacyTask,
    ChainAction,
    TriggerChain,
    TurnkeyFramework,
    TurnkeySolution,
)


class TurnkeyBuilder:
    """턴키 솔루션 빌더 (Fluent API)"""
    
    def __init__(self, industry: str, solution_name: str):
        self.framework = TurnkeyFramework(
            industry=industry,
            solution_name=solution_name
        )
    
    # =========================================================================
    # Stage 1: 수집 (Collection)
    # =========================================================================
    
    def collect_legacy_tasks(self, tasks: list[dict]) -> 'TurnkeyBuilder':
        """기존 파편화된 업무 수집"""
        for t in tasks:
            self.framework.legacy_tasks.append(LegacyTask(
                task_id=t.get("id", ""),
                task_name=t.get("name", ""),
                responsible=t.get("responsible", ""),
                avg_duration_minutes=t.get("duration", 0),
                avg_cost=t.get("cost", 0),
                error_rate=t.get("error_rate", 0),
                dependencies=t.get("dependencies", [])
            ))
        return self
    
    def collect_legacy_flows(self, flows: list[dict]) -> 'TurnkeyBuilder':
        """기존 업무 흐름(릴레이) 수집"""
        self.framework.legacy_flows = flows
        return self
    
    # =========================================================================
    # Stage 2: 재정의 (Redesign)
    # =========================================================================
    
    def define_core_triggers(self, triggers: list[TriggerType]) -> 'TurnkeyBuilder':
        """핵심 트리거 정의 (2-3개)"""
        self.framework.core_triggers = triggers
        return self
    
    def define_trigger_chain(self, chain: TriggerChain) -> 'TurnkeyBuilder':
        """트리거별 체인 정의"""
        self.framework.trigger_chains.append(chain)
        return self
    
    def map_tasks_to_chains(self) -> 'TurnkeyBuilder':
        """기존 업무를 체인에 매핑 (흡수)"""
        task_map = {t.task_name: t for t in self.framework.legacy_tasks}
        
        for chain in self.framework.trigger_chains:
            for action in chain.actions:
                for task_name in action.absorbed_tasks:
                    if task_name in task_map:
                        chain.eliminated_tasks.append(task_map[task_name])
        
        return self
    
    # =========================================================================
    # Stage 3: 자동화 (Automate)
    # =========================================================================
    
    def implement_automation(self) -> 'TurnkeyBuilder':
        """자동화 구현"""
        for chain in self.framework.trigger_chains:
            for action in chain.actions:
                self.framework.automated_actions.append(action)
        return self
    
    # =========================================================================
    # Stage 4: 삭제화 (Eliminate)
    # =========================================================================
    
    def eliminate_tasks(self) -> 'TurnkeyBuilder':
        """업무 삭제 (자연소멸)"""
        eliminated_ids = set()
        
        for chain in self.framework.trigger_chains:
            for task in chain.eliminated_tasks:
                if task.task_id not in eliminated_ids:
                    self.framework.eliminated_tasks.append(task)
                    eliminated_ids.add(task.task_id)
        
        total_legacy = len(self.framework.legacy_tasks)
        total_eliminated = len(self.framework.eliminated_tasks)
        
        self.framework.elimination_rate = (
            total_eliminated / total_legacy if total_legacy > 0 else 0
        )
        
        return self
    
    def define_final_outputs(
        self, 
        outputs: list[str], 
        added_value: list[str]
    ) -> 'TurnkeyBuilder':
        """최종 산출물 정의"""
        self.framework.final_outputs = outputs
        self.framework.added_value = added_value
        return self
    
    # =========================================================================
    # Build
    # =========================================================================
    
    def build(self) -> TurnkeyFramework:
        """프레임워크 빌드"""
        return self.framework
    
    def build_solution(self, solution_id: str) -> TurnkeySolution:
        """턴키 솔루션으로 빌드"""
        return TurnkeySolution(
            solution_id=solution_id,
            solution_name=self.framework.solution_name,
            industry=self.framework.industry,
            core_triggers=self.framework.trigger_chains,
        )


def quick_chain(
    trigger: TriggerType,
    name: str,
    actions: list[tuple[str, str, ChainResult, list[str], list[str]]]
) -> TriggerChain:
    """빠른 체인 생성 헬퍼
    
    actions: [(id, name, result_type, outputs, absorbed_tasks), ...]
    """
    chain_actions = [
        ChainAction(
            action_id=a[0],
            action_name=a[1],
            result_type=a[2],
            outputs=a[3],
            absorbed_tasks=a[4]
        )
        for a in actions
    ]
    
    return TriggerChain(
        trigger_type=trigger,
        trigger_name=name,
        actions=chain_actions
    )


def quick_task(
    id: str,
    name: str,
    responsible: str,
    duration: float,
    cost: float,
    error_rate: float = 0.05
) -> dict:
    """빠른 업무 생성 헬퍼"""
    return {
        "id": id,
        "name": name,
        "responsible": responsible,
        "duration": duration,
        "cost": cost,
        "error_rate": error_rate
    }
