"""
═══════════════════════════════════════════════════════════════════════════════
🌍 AUTUS v2.5+ - Universal Work Elimination Matrix
═══════════════════════════════════════════════════════════════════════════════

지구상 모든 업무의 삭제/자동화/병렬화 전략 매트릭스

핵심 원칙:
- ELIMINATE: 불필요한 업무는 존재 자체를 삭제
- AUTOMATE: 반복적 업무는 AI/시스템이 대체
- PARALLELIZE: 분할 가능한 업무는 분산 처리
- HUMANIZE: 창조/판단/감정 업무만 인간이 수행
"""

from dataclasses import dataclass, field
from typing import Dict, List

from .taxonomy import (
    WorkCategory, WorkStrategy, WorkDomain,
    ALL_WORK_CATEGORIES, WORK_TAXONOMY_STATS,
    ADMINISTRATIVE_WORK, FINANCIAL_WORK, OPERATIONAL_WORK,
    CREATIVE_WORK, ANALYTICAL_WORK, RELATIONAL_WORK, PHYSICAL_WORK,
)

# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 매트릭스
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class WorkMatrix:
    """도메인별 업무 매트릭스"""
    domain: WorkDomain
    domain_ko: str
    
    # 전략별 분류
    eliminate: List[WorkCategory] = field(default_factory=list)
    automate: List[WorkCategory] = field(default_factory=list)
    parallelize: List[WorkCategory] = field(default_factory=list)
    humanize: List[WorkCategory] = field(default_factory=list)
    
    # 통계
    total_categories: int = 0
    elimination_rate: float = 0.0
    automation_rate: float = 0.0
    parallelization_rate: float = 0.0
    human_essential_rate: float = 0.0
    
    # 시간/에너지 절약 추정
    estimated_time_savings: float = 0.0  # 주당 시간
    estimated_energy_savings: float = 0.0
    
    # 진화 타임라인
    full_automation_years: int = 0


DOMAIN_NAMES = {
    'administrative': '행정/관리',
    'financial': '금융/회계',
    'operational': '운영/생산',
    'creative': '창작/디자인',
    'analytical': '분석/연구',
    'relational': '관계/소통',
    'physical': '물리적 노동',
}

TIME_BY_DOMAIN = {
    'administrative': 15,   # 주 15시간
    'financial': 8,         # 주 8시간
    'operational': 20,      # 주 20시간
    'creative': 25,         # 주 25시간
    'analytical': 15,       # 주 15시간
    'relational': 12,       # 주 12시간
    'physical': 30,         # 주 30시간
}


def generate_domain_matrix(domain: WorkDomain) -> WorkMatrix:
    """도메인별 매트릭스 생성"""
    categories = [c for c in ALL_WORK_CATEGORIES if c.domain == domain]
    
    eliminate = [c for c in categories if c.primary_strategy == 'ELIMINATE']
    automate = [c for c in categories if c.primary_strategy == 'AUTOMATE']
    parallelize = [c for c in categories if c.primary_strategy == 'PARALLELIZE']
    humanize = [c for c in categories if c.primary_strategy == 'HUMANIZE']
    
    total = len(categories)
    if total == 0:
        return WorkMatrix(domain=domain, domain_ko=DOMAIN_NAMES.get(domain, domain))
    
    # 평균 비율 계산
    avg_elimination = sum(c.elimination_potential for c in categories) / total
    avg_automation = sum(c.automation_potential for c in categories) / total
    avg_parallel = sum(c.parallelization_potential for c in categories) / total
    avg_human = sum(c.human_essential for c in categories) / total
    
    # 시간 절약 추정
    base_time = TIME_BY_DOMAIN.get(domain, 10)
    time_savings = base_time * (avg_elimination * 1.0 + avg_automation * 0.85 + avg_parallel * 0.5)
    
    # 자동화 완료 예상 년수
    max_years = max((c.timeline_years for c in categories), default=0)
    
    return WorkMatrix(
        domain=domain,
        domain_ko=DOMAIN_NAMES.get(domain, domain),
        eliminate=eliminate,
        automate=automate,
        parallelize=parallelize,
        humanize=humanize,
        total_categories=total,
        elimination_rate=avg_elimination,
        automation_rate=avg_automation,
        parallelization_rate=avg_parallel,
        human_essential_rate=avg_human,
        estimated_time_savings=round(time_savings, 1),
        estimated_energy_savings=avg_elimination * 0.3 + avg_automation * 0.5 + avg_parallel * 0.2,
        full_automation_years=max_years,
    )


def generate_full_matrix() -> List[WorkMatrix]:
    """전체 매트릭스 생성"""
    domains: List[WorkDomain] = [
        'administrative', 'financial', 'operational',
        'creative', 'analytical', 'relational', 'physical',
    ]
    return [generate_domain_matrix(d) for d in domains]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 글로벌 업무 통계
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class GlobalWorkStats:
    """글로벌 업무 통계"""
    total_work_categories: int = 0
    
    # 전략별 분포
    by_strategy: Dict[str, Dict] = field(default_factory=dict)
    
    # 도메인별 분포
    by_domain: Dict[str, int] = field(default_factory=dict)
    
    # 자동화 잠재력
    avg_automation_potential: float = 0.0
    avg_elimination_potential: float = 0.0
    
    # 시간/에너지 절약
    total_weekly_time_savings: float = 0.0
    total_energy_savings: float = 0.0
    
    # 타임라인
    avg_years_to_full_automation: float = 0.0
    
    # 특수 카테고리
    human_essential_categories: List[WorkCategory] = field(default_factory=list)
    immediate_elimination_candidates: List[WorkCategory] = field(default_factory=list)
    immediate_automation_candidates: List[WorkCategory] = field(default_factory=list)


def calculate_global_stats() -> GlobalWorkStats:
    """글로벌 통계 계산"""
    total = len(ALL_WORK_CATEGORIES)
    
    by_strategy = {
        'ELIMINATE': {
            'count': WORK_TAXONOMY_STATS['by_strategy']['ELIMINATE'],
            'percentage': WORK_TAXONOMY_STATS['by_strategy']['ELIMINATE'] / total * 100,
        },
        'AUTOMATE': {
            'count': WORK_TAXONOMY_STATS['by_strategy']['AUTOMATE'],
            'percentage': WORK_TAXONOMY_STATS['by_strategy']['AUTOMATE'] / total * 100,
        },
        'PARALLELIZE': {
            'count': WORK_TAXONOMY_STATS['by_strategy']['PARALLELIZE'],
            'percentage': WORK_TAXONOMY_STATS['by_strategy']['PARALLELIZE'] / total * 100,
        },
        'HUMANIZE': {
            'count': WORK_TAXONOMY_STATS['by_strategy']['HUMANIZE'],
            'percentage': WORK_TAXONOMY_STATS['by_strategy']['HUMANIZE'] / total * 100,
        },
    }
    
    avg_automation = sum(c.automation_potential for c in ALL_WORK_CATEGORIES) / total
    avg_elimination = sum(c.elimination_potential for c in ALL_WORK_CATEGORIES) / total
    
    matrices = generate_full_matrix()
    total_time_savings = sum(m.estimated_time_savings for m in matrices)
    total_energy = sum(m.estimated_energy_savings for m in matrices) / len(matrices)
    
    avg_years = sum(c.timeline_years for c in ALL_WORK_CATEGORIES) / total
    
    # 특수 카테고리
    human_essential = [c for c in ALL_WORK_CATEGORIES if c.human_essential > 0.6]
    immediate_elimination = [c for c in ALL_WORK_CATEGORIES if c.elimination_potential > 0.8 and c.timeline_years == 0]
    immediate_automation = [c for c in ALL_WORK_CATEGORIES if c.automation_potential > 0.9 and c.timeline_years <= 1]
    
    return GlobalWorkStats(
        total_work_categories=total,
        by_strategy=by_strategy,
        by_domain=WORK_TAXONOMY_STATS['by_domain'],
        avg_automation_potential=avg_automation,
        avg_elimination_potential=avg_elimination,
        total_weekly_time_savings=total_time_savings,
        total_energy_savings=total_energy,
        avg_years_to_full_automation=avg_years,
        human_essential_categories=human_essential,
        immediate_elimination_candidates=immediate_elimination,
        immediate_automation_candidates=immediate_automation,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 업무 진화 타임라인
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class EvolutionMilestone:
    """진화 마일스톤"""
    year: int
    categories_automated: int
    cumulative_time_saved: float
    human_work_remaining: int
    description: str


def generate_evolution_timeline() -> List[EvolutionMilestone]:
    """진화 타임라인 생성"""
    milestones = []
    total = len(ALL_WORK_CATEGORIES)
    
    descriptions = {
        0: '즉시 삭제/자동화 가능 업무 처리 완료',
        1: '기본 자동화 도구 도입 완료',
        2: 'AI 어시스턴트 통합 완료',
        3: '대부분의 행정/금융 업무 자동화',
        5: '물류/운영 자동화 완료',
        7: '복잡한 분석/연구 업무 자동화',
        10: '대부분의 물리적 노동 자동화',
    }
    
    years = [0, 1, 2, 3, 5, 7, 10]
    
    for year in years:
        automated = [c for c in ALL_WORK_CATEGORIES if c.timeline_years <= year]
        time_saved = sum(c.automation_potential * 10 for c in automated)
        
        milestones.append(EvolutionMilestone(
            year=year,
            categories_automated=len(automated),
            cumulative_time_saved=time_saved,
            human_work_remaining=total - len(automated),
            description=descriptions.get(year, ''),
        ))
    
    return milestones


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 보고서 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_work_matrix_report() -> str:
    """업무 매트릭스 보고서 생성"""
    stats = calculate_global_stats()
    matrices = generate_full_matrix()
    timeline = generate_evolution_timeline()
    
    domain_lines = []
    for m in matrices:
        line = f"│ {m.domain_ko:12} │ E:{m.elimination_rate*100:>3.0f}% │ A:{m.automation_rate*100:>3.0f}% │ P:{m.parallelization_rate*100:>3.0f}% │ H:{m.human_essential_rate*100:>3.0f}% │ {m.estimated_time_savings:>4.0f}h/wk │"
        domain_lines.append(line)
    
    timeline_lines = []
    for m in timeline:
        line = f"│ Year {m.year:<2} │ {m.categories_automated:>2}/{stats.total_work_categories} automated │ {m.cumulative_time_saved:>4.0f}h saved │ {m.description:30} │"
        timeline_lines.append(line)
    
    eliminate_lines = [f"│    • {c.name_ko} ({c.elimination_potential*100:.0f}%)" for c in stats.immediate_elimination_candidates[:5]]
    automate_lines = [f"│    • {c.name_ko} ({c.automation_potential*100:.0f}%)" for c in stats.immediate_automation_candidates[:5]]
    human_lines = [f"│    • {c.name_ko} (필수: {c.human_essential*100:.0f}%)" for c in stats.human_essential_categories[:5]]
    
    return f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║        🌍 AUTUS Universal Work Elimination Matrix                             ║
║        "지구상 모든 업무의 삭제/자동화/병렬화 전략"                             ║
╚═══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 GLOBAL STATISTICS                                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ Total Work Categories: {stats.total_work_categories}                                                    │
│                                                                             │
│ Strategy Distribution:                                                      │
│   🗑️  ELIMINATE    : {stats.by_strategy['ELIMINATE']['count']} ({stats.by_strategy['ELIMINATE']['percentage']:.1f}%)  - 삭제 (불필요)                   │
│   🤖 AUTOMATE     : {stats.by_strategy['AUTOMATE']['count']} ({stats.by_strategy['AUTOMATE']['percentage']:.1f}%)  - 자동화 (AI 대체)                │
│   🔀 PARALLELIZE  : {stats.by_strategy['PARALLELIZE']['count']} ({stats.by_strategy['PARALLELIZE']['percentage']:.1f}%)   - 병렬화 (분산)                   │
│   👤 HUMANIZE     : {stats.by_strategy['HUMANIZE']['count']} ({stats.by_strategy['HUMANIZE']['percentage']:.1f}%)  - 인간 필수 (창조/판단)            │
│                                                                             │
│ Automation Potential: {stats.avg_automation_potential * 100:.1f}%                                              │
│ Elimination Potential: {stats.avg_elimination_potential * 100:.1f}%                                             │
│                                                                             │
│ Weekly Time Savings: {stats.total_weekly_time_savings:.1f}시간                                              │
│ Energy Savings: {stats.total_energy_savings * 100:.1f}%                                                     │
│ Years to Full Automation: {stats.avg_years_to_full_automation:.1f}년                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 📈 DOMAIN BREAKDOWN                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
{chr(10).join(domain_lines)}
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ ⏰ EVOLUTION TIMELINE                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
{chr(10).join(timeline_lines)}
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│ 🎯 IMMEDIATE ACTION ITEMS                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 🗑️  ELIMINATE NOW ({len(stats.immediate_elimination_candidates)} items):                                              │
{chr(10).join(eliminate_lines)}
│                                                                             │
│ 🤖 AUTOMATE NOW ({len(stats.immediate_automation_candidates)} items):                                               │
{chr(10).join(automate_lines)}
│                                                                             │
│ 👤 HUMAN ESSENTIAL ({len(stats.human_essential_categories)} items):                                             │
{chr(10).join(human_lines)}
└─────────────────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════════════════╗
║ "노동은 삭제되고, 창조만 남는다"                                              ║
║ "삭제할 수 있으면 삭제하고, 자동화할 수 있으면 자동화하고,                       ║
║  분산할 수 있으면 분산하고, 그래도 남는 것만 인간이 한다"                        ║
╚═══════════════════════════════════════════════════════════════════════════════╝
""".strip()
