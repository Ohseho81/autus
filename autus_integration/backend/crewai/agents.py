# backend/crewai/agents.py
# CrewAI 3명 에이전트 (삭제/자동화/외부용역)

from crewai import Agent, Task, Crew, Process
from typing import Dict, List, Any
import os

class AutusAgents:
    """
    AUTUS CrewAI 에이전트 시스템
    
    3명의 전문 에이전트:
    1. 삭제 전문가 (DELETE) - 가치 ≤ 0 노드 제거
    2. 자동화 전문가 (AUTOMATE) - 시너지 연결 강화
    3. 외부용역 전문가 (OUTSOURCE) - 고가치 노드 도입
    """
    
    def __init__(self):
        self.llm = self._get_llm()
        self._init_agents()
        self._init_tasks()
        self._init_crew()
    
    def _get_llm(self):
        """LLM 설정 (우선순위: Claude > GPT > Groq)"""
        try:
            from langchain_anthropic import ChatAnthropic
            if os.getenv("ANTHROPIC_API_KEY"):
                return ChatAnthropic(model="claude-3-5-sonnet-20241022")
        except:
            pass
        
        try:
            from langchain_openai import ChatOpenAI
            if os.getenv("OPENAI_API_KEY"):
                return ChatOpenAI(model="gpt-4o")
        except:
            pass
        
        try:
            from langchain_groq import ChatGroq
            if os.getenv("GROQ_API_KEY"):
                return ChatGroq(model="llama-3.3-70b-versatile")
        except:
            pass
        
        return None
    
    def _init_agents(self):
        """에이전트 초기화"""
        
        # 1. 삭제 전문가
        self.delete_agent = Agent(
            role="삭제 전문가 (DELETE Specialist)",
            goal="가치 ≤ 0인 노드를 찾아 돈 유출을 즉시 차단한다",
            backstory="""
            아우투스 철학에 따라 돈을 빼앗는 모든 것을 무자비하게 제거한다.
            - 엔트로피 법칙: 무질서(손실) 최소화
            - 삭제 기준: 이 노드가 돈 흐름을 10x 하지 않으면 삭제
            - Zero Meaning: 의미/판단 없이 숫자로만 결정
            """,
            llm=self.llm,
            verbose=False,
            allow_delegation=False
        )
        
        # 2. 자동화 전문가
        self.automate_agent = Agent(
            role="자동화 전문가 (AUTOMATE Specialist)",
            goal="시너지 높은 연결을 자동화해 시간 비용을 0으로 만든다",
            backstory="""
            반복되는 모든 모션은 기계가 더 잘한다.
            - 운동량 보존: 시간 비용 T → 0
            - 시너지 공식: S = Σ(connected_value × rate^depth)
            - 자동화 대상: 반복 빈도 > 3회/주
            """,
            llm=self.llm,
            verbose=False,
            allow_delegation=False
        )
        
        # 3. 외부용역 전문가
        self.outsource_agent = Agent(
            role="외부용역 전문가 (OUTSOURCE Specialist)",
            goal="고가치 외부 노드를 도입해 돈을 폭발적으로 가속한다",
            backstory="""
            내부 한계를 넘어 외부 최고 전문가를 연결한다.
            - 중력 법칙: 큰 질량(가치)이 더 많이 끌어당김
            - 도입 기준: 예상 ROI > 300%
            - 연결 효과: (1 + s)^t 복리 가속
            """,
            llm=self.llm,
            verbose=False,
            allow_delegation=False
        )
    
    def _init_tasks(self):
        """태스크 정의"""
        
        self.task_delete = Task(
            description="""
            데이터를 분석하여:
            1. 가치 ≤ 0 노드 식별
            2. 삭제 시 예상 돈 증가액 계산
            3. 삭제 우선순위 제안
            
            출력 형식 (JSON):
            {
                "targets": [{"id": "...", "current_value": 0, "monthly_loss": 0}],
                "total_monthly_savings": 0,
                "priority": "high/medium/low"
            }
            """,
            expected_output="삭제 대상 목록과 월 예상 절약액 (JSON)",
            agent=self.delete_agent
        )
        
        self.task_automate = Task(
            description="""
            데이터를 분석하여:
            1. 반복 빈도 높은 모션 식별
            2. 자동화 시 시간 비용 절감액 계산
            3. 시너지 증가 예측
            
            출력 형식 (JSON):
            {
                "automations": [{"motion": "...", "frequency": 0, "time_saved_hours": 0}],
                "total_monthly_synergy_gain": 0,
                "implementation": "n8n/webhook/cron"
            }
            """,
            expected_output="자동화 대상과 월 예상 시너지 증가액 (JSON)",
            agent=self.automate_agent
        )
        
        self.task_outsource = Task(
            description="""
            데이터를 분석하여:
            1. 부족한 역량 식별
            2. 도입 가능한 외부 전문가 제안
            3. 예상 ROI 계산
            
            출력 형식 (JSON):
            {
                "recommendations": [{"role": "...", "expected_value": 0, "cost": 0, "roi": 0}],
                "total_monthly_acceleration": 0,
                "connection_strategy": "..."
            }
            """,
            expected_output="추천 외부 노드와 월 예상 돈 가속액 (JSON)",
            agent=self.outsource_agent
        )
    
    def _init_crew(self):
        """Crew 구성"""
        self.crew = Crew(
            agents=[self.delete_agent, self.automate_agent, self.outsource_agent],
            tasks=[self.task_delete, self.task_automate, self.task_outsource],
            process=Process.sequential,
            verbose=True
        )
    
    def analyze(self, nodes: List[Dict], motions: List[Dict]) -> Dict[str, Any]:
        """
        전체 분석 실행
        
        Args:
            nodes: 노드 리스트 [{id, value, ...}]
            motions: 모션 리스트 [{source, target, amount, ...}]
        
        Returns:
            분석 결과 (삭제/자동화/외부용역 제안)
        """
        if not self.llm:
            return self._mock_analysis(nodes, motions)
        
        # 데이터 요약 생성
        data_summary = self._create_summary(nodes, motions)
        
        # CrewAI 실행
        try:
            result = self.crew.kickoff(inputs={"data": data_summary})
            return {
                "success": True,
                "analysis": str(result),
                "summary": data_summary
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback": self._mock_analysis(nodes, motions)
            }
    
    def _create_summary(self, nodes: List[Dict], motions: List[Dict]) -> str:
        """LLM 입력용 데이터 요약"""
        total_value = sum(n.get('value', 0) for n in nodes)
        total_flow = sum(abs(m.get('amount', 0)) for m in motions)
        
        # 저가치 노드 식별
        low_value_nodes = [n for n in nodes if n.get('value', 0) <= 0]
        
        # 고빈도 모션 식별 (동일 source-target 카운트)
        motion_counts = {}
        for m in motions:
            key = f"{m.get('source')}->{m.get('target')}"
            motion_counts[key] = motion_counts.get(key, 0) + 1
        high_freq_motions = [(k, v) for k, v in motion_counts.items() if v >= 3]
        
        return f"""
=== AUTUS 데이터 요약 ===
총 노드 수: {len(nodes)}
총 모션 수: {len(motions)}
총 가치: ₩{total_value:,.0f}
총 돈 흐름: ₩{total_flow:,.0f}

저가치 노드 (value ≤ 0): {len(low_value_nodes)}개
- {', '.join([n.get('id', 'unknown') for n in low_value_nodes[:5]])}

고빈도 모션 (≥3회): {len(high_freq_motions)}개
- {', '.join([f"{k}({v}회)" for k, v in high_freq_motions[:5]])}

상위 5 노드:
{chr(10).join([f"- {n.get('id')}: ₩{n.get('value', 0):,.0f}" for n in sorted(nodes, key=lambda x: x.get('value', 0), reverse=True)[:5]])}
"""
    
    def _mock_analysis(self, nodes: List[Dict], motions: List[Dict]) -> Dict:
        """LLM 없을 때 규칙 기반 분석"""
        # 삭제 대상
        delete_targets = [
            {"id": n.get('id'), "value": n.get('value', 0)}
            for n in nodes if n.get('value', 0) <= 0
        ]
        
        # 자동화 대상 (고빈도 모션)
        motion_counts = {}
        for m in motions:
            key = f"{m.get('source')}->{m.get('target')}"
            motion_counts[key] = motion_counts.get(key, 0) + 1
        
        automate_targets = [
            {"motion": k, "frequency": v}
            for k, v in motion_counts.items() if v >= 3
        ]
        
        # 외부용역 (상위 노드 분석)
        top_nodes = sorted(nodes, key=lambda x: x.get('value', 0), reverse=True)[:3]
        
        return {
            "success": True,
            "delete": {
                "targets": delete_targets,
                "monthly_savings": len(delete_targets) * 500000  # 추정
            },
            "automate": {
                "targets": automate_targets,
                "monthly_synergy_gain": len(automate_targets) * 1000000  # 추정
            },
            "outsource": {
                "recommendations": [
                    {"role": "마케팅 전문가", "expected_roi": 300},
                    {"role": "영업 전문가", "expected_roi": 250}
                ],
                "monthly_acceleration": 3000000  # 추정
            },
            "total_monthly_impact": (
                len(delete_targets) * 500000 +
                len(automate_targets) * 1000000 +
                3000000
            )
        }



# backend/crewai/agents.py
# CrewAI 3명 에이전트 (삭제/자동화/외부용역)

from crewai import Agent, Task, Crew, Process
from typing import Dict, List, Any
import os

class AutusAgents:
    """
    AUTUS CrewAI 에이전트 시스템
    
    3명의 전문 에이전트:
    1. 삭제 전문가 (DELETE) - 가치 ≤ 0 노드 제거
    2. 자동화 전문가 (AUTOMATE) - 시너지 연결 강화
    3. 외부용역 전문가 (OUTSOURCE) - 고가치 노드 도입
    """
    
    def __init__(self):
        self.llm = self._get_llm()
        self._init_agents()
        self._init_tasks()
        self._init_crew()
    
    def _get_llm(self):
        """LLM 설정 (우선순위: Claude > GPT > Groq)"""
        try:
            from langchain_anthropic import ChatAnthropic
            if os.getenv("ANTHROPIC_API_KEY"):
                return ChatAnthropic(model="claude-3-5-sonnet-20241022")
        except:
            pass
        
        try:
            from langchain_openai import ChatOpenAI
            if os.getenv("OPENAI_API_KEY"):
                return ChatOpenAI(model="gpt-4o")
        except:
            pass
        
        try:
            from langchain_groq import ChatGroq
            if os.getenv("GROQ_API_KEY"):
                return ChatGroq(model="llama-3.3-70b-versatile")
        except:
            pass
        
        return None
    
    def _init_agents(self):
        """에이전트 초기화"""
        
        # 1. 삭제 전문가
        self.delete_agent = Agent(
            role="삭제 전문가 (DELETE Specialist)",
            goal="가치 ≤ 0인 노드를 찾아 돈 유출을 즉시 차단한다",
            backstory="""
            아우투스 철학에 따라 돈을 빼앗는 모든 것을 무자비하게 제거한다.
            - 엔트로피 법칙: 무질서(손실) 최소화
            - 삭제 기준: 이 노드가 돈 흐름을 10x 하지 않으면 삭제
            - Zero Meaning: 의미/판단 없이 숫자로만 결정
            """,
            llm=self.llm,
            verbose=False,
            allow_delegation=False
        )
        
        # 2. 자동화 전문가
        self.automate_agent = Agent(
            role="자동화 전문가 (AUTOMATE Specialist)",
            goal="시너지 높은 연결을 자동화해 시간 비용을 0으로 만든다",
            backstory="""
            반복되는 모든 모션은 기계가 더 잘한다.
            - 운동량 보존: 시간 비용 T → 0
            - 시너지 공식: S = Σ(connected_value × rate^depth)
            - 자동화 대상: 반복 빈도 > 3회/주
            """,
            llm=self.llm,
            verbose=False,
            allow_delegation=False
        )
        
        # 3. 외부용역 전문가
        self.outsource_agent = Agent(
            role="외부용역 전문가 (OUTSOURCE Specialist)",
            goal="고가치 외부 노드를 도입해 돈을 폭발적으로 가속한다",
            backstory="""
            내부 한계를 넘어 외부 최고 전문가를 연결한다.
            - 중력 법칙: 큰 질량(가치)이 더 많이 끌어당김
            - 도입 기준: 예상 ROI > 300%
            - 연결 효과: (1 + s)^t 복리 가속
            """,
            llm=self.llm,
            verbose=False,
            allow_delegation=False
        )
    
    def _init_tasks(self):
        """태스크 정의"""
        
        self.task_delete = Task(
            description="""
            데이터를 분석하여:
            1. 가치 ≤ 0 노드 식별
            2. 삭제 시 예상 돈 증가액 계산
            3. 삭제 우선순위 제안
            
            출력 형식 (JSON):
            {
                "targets": [{"id": "...", "current_value": 0, "monthly_loss": 0}],
                "total_monthly_savings": 0,
                "priority": "high/medium/low"
            }
            """,
            expected_output="삭제 대상 목록과 월 예상 절약액 (JSON)",
            agent=self.delete_agent
        )
        
        self.task_automate = Task(
            description="""
            데이터를 분석하여:
            1. 반복 빈도 높은 모션 식별
            2. 자동화 시 시간 비용 절감액 계산
            3. 시너지 증가 예측
            
            출력 형식 (JSON):
            {
                "automations": [{"motion": "...", "frequency": 0, "time_saved_hours": 0}],
                "total_monthly_synergy_gain": 0,
                "implementation": "n8n/webhook/cron"
            }
            """,
            expected_output="자동화 대상과 월 예상 시너지 증가액 (JSON)",
            agent=self.automate_agent
        )
        
        self.task_outsource = Task(
            description="""
            데이터를 분석하여:
            1. 부족한 역량 식별
            2. 도입 가능한 외부 전문가 제안
            3. 예상 ROI 계산
            
            출력 형식 (JSON):
            {
                "recommendations": [{"role": "...", "expected_value": 0, "cost": 0, "roi": 0}],
                "total_monthly_acceleration": 0,
                "connection_strategy": "..."
            }
            """,
            expected_output="추천 외부 노드와 월 예상 돈 가속액 (JSON)",
            agent=self.outsource_agent
        )
    
    def _init_crew(self):
        """Crew 구성"""
        self.crew = Crew(
            agents=[self.delete_agent, self.automate_agent, self.outsource_agent],
            tasks=[self.task_delete, self.task_automate, self.task_outsource],
            process=Process.sequential,
            verbose=True
        )
    
    def analyze(self, nodes: List[Dict], motions: List[Dict]) -> Dict[str, Any]:
        """
        전체 분석 실행
        
        Args:
            nodes: 노드 리스트 [{id, value, ...}]
            motions: 모션 리스트 [{source, target, amount, ...}]
        
        Returns:
            분석 결과 (삭제/자동화/외부용역 제안)
        """
        if not self.llm:
            return self._mock_analysis(nodes, motions)
        
        # 데이터 요약 생성
        data_summary = self._create_summary(nodes, motions)
        
        # CrewAI 실행
        try:
            result = self.crew.kickoff(inputs={"data": data_summary})
            return {
                "success": True,
                "analysis": str(result),
                "summary": data_summary
            }
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "fallback": self._mock_analysis(nodes, motions)
            }
    
    def _create_summary(self, nodes: List[Dict], motions: List[Dict]) -> str:
        """LLM 입력용 데이터 요약"""
        total_value = sum(n.get('value', 0) for n in nodes)
        total_flow = sum(abs(m.get('amount', 0)) for m in motions)
        
        # 저가치 노드 식별
        low_value_nodes = [n for n in nodes if n.get('value', 0) <= 0]
        
        # 고빈도 모션 식별 (동일 source-target 카운트)
        motion_counts = {}
        for m in motions:
            key = f"{m.get('source')}->{m.get('target')}"
            motion_counts[key] = motion_counts.get(key, 0) + 1
        high_freq_motions = [(k, v) for k, v in motion_counts.items() if v >= 3]
        
        return f"""
=== AUTUS 데이터 요약 ===
총 노드 수: {len(nodes)}
총 모션 수: {len(motions)}
총 가치: ₩{total_value:,.0f}
총 돈 흐름: ₩{total_flow:,.0f}

저가치 노드 (value ≤ 0): {len(low_value_nodes)}개
- {', '.join([n.get('id', 'unknown') for n in low_value_nodes[:5]])}

고빈도 모션 (≥3회): {len(high_freq_motions)}개
- {', '.join([f"{k}({v}회)" for k, v in high_freq_motions[:5]])}

상위 5 노드:
{chr(10).join([f"- {n.get('id')}: ₩{n.get('value', 0):,.0f}" for n in sorted(nodes, key=lambda x: x.get('value', 0), reverse=True)[:5]])}
"""
    
    def _mock_analysis(self, nodes: List[Dict], motions: List[Dict]) -> Dict:
        """LLM 없을 때 규칙 기반 분석"""
        # 삭제 대상
        delete_targets = [
            {"id": n.get('id'), "value": n.get('value', 0)}
            for n in nodes if n.get('value', 0) <= 0
        ]
        
        # 자동화 대상 (고빈도 모션)
        motion_counts = {}
        for m in motions:
            key = f"{m.get('source')}->{m.get('target')}"
            motion_counts[key] = motion_counts.get(key, 0) + 1
        
        automate_targets = [
            {"motion": k, "frequency": v}
            for k, v in motion_counts.items() if v >= 3
        ]
        
        # 외부용역 (상위 노드 분석)
        top_nodes = sorted(nodes, key=lambda x: x.get('value', 0), reverse=True)[:3]
        
        return {
            "success": True,
            "delete": {
                "targets": delete_targets,
                "monthly_savings": len(delete_targets) * 500000  # 추정
            },
            "automate": {
                "targets": automate_targets,
                "monthly_synergy_gain": len(automate_targets) * 1000000  # 추정
            },
            "outsource": {
                "recommendations": [
                    {"role": "마케팅 전문가", "expected_roi": 300},
                    {"role": "영업 전문가", "expected_roi": 250}
                ],
                "monthly_acceleration": 3000000  # 추정
            },
            "total_monthly_impact": (
                len(delete_targets) * 500000 +
                len(automate_targets) * 1000000 +
                3000000
            )
        }








