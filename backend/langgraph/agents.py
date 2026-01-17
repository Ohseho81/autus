"""
AUTUS LangGraph Agents
======================
5-Stage Agentic Workflow Agents:
1. Collector - 데이터 수집
2. Analyzer - 패턴 분석
3. Planner - 자동화 계획
4. Executor - 실행
5. Deleter - 불필요 데이터 삭제
6. Feedback - 피드백 학습
"""

from typing import Any
from dataclasses import dataclass
from datetime import datetime
import json

from .state import AutusState, GateResult, SafetyStatus


@dataclass
class AgentResult:
    """에이전트 실행 결과"""
    success: bool
    data: Any
    message: str
    tokens_used: int = 0
    duration_ms: int = 0


class BaseAgent:
    """에이전트 베이스 클래스"""
    
    name: str = "base"
    
    def __init__(self, config: dict | None = None):
        self.config = config or {}
    
    async def run(self, state: AutusState) -> dict:
        """에이전트 실행 (상태 업데이트 반환)"""
        raise NotImplementedError
    
    def _log(self, message: str, state: AutusState) -> dict:
        """실행 로그 추가"""
        log_entry = {
            "agent": self.name,
            "timestamp": datetime.now().isoformat(),
            "message": message,
            "stage": state.get("current_stage", "unknown"),
        }
        return {"execution_logs": [log_entry]}


class CollectorAgent(BaseAgent):
    """
    Collector Agent
    ===============
    데이터 수집 에이전트
    - 캘린더, 이메일, 슬랙, ERP 등에서 데이터 수집
    - 오염 데이터 사전 필터링
    - 스트리밍 지원
    """
    
    name = "collector"
    
    async def run(self, state: AutusState) -> dict:
        """데이터 수집 실행"""
        
        # 시뮬레이션: 실제로는 외부 API 연동
        sources = state.get("data_sources", [])
        if not sources:
            sources = ["calendar", "email", "slack", "erp"]
        
        collected = []
        for source in sources:
            # 각 소스에서 데이터 수집 (시뮬레이션)
            data = await self._collect_from_source(source)
            collected.extend(data)
        
        # 오염 데이터 필터링
        clean_data = self._filter_contaminated(collected)
        
        # ΔṠ 업데이트 (수집량에 따라)
        new_delta_s = min(1.0, state.get("delta_s_dot", 0) + len(clean_data) * 0.001)
        
        return {
            "collected_data": clean_data,
            "data_sources": sources,
            "current_stage": "analysis",
            "delta_s_dot": new_delta_s,
            "messages": [{
                "role": "agent",
                "content": f"[Collector] {len(clean_data)}개 데이터 수집 완료 (소스: {', '.join(sources)})",
            }],
            **self._log(f"Collected {len(clean_data)} items", state),
        }
    
    async def _collect_from_source(self, source: str) -> list:
        """소스별 데이터 수집"""
        # 시뮬레이션
        return [
            {"source": source, "id": f"{source}_{i}", "value": i * 10}
            for i in range(5)
        ]
    
    def _filter_contaminated(self, data: list) -> list:
        """오염 데이터 필터링"""
        # 시뮬레이션: 실제로는 AI 기반 필터링
        return [d for d in data if d.get("value", 0) >= 0]


class AnalyzerAgent(BaseAgent):
    """
    Analyzer Agent
    ==============
    패턴 분석 에이전트
    - 빈도 분석
    - 이상치 탐지
    - 관계 그래프 구축
    - 예측 모델링
    - Explainable AI (왜 이 패턴?)
    """
    
    name = "analyzer"
    
    async def run(self, state: AutusState) -> dict:
        """분석 실행"""
        
        data = state.get("collected_data", [])
        if not data:
            return {
                "current_stage": "automation",
                "messages": [{"role": "agent", "content": "[Analyzer] 분석할 데이터 없음"}],
            }
        
        # 패턴 분석
        patterns = self._detect_patterns(data)
        
        # 이상치 탐지
        anomalies = self._detect_anomalies(data)
        
        # 예측
        predictions = self._make_predictions(data, patterns)
        
        # 자동화 규칙 추천
        suggested_rules = self._suggest_automation_rules(patterns)
        
        # Inertia Debt 계산 (복잡도에 따라)
        complexity = len(patterns) + len(anomalies)
        new_inertia = min(10.0, state.get("inertia_debt", 0) + complexity * 0.1)
        
        return {
            "analysis_insights": {
                "total_items": len(data),
                "pattern_count": len(patterns),
                "anomaly_count": len(anomalies),
                "analyzed_at": datetime.now().isoformat(),
            },
            "detected_patterns": patterns,
            "anomalies": anomalies,
            "predictions": predictions,
            "automation_rules": suggested_rules,
            "current_stage": "automation",
            "inertia_debt": new_inertia,
            "messages": [{
                "role": "agent",
                "content": f"[Analyzer] {len(patterns)}개 패턴, {len(anomalies)}개 이상치 감지",
            }],
            **self._log(f"Analyzed {len(data)} items", state),
        }
    
    def _detect_patterns(self, data: list) -> list:
        """패턴 감지"""
        patterns = []
        
        # 소스별 그룹화
        sources = {}
        for item in data:
            src = item.get("source", "unknown")
            sources[src] = sources.get(src, 0) + 1
        
        for src, count in sources.items():
            if count >= 3:
                patterns.append({
                    "type": "frequency",
                    "source": src,
                    "count": count,
                    "confidence": min(1.0, count / 10),
                })
        
        return patterns
    
    def _detect_anomalies(self, data: list) -> list:
        """이상치 탐지"""
        values = [d.get("value", 0) for d in data]
        if not values:
            return []
        
        avg = sum(values) / len(values)
        anomalies = []
        
        for item in data:
            val = item.get("value", 0)
            if abs(val - avg) > avg * 0.5:  # 50% 이상 편차
                anomalies.append({
                    "item_id": item.get("id"),
                    "value": val,
                    "deviation": abs(val - avg) / avg if avg else 0,
                })
        
        return anomalies
    
    def _make_predictions(self, data: list, patterns: list) -> dict:
        """예측 생성"""
        return {
            "next_period_volume": len(data) * 1.1,
            "trend": "increasing" if len(patterns) > 2 else "stable",
            "confidence": 0.75,
        }
    
    def _suggest_automation_rules(self, patterns: list) -> list:
        """자동화 규칙 추천"""
        rules = []
        for pattern in patterns:
            if pattern.get("confidence", 0) > 0.5:
                rules.append({
                    "trigger": f"{pattern['type']}_{pattern.get('source', 'any')}",
                    "action": "auto_process",
                    "confidence": pattern["confidence"],
                })
        return rules


class PlannerAgent(BaseAgent):
    """
    Planner Agent
    =============
    자동화 계획 수립 에이전트
    - ReAct 패턴 적용
    - 다단계 실행 계획 수립
    - Scale Lock 사전 체크
    """
    
    name = "planner"
    
    async def run(self, state: AutusState) -> dict:
        """계획 수립"""
        
        rules = state.get("automation_rules", [])
        insights = state.get("analysis_insights", {})
        
        # Scale Lock 체크
        if state.get("scale_lock_violated", False):
            return {
                "planned_steps": [],
                "safety_status": SafetyStatus.HUMAN_ESCALATION.value,
                "escalation_reason": "Scale Lock violated - cannot plan",
                "messages": [{"role": "agent", "content": "[Planner] Scale Lock 위반으로 계획 중단"}],
            }
        
        # 계획 수립
        steps = []
        for rule in rules:
            step = {
                "id": f"step_{len(steps)+1}",
                "rule": rule,
                "priority": rule.get("confidence", 0.5),
                "estimated_impact": self._estimate_impact(rule),
                "requires_approval": rule.get("confidence", 0) < 0.7,
            }
            steps.append(step)
        
        # 우선순위 정렬
        steps.sort(key=lambda x: x["priority"], reverse=True)
        
        return {
            "planned_steps": steps,
            "current_stage": "automation",
            "messages": [{
                "role": "agent",
                "content": f"[Planner] {len(steps)}개 실행 계획 수립",
            }],
            **self._log(f"Planned {len(steps)} steps", state),
        }
    
    def _estimate_impact(self, rule: dict) -> dict:
        """영향도 추정"""
        return {
            "scope": "local",
            "reversible": True,
            "risk_level": "low" if rule.get("confidence", 0) > 0.7 else "medium",
        }


class ExecutorAgent(BaseAgent):
    """
    Executor Agent
    ==============
    자동화 실행 에이전트
    - 계획된 단계 실행
    - 실시간 Inertia Debt 모니터링
    - 실패 시 자동 롤백
    """
    
    name = "executor"
    
    async def run(self, state: AutusState) -> dict:
        """실행"""
        
        steps = state.get("planned_steps", [])
        k_scale = state.get("user_k_scale", "K2")
        
        # K-Scale 권한 체크
        if k_scale == "K2":
            return {
                "executed_results": {"status": "logged_only"},
                "current_stage": "deletion",
                "messages": [{"role": "agent", "content": "[Executor] K2 - 로그만 기록 (실행 권한 없음)"}],
            }
        
        if k_scale == "K10":
            return {
                "executed_results": {"status": "observe_only"},
                "current_stage": "deletion",
                "messages": [{"role": "agent", "content": "[Executor] K10 - 관찰만 (실행 권한 없음)"}],
            }
        
        # 실행
        results = {}
        executed_count = 0
        
        for step in steps:
            if step.get("requires_approval", False) and k_scale not in ["K6"]:
                results[step["id"]] = {"status": "pending_approval"}
                continue
            
            # 실행 (시뮬레이션)
            success = await self._execute_step(step)
            results[step["id"]] = {
                "status": "success" if success else "failed",
                "executed_at": datetime.now().isoformat(),
            }
            if success:
                executed_count += 1
        
        # Inertia Debt 감소 (성공적 실행 시)
        new_inertia = max(0, state.get("inertia_debt", 0) - executed_count * 0.2)
        
        return {
            "executed_results": results,
            "current_stage": "deletion",
            "inertia_debt": new_inertia,
            "messages": [{
                "role": "agent",
                "content": f"[Executor] {executed_count}/{len(steps)}개 단계 실행 완료",
            }],
            **self._log(f"Executed {executed_count} steps", state),
        }
    
    async def _execute_step(self, step: dict) -> bool:
        """단계 실행"""
        # 시뮬레이션: 80% 성공률
        import random
        return random.random() > 0.2


class DeleterAgent(BaseAgent):
    """
    Deleter Agent
    =============
    불필요 데이터 삭제 에이전트
    - Isolation Zone으로 이동 (7일 보관)
    - ΔṠ 70% 초과 시 중단
    - Safety Net 적용
    """
    
    name = "deleter"
    
    async def run(self, state: AutusState) -> dict:
        """삭제 처리"""
        
        # ΔṠ 체크
        delta_s = state.get("delta_s_dot", 0)
        if delta_s > 0.7:
            return {
                "safety_status": SafetyStatus.THROTTLE.value,
                "current_stage": "feedback",
                "messages": [{"role": "agent", "content": f"[Deleter] ΔṠ {delta_s:.2f} > 0.7 - 삭제 중단"}],
            }
        
        # 삭제 후보 식별
        data = state.get("collected_data", [])
        anomalies = state.get("anomalies", [])
        anomaly_ids = {a.get("item_id") for a in anomalies}
        
        candidates = [d for d in data if d.get("id") in anomaly_ids]
        
        # Isolation Zone으로 이동
        isolation = state.get("isolation_zone", [])
        for item in candidates:
            isolation.append({
                **item,
                "isolated_at": datetime.now().isoformat(),
                "delete_after": "7d",
            })
        
        # ΔṠ 감소 (정리로 인한 엔트로피 감소)
        new_delta_s = max(0, delta_s - len(candidates) * 0.01)
        
        return {
            "deletion_candidates": candidates,
            "isolation_zone": isolation,
            "current_stage": "feedback",
            "delta_s_dot": new_delta_s,
            "messages": [{
                "role": "agent",
                "content": f"[Deleter] {len(candidates)}개 항목 Isolation Zone 이동",
            }],
            **self._log(f"Isolated {len(candidates)} items", state),
        }


class FeedbackAgent(BaseAgent):
    """
    Feedback Agent
    ==============
    피드백 학습 에이전트
    - 결과 평가
    - 다음 루프 최적화
    - Hyper-personalization
    """
    
    name = "feedback"
    
    async def run(self, state: AutusState) -> dict:
        """피드백 처리"""
        
        # 결과 평가
        executed = state.get("executed_results", {})
        success_count = sum(1 for r in executed.values() if r.get("status") == "success")
        total_count = len(executed) or 1
        
        score = (success_count / total_count) * 10
        
        # 개선 제안 생성
        suggestions = []
        if state.get("delta_s_dot", 0) > 0.5:
            suggestions.append("ΔṠ가 높습니다. 수집 주기를 늦추세요.")
        if state.get("inertia_debt", 0) > 5:
            suggestions.append("Inertia Debt가 높습니다. 자동화 규칙을 점검하세요.")
        
        # 루프 카운트 증가
        loop_count = state.get("loop_count", 0) + 1
        
        # 다음 스테이지 결정
        next_stage = "collection" if loop_count < 100 else "halt"
        
        return {
            "feedback_score": score,
            "improvement_suggestions": suggestions,
            "loop_count": loop_count,
            "current_stage": next_stage,
            "messages": [{
                "role": "agent",
                "content": f"[Feedback] 점수: {score:.1f}/10, 루프 #{loop_count}",
            }],
            **self._log(f"Feedback score: {score:.1f}", state),
        }
