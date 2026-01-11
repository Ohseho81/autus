"""
═══════════════════════════════════════════════════════════════════════════════
📊 AUTUS Efficiency Module (효율성 분석)
═══════════════════════════════════════════════════════════════════════════════

업무 효율성 분석 엔진
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class EfficiencyLevel(Enum):
    """효율성 레벨"""
    CRITICAL = "CRITICAL"     # 긴급 개선 필요
    LOW = "LOW"               # 낮음
    MEDIUM = "MEDIUM"         # 보통
    HIGH = "HIGH"             # 높음
    OPTIMAL = "OPTIMAL"       # 최적


@dataclass
class EfficiencyMetric:
    """효율성 메트릭"""
    name: str
    value: float              # 0-100
    level: EfficiencyLevel
    trend: float = 0.0        # 변화율
    benchmark: float = 50.0   # 벤치마크


@dataclass
class TaskEfficiency:
    """업무 효율성"""
    task_id: str
    name: str
    time_spent: float         # 시간 (분)
    time_estimated: float     # 예상 시간
    efficiency_score: float   # 0-100
    bottlenecks: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


@dataclass
class TeamEfficiency:
    """팀 효율성"""
    team_id: str
    name: str
    members: int
    overall_score: float      # 0-100
    task_completion_rate: float
    collaboration_score: float
    capacity_utilization: float


@dataclass
class EfficiencyReport:
    """효율성 리포트"""
    generated_at: datetime
    overall_score: float
    metrics: List[EfficiencyMetric]
    tasks: List[TaskEfficiency]
    recommendations: List[str]


class EfficiencyEngine:
    """효율성 분석 엔진"""
    
    def __init__(self):
        self._metrics: Dict[str, EfficiencyMetric] = {}
        self._tasks: List[TaskEfficiency] = []
        self._history: List[EfficiencyReport] = []
    
    def analyze_task(
        self,
        task_id: str,
        name: str,
        time_spent: float,
        time_estimated: float
    ) -> TaskEfficiency:
        """업무 효율성 분석"""
        # 효율성 점수 계산
        if time_estimated > 0:
            ratio = time_spent / time_estimated
            if ratio <= 0.8:
                score = 100
            elif ratio <= 1.0:
                score = 80 + (1 - ratio) * 100
            elif ratio <= 1.5:
                score = 50 + (1.5 - ratio) * 60
            else:
                score = max(0, 50 - (ratio - 1.5) * 50)
        else:
            score = 50
        
        # 병목 및 제안 생성
        bottlenecks = []
        suggestions = []
        
        if time_spent > time_estimated * 1.5:
            bottlenecks.append("예상 시간 초과")
            suggestions.append("업무 분할 또는 자동화 검토")
        
        task = TaskEfficiency(
            task_id=task_id,
            name=name,
            time_spent=time_spent,
            time_estimated=time_estimated,
            efficiency_score=round(score, 2),
            bottlenecks=bottlenecks,
            suggestions=suggestions,
        )
        
        self._tasks.append(task)
        return task
    
    def calculate_overall(self) -> float:
        """전체 효율성 계산"""
        if not self._tasks:
            return 50.0
        
        scores = [t.efficiency_score for t in self._tasks]
        return round(sum(scores) / len(scores), 2)
    
    def generate_report(self) -> EfficiencyReport:
        """리포트 생성"""
        overall = self.calculate_overall()
        
        # 메트릭 생성
        metrics = [
            EfficiencyMetric(
                name="전체 효율성",
                value=overall,
                level=self._get_level(overall),
            ),
            EfficiencyMetric(
                name="업무 완료율",
                value=len([t for t in self._tasks if t.efficiency_score >= 50]) / max(len(self._tasks), 1) * 100,
                level=EfficiencyLevel.MEDIUM,
            ),
        ]
        
        # 추천 생성
        recommendations = []
        if overall < 50:
            recommendations.append("전반적인 업무 프로세스 검토 필요")
        if any(t.efficiency_score < 30 for t in self._tasks):
            recommendations.append("저효율 업무 자동화 검토")
        
        report = EfficiencyReport(
            generated_at=datetime.now(),
            overall_score=overall,
            metrics=metrics,
            tasks=self._tasks.copy(),
            recommendations=recommendations,
        )
        
        self._history.append(report)
        return report
    
    def _get_level(self, score: float) -> EfficiencyLevel:
        """점수에서 레벨 결정"""
        if score >= 90:
            return EfficiencyLevel.OPTIMAL
        elif score >= 70:
            return EfficiencyLevel.HIGH
        elif score >= 50:
            return EfficiencyLevel.MEDIUM
        elif score >= 30:
            return EfficiencyLevel.LOW
        else:
            return EfficiencyLevel.CRITICAL
    
    def get_trends(self) -> Dict[str, float]:
        """트렌드 조회"""
        if len(self._history) < 2:
            return {}
        
        latest = self._history[-1].overall_score
        previous = self._history[-2].overall_score
        
        return {
            "current": latest,
            "previous": previous,
            "change": latest - previous,
            "change_percent": ((latest - previous) / max(previous, 1)) * 100,
        }
    
    def reset(self):
        """리셋"""
        self._metrics.clear()
        self._tasks.clear()


# ═══════════════════════════════════════════════════════════════════════════════
# Singleton
# ═══════════════════════════════════════════════════════════════════════════════

_engine: Optional[EfficiencyEngine] = None


def get_efficiency_engine() -> EfficiencyEngine:
    """엔진 싱글턴"""
    global _engine
    if _engine is None:
        _engine = EfficiencyEngine()
    return _engine


def analyze_efficiency(
    task_id: str,
    name: str,
    time_spent: float,
    time_estimated: float
) -> TaskEfficiency:
    """업무 효율성 분석 (편의 함수)"""
    return get_efficiency_engine().analyze_task(
        task_id, name, time_spent, time_estimated
    )


def get_efficiency_report() -> EfficiencyReport:
    """리포트 생성 (편의 함수)"""
    return get_efficiency_engine().generate_report()
