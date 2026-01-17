"""
AUTUS LangSmith 트레이싱 모듈
============================

LangChain/LangGraph 워크플로우의 실시간 추적 및 분석

기능:
- 전체 체인/에이전트 실행 추적
- 노드별 입력/출력/시간/에러 기록
- 토큰 사용량 및 비용 추정
- 성능 메트릭 (latency p50/p95)

설정:
1. LangSmith 계정 생성: https://smith.langchain.com
2. API Key 발급
3. 환경 변수 설정:
   - LANGCHAIN_TRACING_V2=true
   - LANGCHAIN_API_KEY=lsv2_xxx
   - LANGCHAIN_PROJECT=autus-production
"""

import os
import time
import logging
from dataclasses import dataclass, field
from typing import Any, Callable, Optional, TypeVar
from functools import wraps
from datetime import datetime

logger = logging.getLogger(__name__)

# Type variable for generic function wrapping
F = TypeVar("F", bound=Callable[..., Any])


@dataclass
class LangSmithConfig:
    """LangSmith 설정"""
    api_key: str = ""
    project: str = "autus-production"
    endpoint: str = "https://api.smith.langchain.com"
    tracing_enabled: bool = True
    debug: bool = False
    
    # 추가 설정
    sample_rate: float = 1.0  # 1.0 = 모든 실행 추적
    max_retries: int = 3
    timeout: int = 30
    
    def __post_init__(self):
        """환경 변수에서 설정 로드"""
        self.api_key = self.api_key or os.getenv("LANGCHAIN_API_KEY", "")
        self.project = self.project or os.getenv("LANGCHAIN_PROJECT", "autus-production")
        self.endpoint = self.endpoint or os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
        self.tracing_enabled = os.getenv("LANGCHAIN_TRACING_V2", "true").lower() == "true"
        self.debug = os.getenv("LANGCHAIN_DEBUG", "false").lower() == "true"


@dataclass
class TraceMetadata:
    """트레이스 메타데이터"""
    run_id: str = ""
    parent_run_id: Optional[str] = None
    name: str = ""
    run_type: str = "chain"  # chain, llm, tool, retriever
    inputs: dict = field(default_factory=dict)
    outputs: dict = field(default_factory=dict)
    error: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    latency_ms: float = 0.0
    tokens_used: int = 0
    cost_usd: float = 0.0
    tags: list = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


# 전역 설정 인스턴스
_config: Optional[LangSmithConfig] = None
_client: Optional[Any] = None
_initialized: bool = False


def init_langsmith(config: Optional[LangSmithConfig] = None) -> bool:
    """
    LangSmith 트레이싱 초기화
    
    Args:
        config: LangSmith 설정 (None이면 환경 변수에서 로드)
        
    Returns:
        bool: 초기화 성공 여부
    """
    global _config, _client, _initialized
    
    _config = config or LangSmithConfig()
    
    if not _config.api_key:
        logger.warning("LangSmith API Key가 설정되지 않았습니다. 트레이싱이 비활성화됩니다.")
        _initialized = False
        return False
    
    # 환경 변수 설정
    os.environ["LANGCHAIN_TRACING_V2"] = str(_config.tracing_enabled).lower()
    os.environ["LANGCHAIN_API_KEY"] = _config.api_key
    os.environ["LANGCHAIN_PROJECT"] = _config.project
    os.environ["LANGCHAIN_ENDPOINT"] = _config.endpoint
    
    if _config.debug:
        os.environ["LANGCHAIN_DEBUG"] = "true"
    
    try:
        # LangSmith 클라이언트 초기화 (선택적)
        try:
            from langsmith import Client
            _client = Client(api_key=_config.api_key)
            logger.info(f"LangSmith 클라이언트 초기화 완료: {_config.project}")
        except ImportError:
            logger.info("langsmith 패키지가 설치되지 않았습니다. 기본 트레이싱만 사용됩니다.")
            _client = None
        
        _initialized = True
        logger.info(f"LangSmith 트레이싱 활성화: {_config.project}")
        return True
        
    except Exception as e:
        logger.error(f"LangSmith 초기화 실패: {e}")
        _initialized = False
        return False


def get_langsmith_client() -> Optional[Any]:
    """LangSmith 클라이언트 반환"""
    return _client


def get_config() -> Optional[LangSmithConfig]:
    """현재 설정 반환"""
    return _config


def is_initialized() -> bool:
    """초기화 상태 확인"""
    return _initialized


def trace_workflow(
    name: str,
    run_type: str = "chain",
    tags: Optional[list] = None,
    metadata: Optional[dict] = None,
):
    """
    워크플로우 트레이싱 데코레이터
    
    사용법:
    ```python
    @trace_workflow("safety_check", tags=["safety", "guard"])
    async def safety_check_node(state):
        ...
    ```
    
    Args:
        name: 트레이스 이름
        run_type: 실행 유형 (chain, llm, tool, retriever)
        tags: 태그 목록
        metadata: 추가 메타데이터
    """
    def decorator(func: F) -> F:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if not _initialized:
                return await func(*args, **kwargs)
            
            trace = TraceMetadata(
                name=name,
                run_type=run_type,
                tags=tags or [],
                metadata=metadata or {},
                start_time=datetime.now(),
            )
            
            # 입력 캡처
            try:
                if args:
                    trace.inputs["args"] = str(args[0])[:1000]  # 첫 번째 인자만 (보통 state)
                if kwargs:
                    trace.inputs["kwargs"] = {k: str(v)[:500] for k, v in kwargs.items()}
            except Exception:
                pass
            
            try:
                result = await func(*args, **kwargs)
                
                # 출력 캡처
                try:
                    trace.outputs["result"] = str(result)[:1000] if result else None
                except Exception:
                    pass
                
                trace.end_time = datetime.now()
                trace.latency_ms = (trace.end_time - trace.start_time).total_seconds() * 1000
                
                # 로그 기록
                if _config and _config.debug:
                    logger.debug(f"[LangSmith] {name}: {trace.latency_ms:.2f}ms")
                
                return result
                
            except Exception as e:
                trace.error = str(e)
                trace.end_time = datetime.now()
                trace.latency_ms = (trace.end_time - trace.start_time).total_seconds() * 1000
                
                logger.error(f"[LangSmith] {name} 에러: {e}")
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if not _initialized:
                return func(*args, **kwargs)
            
            start_time = time.time()
            
            try:
                result = func(*args, **kwargs)
                
                elapsed = (time.time() - start_time) * 1000
                if _config and _config.debug:
                    logger.debug(f"[LangSmith] {name}: {elapsed:.2f}ms")
                
                return result
                
            except Exception as e:
                logger.error(f"[LangSmith] {name} 에러: {e}")
                raise
        
        # async 함수인지 확인
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper  # type: ignore
        return sync_wrapper  # type: ignore
    
    return decorator


# 편의 함수들
def log_run_start(name: str, inputs: dict, tags: Optional[list] = None):
    """실행 시작 로그"""
    if _config and _config.debug:
        logger.info(f"[LangSmith] 시작: {name} | 입력: {str(inputs)[:200]}")


def log_run_end(name: str, outputs: dict, latency_ms: float):
    """실행 종료 로그"""
    if _config and _config.debug:
        logger.info(f"[LangSmith] 완료: {name} | {latency_ms:.2f}ms | 출력: {str(outputs)[:200]}")


def log_run_error(name: str, error: Exception):
    """실행 에러 로그"""
    logger.error(f"[LangSmith] 에러: {name} | {type(error).__name__}: {error}")


# AUTUS 특화 트레이싱 유틸리티
class AUTUSTracer:
    """AUTUS 전용 트레이서"""
    
    def __init__(self, project: str = "autus-production"):
        self.project = project
        self.traces: list[TraceMetadata] = []
        self._metrics = {
            "total_runs": 0,
            "successful_runs": 0,
            "failed_runs": 0,
            "total_latency_ms": 0.0,
            "safety_triggers": 0,
            "scale_lock_violations": 0,
        }
    
    def start_trace(self, name: str, inputs: dict) -> TraceMetadata:
        """트레이스 시작"""
        trace = TraceMetadata(
            name=name,
            inputs=inputs,
            start_time=datetime.now(),
            metadata={"project": self.project},
        )
        self._metrics["total_runs"] += 1
        return trace
    
    def end_trace(self, trace: TraceMetadata, outputs: dict, error: Optional[str] = None):
        """트레이스 종료"""
        trace.end_time = datetime.now()
        trace.outputs = outputs
        trace.error = error
        trace.latency_ms = (trace.end_time - trace.start_time).total_seconds() * 1000
        
        if error:
            self._metrics["failed_runs"] += 1
        else:
            self._metrics["successful_runs"] += 1
        
        self._metrics["total_latency_ms"] += trace.latency_ms
        self.traces.append(trace)
    
    def record_safety_trigger(self):
        """Safety Guard 트리거 기록"""
        self._metrics["safety_triggers"] += 1
    
    def record_scale_lock_violation(self):
        """Scale Lock 위반 기록"""
        self._metrics["scale_lock_violations"] += 1
    
    def get_metrics(self) -> dict:
        """현재 메트릭 반환"""
        avg_latency = (
            self._metrics["total_latency_ms"] / self._metrics["total_runs"]
            if self._metrics["total_runs"] > 0
            else 0.0
        )
        
        return {
            **self._metrics,
            "avg_latency_ms": avg_latency,
            "success_rate": (
                self._metrics["successful_runs"] / self._metrics["total_runs"]
                if self._metrics["total_runs"] > 0
                else 0.0
            ),
        }
    
    def get_recent_traces(self, limit: int = 10) -> list[TraceMetadata]:
        """최근 트레이스 반환"""
        return self.traces[-limit:]


# 전역 AUTUS 트레이서
_autus_tracer: Optional[AUTUSTracer] = None


def get_autus_tracer() -> AUTUSTracer:
    """AUTUS 트레이서 반환"""
    global _autus_tracer
    if _autus_tracer is None:
        _autus_tracer = AUTUSTracer()
    return _autus_tracer
