"""
AUTUS Sovereign - Inertia Calculator
=====================================

관성(Inertia) 계산기: 삭제하기 어려운 요소들의 "무게"를 측정

관성 = 질량 × 마찰 × 의존성
삭제 ROI = (절약 + 효율) / (비용 + 위험)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum
from datetime import datetime
import hashlib


class InertiaType(Enum):
    """관성 원천 유형"""
    SUBSCRIPTION = "subscription"       # 구독 서비스
    CONTRACT = "contract"               # 계약
    LEGACY_SYSTEM = "legacy_system"     # 레거시 시스템
    HABIT = "habit"                     # 습관/관행
    RELATIONSHIP = "relationship"       # 관계 의존
    DATA_LOCK = "data_lock"             # 데이터 종속
    PROCESS = "process"                 # 프로세스
    ASSET = "asset"                     # 자산
    HUMAN = "human"                     # 인력
    REGULATORY = "regulatory"           # 규제 요건


# 유형별 기본 마찰 계수
INERTIA_FRICTION = {
    InertiaType.SUBSCRIPTION: 0.3,      # 쉽게 취소
    InertiaType.CONTRACT: 0.7,          # 계약 해지 어려움
    InertiaType.LEGACY_SYSTEM: 0.9,     # 매우 어려움
    InertiaType.HABIT: 0.6,             # 습관 변경 필요
    InertiaType.RELATIONSHIP: 0.5,      # 관계 유지 고려
    InertiaType.DATA_LOCK: 0.8,         # 데이터 이전 복잡
    InertiaType.PROCESS: 0.5,           # 프로세스 변경
    InertiaType.ASSET: 0.4,             # 매각 가능
    InertiaType.HUMAN: 0.85,            # 인력 조정 민감
    InertiaType.REGULATORY: 0.95,       # 규제 변경 불가
}


@dataclass
class InertiaSource:
    """관성 원천"""
    id: str
    name: str
    inertia_type: InertiaType
    
    # 관성 구성 요소
    mass: float = 0.0                   # 질량 (월비용 * 12 또는 총비용)
    friction: float = 0.5               # 마찰 계수 (0-1)
    dependency: float = 0.5             # 의존도 (0-1)
    
    # 삭제 비용
    removal_cost: float = 0.0           # 삭제 비용
    removal_time: int = 30              # 삭제 소요일
    removal_risk: float = 0.3           # 삭제 위험 (0-1)
    
    # 삭제 효과
    freed_capital: float = 0.0          # 해방 자본
    freed_time: float = 0.0             # 해방 시간 (시간/월)
    efficiency_gain: float = 0.0        # 효율 향상 (%)
    
    # 대안
    alternative: str = ""               # 대체 방안
    automation_possible: bool = False   # 자동화 가능 여부
    
    # 메타
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    tags: List[str] = field(default_factory=list)


@dataclass
class InertiaReport:
    """관성 분석 리포트"""
    entity_id: str
    entity_name: str
    analyzed_at: str
    
    # 총 관성
    total_inertia: float = 0.0
    inertia_score: float = 0.0          # 0-100 정규화 점수
    
    # 유형별 관성
    by_type: Dict[InertiaType, float] = field(default_factory=dict)
    
    # 삭제 후보
    delete_candidates: List[InertiaSource] = field(default_factory=list)
    priority_order: List[str] = field(default_factory=list)
    
    # 예상 효과
    projected_savings: float = 0.0
    projected_time_freed: float = 0.0
    projected_efficiency: float = 0.0


class InertiaCalculator:
    """
    관성 계산기
    
    핵심 공식:
    - 관성(I) = 질량(M) × 마찰(F) × 의존도(D)
    - 삭제 ROI = (절약자본 + 효율향상*1000) / (삭제비용 + 위험*1000 + 1)
    """
    
    def __init__(self):
        self.entity_sources: Dict[str, List[InertiaSource]] = {}
        self.reports: Dict[str, InertiaReport] = {}
    
    def add_source(self, entity_id: str, source: InertiaSource) -> None:
        """관성 원천 추가"""
        if entity_id not in self.entity_sources:
            self.entity_sources[entity_id] = []
        
        # 기본 마찰 계수 적용
        if source.friction == 0.5:  # 기본값이면
            source.friction = INERTIA_FRICTION.get(source.inertia_type, 0.5)
        
        self.entity_sources[entity_id].append(source)
    
    def remove_source(self, entity_id: str, source_id: str) -> bool:
        """관성 원천 제거"""
        if entity_id not in self.entity_sources:
            return False
        
        original_len = len(self.entity_sources[entity_id])
        self.entity_sources[entity_id] = [
            s for s in self.entity_sources[entity_id] if s.id != source_id
        ]
        return len(self.entity_sources[entity_id]) < original_len
    
    def calculate_inertia(self, source: InertiaSource) -> float:
        """개별 관성 계산: I = M × F × D"""
        return source.mass * source.friction * source.dependency
    
    def calculate_delete_roi(self, source: InertiaSource) -> float:
        """삭제 ROI 계산"""
        benefit = source.freed_capital + (source.efficiency_gain * 1000)
        cost = source.removal_cost + (source.removal_risk * 1000) + 1
        return benefit / cost
    
    def get_sources(self, entity_id: str) -> List[InertiaSource]:
        """엔티티 관성 원천 조회"""
        return self.entity_sources.get(entity_id, [])
    
    def analyze_entity(self, entity_id: str, entity_name: str = "") -> Optional[InertiaReport]:
        """엔티티 관성 분석"""
        sources = self.get_sources(entity_id)
        
        if not sources:
            return None
        
        # 유형별 관성 집계
        by_type: Dict[InertiaType, float] = {}
        total_inertia = 0.0
        
        for source in sources:
            inertia = self.calculate_inertia(source)
            total_inertia += inertia
            
            if source.inertia_type not in by_type:
                by_type[source.inertia_type] = 0.0
            by_type[source.inertia_type] += inertia
        
        # 삭제 ROI 기준 정렬 (높을수록 좋음)
        candidates = sorted(
            sources,
            key=lambda s: self.calculate_delete_roi(s),
            reverse=True
        )
        
        # 정규화 점수 (0-100)
        max_possible = sum(s.mass * 1.0 * 1.0 for s in sources)
        inertia_score = (total_inertia / max_possible * 100) if max_possible > 0 else 0
        
        # 예상 효과
        projected_savings = sum(s.freed_capital for s in candidates[:5])
        projected_time = sum(s.freed_time for s in candidates[:5])
        projected_efficiency = sum(s.efficiency_gain for s in candidates[:5]) / max(len(candidates[:5]), 1)
        
        report = InertiaReport(
            entity_id=entity_id,
            entity_name=entity_name or entity_id,
            analyzed_at=datetime.now().isoformat(),
            total_inertia=total_inertia,
            inertia_score=inertia_score,
            by_type=by_type,
            delete_candidates=candidates,
            priority_order=[s.id for s in candidates],
            projected_savings=projected_savings,
            projected_time_freed=projected_time,
            projected_efficiency=projected_efficiency,
        )
        
        self.reports[entity_id] = report
        return report
    
    def compare_entities(self, entity_ids: List[str]) -> List[InertiaReport]:
        """다중 엔티티 관성 비교"""
        reports = []
        
        for entity_id in entity_ids:
            report = self.analyze_entity(entity_id)
            if report:
                reports.append(report)
        
        # 관성 점수 기준 정렬 (높을수록 무거움)
        return sorted(reports, key=lambda r: r.inertia_score, reverse=True)
    
    def get_delete_roadmap(self, entity_id: str, budget: float = 0, time_limit: int = 90) -> Dict:
        """삭제 로드맵 생성"""
        sources = self.get_sources(entity_id)
        
        if not sources:
            return {"entity_id": entity_id, "phases": [], "total_impact": 0}
        
        # ROI 기준 정렬
        candidates = sorted(
            sources,
            key=lambda s: self.calculate_delete_roi(s),
            reverse=True
        )
        
        phases = []
        used_budget = 0.0
        used_time = 0
        total_savings = 0.0
        
        # Phase 1: 즉시 실행 (비용 낮음, ROI 높음)
        phase1 = []
        for s in candidates:
            if s.removal_cost <= budget * 0.1 and s.removal_time <= 7:
                phase1.append(s)
                total_savings += s.freed_capital
        
        if phase1:
            phases.append({
                "phase": 1,
                "name": "즉시 실행",
                "duration": "1주",
                "items": [{"id": s.id, "name": s.name} for s in phase1],
                "expected_savings": sum(s.freed_capital for s in phase1),
            })
        
        # Phase 2: 단기 (30일 이내)
        phase2 = [s for s in candidates if s not in phase1 and s.removal_time <= 30]
        if phase2:
            phases.append({
                "phase": 2,
                "name": "단기 정리",
                "duration": "1개월",
                "items": [{"id": s.id, "name": s.name} for s in phase2[:5]],
                "expected_savings": sum(s.freed_capital for s in phase2[:5]),
            })
        
        # Phase 3: 중기 (90일)
        phase3 = [s for s in candidates if s not in phase1 and s not in phase2 and s.removal_time <= 90]
        if phase3:
            phases.append({
                "phase": 3,
                "name": "중기 최적화",
                "duration": "3개월",
                "items": [{"id": s.id, "name": s.name} for s in phase3[:5]],
                "expected_savings": sum(s.freed_capital for s in phase3[:5]),
            })
        
        return {
            "entity_id": entity_id,
            "phases": phases,
            "total_candidates": len(candidates),
            "total_impact": total_savings,
            "generated_at": datetime.now().isoformat(),
        }
