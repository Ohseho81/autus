"""
AUTUS Sentry 통합
=================

Sentry를 통한 에러 추적 및 성능 모니터링

기능:
- 에러 자동 캡처 및 보고
- 성능 추적 (트랜잭션, 스팬)
- 사용자 컨텍스트 설정
- 커스텀 태그 및 브레드크럼

설정:
1. Sentry 계정 생성: https://sentry.io
2. 프로젝트 생성 (Python)
3. DSN 발급
4. 환경 변수 설정:
   - SENTRY_DSN=https://xxx@sentry.io/xxx
   - SENTRY_ENVIRONMENT=production

사용법:
```python
from backend.monitoring import init_sentry, capture_exception, capture_message

# 초기화
init_sentry()

# 에러 캡처
try:
    risky_operation()
except Exception as e:
    capture_exception(e, tags={"component": "fsd_navigation"})

# 메시지 캡처
capture_message("Safety Guard triggered", level="warning")
```
"""

import os
import logging
from dataclasses import dataclass
from typing import Any, Callable, Optional
from functools import wraps
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Sentry SDK (선택적 의존성)
try:
    import sentry_sdk
    from sentry_sdk import capture_exception as _capture_exception
    from sentry_sdk import capture_message as _capture_message
    from sentry_sdk import set_user, set_tag, set_context
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.asyncio import AsyncioIntegration
    from sentry_sdk.integrations.logging import LoggingIntegration
    SENTRY_AVAILABLE = True
except ImportError:
    SENTRY_AVAILABLE = False
    logger.warning("sentry-sdk가 설치되지 않았습니다. pip install sentry-sdk[fastapi]")


@dataclass
class SentryConfig:
    """Sentry 설정"""
    dsn: str = ""
    environment: str = "development"
    release: str = "autus@7.0.0"
    traces_sample_rate: float = 1.0  # 1.0 = 모든 트랜잭션 추적
    profiles_sample_rate: float = 0.5  # 프로파일링 샘플 비율
    
    # 추가 설정
    debug: bool = False
    send_default_pii: bool = False  # PII 전송 비활성화 (프라이버시)
    max_breadcrumbs: int = 100
    attach_stacktrace: bool = True
    
    def __post_init__(self):
        """환경 변수에서 설정 로드"""
        self.dsn = self.dsn or os.getenv("SENTRY_DSN", "")
        self.environment = self.environment or os.getenv("SENTRY_ENVIRONMENT", "development")
        self.release = self.release or os.getenv("SENTRY_RELEASE", "autus@7.0.0")
        self.debug = os.getenv("SENTRY_DEBUG", "false").lower() == "true"


# 전역 상태
_initialized: bool = False
_config: Optional[SentryConfig] = None


def init_sentry(config: Optional[SentryConfig] = None) -> bool:
    """
    Sentry 초기화
    
    Args:
        config: Sentry 설정 (None이면 환경 변수에서 로드)
        
    Returns:
        bool: 초기화 성공 여부
    """
    global _initialized, _config
    
    if not SENTRY_AVAILABLE:
        logger.warning("Sentry SDK가 없습니다. 에러 추적이 비활성화됩니다.")
        return False
    
    _config = config or SentryConfig()
    
    if not _config.dsn:
        logger.warning("Sentry DSN이 설정되지 않았습니다. 에러 추적이 비활성화됩니다.")
        _initialized = False
        return False
    
    try:
        sentry_sdk.init(
            dsn=_config.dsn,
            environment=_config.environment,
            release=_config.release,
            traces_sample_rate=_config.traces_sample_rate,
            profiles_sample_rate=_config.profiles_sample_rate,
            debug=_config.debug,
            send_default_pii=_config.send_default_pii,
            max_breadcrumbs=_config.max_breadcrumbs,
            attach_stacktrace=_config.attach_stacktrace,
            
            # 통합
            integrations=[
                FastApiIntegration(
                    transaction_style="endpoint",
                ),
                AsyncioIntegration(),
                LoggingIntegration(
                    level=logging.INFO,
                    event_level=logging.ERROR,
                ),
            ],
            
            # 필터링
            before_send=_before_send,
            before_send_transaction=_before_send_transaction,
        )
        
        _initialized = True
        logger.info(f"Sentry 초기화 완료: {_config.environment}")
        return True
        
    except Exception as e:
        logger.error(f"Sentry 초기화 실패: {e}")
        _initialized = False
        return False


def _before_send(event: dict, hint: dict) -> Optional[dict]:
    """이벤트 전송 전 필터링"""
    # 민감한 정보 필터링
    if "extra" in event:
        event["extra"] = _filter_sensitive_data(event["extra"])
    
    # 특정 에러 무시
    if "exception" in event:
        exc_type = event.get("exception", {}).get("values", [{}])[0].get("type", "")
        if exc_type in ["KeyboardInterrupt", "SystemExit"]:
            return None
    
    return event


def _before_send_transaction(event: dict, hint: dict) -> Optional[dict]:
    """트랜잭션 전송 전 필터링"""
    # 헬스체크 요청 무시
    transaction = event.get("transaction", "")
    if "/health" in transaction or "/metrics" in transaction:
        return None
    
    return event


def _filter_sensitive_data(data: dict) -> dict:
    """민감한 데이터 필터링"""
    sensitive_keys = ["password", "token", "api_key", "secret", "credentials"]
    
    filtered = {}
    for key, value in data.items():
        if any(s in key.lower() for s in sensitive_keys):
            filtered[key] = "[FILTERED]"
        elif isinstance(value, dict):
            filtered[key] = _filter_sensitive_data(value)
        else:
            filtered[key] = value
    
    return filtered


def capture_exception(
    error: Optional[Exception] = None,
    tags: Optional[dict] = None,
    extras: Optional[dict] = None,
    user: Optional[dict] = None,
) -> Optional[str]:
    """
    예외 캡처
    
    Args:
        error: 예외 객체 (None이면 현재 예외)
        tags: 태그 딕셔너리
        extras: 추가 컨텍스트
        user: 사용자 정보
        
    Returns:
        str: 이벤트 ID (성공 시)
    """
    if not _initialized or not SENTRY_AVAILABLE:
        if error:
            logger.error(f"[Sentry 비활성화] 에러: {error}")
        return None
    
    try:
        # 사용자 설정
        if user:
            set_user(user)
        
        # 태그 설정
        if tags:
            for key, value in tags.items():
                set_tag(key, value)
        
        # 추가 컨텍스트
        if extras:
            set_context("extra", extras)
        
        # 캡처
        event_id = _capture_exception(error)
        return event_id
        
    except Exception as e:
        logger.error(f"Sentry 캡처 실패: {e}")
        return None


def capture_message(
    message: str,
    level: str = "info",
    tags: Optional[dict] = None,
    extras: Optional[dict] = None,
) -> Optional[str]:
    """
    메시지 캡처
    
    Args:
        message: 메시지
        level: 레벨 (debug, info, warning, error, fatal)
        tags: 태그 딕셔너리
        extras: 추가 컨텍스트
        
    Returns:
        str: 이벤트 ID (성공 시)
    """
    if not _initialized or not SENTRY_AVAILABLE:
        logger.log(
            getattr(logging, level.upper(), logging.INFO),
            f"[Sentry 비활성화] {message}"
        )
        return None
    
    try:
        # 태그 설정
        if tags:
            for key, value in tags.items():
                set_tag(key, value)
        
        # 추가 컨텍스트
        if extras:
            set_context("extra", extras)
        
        # 캡처
        event_id = _capture_message(message, level=level)
        return event_id
        
    except Exception as e:
        logger.error(f"Sentry 메시지 캡처 실패: {e}")
        return None


def set_autus_user(
    user_id: str,
    location: Optional[str] = None,
    mbti: Optional[str] = None,
    k_scale: Optional[str] = None,
) -> None:
    """
    AUTUS 사용자 컨텍스트 설정
    
    Args:
        user_id: 사용자 ID
        location: 위치
        mbti: MBTI 유형
        k_scale: K-Scale (K2, K4, K10)
    """
    if not _initialized or not SENTRY_AVAILABLE:
        return
    
    user_data = {"id": user_id}
    
    if location:
        user_data["geo"] = {"country_code": location[:2]}
    
    set_user(user_data)
    
    if mbti:
        set_tag("mbti", mbti)
    if k_scale:
        set_tag("k_scale", k_scale)


def set_autus_context(
    stability_score: Optional[float] = None,
    inertia_debt: Optional[float] = None,
    delta_s_dot: Optional[float] = None,
    current_goal: Optional[str] = None,
) -> None:
    """
    AUTUS 컨텍스트 설정
    
    Args:
        stability_score: 안정성 점수
        inertia_debt: Inertia Debt
        delta_s_dot: ΔṠ
        current_goal: 현재 목표
    """
    if not _initialized or not SENTRY_AVAILABLE:
        return
    
    context = {}
    
    if stability_score is not None:
        context["stability_score"] = stability_score
    if inertia_debt is not None:
        context["inertia_debt"] = inertia_debt
    if delta_s_dot is not None:
        context["delta_s_dot"] = delta_s_dot
    if current_goal:
        context["current_goal"] = current_goal
    
    if context:
        set_context("autus", context)


@contextmanager
def sentry_span(name: str, op: str = "task"):
    """
    Sentry 스팬 컨텍스트 매니저
    
    사용법:
    ```python
    with sentry_span("fsd_navigation", op="prediction"):
        result = run_prediction()
    ```
    """
    if not _initialized or not SENTRY_AVAILABLE:
        yield
        return
    
    try:
        with sentry_sdk.start_span(op=op, description=name) as span:
            yield span
    except Exception:
        yield


def sentry_trace(name: str, op: str = "function"):
    """
    함수 트레이싱 데코레이터
    
    사용법:
    ```python
    @sentry_trace("safety_check", op="validation")
    async def safety_check(state):
        ...
    ```
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            if not _initialized or not SENTRY_AVAILABLE:
                return await func(*args, **kwargs)
            
            with sentry_sdk.start_transaction(op=op, name=name):
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            if not _initialized or not SENTRY_AVAILABLE:
                return func(*args, **kwargs)
            
            with sentry_sdk.start_transaction(op=op, name=name):
                return func(*args, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


# AUTUS 특화 에러 유형
class AUTUSError(Exception):
    """AUTUS 기본 에러"""
    pass


class SafetyGuardError(AUTUSError):
    """Safety Guard 트리거 에러"""
    pass


class ScaleLockError(AUTUSError):
    """Scale Lock 위반 에러"""
    pass


class InertiaDebtError(AUTUSError):
    """Inertia Debt 초과 에러"""
    pass


def capture_safety_trigger(
    reason: str,
    metrics: dict,
    user_id: Optional[str] = None,
) -> Optional[str]:
    """Safety Guard 트리거 캡처"""
    return capture_message(
        f"Safety Guard Triggered: {reason}",
        level="warning",
        tags={
            "component": "safety_guard",
            "trigger_reason": reason,
        },
        extras={
            "metrics": metrics,
            "user_id": user_id,
        },
    )


def capture_scale_lock_violation(
    user_id: str,
    attempted_action: str,
    current_scale: str,
) -> Optional[str]:
    """Scale Lock 위반 캡처"""
    return capture_message(
        f"Scale Lock Violation: {attempted_action}",
        level="error",
        tags={
            "component": "scale_lock",
            "action": attempted_action,
            "k_scale": current_scale,
        },
        extras={
            "user_id": user_id,
        },
    )
