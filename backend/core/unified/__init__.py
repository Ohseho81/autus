"""
═══════════════════════════════════════════════════════════════════════════════
🎯 AUTUS v3.0 - Unified System (Complete Edition)
═══════════════════════════════════════════════════════════════════════════════

"무슨 존재가 될지는 당신이 정한다.
 그 존재를 유지하는 일은 우리가 한다."

v3.0 핵심:
- 6가지 물리법칙 + 3대 원리
- Aggressive Mode (ERT 90% 최적화)
- Ghost Protocol (업무 유령화)
- 36노드 네트워크 (MVP: 10노드)
- Laplacian 압력 전파

결과:
- 90%를 시스템이 처리
- 인간은 10%의 창조에만 집중
"""

# 물리법칙 (6가지 + 3대 원리)
from .physics_laws import (
    # 타입
    ForceVector,
    UserState,
    PhaseState,
    Interaction,
    DiffusionResult,
    PhysicsUpdate,
    
    # 법칙 1: 관성
    apply_inertia,
    measure_inertia,
    
    # 법칙 2: 운동 (F=ma)
    calculate_force,
    calculate_acceleration,
    combine_forces,
    
    # 법칙 3: 작용-반작용
    calculate_reaction,
    analyze_interaction,
    
    # 법칙 4: 엔트로피
    calculate_entropy,
    natural_entropy_increase,
    reduce_entropy,
    
    # 법칙 5: 임계점/상전이
    analyze_phase,
    check_phase_transition,
    
    # 법칙 6: 확산/전파
    calculate_diffusion,
    simulate_network_diffusion,
    
    # 3대 원리
    deterministic_predict,
    apply_thermodynamics,
    calculate_emergent_behavior,
    
    # 통합
    apply_all_physics_laws,
    describe_physics_laws,
)

# Aggressive Mode (ERT 90% 최적화)
from .aggressive_mode import (
    # 타입
    AggressiveLevel,
    ERTAction,
    ERTStatus,
    
    # 설정
    EliminateThresholds,
    ReplaceThresholds,
    TransformThresholds,
    AggressiveConfig,
    AGGRESSIVE_PRESETS,
    
    # 모델
    Work,
    ERTResult,
    AggressiveDashboard,
    BatchERTSummary,
    BatchERTResult,
    GhostReport,
    
    # 함수
    existence_proof,
    ERTClassifier,
    batch_classify_ert,
    generate_ghost_report,
    generate_aggressive_output,
    run_aggressive_example,
)

# Ghost Protocol (업무 유령화)
from .ghost_protocol import (
    # 타입
    GhostAgentType,
    GhostTaskType,
    GhostTaskStatus,
    SelfHealSeverity,
    
    # 에이전트
    PersonaWeights,
    AgentPermissions,
    GhostAgent,
    
    # 태스크
    GhostTaskOutput,
    GhostTask,
    
    # Zero-Drafting
    ZeroDraftInput,
    ZeroDraftDocument,
    ZeroDraftAssignment,
    ZeroDraftBudget,
    ZeroDraftOutput,
    zero_drafting,
    
    # Invisible Networking
    ScheduledMeeting,
    AutoResponse,
    PendingDecision,
    InvisibleNetworkResult,
    invisible_networking,
    
    # Self-Healing
    SelfHealAction,
    self_heal_workflow,
    
    # Shadow Processing
    ShadowTask,
    ShadowProcess,
    start_shadow_processing,
    
    # 통합
    WorkItem,
    GhostProtocolResult,
    run_ghost_protocol,
    generate_ghost_output,
)

# MVP 엔진
from .mvp_engine import (
    # 타입
    NodeState,
    NodeLayer,
    EdgeType,
    
    # 모델
    Node,
    Edge,
    Alert,
    
    # 생성 함수
    create_mvp_nodes,
    create_mvp_edges,
    
    # 엔진
    PressureEngine,
    
    # 피드백
    refine_threshold,
    log_outcome,
    
    # 통합 시스템
    AUTUS,
    run_demo,
)

# 데이터 수집
from .data_acquisition import (
    DataSourceConfig,
    DATA_SOURCES,
    NodeDataTransform,
    NODE_DATA_TRANSFORMS,
    DataCollector,
    SyncResult,
    DataSyncManager,
    test_data_collection,
)

# Reality Check (목표 실현 가능성 검증)
from .reality_check import (
    # 타입
    ScienceCategory,
    FeasibilityLevel,
    GoalCategory,
    NODE_SCIENCE_MAP,
    
    # 데이터 클래스
    Goal,
    ScienceConstraint,
    Checkpoint,
    FeasibilityReport,
    
    # 검증기
    PhysicsValidator,
    BiologyValidator,
    EarthScienceValidator,
    ChemistryValidator,
    
    # 엔진
    RealitySpecEngine,
    EmergencyBrake,
    RealityCheck,
    
    # 출력
    generate_reality_report,
    run_reality_check_demo,
)

# Trinity Engine (목표 달성 가속기)
from .trinity_engine import (
    # 타입
    DesireCategory,
    PainType,
    DESIRE_DESCRIPTIONS,
    PAIN_DESCRIPTIONS,
    
    # 데이터 클래스
    CrystallizedGoal,
    EnvironmentState,
    ProgressState,
    
    # 1. 결정질화 엔진
    GoalMapper,
    
    # 2. 최적 환경 엔진
    FrictionlessEngine,
    
    # 3. 진행 레이더
    ProgressRadar,
    
    # 통합 엔진
    TrinityEngine,
    
    # 데모
    run_trinity_demo,
)

# Unified Engine (main.py에서 사용)
from .unified_engine import (
    # Enums
    Physics,
    Motion,
    UIPort,
    Domain,
    
    # Info Dicts
    PHYSICS_INFO,
    MOTION_INFO,
    
    # Classes
    Node,
    NodeRegistry,
    MotionEvent,
    GateResult,
    UnifiedEngine,
)

__version__ = '3.0.0'
__all__ = [
    # 버전
    '__version__',
    
    # 물리법칙
    'ForceVector',
    'UserState',
    'PhaseState',
    'Interaction',
    'DiffusionResult',
    'PhysicsUpdate',
    'apply_inertia',
    'measure_inertia',
    'calculate_force',
    'calculate_acceleration',
    'combine_forces',
    'calculate_reaction',
    'analyze_interaction',
    'calculate_entropy',
    'natural_entropy_increase',
    'reduce_entropy',
    'analyze_phase',
    'check_phase_transition',
    'calculate_diffusion',
    'simulate_network_diffusion',
    'deterministic_predict',
    'apply_thermodynamics',
    'calculate_emergent_behavior',
    'apply_all_physics_laws',
    'describe_physics_laws',
    
    # Aggressive Mode
    'AggressiveLevel',
    'ERTAction',
    'ERTStatus',
    'EliminateThresholds',
    'ReplaceThresholds',
    'TransformThresholds',
    'AggressiveConfig',
    'AGGRESSIVE_PRESETS',
    'Work',
    'ERTResult',
    'AggressiveDashboard',
    'BatchERTSummary',
    'BatchERTResult',
    'GhostReport',
    'existence_proof',
    'ERTClassifier',
    'batch_classify_ert',
    'generate_ghost_report',
    'generate_aggressive_output',
    'run_aggressive_example',
    
    # Ghost Protocol
    'GhostAgentType',
    'GhostTaskType',
    'GhostTaskStatus',
    'SelfHealSeverity',
    'PersonaWeights',
    'AgentPermissions',
    'GhostAgent',
    'GhostTaskOutput',
    'GhostTask',
    'ZeroDraftInput',
    'ZeroDraftDocument',
    'ZeroDraftAssignment',
    'ZeroDraftBudget',
    'ZeroDraftOutput',
    'zero_drafting',
    'ScheduledMeeting',
    'AutoResponse',
    'PendingDecision',
    'InvisibleNetworkResult',
    'invisible_networking',
    'SelfHealAction',
    'self_heal_workflow',
    'ShadowTask',
    'ShadowProcess',
    'start_shadow_processing',
    'WorkItem',
    'GhostProtocolResult',
    'run_ghost_protocol',
    'generate_ghost_output',
    
    # MVP 엔진
    'NodeState',
    'NodeLayer',
    'EdgeType',
    'Node',
    'Edge',
    'Alert',
    'create_mvp_nodes',
    'create_mvp_edges',
    'PressureEngine',
    'refine_threshold',
    'log_outcome',
    'AUTUS',
    'run_demo',
    
    # 데이터 수집
    'DataSourceConfig',
    'DATA_SOURCES',
    'NodeDataTransform',
    'NODE_DATA_TRANSFORMS',
    'DataCollector',
    'SyncResult',
    'DataSyncManager',
    'test_data_collection',
    
    # Reality Check
    'ScienceCategory',
    'FeasibilityLevel',
    'GoalCategory',
    'NODE_SCIENCE_MAP',
    'Goal',
    'ScienceConstraint',
    'Checkpoint',
    'FeasibilityReport',
    'PhysicsValidator',
    'BiologyValidator',
    'EarthScienceValidator',
    'ChemistryValidator',
    'RealitySpecEngine',
    'EmergencyBrake',
    'RealityCheck',
    'generate_reality_report',
    'run_reality_check_demo',
    
    # Trinity Engine (목표 달성 가속기)
    'DesireCategory',
    'PainType',
    'DESIRE_DESCRIPTIONS',
    'PAIN_DESCRIPTIONS',
    'CrystallizedGoal',
    'EnvironmentState',
    'ProgressState',
    'GoalMapper',
    'FrictionlessEngine',
    'ProgressRadar',
    'TrinityEngine',
    'run_trinity_demo',
    
    # Unified Engine
    'Physics',
    'Motion',
    'UIPort',
    'Domain',
    'PHYSICS_INFO',
    'MOTION_INFO',
    'Node',
    'NodeRegistry',
    'MotionEvent',
    'GateResult',
    'UnifiedEngine',
]
