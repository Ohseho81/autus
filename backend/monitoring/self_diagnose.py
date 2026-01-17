"""
AUTUS 자기 진단 에이전트
========================

CrewAI 기반 자기 모니터링 및 진단 시스템

에이전트:
- Analyzer: 시스템 상태 분석 및 문제 탐지
- Reporter: 진단 결과 요약 보고서 생성
- Fixer: 발견된 문제 자동 보정 시도

사용법:
```python
from backend.monitoring import SelfDiagnoseAgent, run_diagnosis

agent = SelfDiagnoseAgent()
result = await agent.run({
    "delta_s_dot": 0.45,
    "inertia_debt": 0.85,  # 위험 수준
    "safety_triggers": 5,
    "module_count": 700
})
print(result.summary)
```
"""

import os
import logging
from dataclasses import dataclass, field
from typing import Any, Optional
from datetime import datetime
from enum import Enum

logger = logging.getLogger(__name__)


class DiagnosisStatus(Enum):
    """진단 상태"""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    UNKNOWN = "unknown"


class FixAction(Enum):
    """수정 액션"""
    NONE = "none"
    THROTTLE = "throttle"
    CACHE_CLEAR = "cache_clear"
    MODULE_RELOAD = "module_reload"
    SCALE_LOCK = "scale_lock"
    ALERT = "alert"


@dataclass
class DiagnosisResult:
    """진단 결과"""
    timestamp: datetime = field(default_factory=datetime.now)
    status: DiagnosisStatus = DiagnosisStatus.UNKNOWN
    
    # 분석 결과
    issues: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    metrics_summary: dict = field(default_factory=dict)
    
    # 보고서
    summary: str = ""
    detailed_report: str = ""
    
    # 수정 액션
    recommended_actions: list[FixAction] = field(default_factory=list)
    actions_taken: list[str] = field(default_factory=list)
    
    # 메타데이터
    duration_ms: float = 0.0
    agent_outputs: dict = field(default_factory=dict)


# 임계값 설정
THRESHOLDS = {
    "inertia_debt": {
        "warning": 0.6,
        "critical": 0.8,
    },
    "delta_s_dot": {
        "warning": 0.7,
        "critical": 0.9,
    },
    "safety_triggers": {
        "warning": 3,
        "critical": 10,
    },
    "error_rate": {
        "warning": 0.05,
        "critical": 0.1,
    },
    "latency_ms": {
        "warning": 5000,
        "critical": 10000,
    },
}


class SelfDiagnoseAgent:
    """AUTUS 자기 진단 에이전트"""
    
    def __init__(self, use_llm: bool = True):
        """
        Args:
            use_llm: LLM 기반 에이전트 사용 여부 (False면 규칙 기반)
        """
        self.use_llm = use_llm
        self._crew = None
        
        if use_llm:
            self._init_crew()
    
    def _init_crew(self):
        """CrewAI Crew 초기화"""
        try:
            from crewai import Agent, Task, Crew, Process
            from langchain_openai import ChatOpenAI
            
            # LLM 설정
            llm = ChatOpenAI(
                model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
                temperature=0.1,
            )
            
            # 에이전트 정의
            self.analyzer = Agent(
                role="System Analyzer",
                goal="AUTUS 시스템 상태를 진단하고 잠재적 문제를 탐지합니다.",
                backstory="""당신은 AUTUS 모니터링 전문가입니다. 
                시스템 메트릭을 분석하여 이상 징후를 찾고, 
                Inertia Debt, ΔṠ, Safety Guard 트리거 등의 지표를 해석합니다.""",
                llm=llm,
                verbose=False,
            )
            
            self.reporter = Agent(
                role="Report Generator",
                goal="진단 결과를 명확하고 실행 가능한 보고서로 요약합니다.",
                backstory="""당신은 AUTUS 리포트 전문가입니다.
                기술적 진단 결과를 비전문가도 이해할 수 있는 형태로 변환하고,
                우선순위에 따라 조치 사항을 정리합니다.""",
                llm=llm,
                verbose=False,
            )
            
            self.fixer = Agent(
                role="Auto Fixer",
                goal="발견된 문제에 대해 안전한 자동 보정 조치를 제안하고 실행합니다.",
                backstory="""당신은 AUTUS 수리 전문가입니다.
                시스템 안정성을 유지하면서 문제를 해결하는 최소한의 조치를 선택합니다.
                위험한 조치는 경고만 하고, 안전한 조치만 자동 실행합니다.""",
                llm=llm,
                verbose=False,
            )
            
            logger.info("CrewAI 에이전트 초기화 완료")
            
        except ImportError:
            logger.warning("CrewAI가 설치되지 않았습니다. 규칙 기반 진단만 사용합니다.")
            self.use_llm = False
        except Exception as e:
            logger.error(f"CrewAI 초기화 실패: {e}")
            self.use_llm = False
    
    def _analyze_metrics(self, metrics: dict) -> tuple[DiagnosisStatus, list[str], list[str]]:
        """규칙 기반 메트릭 분석"""
        issues = []
        warnings = []
        status = DiagnosisStatus.HEALTHY
        
        # Inertia Debt 분석
        inertia_debt = metrics.get("inertia_debt", 0)
        if inertia_debt >= THRESHOLDS["inertia_debt"]["critical"]:
            issues.append(f"Inertia Debt 위험 수준: {inertia_debt:.2f} (임계값: {THRESHOLDS['inertia_debt']['critical']})")
            status = DiagnosisStatus.CRITICAL
        elif inertia_debt >= THRESHOLDS["inertia_debt"]["warning"]:
            warnings.append(f"Inertia Debt 경고 수준: {inertia_debt:.2f}")
            if status == DiagnosisStatus.HEALTHY:
                status = DiagnosisStatus.WARNING
        
        # ΔṠ 분석
        delta_s_dot = metrics.get("delta_s_dot", 0)
        if delta_s_dot >= THRESHOLDS["delta_s_dot"]["critical"]:
            issues.append(f"ΔṠ 급등: {delta_s_dot:.2f} (임계값: {THRESHOLDS['delta_s_dot']['critical']})")
            status = DiagnosisStatus.CRITICAL
        elif delta_s_dot >= THRESHOLDS["delta_s_dot"]["warning"]:
            warnings.append(f"ΔṠ 상승: {delta_s_dot:.2f}")
            if status == DiagnosisStatus.HEALTHY:
                status = DiagnosisStatus.WARNING
        
        # Safety Guard 트리거 분석
        safety_triggers = metrics.get("safety_triggers", 0)
        if safety_triggers >= THRESHOLDS["safety_triggers"]["critical"]:
            issues.append(f"Safety Guard 과다 트리거: {safety_triggers}회")
            status = DiagnosisStatus.CRITICAL
        elif safety_triggers >= THRESHOLDS["safety_triggers"]["warning"]:
            warnings.append(f"Safety Guard 빈번한 트리거: {safety_triggers}회")
            if status == DiagnosisStatus.HEALTHY:
                status = DiagnosisStatus.WARNING
        
        # 에러율 분석
        error_rate = metrics.get("error_rate", 0)
        if error_rate >= THRESHOLDS["error_rate"]["critical"]:
            issues.append(f"에러율 위험: {error_rate*100:.1f}%")
            status = DiagnosisStatus.CRITICAL
        elif error_rate >= THRESHOLDS["error_rate"]["warning"]:
            warnings.append(f"에러율 상승: {error_rate*100:.1f}%")
            if status == DiagnosisStatus.HEALTHY:
                status = DiagnosisStatus.WARNING
        
        # 지연 시간 분석
        latency_ms = metrics.get("avg_latency_ms", 0)
        if latency_ms >= THRESHOLDS["latency_ms"]["critical"]:
            issues.append(f"응답 지연 심각: {latency_ms:.0f}ms")
            status = DiagnosisStatus.CRITICAL
        elif latency_ms >= THRESHOLDS["latency_ms"]["warning"]:
            warnings.append(f"응답 지연 발생: {latency_ms:.0f}ms")
            if status == DiagnosisStatus.HEALTHY:
                status = DiagnosisStatus.WARNING
        
        return status, issues, warnings
    
    def _recommend_actions(self, status: DiagnosisStatus, issues: list[str], metrics: dict) -> list[FixAction]:
        """수정 액션 추천"""
        actions = []
        
        if status == DiagnosisStatus.CRITICAL:
            # 긴급 조치
            if metrics.get("inertia_debt", 0) >= THRESHOLDS["inertia_debt"]["critical"]:
                actions.append(FixAction.THROTTLE)
                actions.append(FixAction.ALERT)
            
            if metrics.get("delta_s_dot", 0) >= THRESHOLDS["delta_s_dot"]["critical"]:
                actions.append(FixAction.SCALE_LOCK)
                actions.append(FixAction.ALERT)
            
            if metrics.get("safety_triggers", 0) >= THRESHOLDS["safety_triggers"]["critical"]:
                actions.append(FixAction.CACHE_CLEAR)
        
        elif status == DiagnosisStatus.WARNING:
            # 예방 조치
            if metrics.get("avg_latency_ms", 0) >= THRESHOLDS["latency_ms"]["warning"]:
                actions.append(FixAction.CACHE_CLEAR)
            
            if metrics.get("error_rate", 0) >= THRESHOLDS["error_rate"]["warning"]:
                actions.append(FixAction.MODULE_RELOAD)
        
        if not actions:
            actions.append(FixAction.NONE)
        
        return actions
    
    def _generate_summary(self, status: DiagnosisStatus, issues: list[str], warnings: list[str], metrics: dict) -> str:
        """보고서 요약 생성"""
        status_emoji = {
            DiagnosisStatus.HEALTHY: "✅",
            DiagnosisStatus.WARNING: "⚠️",
            DiagnosisStatus.CRITICAL: "🚨",
            DiagnosisStatus.UNKNOWN: "❓",
        }
        
        lines = [
            f"{status_emoji[status]} AUTUS 자기 진단 보고서",
            f"시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"상태: {status.value.upper()}",
            "",
        ]
        
        # 주요 지표
        lines.append("📊 주요 지표:")
        lines.append(f"  - Stability Score: {metrics.get('stability_score', 0):.2f}")
        lines.append(f"  - Inertia Debt: {metrics.get('inertia_debt', 0):.2f}")
        lines.append(f"  - ΔṠ: {metrics.get('delta_s_dot', 0):.2f}")
        lines.append(f"  - Safety Triggers: {metrics.get('safety_triggers', 0)}")
        lines.append("")
        
        # 문제점
        if issues:
            lines.append("🚨 발견된 문제:")
            for issue in issues:
                lines.append(f"  - {issue}")
            lines.append("")
        
        # 경고
        if warnings:
            lines.append("⚠️ 경고:")
            for warning in warnings:
                lines.append(f"  - {warning}")
            lines.append("")
        
        # 건강한 경우
        if status == DiagnosisStatus.HEALTHY:
            lines.append("✅ 모든 시스템이 정상 작동 중입니다.")
        
        return "\n".join(lines)
    
    async def run(self, metrics: dict) -> DiagnosisResult:
        """
        진단 실행
        
        Args:
            metrics: 시스템 메트릭 딕셔너리
                - stability_score: float
                - inertia_debt: float
                - delta_s_dot: float
                - safety_triggers: int
                - error_rate: float
                - avg_latency_ms: float
                - module_count: int
        
        Returns:
            DiagnosisResult: 진단 결과
        """
        start_time = datetime.now()
        
        # 규칙 기반 분석
        status, issues, warnings = self._analyze_metrics(metrics)
        
        # 액션 추천
        recommended_actions = self._recommend_actions(status, issues, metrics)
        
        # 요약 생성
        summary = self._generate_summary(status, issues, warnings, metrics)
        
        # LLM 기반 상세 분석 (선택적)
        detailed_report = summary
        agent_outputs = {}
        
        if self.use_llm and (status == DiagnosisStatus.WARNING or status == DiagnosisStatus.CRITICAL):
            try:
                from crewai import Task, Crew, Process
                
                # 분석 태스크
                analysis_task = Task(
                    description=f"""
                    AUTUS 시스템 메트릭을 분석하세요:
                    
                    메트릭:
                    {metrics}
                    
                    발견된 문제:
                    {issues}
                    
                    경고:
                    {warnings}
                    
                    근본 원인을 분석하고, 추가적인 문제가 있는지 확인하세요.
                    """,
                    expected_output="상세 분석 결과 (원인, 영향, 권장 조치)",
                    agent=self.analyzer,
                )
                
                # 보고서 태스크
                report_task = Task(
                    description="분석 결과를 바탕으로 경영진에게 보고할 수 있는 명확한 보고서를 작성하세요.",
                    expected_output="1페이지 요약 보고서",
                    agent=self.reporter,
                )
                
                # Crew 실행
                crew = Crew(
                    agents=[self.analyzer, self.reporter],
                    tasks=[analysis_task, report_task],
                    process=Process.sequential,
                    verbose=False,
                )
                
                result = crew.kickoff(inputs={"metrics": str(metrics)})
                detailed_report = str(result)
                agent_outputs["crew_result"] = str(result)
                
            except Exception as e:
                logger.error(f"LLM 분석 실패: {e}")
                agent_outputs["error"] = str(e)
        
        # 결과 생성
        end_time = datetime.now()
        duration_ms = (end_time - start_time).total_seconds() * 1000
        
        return DiagnosisResult(
            timestamp=start_time,
            status=status,
            issues=issues,
            warnings=warnings,
            metrics_summary=metrics,
            summary=summary,
            detailed_report=detailed_report,
            recommended_actions=recommended_actions,
            duration_ms=duration_ms,
            agent_outputs=agent_outputs,
        )
    
    def run_sync(self, metrics: dict) -> DiagnosisResult:
        """동기 진단 실행"""
        import asyncio
        return asyncio.run(self.run(metrics))


# 편의 함수
async def run_diagnosis(metrics: dict, use_llm: bool = False) -> DiagnosisResult:
    """
    빠른 진단 실행
    
    Args:
        metrics: 시스템 메트릭
        use_llm: LLM 사용 여부
    
    Returns:
        DiagnosisResult: 진단 결과
    """
    agent = SelfDiagnoseAgent(use_llm=use_llm)
    return await agent.run(metrics)


def run_diagnosis_sync(metrics: dict, use_llm: bool = False) -> DiagnosisResult:
    """동기 빠른 진단"""
    import asyncio
    return asyncio.run(run_diagnosis(metrics, use_llm))


# 전역 진단 에이전트 (싱글톤)
_global_agent: Optional[SelfDiagnoseAgent] = None


def get_diagnose_agent(use_llm: bool = False) -> SelfDiagnoseAgent:
    """전역 진단 에이전트 반환"""
    global _global_agent
    if _global_agent is None:
        _global_agent = SelfDiagnoseAgent(use_llm=use_llm)
    return _global_agent
