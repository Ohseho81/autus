"""
AUTUS 모니터링 패키지
====================

LangSmith + Prometheus + Sentry 통합 모니터링 시스템

주요 모듈:
- langsmith_tracer: LangSmith 트레이싱 설정
- prometheus_exporter: AUTUS 메트릭 익스포터
- self_diagnose: 자기 진단 에이전트 (CrewAI)
- health_check: 시스템 헬스 체크

2026년 표준 모니터링 스택:
- LangSmith: LangGraph/CrewAI 워크플로우 추적
- Prometheus: 메트릭 수집
- Grafana: 대시보드 시각화
- Sentry: 에러 추적 및 알림
"""

from .langsmith_tracer import (
    init_langsmith,
    trace_workflow,
    get_langsmith_client,
    get_autus_tracer,
    LangSmithConfig,
    AUTUSTracer,
)
from .prometheus_exporter import (
    init_prometheus,
    update_metrics,
    get_metrics,
    record_workflow_run,
    record_safety_trigger,
    record_scale_lock_violation,
    record_tft_prediction,
    record_gnn_embedding,
    observe_latency,
    AUTUSMetrics,
)
from .self_diagnose import (
    SelfDiagnoseAgent,
    run_diagnosis,
    run_diagnosis_sync,
    get_diagnose_agent,
    DiagnosisResult,
    DiagnosisStatus,
    FixAction,
)
from .sentry_integration import (
    init_sentry,
    capture_exception,
    capture_message,
    set_autus_user,
    set_autus_context,
    sentry_span,
    sentry_trace,
    capture_safety_trigger,
    capture_scale_lock_violation,
    SentryConfig,
    AUTUSError,
    SafetyGuardError,
    ScaleLockError,
    InertiaDebtError,
)

__all__ = [
    # LangSmith
    "init_langsmith",
    "trace_workflow",
    "get_langsmith_client",
    "get_autus_tracer",
    "LangSmithConfig",
    "AUTUSTracer",
    # Prometheus
    "init_prometheus",
    "update_metrics",
    "get_metrics",
    "record_workflow_run",
    "record_safety_trigger",
    "record_scale_lock_violation",
    "record_tft_prediction",
    "record_gnn_embedding",
    "observe_latency",
    "AUTUSMetrics",
    # Self-Diagnose
    "SelfDiagnoseAgent",
    "run_diagnosis",
    "run_diagnosis_sync",
    "get_diagnose_agent",
    "DiagnosisResult",
    "DiagnosisStatus",
    "FixAction",
    # Sentry
    "init_sentry",
    "capture_exception",
    "capture_message",
    "set_autus_user",
    "set_autus_context",
    "sentry_span",
    "sentry_trace",
    "capture_safety_trigger",
    "capture_scale_lock_violation",
    "SentryConfig",
    "AUTUSError",
    "SafetyGuardError",
    "ScaleLockError",
    "InertiaDebtError",
]
