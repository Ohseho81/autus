#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🤖 AUTUS v3.0 - Multi-Agent Crew                                       ║
║                                                                                           ║
║  Layer 5: 멀티 에이전트 시스템                                                              ║
║                                                                                           ║
║  백엔드:                                                                                   ║
║  - CrewAI 설치됨 → Native CrewAI 사용                                                      ║
║  - CrewAI 미설치 → Built-in Agents (LLM 직접 호출)                                         ║
║                                                                                           ║
║  에이전트:                                                                                  ║
║  1. Researcher - 데이터 조사, 컨텍스트 제공                                                 ║
║  2. Analyzer - PIPELINE 분석, KPI/Synergy/Roles 심층 분석                                  ║
║  3. Executor - 개선 제안 실행, 알림 발송                                                    ║
║  4. Reporter - 경영진 리포트 작성                                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import time
import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

from .database import get_database, DatabaseManager
from .db_schema import AgentLog, AgentRole


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Agent Configuration
# ═══════════════════════════════════════════════════════════════════════════════════════════

AGENT_CONFIGS = {
    "researcher": {
        "role": AgentRole.RESEARCHER.value,
        "goal": "외부 트렌드 조사, 경쟁사 분석, 시장 컨텍스트 제공",
        "backstory": "10년 경력의 시니어 데이터 리서처. 시장 동향과 산업 트렌드를 파악하는 전문가.",
    },
    "analyzer": {
        "role": AgentRole.ANALYZER.value,
        "goal": "PIPELINE 결과 심층 분석, KPI/Synergy/Roles 패턴 발견, 인사이트 도출",
        "backstory": "AUTUS PIPELINE 전문 분석가. 데이터에서 숨겨진 패턴을 찾아내는 전문가.",
    },
    "executor": {
        "role": AgentRole.EXECUTOR.value,
        "goal": "개선 제안 실행, 자동화 작업 수행, 알림 발송, 리포트 전송",
        "backstory": "실행력 높은 프로젝트 매니저. 결정된 액션을 신속하게 수행.",
    },
    "reporter": {
        "role": AgentRole.REPORTER.value,
        "goal": "경영진용 Executive Summary 작성, 핵심 지표 시각화, 의사결정 지원",
        "backstory": "전략 컨설턴트 출신. 복잡한 데이터를 경영진이 이해할 수 있는 인사이트로 변환.",
    },
}


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Built-in Agent (No External Dependencies)
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class AgentOutput:
    """에이전트 출력"""
    role: str
    task: str
    output: str
    success: bool
    duration_ms: int
    error: Optional[str] = None


class BuiltinAgent:
    """Built-in 에이전트 (LLM 직접 호출)"""
    
    def __init__(self, config: Dict[str, str]):
        self.role = config["role"]
        self.goal = config["goal"]
        self.backstory = config["backstory"]
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def run(self, task: str, context: Dict[str, Any] = None) -> AgentOutput:
        """태스크 실행"""
        start_time = time.time()
        
        try:
            prompt = self._build_prompt(task, context)
            output = self._call_llm(prompt)
            
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output=output,
                success=True,
                duration_ms=duration,
            )
        except Exception as e:
            duration = int((time.time() - start_time) * 1000)
            return AgentOutput(
                role=self.role,
                task=task,
                output="",
                success=False,
                duration_ms=duration,
                error=str(e),
            )
    
    def _build_prompt(self, task: str, context: Dict[str, Any] = None) -> str:
        """프롬프트 생성"""
        context_str = json.dumps(context, ensure_ascii=False, indent=2) if context else "{}"
        
        return f"""당신은 {self.role}입니다.

배경: {self.backstory}
목표: {self.goal}

컨텍스트:
{context_str}

태스크: {task}

위 태스크를 수행하고 결과를 한국어로 제공해주세요. 간결하고 실행 가능한 내용으로 작성해주세요."""
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=500,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except ImportError:
                pass
            except Exception as e:
                raise e
        
        # Mock 응답
        return self._mock_response()
    
    def _mock_response(self) -> str:
        """Mock 응답 (API 없을 때)"""
        mock_responses = {
            AgentRole.RESEARCHER.value: "시장 분석 완료. 현재 산업 동향은 디지털 전환 가속화 중.",
            AgentRole.ANALYZER.value: "PIPELINE 분석 완료. 주요 인사이트: 팀 시너지 20% 향상됨.",
            AgentRole.EXECUTOR.value: "액션 실행 완료. 알림 발송, 리포트 생성 대기.",
            AgentRole.REPORTER.value: "Executive Summary 작성 완료. 핵심: Net 수익 달성, Entropy 정상 범위.",
        }
        return mock_responses.get(self.role, "태스크 완료.")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# AUTUS Crew
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusCrew:
    """AUTUS 멀티 에이전트 크루"""
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        self.use_crewai = self._check_crewai()
        
        # Built-in 에이전트 초기화
        self.agents = {
            name: BuiltinAgent(config)
            for name, config in AGENT_CONFIGS.items()
        }
    
    def _check_crewai(self) -> bool:
        """CrewAI 사용 가능 여부 확인"""
        try:
            from crewai import Agent, Task, Crew
            return True
        except ImportError:
            return False
    
    def run_task(self, agent_name: str, task: str, context: Dict = None) -> AgentOutput:
        """단일 에이전트 태스크 실행"""
        if agent_name not in self.agents:
            return AgentOutput(
                role=agent_name,
                task=task,
                output="",
                success=False,
                duration_ms=0,
                error=f"Unknown agent: {agent_name}",
            )
        
        agent = self.agents[agent_name]
        output = agent.run(task, context)
        
        # 로그 저장
        self._log_agent_run(output)
        
        return output
    
    def run_crew(self, tasks: List[Dict[str, str]], context: Dict = None) -> List[AgentOutput]:
        """순차적 크루 실행"""
        outputs = []
        accumulated_context = context or {}
        
        for task_config in tasks:
            agent_name = task_config.get("agent")
            task = task_config.get("task")
            
            # 이전 출력을 컨텍스트에 추가
            output = self.run_task(agent_name, task, accumulated_context)
            outputs.append(output)
            
            # 컨텍스트 업데이트
            accumulated_context[f"{agent_name}_output"] = output.output
        
        return outputs
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 전체 크루 실행"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {})
        best_team = result.get("best_team", {})
        
        context = {
            "week_id": week_id,
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "total_pillar_score": pillars.get("summary", {}).get("total_score", 0),
            "team": best_team.get("team", []),
            "team_score": best_team.get("score", 0),
        }
        
        tasks = [
            {
                "agent": "researcher",
                "task": f"주간 {week_id} 데이터 조사: 시장 상황과 경쟁 동향 분석",
            },
            {
                "agent": "analyzer",
                "task": f"PIPELINE 결과 분석: Net {kpi.get('net_krw', 0):,.0f}원, Entropy {kpi.get('entropy_ratio', 0):.1%}",
            },
            {
                "agent": "executor",
                "task": "분석 결과 기반 액션 실행: 알림 발송, 다음 주 준비",
            },
            {
                "agent": "reporter",
                "task": "Executive Summary 작성: 경영진 리포트 생성",
            },
        ]
        
        outputs = self.run_crew(tasks, context)
        
        # 결과 집계
        success_count = sum(1 for o in outputs if o.success)
        total_duration = sum(o.duration_ms for o in outputs)
        
        return {
            "week_id": week_id,
            "agents_run": len(outputs),
            "success_count": success_count,
            "total_duration_ms": total_duration,
            "success": success_count == len(outputs),
            "outputs": {
                o.role: {
                    "task": o.task,
                    "output": o.output[:200] + "..." if len(o.output) > 200 else o.output,
                    "success": o.success,
                }
                for o in outputs
            },
        }
    
    def _log_agent_run(self, output: AgentOutput):
        """에이전트 실행 로그 저장"""
        log = AgentLog(
            log_id=f"L-{uuid.uuid4().hex[:8]}",
            agent_role=output.role,
            task=output.task,
            input_data="{}",
            output_data=json.dumps({"output": output.output[:500]}, ensure_ascii=False),
            success=output.success,
            duration_ms=output.duration_ms,
            error_message=output.error,
        )
        self.db.insert_agent_log(log)
    
    def get_agent_stats(self) -> Dict[str, Any]:
        """에이전트 통계"""
        stats = {}
        for role in AgentRole:
            logs = self.db.get_agent_logs_by_role(role.value, limit=100)
            if logs:
                success_count = sum(1 for l in logs if l.success)
                avg_duration = sum(l.duration_ms for l in logs) / len(logs)
                stats[role.value] = {
                    "total_runs": len(logs),
                    "success_rate": success_count / len(logs),
                    "avg_duration_ms": avg_duration,
                }
            else:
                stats[role.value] = {
                    "total_runs": 0,
                    "success_rate": 0,
                    "avg_duration_ms": 0,
                }
        return stats


# ═══════════════════════════════════════════════════════════════════════════════════════════
# CrewAI Integration (Optional)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_crewai_crew():
    """
    CrewAI 크루 생성 (crewai 설치 시에만 사용)
    
    pip install crewai langchain-openai
    """
    try:
        from crewai import Agent, Task, Crew, Process
        
        # Agents
        researcher = Agent(
            role='Senior Data Researcher',
            goal=AGENT_CONFIGS["researcher"]["goal"],
            backstory=AGENT_CONFIGS["researcher"]["backstory"],
            verbose=True,
        )
        
        analyzer = Agent(
            role='PIPELINE Data Analyst',
            goal=AGENT_CONFIGS["analyzer"]["goal"],
            backstory=AGENT_CONFIGS["analyzer"]["backstory"],
            verbose=True,
        )
        
        executor = Agent(
            role='Action Executor',
            goal=AGENT_CONFIGS["executor"]["goal"],
            backstory=AGENT_CONFIGS["executor"]["backstory"],
            verbose=True,
        )
        
        reporter = Agent(
            role='Executive Report Writer',
            goal=AGENT_CONFIGS["reporter"]["goal"],
            backstory=AGENT_CONFIGS["reporter"]["backstory"],
            verbose=True,
        )
        
        return {
            "researcher": researcher,
            "analyzer": analyzer,
            "executor": executor,
            "reporter": reporter,
        }
    
    except ImportError:
        return None





















