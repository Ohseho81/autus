"""
AUTUS Log Processor v0.1.1
==========================

사용자 로그 → 노드 값 업데이트
AUTUS 문법(패턴)을 적용하여 행동을 해석

Constitution 준수:
- Article I: Zero Identity → 로그에서 PII 추출 안함
- Article II: Privacy by Architecture → 해석 결과만 저장 (원본 삭제)
- Article III: Meta-Circular → 이 엔진도 Pack으로 개선 가능

v0.1.1 Changes:
- Evidence Gate 경고 상태 처리 개선
- 신뢰도 계산 로그 함수 적용 (초기 과대 반응 완화)
- 일관성 점수(Consistency) 실제 구현
"""

import yaml
import math
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field

# 로컬 임포트
from .initializer import (
    UserOntology, 
    NodeState, 
    OntologyInitializer,
    BASE_DIR
)


# ===========================================
# 설정 경로
# ===========================================
PATTERNS_PATH = BASE_DIR / "grammar" / "log_patterns.yaml"
THRESHOLDS_PATH = BASE_DIR / "defaults" / "thresholds.yaml"


# ===========================================
# 데이터 클래스
# ===========================================
@dataclass
class LogEntry:
    """단일 로그 항목"""
    timestamp: str
    content: str
    category: Optional[str] = None
    source: Optional[str] = None
    metadata: Optional[dict] = None
    
    @classmethod
    def from_dict(cls, data: dict) -> 'LogEntry':
        return cls(
            timestamp=data.get("timestamp", datetime.now().isoformat()),
            content=data.get("content", ""),
            category=data.get("category"),
            source=data.get("source"),
            metadata=data.get("metadata")
        )


@dataclass
class PatternMatch:
    """패턴 매칭 결과"""
    pattern_id: str
    pattern_name: str
    node: str
    delta: float
    confidence_boost: float
    affects: List[dict]  # 연쇄 영향


@dataclass
class ProcessingResult:
    """로그 처리 결과"""
    log_entry: LogEntry
    matches: List[PatternMatch]
    nodes_updated: Dict[str, float]  # node -> delta
    evidence_gate_passed: bool
    warnings: List[str]


@dataclass
class NodeDiagnosis:
    """
    노드 자기 진단 보고서
    "나는 지금 이래서 문제야"를 스스로 보고
    """
    node_id: str
    node_name: str
    
    # 핵심 상태
    health_status: str  # 'healthy' | 'warning' | 'critical'
    urgency_level: int  # 1-10 (10이 가장 긴급)
    
    # 자기 진단 메시지
    status_report: str  # 사람이 읽을 수 있는 문장
    primary_issue: str  # 가장 시급한 문제
    
    # 상세 분석
    reliability_score: float
    freshness_score: float
    consistency_score: float  # 값 변동성
    
    # 인과관계 추적
    upstream_issues: List[str]  # 이 노드에 영향을 주는 문제들
    downstream_risks: List[str]  # 이 노드가 영향을 줄 수 있는 노드들
    
    # 권장 행동
    recommended_action: str
    action_enabled: bool
    logs_needed: int  # 액션을 위해 필요한 추가 로그 수


# ===========================================
# Evidence Gate
# ===========================================
class EvidenceGate:
    """
    신뢰할 수 없는 데이터로는 행동하지 않는다.
    
    3가지 관문:
    1. Reliability (신뢰도)
    2. Freshness (신선도)
    3. Sensitivity (민감도)
    """
    
    def __init__(self, thresholds: dict):
        self.config = thresholds.get("evidence_gate", {})
        self.reliability_config = self.config.get("reliability", {})
        self.freshness_config = self.config.get("freshness", {})
        self.sensitivity_config = self.config.get("sensitivity", {})
    
    def check_reliability(
        self, 
        node_state: NodeState, 
        node_name: str,
        log_history: Optional[List[str]] = None
    ) -> Tuple[bool, float, str, bool]:
        """
        신뢰도 검사 (v0.1.1 개선)
        
        Returns:
            (passed, score, message, is_warning)
            
        Changes in v0.1.1:
        - 로그 함수로 초기 과대 반응 완화
        - 일관성 점수 반영
        - 경고 플래그 추가
        """
        min_logs = self.reliability_config.get("min_logs_by_node", {}).get(node_name, 5)
        log_count = node_state.log_count
        
        # [v0.1.1] 로그 함수로 초기 과대 반응 완화
        if log_count == 0:
            log_score = 0.0
        else:
            log_score = min(1.0, math.log1p(log_count) / math.log1p(min_logs * 2))
        
        # [v0.1.1] 일관성 점수 계산
        consistency_score = self._calculate_consistency(log_history or node_state.log_history)
        
        # 가중 평균: 로그 점수 60% + 일관성 40%
        reliability = (log_score * 0.6) + (consistency_score * 0.4)
        
        thresholds = self.reliability_config.get("thresholds", {})
        action_disabled = thresholds.get("action_disabled", 0.3)
        action_warning = thresholds.get("action_warning", 0.5)
        
        # [v0.1.1] 경고 플래그 추가
        if reliability < action_disabled:
            return (False, reliability, f"신뢰도 부족 ({reliability:.2f} < {action_disabled})", False)
        elif reliability < action_warning:
            return (True, reliability, f"⚠️ 신뢰도 경고 ({reliability:.2f})", True)
        else:
            return (True, reliability, "신뢰도 충분", False)
    
    def _calculate_consistency(self, log_history: Optional[List[str]] = None) -> float:
        """
        [v0.1.1 신규] 일관성 점수 계산
        
        최근 7일간 로그 발생 날짜의 분산을 기반으로 계산
        매일 꾸준히 → 1.0, 한 번에 몰아서 → 0.3
        """
        if not log_history or len(log_history) < 2:
            return 0.5  # 기본값 (데이터 부족)
        
        try:
            # 로그 타임스탬프에서 날짜만 추출
            dates = set()
            for ts in log_history[-50:]:  # 최근 50개만
                try:
                    dt = datetime.fromisoformat(ts)
                    dates.add(dt.date())
                except:
                    continue
            
            if len(dates) < 2:
                return 0.5
            
            # 최근 7일 중 몇 일에 로그가 있었는지
            today = datetime.now().date()
            recent_7_days = [(today - timedelta(days=i)) for i in range(7)]
            active_days = sum(1 for d in recent_7_days if d in dates)
            
            # 7일 중 활성 일수 비율
            consistency = active_days / 7.0
            
            return consistency
            
        except Exception:
            return 0.5
    
    def check_freshness(self, node_state: NodeState, node_name: str) -> Tuple[bool, float, str]:
        """
        신선도 검사
        
        Returns:
            (passed, score, message)
        """
        if not node_state.last_updated:
            return (False, 0.0, "데이터 없음")
        
        validity_days = self.freshness_config.get("validity_days", {}).get(node_name, 14)
        
        try:
            last_update = datetime.fromisoformat(node_state.last_updated)
            age_days = (datetime.now() - last_update).days
            
            # 신선도 점수 (지수 감쇠)
            half_life = validity_days * 2
            freshness = 0.5 ** (age_days / half_life) if half_life > 0 else 0
            
            stale_threshold = self.freshness_config.get("thresholds", {}).get("stale", 0.3)
            
            if freshness < stale_threshold:
                return (False, freshness, f"오래된 데이터 ({age_days}일 전)")
            else:
                return (True, freshness, f"신선도 양호 ({age_days}일 전)")
                
        except (ValueError, TypeError):
            return (False, 0.0, "날짜 파싱 오류")
    
    def check_action_sensitivity(self, action_type: str) -> Tuple[float, bool, str]:
        """
        액션 민감도 검사
        
        Returns:
            (min_reliability_required, human_confirmation_needed, message)
        """
        action_types = self.sensitivity_config.get("action_types", {})
        action_config = action_types.get(action_type, action_types.get("suggestion", {}))
        
        min_reliability = action_config.get("min_reliability", 0.5)
        human_confirmation = action_config.get("human_confirmation", False)
        
        return (min_reliability, human_confirmation, f"민감도: {action_config.get('sensitivity', 0.5)}")
    
    def evaluate(self, node_state: NodeState, node_name: str, 
                 action_type: str = "suggestion",
                 log_history: Optional[List[str]] = None) -> dict:
        """
        전체 Evidence Gate 평가 (v0.1.1 개선)
        
        Returns:
            dict: 평가 결과 (is_warning 플래그 추가)
        """
        # 1. 신뢰도 검사 (v0.1.1: 일관성 + 경고 플래그)
        rel_passed, rel_score, rel_msg, rel_warning = self.check_reliability(
            node_state, node_name, log_history
        )
        
        # 2. 신선도 검사
        fresh_passed, fresh_score, fresh_msg = self.check_freshness(node_state, node_name)
        
        # 3. 민감도 검사
        min_rel, human_confirm, sens_msg = self.check_action_sensitivity(action_type)
        
        # 종합 판정
        overall_passed = rel_passed and fresh_passed and (rel_score >= min_rel)
        
        # [v0.1.1] 경고 상태 판정
        is_warning = rel_warning or (rel_score < 0.7 and overall_passed)
        
        return {
            "passed": overall_passed,
            "is_warning": is_warning,
            "reliability": {
                "passed": rel_passed, 
                "score": rel_score, 
                "message": rel_msg,
                "is_warning": rel_warning
            },
            "freshness": {"passed": fresh_passed, "score": fresh_score, "message": fresh_msg},
            "sensitivity": {"min_reliability": min_rel, "human_confirmation": human_confirm},
            "action_allowed": overall_passed and not human_confirm,
            "action_with_warning": overall_passed and is_warning,
            "warnings": [rel_msg, fresh_msg] if is_warning or not overall_passed else []
        }


# ===========================================
# Log Processor
# ===========================================
class LogProcessor:
    """
    로그 처리 엔진
    
    원본 로그 → 패턴 매칭 → 노드 업데이트 → 원본 삭제
    """
    
    def __init__(self):
        self.patterns = self._load_patterns()
        self.thresholds = self._load_yaml(THRESHOLDS_PATH)
        self.evidence_gate = EvidenceGate(self.thresholds)
        self.initializer = OntologyInitializer()
        
        # 처리 기록 (중복 방지)
        self._recent_patterns: Dict[str, datetime] = {}
    
    def _load_yaml(self, path: Path) -> dict:
        """YAML 파일 로드"""
        if not path.exists():
            return {}
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f) or {}
    
    def _load_patterns(self) -> dict:
        """패턴 파일 로드 및 인덱싱"""
        raw = self._load_yaml(PATTERNS_PATH)
        
        # 패턴 인덱싱
        patterns = {
            "all": [],
            "by_node": {},
            "by_category": {},
            "application_rules": raw.get("application_rules", {})
        }
        
        # 각 카테고리에서 패턴 수집
        for category_key in raw:
            if category_key.endswith("_patterns"):
                pattern_list = raw[category_key]
                if isinstance(pattern_list, list):
                    for pattern in pattern_list:
                        patterns["all"].append(pattern)
                        
                        # 노드별 인덱스
                        node = pattern.get("node")
                        if node:
                            if node not in patterns["by_node"]:
                                patterns["by_node"][node] = []
                            patterns["by_node"][node].append(pattern)
                        
                        # 카테고리별 인덱스
                        cat = pattern.get("category")
                        if cat:
                            if cat not in patterns["by_category"]:
                                patterns["by_category"][cat] = []
                            patterns["by_category"][cat].append(pattern)
        
        return patterns
    
    def _match_pattern(self, log: LogEntry, pattern: dict) -> bool:
        """패턴 매칭 검사"""
        keywords = pattern.get("keywords", [])
        content_lower = log.content.lower()
        
        # 키워드 매칭
        for keyword in keywords:
            if keyword.lower() in content_lower:
                return True
        
        # 카테고리 매칭 (있는 경우)
        if pattern.get("category") and log.category:
            if pattern["category"] == log.category:
                return True
        
        return False
    
    def _check_cooldown(self, pattern_id: str, cooldown_hours: float) -> bool:
        """중복 방지 쿨다운 검사"""
        if pattern_id not in self._recent_patterns:
            return True
        
        last_time = self._recent_patterns[pattern_id]
        elapsed = datetime.now() - last_time
        return elapsed > timedelta(hours=cooldown_hours)
    
    def process_log(self, log: LogEntry, ontology: UserOntology) -> ProcessingResult:
        """
        단일 로그 처리
        """
        matches: List[PatternMatch] = []
        nodes_updated: Dict[str, float] = {}
        warnings: List[str] = []
        
        # 1. 패턴 매칭
        for pattern in self.patterns["all"]:
            if self._match_pattern(log, pattern):
                pattern_id = pattern.get("id", "unknown")
                cooldown = pattern.get("cooldown_hours", 4)
                
                # 쿨다운 검사
                if not self._check_cooldown(pattern_id, cooldown):
                    warnings.append(f"패턴 {pattern_id} 쿨다운 중")
                    continue
                
                # 매칭 기록
                match = PatternMatch(
                    pattern_id=pattern_id,
                    pattern_name=pattern.get("name", "unknown"),
                    node=pattern.get("node", ""),
                    delta=pattern.get("delta", 0),
                    confidence_boost=pattern.get("confidence_boost", 0.005),
                    affects=pattern.get("affects", [])
                )
                matches.append(match)
                
                # 쿨다운 업데이트
                self._recent_patterns[pattern_id] = datetime.now()
        
        # 2. 노드 업데이트
        for match in matches:
            # 메인 노드 업데이트
            if match.node:
                if match.node not in nodes_updated:
                    nodes_updated[match.node] = 0
                nodes_updated[match.node] += match.delta
            
            # 연쇄 영향 적용
            for affect in match.affects:
                affected_node = affect.get("node")
                affected_delta = affect.get("delta", 0)
                if affected_node:
                    if affected_node not in nodes_updated:
                        nodes_updated[affected_node] = 0
                    nodes_updated[affected_node] += affected_delta
        
        # 3. 일일 한도 적용
        limits = self.patterns.get("application_rules", {}).get("daily_limits", {})
        max_positive = limits.get("max_positive_delta", 0.15)
        max_negative = limits.get("max_negative_delta", -0.15)
        
        for node, delta in nodes_updated.items():
            if delta > max_positive:
                nodes_updated[node] = max_positive
                warnings.append(f"{node} 일일 최대 증가량 도달")
            elif delta < max_negative:
                nodes_updated[node] = max_negative
                warnings.append(f"{node} 일일 최대 감소량 도달")
        
        # 4. 온톨로지에 적용
        for node, delta in nodes_updated.items():
            if node in ontology.nodes:
                state = ontology.nodes[node]
                
                # 값 업데이트
                new_value = state.value + delta
                new_value = max(0.0, min(1.0, new_value))
                state.value = new_value
                
                # 로그 카운트 증가
                state.log_count += 1
                
                # [v0.1.1] 로그 히스토리 업데이트 (일관성 계산용)
                state.log_history.append(log.timestamp)
                if len(state.log_history) > 100:
                    state.log_history = state.log_history[-100:]
                
                # 확신도 업데이트
                min_logs_config = self.initializer.structure.get("nodes", {}).get(node, {})
                min_logs_high = min_logs_config.get("min_logs_for_confidence", {}).get("high", 50) if isinstance(min_logs_config, dict) else 50
                state.confidence = min(1.0, state.log_count / min_logs_high) if min_logs_high > 0 else 0
                
                # Uncertainty Level 업데이트
                if state.confidence < 0.3:
                    state.uncertainty_level = "range"
                elif state.confidence < 0.7:
                    state.uncertainty_level = "estimate"
                else:
                    state.uncertainty_level = "confirmed"
                
                # 타임스탬프 업데이트
                state.last_updated = datetime.now().isoformat()
        
        # 5. 총 로그 수 증가
        ontology.total_logs_processed += 1
        
        # 6. Evidence Gate 평가 (대표 노드로)
        gate_passed = True
        if matches:
            main_node = matches[0].node
            if main_node and main_node in ontology.nodes:
                gate_result = self.evidence_gate.evaluate(
                    ontology.nodes[main_node], 
                    main_node
                )
                gate_passed = gate_result["passed"]
                if not gate_passed:
                    warnings.extend(gate_result["warnings"])
        
        return ProcessingResult(
            log_entry=log,
            matches=matches,
            nodes_updated=nodes_updated,
            evidence_gate_passed=gate_passed,
            warnings=warnings
        )
    
    def process_batch(self, logs: List[LogEntry], ontology: UserOntology) -> List[ProcessingResult]:
        """배치 로그 처리"""
        results = []
        for log in logs:
            result = self.process_log(log, ontology)
            results.append(result)
        return results
    
    def get_node_summary(self, ontology: UserOntology) -> dict:
        """노드 요약 정보 생성 (v0.1.1 개선)"""
        summary = {
            "self_value": self.initializer.calculate_self_value(ontology),
            "domains": {},
            "nodes": {},
            "system_state": ontology.system_state,
            "total_logs": ontology.total_logs_processed
        }
        
        # 도메인별 값
        for domain in ["SURVIVE", "GROW", "CONNECT"]:
            summary["domains"][domain] = {
                "value": self.initializer.calculate_domain_value(ontology, domain),
                "weight": ontology.domain_weights.get(domain, 0.33)
            }
        
        # 노드별 상세
        for name, state in ontology.nodes.items():
            display = self.initializer.get_display_value(state)
            gate = self.evidence_gate.evaluate(state, name, log_history=state.log_history)
            
            summary["nodes"][name] = {
                "value": state.value,
                "confidence": state.confidence,
                "uncertainty_level": state.uncertainty_level,
                "display": display,
                "log_count": state.log_count,
                "evidence_gate": gate["passed"],
                "actionable": gate["action_allowed"],
                "is_warning": gate.get("is_warning", False),
                "action_with_warning": gate.get("action_with_warning", False)
            }
        
        return summary
    
    def get_pattern_stats(self) -> dict:
        """패턴 통계 반환"""
        return {
            "total_patterns": len(self.patterns["all"]),
            "by_node": {k: len(v) for k, v in self.patterns["by_node"].items()},
            "by_category": {k: len(v) for k, v in self.patterns["by_category"].items()},
        }
    
    # ═══════════════════════════════════════════════════════════════════════════
    # NODE INTELLIGENCE: 자기 진단 시스템
    # ═══════════════════════════════════════════════════════════════════════════
    
    def diagnose_node(self, node_name: str, ontology: UserOntology) -> NodeDiagnosis:
        """노드 자기 진단"""
        if node_name not in ontology.nodes:
            raise ValueError(f"Node '{node_name}' not found")
        
        state = ontology.nodes[node_name]
        
        # 1. Evidence Gate 평가
        gate_result = self.evidence_gate.evaluate(state, node_name, log_history=state.log_history)
        rel_score = gate_result["reliability"]["score"]
        fresh_score = gate_result["freshness"]["score"]
        
        # 2. Consistency Score
        consistency_score = self.evidence_gate._calculate_consistency(state.log_history)
        
        # 3. 종합 건강 상태 계산
        health_score = (rel_score * 0.4 + fresh_score * 0.3 + consistency_score * 0.3)
        
        if health_score >= 0.7:
            health_status = "healthy"
        elif health_score >= 0.4:
            health_status = "warning"
        else:
            health_status = "critical"
        
        # 4. 긴급도 계산 (10점 만점)
        urgency_level = max(1, min(10, int((1 - health_score) * 10)))
        
        # 5. 가장 시급한 문제 식별
        issues = []
        if rel_score < 0.5:
            issues.append(("reliability", rel_score, f"신뢰도 부족 ({rel_score:.0%})"))
        if fresh_score < 0.5:
            issues.append(("freshness", fresh_score, f"오래된 데이터"))
        if consistency_score < 0.5:
            issues.append(("consistency", consistency_score, f"데이터 일관성 부족"))
        
        if issues:
            issues.sort(key=lambda x: x[1])
            primary_issue = issues[0][2]
        else:
            primary_issue = "특별한 문제 없음"
        
        # 6. 자기 진단 메시지 생성
        status_report = self._generate_status_report(
            node_name, state, rel_score, fresh_score, consistency_score, health_status
        )
        
        # 7. 인과관계 추적
        upstream, downstream = self._trace_causality(node_name, ontology)
        
        # 8. 필요한 추가 로그 수 계산
        min_logs = self.evidence_gate.reliability_config.get(
            "min_logs_by_node", {}
        ).get(node_name, 5)
        logs_needed = max(0, int(min_logs * 2 * 0.7) - state.log_count)
        
        # 9. 권장 행동 결정
        recommended_action = self._recommend_action(
            node_name, health_status, primary_issue, logs_needed
        )
        
        return NodeDiagnosis(
            node_id=node_name,
            node_name=self._get_node_korean_name(node_name),
            health_status=health_status,
            urgency_level=urgency_level,
            status_report=status_report,
            primary_issue=primary_issue,
            reliability_score=rel_score,
            freshness_score=fresh_score,
            consistency_score=consistency_score,
            upstream_issues=upstream,
            downstream_risks=downstream,
            recommended_action=recommended_action,
            action_enabled=gate_result["action_allowed"],
            logs_needed=logs_needed
        )
    
    def _generate_status_report(
        self, node_name: str, state: NodeState,
        rel_score: float, fresh_score: float,
        consistency_score: float, health_status: str
    ) -> str:
        """자연어 상태 보고서 생성"""
        node_korean = self._get_node_korean_name(node_name)
        
        if health_status == "healthy":
            base = f"나({node_korean})는 현재 안정적이야."
        elif health_status == "warning":
            base = f"나({node_korean})는 지금 주의가 필요해."
        else:
            base = f"나({node_korean})는 지금 위험 상태야!"
        
        details = []
        
        if rel_score < 0.7:
            if rel_score < 0.3:
                details.append(f"로그가 {state.log_count}개뿐이라 판단하기엔 너무 적어")
            else:
                details.append(f"데이터가 {state.log_count}개로 아직 부족해")
        
        if fresh_score < 0.7:
            if state.last_updated:
                try:
                    last = datetime.fromisoformat(state.last_updated)
                    days = (datetime.now() - last).days
                    if days == 0:
                        details.append("오늘 업데이트됐지만 더 필요해")
                    elif days == 1:
                        details.append("어제 마지막 업데이트였어")
                    else:
                        details.append(f"{days}일 전이 마지막 업데이트야")
                except:
                    pass
            else:
                details.append("아직 데이터가 전혀 없어")
        
        if consistency_score < 0.5:
            details.append("값이 불규칙하게 변하고 있어")
        
        if details:
            detail_str = ", ".join(details)
            return f"{base} {detail_str}."
        else:
            return base
    
    def _get_node_korean_name(self, node_name: str) -> str:
        """노드 한글 이름"""
        names = {
            "HEALTH": "건강", "WEALTH": "재정", "SECURITY": "안전",
            "CAREER": "경력", "LEARNING": "학습", "CREATION": "창작",
            "FAMILY": "가족", "SOCIAL": "사회", "LEGACY": "유산"
        }
        return names.get(node_name, node_name)
    
    def _trace_causality(self, node_name: str, ontology: UserOntology) -> Tuple[List[str], List[str]]:
        """인과관계 추적"""
        dependencies = {
            "HEALTH": {"upstream": [], "downstream": ["CAREER", "FAMILY"]},
            "WEALTH": {"upstream": ["CAREER"], "downstream": ["SECURITY", "FAMILY"]},
            "SECURITY": {"upstream": ["WEALTH"], "downstream": ["HEALTH"]},
            "CAREER": {"upstream": ["LEARNING", "HEALTH"], "downstream": ["WEALTH", "CREATION"]},
            "LEARNING": {"upstream": [], "downstream": ["CAREER", "CREATION"]},
            "CREATION": {"upstream": ["LEARNING", "CAREER"], "downstream": ["LEGACY"]},
            "FAMILY": {"upstream": ["HEALTH", "WEALTH"], "downstream": ["SOCIAL", "LEGACY"]},
            "SOCIAL": {"upstream": ["FAMILY"], "downstream": ["CAREER", "LEGACY"]},
            "LEGACY": {"upstream": ["CREATION", "FAMILY", "SOCIAL"], "downstream": []}
        }
        
        node_deps = dependencies.get(node_name, {"upstream": [], "downstream": []})
        
        upstream_issues = []
        for up_node in node_deps["upstream"]:
            if up_node in ontology.nodes:
                up_state = ontology.nodes[up_node]
                if up_state.confidence < 0.5:
                    upstream_issues.append(
                        f"{self._get_node_korean_name(up_node)}의 신뢰도가 낮아 영향을 받고 있음"
                    )
        
        downstream_risks = []
        if ontology.nodes[node_name].confidence < 0.5:
            for down_node in node_deps["downstream"]:
                downstream_risks.append(
                    f"내 불안정이 {self._get_node_korean_name(down_node)}에 영향을 줄 수 있음"
                )
        
        return upstream_issues, downstream_risks
    
    def _recommend_action(self, node_name: str, health_status: str,
                          primary_issue: str, logs_needed: int) -> str:
        """권장 행동 생성"""
        node_korean = self._get_node_korean_name(node_name)
        
        if health_status == "healthy":
            return f"현재 {node_korean}는 안정적입니다. 꾸준히 기록해주세요."
        
        if logs_needed > 0:
            return f"{node_korean} 관련 활동을 {logs_needed}건 더 기록해주세요."
        
        if "오래된" in primary_issue:
            return f"최근 {node_korean} 관련 활동이 있다면 기록해주세요."
        
        return f"{node_korean}의 상태를 개선하기 위해 관련 활동을 기록해주세요."
    
    def diagnose_all(self, ontology: UserOntology) -> Dict[str, NodeDiagnosis]:
        """모든 노드 진단"""
        diagnoses = {}
        for node_name in ontology.nodes.keys():
            diagnoses[node_name] = self.diagnose_node(node_name, ontology)
        return diagnoses
    
    def get_priority_issues(self, ontology: UserOntology, top_n: int = 3) -> List[NodeDiagnosis]:
        """가장 시급한 문제 노드 N개 반환"""
        all_diagnoses = self.diagnose_all(ontology)
        sorted_diagnoses = sorted(
            all_diagnoses.values(), 
            key=lambda d: d.urgency_level, 
            reverse=True
        )
        return sorted_diagnoses[:top_n]
    
    def get_bottleneck_connections(self, ontology: UserOntology) -> List[dict]:
        """병목 구간 식별"""
        bottlenecks = []
        
        connections = [
            ("LEARNING", "CAREER"), ("CAREER", "WEALTH"),
            ("WEALTH", "SECURITY"), ("HEALTH", "CAREER"),
            ("FAMILY", "SOCIAL"), ("CREATION", "LEGACY"),
        ]
        
        for from_node, to_node in connections:
            if from_node in ontology.nodes and to_node in ontology.nodes:
                from_conf = ontology.nodes[from_node].confidence
                to_conf = ontology.nodes[to_node].confidence
                
                diff = from_conf - to_conf
                if diff > 0.3:
                    severity = min(1.0, diff / 0.5)
                    bottlenecks.append({
                        "from": from_node,
                        "to": to_node,
                        "severity": severity,
                        "from_confidence": from_conf,
                        "to_confidence": to_conf,
                        "message": f"{self._get_node_korean_name(from_node)}→{self._get_node_korean_name(to_node)} 구간에서 데이터 흐름이 약화됨"
                    })
        
        return sorted(bottlenecks, key=lambda x: x["severity"], reverse=True)


# ===========================================
# 편의 함수
# ===========================================
def process_log(content: str, ontology: UserOntology, 
                category: str = None) -> ProcessingResult:
    """단일 로그 처리 편의 함수"""
    processor = LogProcessor()
    log = LogEntry(
        timestamp=datetime.now().isoformat(),
        content=content,
        category=category
    )
    return processor.process_log(log, ontology)


def process_logs(contents: List[str], ontology: UserOntology) -> List[ProcessingResult]:
    """배치 로그 처리 편의 함수"""
    processor = LogProcessor()
    logs = [
        LogEntry(timestamp=datetime.now().isoformat(), content=c)
        for c in contents
    ]
    return processor.process_batch(logs, ontology)


def get_summary(ontology: UserOntology) -> dict:
    """온톨로지 요약 편의 함수"""
    processor = LogProcessor()
    return processor.get_node_summary(ontology)


# ===========================================
# 테스트
# ===========================================
if __name__ == "__main__":
    from .initializer import create_new_user
    
    print("=== AUTUS Log Processor Test (v0.1.1) ===\n")
    
    # 1. 새 사용자 생성
    print("1. Creating new user...")
    ontology = create_new_user()
    print(f"   Initial SELF value: {LogProcessor().initializer.calculate_self_value(ontology):.3f}")
    
    # 2. 테스트 로그 생성
    test_logs = [
        "오늘 아침 헬스장에서 운동했다",
        "급여가 입금되었다",
        "가족과 저녁 식사를 했다",
        "새로운 Python 강의를 시작했다",
        "프로젝트 마일스톤을 달성했다",
    ]
    
    # 3. 로그 처리
    print("\n2. Processing logs...")
    processor = LogProcessor()
    
    for log_content in test_logs:
        log = LogEntry(timestamp=datetime.now().isoformat(), content=log_content)
        result = processor.process_log(log, ontology)
        
        if result.matches:
            print(f"\n   Log: \"{log_content}\"")
            for match in result.matches:
                print(f"   → Matched: {match.pattern_name} ({match.node} {match.delta:+.3f})")
    
    # 4. 결과 확인
    print("\n3. After processing:")
    summary = processor.get_node_summary(ontology)
    
    print(f"   SELF value: {summary['self_value']:.3f}")
    print(f"   Total logs: {summary['total_logs']}")
    
    print("\n   Node values:")
    for node, data in summary['nodes'].items():
        status = "✓" if data['actionable'] else "○"
        warning = " ⚠️" if data.get('is_warning') else ""
        print(f"   {status} {node}: {data['value']:.3f} ({data['uncertainty_level']}){warning}")
    
    print("\n=== Test Complete ===")