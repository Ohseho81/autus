"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS Task Engine - 업무 솔루션 시스템
═══════════════════════════════════════════════════════════════════════════════

구성요소:
1. 30개 원자 모듈 (modules_30)
2. 30개 솔루션 모듈 (solution_modules_30)
3. 570개 업무 정의 (task_definitions_570)
4. 5차 분류 체계 (task_taxonomy)
5. 사례 수집기 (case_collector)
6. 업무 일체화 (task_unifier)
7. 솔루션 매니저 (solution_manager)
"""

# Models
from .models import (
    UserType,
    TaskLayer,
    TaskStatus,
    KStatus,
    IStatus,
    RStatus,
    TaskDefinition,
    UserTask,
    KIRSnapshot,
    AutomationRule,
)

# 30 Atomic Modules
from .modules_30 import (
    ATOMIC_MODULES,
    ModuleCategory,
    AtomicModule,
    ModulePipeline,
    create_custom_pipeline,
    validate_pipeline,
    compute_pipeline_physics,
)

# 30 Solution Modules
from .solution_modules_30 import (
    SOLUTION_MODULES,
    SolutionCategory,
    SolutionModule,
    get_module as get_solution_module,
    get_modules_by_category as get_solution_modules_by_category,
    get_implementation_roadmap,
)

# 5-Level Taxonomy
from .task_taxonomy import (
    TaskDomain,
    TaxonomyNode,
    TaxonomyManager,
    get_taxonomy_manager,
    TAXONOMY_5LEVEL,
    GLOBAL_STANDARDS,
)

# Case Collector
from .case_collector import (
    TaskCase,
    BestPractice,
    CaseOutcome,
    CaseCollector,
    get_case_collector,
)

# Task Unifier
from .task_unifier import (
    UnifyAction,
    EliminationReason,
    UnificationProposal,
    EliminationCandidate,
    TaskUnifier,
    get_task_unifier,
)

# Solution Manager (통합)
from .solution_manager import (
    UserConstants,
    USER_TYPE_CONSTANTS,
    SolutionManager,
    get_solution_manager,
)

# 1,000 Task Generator
from .task_generator_1000 import (
    TaskGenerator1000,
    TaskInstance,
    TaskPriority,
    TaskStatus,
    TaskFrequency,
    TASK_DOMAINS,
    TASK_PARAMETERS,
    get_task_generator,
    generate_1000_tasks,
    get_task_summary,
)

__all__ = [
    # Models
    "UserType", "TaskLayer", "TaskStatus", "KStatus", "IStatus", "RStatus",
    "TaskDefinition", "UserTask", "KIRSnapshot", "AutomationRule",
    # Modules
    "ATOMIC_MODULES", "ModuleCategory", "AtomicModule", "ModulePipeline",
    "create_custom_pipeline", "validate_pipeline", "compute_pipeline_physics",
    "SOLUTION_MODULES", "SolutionCategory", "SolutionModule",
    "get_solution_module", "get_solution_modules_by_category", "get_implementation_roadmap",
    # Taxonomy
    "TaskDomain", "TaxonomyNode", "TaxonomyManager", "get_taxonomy_manager",
    "TAXONOMY_5LEVEL", "GLOBAL_STANDARDS",
    # Cases
    "TaskCase", "BestPractice", "CaseOutcome", "CaseCollector", "get_case_collector",
    # Unifier
    "UnifyAction", "EliminationReason", "UnificationProposal", "EliminationCandidate",
    "TaskUnifier", "get_task_unifier",
    # Solution Manager
    "UserConstants", "USER_TYPE_CONSTANTS", "SolutionManager", "get_solution_manager",
    # 1,000 Task Generator
    "TaskGenerator1000", "TaskInstance", "TaskPriority", "TaskFrequency",
    "TASK_DOMAINS", "TASK_PARAMETERS",
    "get_task_generator", "generate_1000_tasks", "get_task_summary",
]
