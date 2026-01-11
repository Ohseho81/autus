"""
═══════════════════════════════════════════════════════════════════════════════
🎯 AUTUS v2.5+ - ERT Work Elimination System
═══════════════════════════════════════════════════════════════════════════════

"무슨 존재가 될지는 당신이 정한다.
 그 존재를 유지하는 일은 우리가 한다."

ERT 288 Matrix: 12 Entity × 6 Relation × 4 Time = 288개 관점

사용법:
    from backend.core.work import (
        create_ert_work,
        auto_decide,
        generate_ert_matrix_report,
    )
    
    # 업무 생성 (ERT 분류)
    work = create_ert_work(
        '청구서 처리',
        entity='CASH',
        relation='EXCHANGE',
        time='SEQUENCE',
        variables={'pressure': 0.4, 'entropy': 0.3}
    )
    
    # 자동 판단
    decision = auto_decide(work)
    print(decision.proposed_strategy)  # 'AUTOMATE'
    print(decision.confidence)          # 0.9
    
    # 매트릭스 보고서
    print(generate_ert_matrix_report())
"""

# ═══════════════════════════════════════════════════════════════════════════════
# ERT Classification (12E × 6R × 4T = 288)
# ═══════════════════════════════════════════════════════════════════════════════

from .ert_classification import (
    # Types
    Entity,
    Relation,
    TimeType,
    ERTStrategy,
    
    # Definitions
    EntityDef,
    RelationDef,
    TimeDef,
    
    # Data
    ENTITIES,
    RELATIONS,
    TIME_TYPES,
    
    # ERT Work
    ERTWork,
    KeyPattern,
    KEY_ERT_PATTERNS,
    
    # Functions
    calculate_ert_strategy,
    generate_all_ert_combinations,
    get_ert_stats,
    ERTStats,
)

# ═══════════════════════════════════════════════════════════════════════════════
# ERT Auto-Decision Engine
# ═══════════════════════════════════════════════════════════════════════════════

from .ert_auto_decision import (
    # Variables
    UserVariables,
    Edge,
    EdgeType,
    
    # Work Instance
    ERTWorkInstance,
    
    # Thresholds
    Thresholds,
    DEFAULT_THRESHOLDS,
    
    # Decision
    DecisionResult,
    DecisionActions,
    ExpectedOutcome,
    VariableAnalysis,
    BatchDecisionResult,
    BatchDecisionSummary,
    
    # Functions
    auto_decide,
    batch_decide,
    generate_proposal_message,
    analyze_variables,
)

# ═══════════════════════════════════════════════════════════════════════════════
# Work Eliminator (통합 시스템)
# ═══════════════════════════════════════════════════════════════════════════════

from .work_eliminator import (
    # State
    WorkEliminatorState,
    WorkEliminatorStats,
    WorkEliminatorConfig,
    create_work_eliminator_state,
    
    # Work Creation
    create_ert_work,
    
    # Actions
    analyze_all_works,
    process_single_work,
    accept_proposal,
    reject_proposal,
    
    # Reports
    generate_report,
    generate_ert_matrix_report,
    
    # Example
    run_example,
)

# ═══════════════════════════════════════════════════════════════════════════════
# Legacy Work Module (기존 호환)
# ═══════════════════════════════════════════════════════════════════════════════

from .taxonomy import (
    WorkCategory,
    WorkStrategy,
    WorkDomain,
    AutomationLevel,
    ALL_WORK_CATEGORIES,
    WORK_TAXONOMY_STATS,
)

from .processor import (
    WorkInstance,
    ProcessingDecision,
    UserWorkPreferences,
    DEFAULT_USER_PREFERENCES,
    decide_processing_strategy,
    analyze_work_batch,
    create_work_instance,
    WorkBatchSummary,
)

from .matrix import (
    WorkMatrix,
    GlobalWorkStats,
    EvolutionMilestone,
    generate_domain_matrix,
    generate_full_matrix,
    calculate_global_stats,
    generate_evolution_timeline,
    generate_work_matrix_report,
)

# ═══════════════════════════════════════════════════════════════════════════════
# 버전 정보
# ═══════════════════════════════════════════════════════════════════════════════

WORK_MODULE_VERSION = '2.5+ ERT'

__all__ = [
    # Version
    'WORK_MODULE_VERSION',
    
    # === ERT System ===
    # Types
    'Entity', 'Relation', 'TimeType', 'ERTStrategy',
    'EntityDef', 'RelationDef', 'TimeDef',
    
    # Data
    'ENTITIES', 'RELATIONS', 'TIME_TYPES',
    'ERTWork', 'KeyPattern', 'KEY_ERT_PATTERNS',
    
    # Functions
    'calculate_ert_strategy', 'generate_all_ert_combinations', 'get_ert_stats',
    'ERTStats',
    
    # Variables
    'UserVariables', 'Edge', 'EdgeType',
    'ERTWorkInstance',
    'Thresholds', 'DEFAULT_THRESHOLDS',
    
    # Decision
    'DecisionResult', 'DecisionActions', 'ExpectedOutcome',
    'VariableAnalysis', 'BatchDecisionResult', 'BatchDecisionSummary',
    'auto_decide', 'batch_decide', 'generate_proposal_message', 'analyze_variables',
    
    # Work Eliminator
    'WorkEliminatorState', 'WorkEliminatorStats', 'WorkEliminatorConfig',
    'create_work_eliminator_state', 'create_ert_work',
    'analyze_all_works', 'process_single_work', 'accept_proposal', 'reject_proposal',
    'generate_report', 'generate_ert_matrix_report', 'run_example',
    
    # === Legacy System ===
    'WorkCategory', 'WorkStrategy', 'WorkDomain', 'AutomationLevel',
    'ALL_WORK_CATEGORIES', 'WORK_TAXONOMY_STATS',
    'WorkInstance', 'ProcessingDecision', 'UserWorkPreferences',
    'DEFAULT_USER_PREFERENCES', 'decide_processing_strategy',
    'analyze_work_batch', 'create_work_instance', 'WorkBatchSummary',
    'WorkMatrix', 'GlobalWorkStats', 'EvolutionMilestone',
    'generate_domain_matrix', 'generate_full_matrix', 'calculate_global_stats',
    'generate_evolution_timeline', 'generate_work_matrix_report',
]
