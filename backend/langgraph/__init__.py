"""
AUTUS LangGraph 통합 모듈
=========================

2026년 기준 LangGraph 1.0+ 완전 통합

구성요소:
- AutusState: 통합 상태 정의
- Safety Guard 노드
- Neo4j 계수 노드
- CrewAI 분석 노드
- TFT 예측 노드
- 조건부 라우팅

사용법:
```python
from backend.langgraph import create_autus_graph, run_autus_workflow

# 그래프 생성
graph = create_autus_graph()

# 워크플로우 실행
result = run_autus_workflow(
    user_id="user_ohseho_001",
    goal="HR 온보딩 프로세스 최적화"
)
```
"""

from .state import AutusState, SafetyRoute
from .nodes import (
    safety_guard_node,
    fetch_user_data_node,
    fetch_coefficients_node,
    analysis_crew_node,
    fsd_laplace_node,
    throttle_node,
    human_escalation_node,
)
from .graph import (
    create_autus_graph,
    run_autus_workflow,
    AUTUSLangGraph,
)
from .monthly_update import (
    MonthlyUpdateCrew,
    run_monthly_update,
)
from .behavior_drift import (
    BehaviorDriftDetector,
    run_drift_detection,
    DriftResult,
)
from .release_analyzer import (
    ReleaseNoteAnalyzer,
    analyze_releases,
    AnalysisResult,
    RiskLevel,
)
from .realtime_progress import (
    RealtimeProgressReporter,
    CrewAIProgressCallback,
    UpdateStage,
    ProgressEvent,
)
from .webhooks import (
    WebhookNotifier,
    WebhookConfig,
    get_notifier,
    send_escalation,
)
from .auto_rollback import (
    AutoRollbackEngine,
    get_rollback_engine,
    check_and_rollback,
    RollbackReason,
    RollbackResult,
    RollbackThresholds,
)

__all__ = [
    # State
    "AutusState",
    "SafetyRoute",
    # Nodes
    "safety_guard_node",
    "fetch_user_data_node",
    "fetch_coefficients_node",
    "analysis_crew_node",
    "fsd_laplace_node",
    "throttle_node",
    "human_escalation_node",
    # Graph
    "create_autus_graph",
    "run_autus_workflow",
    "AUTUSLangGraph",
    # Monthly Update
    "MonthlyUpdateCrew",
    "run_monthly_update",
    # Behavior Drift
    "BehaviorDriftDetector",
    "run_drift_detection",
    "DriftResult",
    # Release Analyzer
    "ReleaseNoteAnalyzer",
    "analyze_releases",
    "AnalysisResult",
    "RiskLevel",
    # Realtime Progress
    "RealtimeProgressReporter",
    "CrewAIProgressCallback",
    "UpdateStage",
    "ProgressEvent",
    # Webhooks
    "WebhookNotifier",
    "WebhookConfig",
    "get_notifier",
    "send_escalation",
    # Auto Rollback
    "AutoRollbackEngine",
    "get_rollback_engine",
    "check_and_rollback",
    "RollbackReason",
    "RollbackResult",
    "RollbackThresholds",
]
