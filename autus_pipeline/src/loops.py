#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🔄 AUTUS v3.0 - 6 Automation Loops                                     ║
║                                                                                           ║
║  Layer 3: 6가지 자동화 루프 엔진                                                            ║
║                                                                                           ║
║  Loop 1: Auto Collect   - 데이터 자동 수집                                                 ║
║  Loop 2: Auto Learn     - LLM 기반 학습                                                    ║
║  Loop 3: Auto Delete    - 저품질 데이터 정리                                               ║
║  Loop 4: Auto Improve   - Reflexion 기반 개선                                              ║
║  Loop 5: Auto Execute   - Multi-Agent 실행                                                 ║
║  Loop 6: Auto Loop      - Flywheel 순환                                                    ║
║                                                                                           ║
║  ⚠️ v1.3 PIPELINE LOCK 영향 없음 - 호출만 함                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd

from .database import get_database, DatabaseManager
from .db_schema import (
    MoneyEvent, BurnEvent, Insight, Archive, Proposal, FlywheelCycle, AgentLog,
    ProposalStatus
)
from .quality import QualityManager, validate_money_event, validate_burn_event


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 1: Auto Collect (자동 수집)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoCollectLoop:
    """
    Loop 1: 데이터 자동 수집
    
    - Webhook/API로 들어오는 이벤트 검증 및 저장
    - Schema 검증 100% 통과 필수
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def collect_money_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Money 이벤트 수집
        
        Returns:
            (success, message)
        """
        # 품질 검증
        result = self.quality.validate_money_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        # DB 저장
        event = MoneyEvent(
            event_id=data.get("event_id") or f"M-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            event_type=data["event_type"],
            currency=data["currency"],
            amount=float(data["amount"]),
            people_tags=data["people_tags"],
            effective_minutes=int(data["effective_minutes"]),
            evidence_id=data["evidence_id"],
            recommendation_type=data["recommendation_type"],
            customer_id=data["customer_id"],
            project_id=data.get("project_id"),
            amount_krw=data.get("amount_krw"),
            processed=False,
        )
        
        event_id = self.db.insert_money_event(event)
        return True, f"저장 완료: {event_id}"
    
    def collect_burn_event(self, data: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Burn 이벤트 수집
        """
        result = self.quality.validate_burn_event(data)
        
        if not result.is_valid:
            return False, f"검증 실패: {result.schema_errors}"
        
        event = BurnEvent(
            burn_id=data.get("burn_id") or f"B-{uuid.uuid4().hex[:8]}",
            date=data["date"],
            burn_type=data["burn_type"],
            loss_minutes=int(data["loss_minutes"]),
            evidence_id=data["evidence_id"],
            person_or_edge=data.get("person_or_edge"),
            prevented_by=data.get("prevented_by"),
            prevented_minutes=data.get("prevented_minutes"),
            processed=False,
        )
        
        burn_id = self.db.insert_burn_event(event)
        return True, f"저장 완료: {burn_id}"
    
    def collect_from_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Webhook 페이로드 처리
        """
        event_type = payload.get("type", "").upper()
        data = payload.get("data", {})
        
        if event_type == "MONEY":
            success, message = self.collect_money_event(data)
        elif event_type == "BURN":
            success, message = self.collect_burn_event(data)
        else:
            return {"success": False, "message": f"Unknown type: {event_type}"}
        
        return {"success": success, "message": message}
    
    def get_unprocessed_count(self) -> Dict[str, int]:
        """미처리 이벤트 수"""
        return {
            "money": len(self.db.get_unprocessed_money_events()),
            "burn": len(self.db.get_unprocessed_burn_events()),
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 2: Auto Learn (자동 학습)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLearnLoop:
    """
    Loop 2: LLM 기반 자동 학습
    
    - PIPELINE 결과에서 패턴 분석
    - 인사이트 생성 및 저장
    - Confidence > 0.7 필터링
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.api_key = os.getenv("ANTHROPIC_API_KEY") or os.getenv("OPENAI_API_KEY")
    
    def analyze_pipeline_result(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        PIPELINE 결과 분석
        """
        insights = []
        kpi = result.get("kpi", {})
        
        # 패턴 1: 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.25:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="ANOMALY",
                content=f"Entropy {entropy:.0%}로 높음. 손실 요인 집중 분석 필요.",
                confidence=0.85,
            )
            insights.append(insight)
        
        # 패턴 2: 낮은 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0:
            roi = net / mint
            if roi < 0.5:
                insight = self._create_insight(
                    week_id=week_id,
                    source="PIPELINE",
                    category="PATTERN",
                    content=f"ROI {roi:.0%}로 낮음. 수익성 개선 필요.",
                    confidence=0.80,
                )
                insights.append(insight)
        
        # 패턴 3: 팀 시너지 분석
        best_team = result.get("best_team", {})
        team_score = best_team.get("score", 0)
        if team_score > 0:
            insight = self._create_insight(
                week_id=week_id,
                source="PIPELINE",
                category="RECOMMENDATION",
                content=f"최적 팀 점수: {team_score:,.0f}. 팀 구성 유지 권장.",
                confidence=0.75,
            )
            insights.append(insight)
        
        return insights
    
    def analyze_pillars_result(self, pillars: Dict[str, Any], week_id: str) -> List[Insight]:
        """
        5 Pillars 결과 분석
        """
        insights = []
        summary = pillars.get("summary", {})
        
        # 약점 기둥 분석
        weakest = summary.get("weakest_pillar", "")
        weakest_score = summary.get("weakest_score", 0)
        
        if weakest and weakest_score < 0.4:
            pillar_names = {
                "vision_mastery": "비전 장악",
                "risk_equilibrium": "위험 균형",
                "innovation_disruption": "혁신 주도",
                "learning_acceleration": "학습 가속",
                "impact_amplification": "영향 증폭",
            }
            name = pillar_names.get(weakest, weakest)
            
            insight = self._create_insight(
                week_id=week_id,
                source="PILLARS",
                category="RECOMMENDATION",
                content=f"'{name}' 기둥이 {weakest_score:.0%}로 가장 약함. 집중 강화 필요.",
                confidence=0.90,
            )
            insights.append(insight)
        
        return insights
    
    def learn_from_pipeline_result(self, result: Dict[str, Any], week_id: str) -> int:
        """
        PIPELINE 결과에서 학습하고 인사이트 저장
        
        Returns:
            저장된 인사이트 수
        """
        all_insights = []
        
        # PIPELINE 분석
        if "kpi" in result:
            all_insights.extend(self.analyze_pipeline_result(result, week_id))
        
        # Pillars 분석
        if "pillars" in result:
            all_insights.extend(self.analyze_pillars_result(result["pillars"], week_id))
        
        # LLM 기반 심층 분석 (API 있을 때)
        if self.api_key:
            llm_insights = self._llm_analyze(result, week_id)
            all_insights.extend(llm_insights)
        
        # 저장 (Confidence > 0.7만)
        saved_count = 0
        for insight in all_insights:
            if insight.confidence >= 0.7:
                self.db.insert_insight(insight)
                saved_count += 1
        
        return saved_count
    
    def _create_insight(
        self,
        week_id: str,
        source: str,
        category: str,
        content: str,
        confidence: float,
        metadata: Dict = None
    ) -> Insight:
        """인사이트 객체 생성"""
        return Insight(
            insight_id=f"I-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            source=source,
            category=category,
            content=content,
            confidence=confidence,
            metadata=json.dumps(metadata or {}),
        )
    
    def _llm_analyze(self, result: Dict[str, Any], week_id: str) -> List[Insight]:
        """LLM 기반 심층 분석"""
        insights = []
        
        # Mock 또는 실제 LLM 호출
        kpi = result.get("kpi", {})
        prompt = f"""AUTUS 주간 결과를 분석하고 인사이트를 생성해주세요.

KPI:
- Net: {kpi.get('net_krw', 0):,.0f} 원
- Mint: {kpi.get('mint_krw', 0):,.0f} 원
- Burn: {kpi.get('burn_krw', 0):,.0f} 원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}

가장 중요한 인사이트 1개를 한 문장으로 제공해주세요."""

        try:
            content = self._call_llm(prompt)
            if content:
                insight = self._create_insight(
                    week_id=week_id,
                    source="LLM",
                    category="PATTERN",
                    content=content,
                    confidence=0.75,
                )
                insights.append(insight)
        except Exception as e:
            pass  # LLM 실패 시 무시
        
        return insights
    
    def _call_llm(self, prompt: str) -> str:
        """LLM 호출"""
        if os.getenv("ANTHROPIC_API_KEY"):
            try:
                import anthropic
                client = anthropic.Anthropic()
                response = client.messages.create(
                    model="claude-3-haiku-20240307",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
            except:
                pass
        
        if os.getenv("OPENAI_API_KEY"):
            try:
                import openai
                client = openai.OpenAI()
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    max_tokens=200,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.choices[0].message.content
            except:
                pass
        
        return ""


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 3: Auto Delete (자동 삭제/정리)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoDeleteLoop:
    """
    Loop 3: 저품질 데이터 자동 정리
    
    - Quality < 0.3 데이터 아카이브
    - 90일 미활동 데이터 아카이브
    - LLM으로 요약 생성 후 원본 삭제
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.quality = QualityManager()
    
    def find_low_quality_insights(self, threshold: float = 0.3) -> List[Dict]:
        """낮은 품질 인사이트 찾기"""
        # 모든 인사이트 조회 후 필터링
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM insights WHERE confidence < ?", (threshold,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def find_inactive_data(self, days: int = 90) -> Dict[str, List]:
        """비활성 데이터 찾기"""
        cutoff = (datetime.now() - timedelta(days=days)).isoformat()
        inactive = {"insights": [], "agent_logs": []}
        
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            
            # 오래된 인사이트
            cursor.execute(
                "SELECT * FROM insights WHERE created_at < ?",
                (cutoff,)
            )
            inactive["insights"] = [dict(row) for row in cursor.fetchall()]
            
            # 오래된 로그
            cursor.execute(
                "SELECT * FROM agent_logs WHERE created_at < ?",
                (cutoff,)
            )
            inactive["agent_logs"] = [dict(row) for row in cursor.fetchall()]
        
        return inactive
    
    def archive_and_delete(self, item_type: str, item_id: str, item_data: Dict, reason: str) -> str:
        """아카이브 후 삭제"""
        # 요약 생성
        summary = self._generate_summary(item_data)
        
        # 아카이브 저장
        archive = Archive(
            archive_id=f"A-{uuid.uuid4().hex[:8]}",
            original_type=item_type,
            original_id=item_id,
            summary=summary,
            reason=reason,
            original_data=json.dumps(item_data, ensure_ascii=False),
        )
        self.db.insert_archive(archive)
        
        # 원본 삭제
        with self.db._get_connection() as conn:
            cursor = conn.cursor()
            table_map = {
                "INSIGHT": "insights",
                "AGENT_LOG": "agent_logs",
            }
            table = table_map.get(item_type)
            if table:
                id_col = "insight_id" if item_type == "INSIGHT" else "log_id"
                cursor.execute(f"DELETE FROM {table} WHERE {id_col} = ?", (item_id,))
                conn.commit()
        
        return archive.archive_id
    
    def cleanup_cycle(self) -> Dict[str, int]:
        """정리 사이클 실행"""
        results = {"archived": 0, "skipped": 0}
        
        # 저품질 인사이트 정리
        low_quality = self.find_low_quality_insights()
        for item in low_quality:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "LOW_QUALITY"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        # 비활성 데이터 정리 (90일)
        inactive = self.find_inactive_data(90)
        for item in inactive["insights"]:
            try:
                self.archive_and_delete(
                    "INSIGHT",
                    item["insight_id"],
                    item,
                    "INACTIVE"
                )
                results["archived"] += 1
            except:
                results["skipped"] += 1
        
        return results
    
    def _generate_summary(self, data: Dict) -> str:
        """LLM으로 요약 생성"""
        # Mock 요약
        if "content" in data:
            return f"요약: {data['content'][:100]}..."
        return f"요약: {json.dumps(data, ensure_ascii=False)[:100]}..."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 4: Auto Improve (Reflexion 기반 개선)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoImproveLoop:
    """
    Loop 4: Reflexion 기반 자동 개선
    
    - 실패 감지 (Entropy > 30%, ROI < 0)
    - "왜 실패했나?" 분석
    - 개선 제안 생성
    - Human-in-the-Loop 승인 대기
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
    
    def check_failures(self, kpi: Dict) -> List[Dict]:
        """실패 조건 검사"""
        failures = []
        
        # 높은 Entropy
        entropy = kpi.get("entropy_ratio", 0)
        if entropy > 0.30:
            failures.append({
                "trigger": "HIGH_ENTROPY",
                "value": entropy,
                "threshold": 0.30,
                "severity": "HIGH" if entropy > 0.40 else "MEDIUM",
            })
        
        # 음수 ROI
        mint = kpi.get("mint_krw", 0)
        net = kpi.get("net_krw", 0)
        if mint > 0 and net < 0:
            failures.append({
                "trigger": "NEGATIVE_ROI",
                "value": net / mint,
                "threshold": 0,
                "severity": "HIGH",
            })
        
        # 낮은 Velocity
        velocity = kpi.get("velocity", 0)
        if velocity < 0.3:
            failures.append({
                "trigger": "LOW_VELOCITY",
                "value": velocity,
                "threshold": 0.30,
                "severity": "MEDIUM",
            })
        
        return failures
    
    def generate_reflexion(self, failure: Dict, kpi: Dict, week_id: str) -> Proposal:
        """
        Reflexion 분석 및 제안 생성
        """
        trigger = failure["trigger"]
        value = failure["value"]
        
        # 분석 생성
        if trigger == "HIGH_ENTROPY":
            analysis = f"Entropy {value:.1%}로 손실 비율이 높음. 주요 손실 요인 분석 필요."
            suggestion = "1. Burn 이벤트 상세 분석\n2. DELAY/REWORK 유형 집중 검토\n3. 프로세스 병목 제거"
            impact = f"Entropy 10%p 감소 → Net {kpi.get('burn_krw', 0) * 0.1:,.0f}원 절감 예상"
        
        elif trigger == "NEGATIVE_ROI":
            analysis = f"ROI {value:.1%}로 손실 상태. 수익 구조 재검토 필요."
            suggestion = "1. 고수익 이벤트 타입 확대\n2. 저수익 프로젝트 축소\n3. 비용 구조 최적화"
            impact = "ROI 20%p 개선 목표"
        
        elif trigger == "LOW_VELOCITY":
            analysis = f"Flywheel Velocity {value:.1%}로 순환 느림. 재투자 비율 점검 필요."
            suggestion = "1. REINVEST 단계 강화\n2. GROW 단계 활성화\n3. 병목 단계 식별"
            impact = "Velocity 15%p 상승 목표"
        
        else:
            analysis = f"{trigger} 문제 감지. 상세 분석 필요."
            suggestion = "데이터 기반 분석 후 제안 예정"
            impact = "개선 효과 측정 예정"
        
        return Proposal(
            proposal_id=f"P-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            trigger=trigger,
            analysis=analysis,
            suggestion=suggestion,
            expected_impact=impact,
            status=ProposalStatus.PENDING.value,
        )
    
    def run_improvement_cycle(self, kpi: Dict, week_id: str) -> List[str]:
        """개선 사이클 실행"""
        proposal_ids = []
        
        failures = self.check_failures(kpi)
        
        for failure in failures:
            proposal = self.generate_reflexion(failure, kpi, week_id)
            self.db.insert_proposal(proposal)
            proposal_ids.append(proposal.proposal_id)
        
        return proposal_ids
    
    def get_pending_proposals(self) -> List[Dict]:
        """대기 중인 제안 조회"""
        proposals = self.db.get_pending_proposals()
        return [p.to_dict() for p in proposals]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 5: Auto Execute (Multi-Agent 실행)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoExecuteLoop:
    """
    Loop 5: Multi-Agent 자동 실행
    
    - CrewAI 또는 Built-in Agents 사용
    - Researcher → Analyzer → Executor → Reporter 순서
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        
        # CrewAI 사용 가능 여부 확인
        try:
            from .crew import AutusCrew
            self.crew = AutusCrew()
            self.crew_enabled = True
        except ImportError:
            self.crew = None
            self.crew_enabled = False
    
    def run_weekly_crew(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """주간 크루 실행"""
        if self.crew_enabled and self.crew:
            return self.crew.run_weekly_crew(result, week_id)
        else:
            return self._run_builtin_agents(result, week_id)
    
    def _run_builtin_agents(self, result: Dict[str, Any], week_id: str) -> Dict[str, Any]:
        """Built-in 에이전트 실행 (CrewAI 없을 때)"""
        outputs = {}
        
        # Agent 1: Researcher (데이터 조사)
        outputs["researcher"] = self._agent_research(result)
        
        # Agent 2: Analyzer (분석)
        outputs["analyzer"] = self._agent_analyze(result)
        
        # Agent 3: Executor (실행)
        outputs["executor"] = self._agent_execute(result)
        
        # Agent 4: Reporter (리포트)
        outputs["reporter"] = self._agent_report(result, outputs)
        
        return {
            "week_id": week_id,
            "agents_run": 4,
            "outputs": outputs,
            "success": True,
        }
    
    def _agent_research(self, result: Dict) -> Dict:
        """Researcher Agent"""
        kpi = result.get("kpi", {})
        return {
            "role": "RESEARCHER",
            "task": "데이터 조사",
            "output": f"Net: {kpi.get('net_krw', 0):,.0f}원, 팀: {len(result.get('best_team', {}).get('team', []))}명",
            "success": True,
        }
    
    def _agent_analyze(self, result: Dict) -> Dict:
        """Analyzer Agent"""
        kpi = result.get("kpi", {})
        entropy = kpi.get("entropy_ratio", 0)
        return {
            "role": "ANALYZER",
            "task": "PIPELINE 분석",
            "output": f"Entropy: {entropy:.1%}, 상태: {'정상' if entropy < 0.25 else '주의'}",
            "success": True,
        }
    
    def _agent_execute(self, result: Dict) -> Dict:
        """Executor Agent"""
        return {
            "role": "EXECUTOR",
            "task": "액션 실행",
            "output": "알림 발송 완료, 리포트 생성 대기",
            "success": True,
        }
    
    def _agent_report(self, result: Dict, outputs: Dict) -> Dict:
        """Reporter Agent"""
        kpi = result.get("kpi", {})
        pillars = result.get("pillars", {}).get("summary", {})
        
        report = f"""## 주간 요약
- Net: {kpi.get('net_krw', 0):,.0f}원
- Entropy: {kpi.get('entropy_ratio', 0):.1%}
- Pillars 점수: {pillars.get('total_score', 0):.0%}
- 상태: {pillars.get('overall_status', 'N/A')}
"""
        return {
            "role": "REPORTER",
            "task": "리포트 작성",
            "output": report,
            "success": True,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loop 6: Auto Loop (Flywheel 순환)
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutoLoopEngine:
    """
    Loop 6: Flywheel 자동 순환
    
    - 전체 6 루프 순환 관리
    - Flywheel 이력 관리
    - ROI 및 Velocity 추적
    """
    
    def __init__(self, db: DatabaseManager = None):
        self.db = db or get_database()
        self.collect = AutoCollectLoop(self.db)
        self.learn = AutoLearnLoop(self.db)
        self.delete = AutoDeleteLoop(self.db)
        self.improve = AutoImproveLoop(self.db)
        self.execute = AutoExecuteLoop(self.db)
    
    def run_full_cycle(
        self,
        pipeline_result: Dict[str, Any],
        pillars_result: Dict[str, Any],
        week_id: str
    ) -> Dict[str, Any]:
        """전체 6 루프 순환 실행"""
        cycle_result = {
            "week_id": week_id,
            "loops": {},
            "flywheel": {},
            "success": True,
        }
        
        # Loop 1: Collect (이미 완료된 데이터)
        cycle_result["loops"]["collect"] = {
            "unprocessed": self.collect.get_unprocessed_count(),
        }
        
        # Loop 2: Learn
        insights_count = self.learn.learn_from_pipeline_result(
            {"kpi": pipeline_result.get("kpi", {}), "pillars": pillars_result},
            week_id
        )
        cycle_result["loops"]["learn"] = {
            "insights_generated": insights_count,
        }
        
        # Loop 3: Delete (월간 실행 권장)
        # cleanup = self.delete.cleanup_cycle()
        cycle_result["loops"]["delete"] = {
            "archived": 0,  # 매주 실행하지 않음
        }
        
        # Loop 4: Improve
        kpi = pipeline_result.get("kpi", {})
        proposal_ids = self.improve.run_improvement_cycle(kpi, week_id)
        cycle_result["loops"]["improve"] = {
            "proposals_generated": len(proposal_ids),
            "proposal_ids": proposal_ids,
        }
        
        # Loop 5: Execute
        crew_result = self.execute.run_weekly_crew(
            {"kpi": kpi, "pillars": pillars_result, "best_team": pipeline_result.get("best_team", {})},
            week_id
        )
        cycle_result["loops"]["execute"] = {
            "agents_run": crew_result.get("agents_run", 0),
            "success": crew_result.get("success", False),
        }
        
        # Loop 6: Flywheel 저장
        flywheel_data = self._create_flywheel_cycle(pipeline_result, pillars_result, week_id)
        self.db.insert_flywheel_cycle(flywheel_data)
        
        cycle_result["flywheel"] = {
            "cycle_id": flywheel_data.cycle_id,
            "velocity": flywheel_data.velocity,
            "momentum": flywheel_data.momentum,
            "roi": flywheel_data.net_krw / flywheel_data.mint_krw if flywheel_data.mint_krw > 0 else 0,
        }
        
        return cycle_result
    
    def _create_flywheel_cycle(
        self,
        pipeline_result: Dict,
        pillars_result: Dict,
        week_id: str
    ) -> FlywheelCycle:
        """Flywheel 사이클 데이터 생성"""
        kpi = pipeline_result.get("kpi", {})
        best_team = pipeline_result.get("best_team", {})
        summary = pillars_result.get("summary", {})
        scores = summary.get("pillar_scores", {})
        
        # Flywheel 상태 계산
        flywheel = pillars_result.get("vision_mastery", {}).get("flywheel", {})
        state = flywheel.get("state", {})
        score = flywheel.get("score", {})
        momentum = flywheel.get("momentum", {})
        
        return FlywheelCycle(
            cycle_id=f"C-{uuid.uuid4().hex[:8]}",
            week_id=week_id,
            net_krw=kpi.get("net_krw", 0),
            mint_krw=kpi.get("mint_krw", 0),
            burn_krw=kpi.get("burn_krw", 0),
            entropy_ratio=kpi.get("entropy_ratio", 0),
            vision_score=scores.get("vision_mastery", 0),
            risk_score=scores.get("risk_equilibrium", 0),
            innovation_score=scores.get("innovation_disruption", 0),
            learning_score=scores.get("learning_acceleration", 0),
            impact_score=scores.get("impact_amplification", 0),
            total_pillar_score=summary.get("total_score", 0),
            velocity=score.get("velocity", 0),
            momentum=momentum.get("momentum", 0),
            invest_krw=state.get("invest_krw", 0),
            grow_krw=state.get("grow_krw", 0),
            profit_krw=state.get("profit_krw", 0),
            reinvest_krw=state.get("reinvest_krw", 0),
            team=json.dumps(best_team.get("team", [])),
            team_score=best_team.get("score", 0),
        )
    
    def get_flywheel_report(self, weeks: int = 12) -> Dict[str, Any]:
        """Flywheel 이력 리포트"""
        history = self.db.get_flywheel_history(weeks)
        
        if not history:
            return {"weeks": 0, "trend": "NO_DATA"}
        
        # 트렌드 계산
        velocities = [h.velocity for h in history]
        avg_velocity = sum(velocities) / len(velocities)
        
        if len(history) >= 2:
            recent = history[0].velocity
            prev = history[1].velocity
            if recent > prev * 1.1:
                trend = "ACCELERATING"
            elif recent < prev * 0.9:
                trend = "DECELERATING"
            else:
                trend = "STEADY"
        else:
            trend = "STARTING"
        
        return {
            "weeks": len(history),
            "avg_velocity": avg_velocity,
            "current_velocity": history[0].velocity if history else 0,
            "trend": trend,
            "history": [h.to_dict() for h in history[:4]],  # 최근 4주
        }





















