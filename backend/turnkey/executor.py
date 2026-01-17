"""
AUTUS Turnkey Solution Executor
트리거 체인 실행 엔진
"""

import asyncio
import hashlib
from datetime import datetime
from typing import Any, Optional
from dataclasses import asdict

from .models import (
    TriggerType,
    TriggerChain,
    TriggerEvent,
    ChainAction,
    ChainExecutionResult,
    TurnkeySolution,
)


class TurnkeyExecutor:
    """턴키 솔루션 실행 엔진"""
    
    def __init__(self, solution: Optional[TurnkeySolution] = None):
        self.solution = solution
        self.chains: dict[TriggerType, TriggerChain] = {}
        self.execution_history: list[ChainExecutionResult] = []
        
        if solution:
            for chain in solution.core_triggers:
                self.chains[chain.trigger_type] = chain
    
    def register_chain(self, chain: TriggerChain):
        """체인 등록"""
        self.chains[chain.trigger_type] = chain
    
    async def trigger(
        self, 
        trigger_type: TriggerType, 
        payload: dict
    ) -> ChainExecutionResult:
        """트리거 발동 → 전체 체인 실행"""
        
        event_id = hashlib.md5(
            f"{trigger_type.value}{datetime.now()}".encode()
        ).hexdigest()[:12]
        
        chain = self.chains.get(trigger_type)
        if not chain:
            return ChainExecutionResult(
                chain_id=event_id,
                trigger_type=trigger_type,
                success=False,
                errors=[f"Chain not found for trigger: {trigger_type.value}"]
            )
        
        start_time = datetime.now()
        action_results = []
        outputs = {}
        errors = []
        
        # 모든 액션 순차 실행
        for action in chain.actions:
            # 조건 체크
            if action.condition and not self._check_condition(action.condition, payload):
                action_results.append({
                    "action_id": action.action_id,
                    "action_name": action.action_name,
                    "status": "skipped",
                    "reason": f"Condition not met: {action.condition}"
                })
                continue
            
            try:
                result = await self._execute_action(action, payload)
                action_results.append({
                    "action_id": action.action_id,
                    "action_name": action.action_name,
                    "status": "success",
                    "outputs": result,
                    "absorbed_tasks": action.absorbed_tasks
                })
                outputs[action.action_id] = result
                
            except Exception as e:
                errors.append(f"{action.action_name}: {str(e)}")
                action_results.append({
                    "action_id": action.action_id,
                    "action_name": action.action_name,
                    "status": "failed",
                    "error": str(e)
                })
        
        end_time = datetime.now()
        duration_ms = (end_time - start_time).total_seconds() * 1000
        
        result = ChainExecutionResult(
            chain_id=event_id,
            trigger_type=trigger_type,
            success=len(errors) == 0,
            outputs=outputs,
            action_results=action_results,
            total_duration_ms=duration_ms,
            eliminated_task_count=sum(
                len(ar.get("absorbed_tasks", [])) 
                for ar in action_results 
                if ar.get("status") == "success"
            ),
            errors=errors,
            timestamp=start_time
        )
        
        self.execution_history.append(result)
        return result
    
    async def _execute_action(
        self, 
        action: ChainAction, 
        payload: dict
    ) -> dict:
        """개별 액션 실행"""
        
        # 실제 구현에서는 외부 서비스 연동
        # 여기서는 시뮬레이션
        await asyncio.sleep(0.1)  # 시뮬레이션 딜레이
        
        return {
            "action_id": action.action_id,
            "action_name": action.action_name,
            "result_type": action.result_type.value,
            "outputs": action.outputs,
            "payload_processed": payload,
            "executed_at": datetime.now().isoformat()
        }
    
    def _check_condition(self, condition: str, payload: dict) -> bool:
        """조건 체크"""
        # 간단한 조건 평가 (실제로는 더 복잡한 파서 필요)
        # 예: "결제+7일" → 7일 후 실행
        return True  # 기본적으로 실행
    
    def get_chain_info(self, trigger_type: TriggerType) -> Optional[dict]:
        """체인 정보 조회"""
        chain = self.chains.get(trigger_type)
        if not chain:
            return None
        
        return {
            "trigger_type": trigger_type.value,
            "trigger_name": chain.trigger_name,
            "description": chain.trigger_description,
            "action_count": len(chain.actions),
            "actions": [
                {
                    "id": a.action_id,
                    "name": a.action_name,
                    "result_type": a.result_type.value,
                    "outputs": a.outputs,
                    "absorbed_tasks": a.absorbed_tasks,
                    "absorbed_count": len(a.absorbed_tasks)
                }
                for a in chain.actions
            ],
            "total_absorbed_tasks": chain.total_absorbed_tasks,
            "final_outputs": chain.final_outputs,
            "estimated_savings": {
                "cost": chain.total_eliminated_cost,
                "time_minutes": chain.total_eliminated_time
            }
        }
    
    def get_all_chains(self) -> list[dict]:
        """모든 체인 정보"""
        return [
            self.get_chain_info(t) 
            for t in self.chains.keys()
        ]
    
    def get_execution_stats(self) -> dict:
        """실행 통계"""
        if not self.execution_history:
            return {
                "total_executions": 0,
                "success_rate": 0,
                "avg_duration_ms": 0,
                "total_tasks_eliminated": 0
            }
        
        total = len(self.execution_history)
        success = sum(1 for e in self.execution_history if e.success)
        total_duration = sum(e.total_duration_ms for e in self.execution_history)
        total_eliminated = sum(e.eliminated_task_count for e in self.execution_history)
        
        return {
            "total_executions": total,
            "success_rate": success / total,
            "avg_duration_ms": total_duration / total,
            "total_tasks_eliminated": total_eliminated,
            "by_trigger": {
                t.value: sum(1 for e in self.execution_history if e.trigger_type == t)
                for t in set(e.trigger_type for e in self.execution_history)
            }
        }
    
    def get_recent_executions(self, limit: int = 10) -> list[dict]:
        """최근 실행 이력"""
        recent = self.execution_history[-limit:][::-1]
        return [
            {
                "chain_id": e.chain_id,
                "trigger_type": e.trigger_type.value,
                "success": e.success,
                "duration_ms": e.total_duration_ms,
                "eliminated_count": e.eliminated_task_count,
                "timestamp": e.timestamp.isoformat()
            }
            for e in recent
        ]


# 글로벌 실행기 인스턴스
_executor: Optional[TurnkeyExecutor] = None


def get_executor() -> TurnkeyExecutor:
    """글로벌 실행기 가져오기"""
    global _executor
    if _executor is None:
        _executor = TurnkeyExecutor()
    return _executor


def init_executor(solution: TurnkeySolution) -> TurnkeyExecutor:
    """실행기 초기화"""
    global _executor
    _executor = TurnkeyExecutor(solution)
    return _executor
