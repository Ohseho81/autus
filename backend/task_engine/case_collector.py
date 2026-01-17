"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS 사례 수집 시스템
Task Case Collector - 업무 사례 수집/분석/학습
═══════════════════════════════════════════════════════════════════════════════

기능:
1. 업무 실행 사례 자동 수집
2. 성공/실패 패턴 분석
3. Best Practice 추출
4. K/I/r 최적화 데이터 축적
"""

from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from uuid import UUID, uuid4
from collections import defaultdict
import json
import statistics

# ═══════════════════════════════════════════════════════════════════════════════
# 사례 유형
# ═══════════════════════════════════════════════════════════════════════════════

class CaseOutcome(str, Enum):
    """사례 결과"""
    SUCCESS = "SUCCESS"           # 성공
    PARTIAL = "PARTIAL"           # 부분 성공
    FAILURE = "FAILURE"           # 실패
    TIMEOUT = "TIMEOUT"           # 타임아웃
    CANCELLED = "CANCELLED"       # 취소


class CaseSource(str, Enum):
    """사례 출처"""
    AUTO_EXECUTION = "AUTO_EXECUTION"     # 자동 실행
    MANUAL_INPUT = "MANUAL_INPUT"         # 수동 입력
    EXTERNAL_IMPORT = "EXTERNAL_IMPORT"   # 외부 임포트
    SIMULATION = "SIMULATION"             # 시뮬레이션


# ═══════════════════════════════════════════════════════════════════════════════
# 사례 데이터 모델
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class TaskCase:
    """업무 실행 사례"""
    case_id: str = field(default_factory=lambda: str(uuid4())[:12])
    task_id: str = ""
    taxonomy_code: str = ""       # 5차 분류 코드
    
    # 실행 정보
    entity_id: Optional[str] = None
    user_type: str = "INDIVIDUAL"
    actor: str = ""
    
    # 입력/출력
    input_data: Dict[str, Any] = field(default_factory=dict)
    output_data: Dict[str, Any] = field(default_factory=dict)
    
    # 결과
    outcome: CaseOutcome = CaseOutcome.SUCCESS
    error_message: Optional[str] = None
    
    # K/I/r
    k_before: float = 1.0
    i_before: float = 0.0
    r_before: float = 0.0
    k_after: float = 1.0
    i_after: float = 0.0
    r_after: float = 0.0
    
    # 성능 메트릭
    duration_ms: int = 0
    energy_consumed: float = 0.0
    automation_level: int = 0
    
    # 메타
    source: CaseSource = CaseSource.AUTO_EXECUTION
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    tags: List[str] = field(default_factory=list)
    notes: str = ""
    
    @property
    def k_delta(self) -> float:
        return round(self.k_after - self.k_before, 4)
    
    @property
    def i_delta(self) -> float:
        return round(self.i_after - self.i_before, 4)
    
    @property
    def r_delta(self) -> float:
        return round(self.r_after - self.r_before, 4)
    
    @property
    def is_success(self) -> bool:
        return self.outcome in (CaseOutcome.SUCCESS, CaseOutcome.PARTIAL)


@dataclass
class BestPractice:
    """Best Practice"""
    practice_id: str = field(default_factory=lambda: str(uuid4())[:8])
    task_id: str = ""
    taxonomy_code: str = ""
    
    title: str = ""
    description: str = ""
    
    # 추천 설정
    recommended_automation_level: int = 50
    recommended_k: float = 1.0
    recommended_i: float = 0.0
    
    # 조건
    applicable_user_types: List[str] = field(default_factory=list)
    prerequisites: List[str] = field(default_factory=list)
    
    # 기반 데이터
    based_on_cases: int = 0
    avg_success_rate: float = 0.0
    avg_k_improvement: float = 0.0
    
    # 메타
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    confidence: float = 0.5


# ═══════════════════════════════════════════════════════════════════════════════
# 사례 수집기
# ═══════════════════════════════════════════════════════════════════════════════

class CaseCollector:
    """사례 수집 및 분석기"""
    
    def __init__(self):
        self._cases: Dict[str, TaskCase] = {}
        self._by_task: Dict[str, List[str]] = defaultdict(list)
        self._by_taxonomy: Dict[str, List[str]] = defaultdict(list)
        self._best_practices: Dict[str, BestPractice] = {}
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 사례 수집
    # ═══════════════════════════════════════════════════════════════════════════
    
    def collect(self, case: TaskCase) -> str:
        """사례 수집"""
        self._cases[case.case_id] = case
        self._by_task[case.task_id].append(case.case_id)
        
        if case.taxonomy_code:
            self._by_taxonomy[case.taxonomy_code].append(case.case_id)
        
        return case.case_id
    
    def collect_from_execution(
        self,
        task_id: str,
        entity_id: str,
        input_data: Dict,
        output_data: Dict,
        success: bool,
        duration_ms: int,
        k_before: float,
        k_after: float,
        **kwargs,
    ) -> str:
        """실행 결과로부터 사례 수집"""
        case = TaskCase(
            task_id=task_id,
            entity_id=entity_id,
            input_data=input_data,
            output_data=output_data,
            outcome=CaseOutcome.SUCCESS if success else CaseOutcome.FAILURE,
            duration_ms=duration_ms,
            k_before=k_before,
            k_after=k_after,
            source=CaseSource.AUTO_EXECUTION,
            **kwargs,
        )
        return self.collect(case)
    
    def import_external(
        self,
        cases: List[Dict[str, Any]],
        source_name: str,
    ) -> int:
        """외부 사례 임포트"""
        imported = 0
        for case_data in cases:
            try:
                case = TaskCase(
                    task_id=case_data.get("task_id", ""),
                    taxonomy_code=case_data.get("taxonomy_code", ""),
                    outcome=CaseOutcome(case_data.get("outcome", "SUCCESS")),
                    k_before=case_data.get("k_before", 1.0),
                    k_after=case_data.get("k_after", 1.0),
                    duration_ms=case_data.get("duration_ms", 0),
                    source=CaseSource.EXTERNAL_IMPORT,
                    tags=[source_name],
                )
                self.collect(case)
                imported += 1
            except Exception:
                continue
        
        return imported
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 사례 조회
    # ═══════════════════════════════════════════════════════════════════════════
    
    def get_case(self, case_id: str) -> Optional[TaskCase]:
        """사례 조회"""
        return self._cases.get(case_id)
    
    def get_cases_by_task(self, task_id: str, limit: int = 100) -> List[TaskCase]:
        """업무별 사례 조회"""
        case_ids = self._by_task.get(task_id, [])[-limit:]
        return [self._cases[cid] for cid in case_ids if cid in self._cases]
    
    def get_cases_by_taxonomy(self, code: str, limit: int = 100) -> List[TaskCase]:
        """분류별 사례 조회"""
        case_ids = self._by_taxonomy.get(code, [])[-limit:]
        return [self._cases[cid] for cid in case_ids if cid in self._cases]
    
    def get_recent_cases(self, hours: int = 24, limit: int = 100) -> List[TaskCase]:
        """최근 사례 조회"""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        recent = [c for c in self._cases.values() if c.timestamp > cutoff]
        return sorted(recent, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 사례 분석
    # ═══════════════════════════════════════════════════════════════════════════
    
    def analyze_task(self, task_id: str) -> Dict[str, Any]:
        """업무별 분석"""
        cases = self.get_cases_by_task(task_id)
        
        if not cases:
            return {"task_id": task_id, "case_count": 0}
        
        success_cases = [c for c in cases if c.is_success]
        
        k_deltas = [c.k_delta for c in cases]
        durations = [c.duration_ms for c in cases if c.duration_ms > 0]
        
        return {
            "task_id": task_id,
            "case_count": len(cases),
            "success_rate": len(success_cases) / len(cases),
            "avg_k_delta": statistics.mean(k_deltas) if k_deltas else 0,
            "avg_duration_ms": statistics.mean(durations) if durations else 0,
            "k_delta_stddev": statistics.stdev(k_deltas) if len(k_deltas) > 1 else 0,
            "outcome_distribution": self._count_outcomes(cases),
            "user_type_distribution": self._count_user_types(cases),
        }
    
    def find_patterns(self, task_id: str) -> Dict[str, Any]:
        """성공/실패 패턴 찾기"""
        cases = self.get_cases_by_task(task_id)
        
        success_cases = [c for c in cases if c.is_success]
        failure_cases = [c for c in cases if not c.is_success]
        
        patterns = {
            "success_patterns": [],
            "failure_patterns": [],
        }
        
        # 성공 패턴 분석
        if success_cases:
            avg_k_before = statistics.mean([c.k_before for c in success_cases])
            avg_automation = statistics.mean([c.automation_level for c in success_cases])
            
            patterns["success_patterns"].append({
                "pattern": "optimal_k_range",
                "avg_k_before": round(avg_k_before, 2),
                "avg_automation": round(avg_automation, 1),
            })
        
        # 실패 패턴 분석
        if failure_cases:
            common_errors = defaultdict(int)
            for c in failure_cases:
                if c.error_message:
                    # 에러 메시지에서 키워드 추출
                    keywords = c.error_message.split()[:3]
                    common_errors[" ".join(keywords)] += 1
            
            if common_errors:
                patterns["failure_patterns"].append({
                    "pattern": "common_errors",
                    "errors": dict(common_errors),
                })
        
        return patterns
    
    def _count_outcomes(self, cases: List[TaskCase]) -> Dict[str, int]:
        """결과 분포"""
        counts = defaultdict(int)
        for case in cases:
            counts[case.outcome.value] += 1
        return dict(counts)
    
    def _count_user_types(self, cases: List[TaskCase]) -> Dict[str, int]:
        """사용자 타입 분포"""
        counts = defaultdict(int)
        for case in cases:
            counts[case.user_type] += 1
        return dict(counts)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # Best Practice 추출
    # ═══════════════════════════════════════════════════════════════════════════
    
    def extract_best_practice(self, task_id: str) -> Optional[BestPractice]:
        """Best Practice 추출"""
        cases = self.get_cases_by_task(task_id)
        success_cases = [c for c in cases if c.is_success]
        
        if len(success_cases) < 10:
            return None  # 충분한 데이터 필요
        
        # 상위 성과 사례 분석
        top_cases = sorted(success_cases, key=lambda x: x.k_delta, reverse=True)[:int(len(success_cases) * 0.2)]
        
        if not top_cases:
            return None
        
        avg_automation = statistics.mean([c.automation_level for c in top_cases])
        avg_k = statistics.mean([c.k_after for c in top_cases])
        avg_k_improvement = statistics.mean([c.k_delta for c in top_cases])
        
        practice = BestPractice(
            task_id=task_id,
            title=f"Best Practice for {task_id}",
            description=f"상위 20% 성공 사례 기반 추천 설정",
            recommended_automation_level=int(avg_automation),
            recommended_k=round(avg_k, 2),
            based_on_cases=len(success_cases),
            avg_success_rate=len(success_cases) / len(cases),
            avg_k_improvement=round(avg_k_improvement, 4),
            confidence=min(0.95, 0.5 + len(success_cases) / 200),
        )
        
        self._best_practices[practice.practice_id] = practice
        return practice
    
    def get_best_practice(self, task_id: str) -> Optional[BestPractice]:
        """Best Practice 조회"""
        for bp in self._best_practices.values():
            if bp.task_id == task_id:
                return bp
        return None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 통계
    # ═══════════════════════════════════════════════════════════════════════════
    
    def get_statistics(self) -> Dict[str, Any]:
        """전체 통계"""
        all_cases = list(self._cases.values())
        
        if not all_cases:
            return {"total_cases": 0}
        
        success_cases = [c for c in all_cases if c.is_success]
        
        return {
            "total_cases": len(all_cases),
            "success_rate": len(success_cases) / len(all_cases),
            "unique_tasks": len(self._by_task),
            "unique_taxonomies": len(self._by_taxonomy),
            "best_practices_count": len(self._best_practices),
            "by_source": self._count_by_source(all_cases),
            "by_outcome": self._count_outcomes(all_cases),
        }
    
    def _count_by_source(self, cases: List[TaskCase]) -> Dict[str, int]:
        """출처별 분포"""
        counts = defaultdict(int)
        for case in cases:
            counts[case.source.value] += 1
        return dict(counts)


# ═══════════════════════════════════════════════════════════════════════════════
# Global Instance
# ═══════════════════════════════════════════════════════════════════════════════

_case_collector: Optional[CaseCollector] = None


def get_case_collector() -> CaseCollector:
    """사례 수집기 싱글톤"""
    global _case_collector
    if _case_collector is None:
        _case_collector = CaseCollector()
    return _case_collector
