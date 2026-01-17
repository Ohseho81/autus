"""
AUTUS Prometheus Exporter
=========================

AUTUS 시스템 메트릭을 Prometheus 형식으로 노출

메트릭:
- autus_stability_score: 사용자 안정성 점수
- autus_inertia_debt: Inertia Debt
- autus_delta_s_dot: ΔṠ 변화율
- autus_connectivity_density: 연결 밀도
- autus_influence_score: 영향력 점수
- autus_safety_triggers_total: Safety Guard 트리거 횟수
- autus_workflow_latency_seconds: 워크플로우 실행 시간
- autus_graph_nodes_total: 그래프 노드 수
- autus_module_count: 활성 모듈 수

사용법:
```python
from backend.monitoring import init_prometheus, update_metrics

# 서버 시작 (포트 9100)
init_prometheus(port=9100)

# 메트릭 업데이트
update_metrics({
    "stability_score": 0.82,
    "inertia_debt": 0.35,
    "delta_s_dot": 0.42,
})
```
"""

import os
import time
import logging
import threading
from dataclasses import dataclass, field
from typing import Any, Callable, Optional
from functools import wraps

logger = logging.getLogger(__name__)

# Prometheus 클라이언트 (선택적 의존성)
try:
    from prometheus_client import (
        start_http_server,
        Gauge,
        Counter,
        Histogram,
        Summary,
        Info,
        CollectorRegistry,
        generate_latest,
        CONTENT_TYPE_LATEST,
    )
    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("prometheus_client가 설치되지 않았습니다. pip install prometheus_client")


@dataclass
class AUTUSMetrics:
    """AUTUS 메트릭 데이터"""
    # 사용자 상수
    stability_score: float = 0.0
    inertia_debt: float = 0.0
    delta_s_dot: float = 0.0
    
    # 사용자 계수
    connectivity_density: float = 0.0
    influence_score: float = 0.0
    value_flow_rate: float = 0.0
    
    # 시스템 상태
    safety_triggers: int = 0
    scale_lock_violations: int = 0
    workflow_runs: int = 0
    workflow_errors: int = 0
    
    # 그래프 상태
    inner_nodes: int = 0
    outer_nodes: int = 0
    total_edges: int = 0
    
    # 모듈 상태
    active_modules: int = 0
    module_version: str = "7.4"
    
    # 성능
    avg_latency_ms: float = 0.0
    p95_latency_ms: float = 0.0


# 전역 상태
_registry: Optional[Any] = None
_metrics: dict = {}
_autus_metrics: Optional[AUTUSMetrics] = None
_server_started: bool = False
_port: int = 9100


def init_prometheus(port: int = 9100, registry: Optional[Any] = None) -> bool:
    """
    Prometheus exporter 초기화 및 HTTP 서버 시작
    
    Args:
        port: HTTP 서버 포트 (기본: 9100)
        registry: 커스텀 레지스트리 (기본: None)
        
    Returns:
        bool: 초기화 성공 여부
    """
    global _registry, _metrics, _autus_metrics, _server_started, _port
    
    if not PROMETHEUS_AVAILABLE:
        logger.warning("Prometheus 클라이언트가 없습니다. 메트릭이 비활성화됩니다.")
        return False
    
    _port = port
    _registry = registry or CollectorRegistry()
    _autus_metrics = AUTUSMetrics()
    
    try:
        # 게이지 메트릭 (현재 값)
        _metrics["stability_score"] = Gauge(
            "autus_stability_score",
            "사용자 안정성 점수 (0-1)",
            registry=_registry,
        )
        
        _metrics["inertia_debt"] = Gauge(
            "autus_inertia_debt",
            "Inertia Debt (0-1)",
            registry=_registry,
        )
        
        _metrics["delta_s_dot"] = Gauge(
            "autus_delta_s_dot",
            "엔트로피 변화율 ΔṠ",
            registry=_registry,
        )
        
        _metrics["connectivity_density"] = Gauge(
            "autus_connectivity_density",
            "연결 밀도 (0-1)",
            registry=_registry,
        )
        
        _metrics["influence_score"] = Gauge(
            "autus_influence_score",
            "영향력 점수 (0-1)",
            registry=_registry,
        )
        
        _metrics["value_flow_rate"] = Gauge(
            "autus_value_flow_rate",
            "가치 흐름률",
            registry=_registry,
        )
        
        # 그래프 메트릭
        _metrics["inner_nodes"] = Gauge(
            "autus_graph_inner_nodes",
            "1차 연결 노드 수 (최대 12)",
            registry=_registry,
        )
        
        _metrics["outer_nodes"] = Gauge(
            "autus_graph_outer_nodes",
            "2차 연결 노드 수 (최대 144)",
            registry=_registry,
        )
        
        _metrics["total_edges"] = Gauge(
            "autus_graph_edges_total",
            "총 엣지 수",
            registry=_registry,
        )
        
        # 모듈 메트릭
        _metrics["active_modules"] = Gauge(
            "autus_modules_active",
            "활성 모듈 수",
            registry=_registry,
        )
        
        # 카운터 메트릭 (누적 값)
        _metrics["safety_triggers"] = Counter(
            "autus_safety_triggers_total",
            "Safety Guard 트리거 총 횟수",
            registry=_registry,
        )
        
        _metrics["scale_lock_violations"] = Counter(
            "autus_scale_lock_violations_total",
            "Scale Lock 위반 총 횟수",
            registry=_registry,
        )
        
        _metrics["workflow_runs"] = Counter(
            "autus_workflow_runs_total",
            "워크플로우 실행 총 횟수",
            ["status"],  # success, error
            registry=_registry,
        )
        
        # 히스토그램 메트릭 (분포)
        _metrics["workflow_latency"] = Histogram(
            "autus_workflow_latency_seconds",
            "워크플로우 실행 시간 (초)",
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0],
            registry=_registry,
        )
        
        _metrics["tft_prediction_latency"] = Histogram(
            "autus_tft_prediction_latency_seconds",
            "TFT 예측 실행 시간 (초)",
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0],
            registry=_registry,
        )
        
        _metrics["gnn_embedding_latency"] = Histogram(
            "autus_gnn_embedding_latency_seconds",
            "GNN 임베딩 계산 시간 (초)",
            buckets=[0.1, 0.5, 1.0, 2.0, 5.0],
            registry=_registry,
        )
        
        # 서머리 메트릭 (요약 통계)
        _metrics["api_response_time"] = Summary(
            "autus_api_response_time_seconds",
            "API 응답 시간",
            registry=_registry,
        )
        
        # 정보 메트릭
        _metrics["system_info"] = Info(
            "autus_system",
            "AUTUS 시스템 정보",
            registry=_registry,
        )
        _metrics["system_info"].info({
            "version": "7.0",
            "module_version": "7.4",
            "engine": "langgraph",
            "predictor": "tft",
            "graph_db": "neo4j",
        })
        
        # HTTP 서버 시작 (별도 스레드)
        def start_server():
            global _server_started
            try:
                start_http_server(port, registry=_registry)
                _server_started = True
                logger.info(f"Prometheus exporter 시작: http://localhost:{port}/metrics")
            except Exception as e:
                logger.error(f"Prometheus 서버 시작 실패: {e}")
        
        server_thread = threading.Thread(target=start_server, daemon=True)
        server_thread.start()
        
        # 서버 시작 대기 (최대 3초)
        time.sleep(1)
        
        return True
        
    except Exception as e:
        logger.error(f"Prometheus 초기화 실패: {e}")
        return False


def update_metrics(data: dict) -> None:
    """
    메트릭 값 업데이트
    
    Args:
        data: 메트릭 딕셔너리
            - stability_score: float
            - inertia_debt: float
            - delta_s_dot: float
            - connectivity_density: float
            - influence_score: float
            - inner_nodes: int
            - outer_nodes: int
            - active_modules: int
    """
    global _autus_metrics
    
    if not PROMETHEUS_AVAILABLE or not _metrics:
        return
    
    try:
        # 게이지 업데이트
        if "stability_score" in data:
            _metrics["stability_score"].set(data["stability_score"])
            if _autus_metrics:
                _autus_metrics.stability_score = data["stability_score"]
        
        if "inertia_debt" in data:
            _metrics["inertia_debt"].set(data["inertia_debt"])
            if _autus_metrics:
                _autus_metrics.inertia_debt = data["inertia_debt"]
        
        if "delta_s_dot" in data:
            _metrics["delta_s_dot"].set(data["delta_s_dot"])
            if _autus_metrics:
                _autus_metrics.delta_s_dot = data["delta_s_dot"]
        
        if "connectivity_density" in data:
            _metrics["connectivity_density"].set(data["connectivity_density"])
            if _autus_metrics:
                _autus_metrics.connectivity_density = data["connectivity_density"]
        
        if "influence_score" in data:
            _metrics["influence_score"].set(data["influence_score"])
            if _autus_metrics:
                _autus_metrics.influence_score = data["influence_score"]
        
        if "value_flow_rate" in data:
            _metrics["value_flow_rate"].set(data["value_flow_rate"])
            if _autus_metrics:
                _autus_metrics.value_flow_rate = data["value_flow_rate"]
        
        # 그래프 메트릭
        if "inner_nodes" in data:
            _metrics["inner_nodes"].set(data["inner_nodes"])
            if _autus_metrics:
                _autus_metrics.inner_nodes = data["inner_nodes"]
        
        if "outer_nodes" in data:
            _metrics["outer_nodes"].set(data["outer_nodes"])
            if _autus_metrics:
                _autus_metrics.outer_nodes = data["outer_nodes"]
        
        if "total_edges" in data:
            _metrics["total_edges"].set(data["total_edges"])
            if _autus_metrics:
                _autus_metrics.total_edges = data["total_edges"]
        
        # 모듈 메트릭
        if "active_modules" in data:
            _metrics["active_modules"].set(data["active_modules"])
            if _autus_metrics:
                _autus_metrics.active_modules = data["active_modules"]
    
    except Exception as e:
        logger.error(f"메트릭 업데이트 실패: {e}")


def record_workflow_run(success: bool = True, latency_seconds: float = 0.0) -> None:
    """워크플로우 실행 기록"""
    if not PROMETHEUS_AVAILABLE or not _metrics:
        return
    
    try:
        status = "success" if success else "error"
        _metrics["workflow_runs"].labels(status=status).inc()
        
        if latency_seconds > 0:
            _metrics["workflow_latency"].observe(latency_seconds)
    except Exception as e:
        logger.error(f"워크플로우 기록 실패: {e}")


def record_safety_trigger() -> None:
    """Safety Guard 트리거 기록"""
    if not PROMETHEUS_AVAILABLE or not _metrics:
        return
    
    try:
        _metrics["safety_triggers"].inc()
    except Exception as e:
        logger.error(f"Safety 트리거 기록 실패: {e}")


def record_scale_lock_violation() -> None:
    """Scale Lock 위반 기록"""
    if not PROMETHEUS_AVAILABLE or not _metrics:
        return
    
    try:
        _metrics["scale_lock_violations"].inc()
    except Exception as e:
        logger.error(f"Scale Lock 위반 기록 실패: {e}")


def record_tft_prediction(latency_seconds: float) -> None:
    """TFT 예측 실행 시간 기록"""
    if not PROMETHEUS_AVAILABLE or not _metrics:
        return
    
    try:
        _metrics["tft_prediction_latency"].observe(latency_seconds)
    except Exception as e:
        logger.error(f"TFT 예측 기록 실패: {e}")


def record_gnn_embedding(latency_seconds: float) -> None:
    """GNN 임베딩 계산 시간 기록"""
    if not PROMETHEUS_AVAILABLE or not _metrics:
        return
    
    try:
        _metrics["gnn_embedding_latency"].observe(latency_seconds)
    except Exception as e:
        logger.error(f"GNN 임베딩 기록 실패: {e}")


def record_api_response(latency_seconds: float) -> None:
    """API 응답 시간 기록"""
    if not PROMETHEUS_AVAILABLE or not _metrics:
        return
    
    try:
        _metrics["api_response_time"].observe(latency_seconds)
    except Exception as e:
        logger.error(f"API 응답 시간 기록 실패: {e}")


def get_metrics() -> Optional[AUTUSMetrics]:
    """현재 메트릭 상태 반환"""
    return _autus_metrics


def get_metrics_text() -> str:
    """Prometheus 형식 메트릭 텍스트 반환"""
    if not PROMETHEUS_AVAILABLE or not _registry:
        return "# Prometheus not available"
    
    try:
        return generate_latest(_registry).decode("utf-8")
    except Exception as e:
        return f"# Error generating metrics: {e}"


# 데코레이터: 함수 실행 시간 측정
def observe_latency(metric_name: str):
    """
    함수 실행 시간을 히스토그램으로 기록하는 데코레이터
    
    사용법:
    ```python
    @observe_latency("workflow_latency")
    async def run_workflow(state):
        ...
    ```
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                elapsed = time.time() - start
                if PROMETHEUS_AVAILABLE and metric_name in _metrics:
                    _metrics[metric_name].observe(elapsed)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                elapsed = time.time() - start
                if PROMETHEUS_AVAILABLE and metric_name in _metrics:
                    _metrics[metric_name].observe(elapsed)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator
