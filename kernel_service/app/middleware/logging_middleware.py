"""
AUTUS Logging Middleware
========================

구조화된 로깅 시스템

Version: 1.0.0
Status: PRODUCTION
"""

import os
import sys
import time
import json
import logging
import uuid
from datetime import datetime
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

# ================================================================
# LOGGING CONFIGURATION
# ================================================================

LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = os.getenv("LOG_FORMAT", "json")  # json or text


class JSONFormatter(logging.Formatter):
    """JSON 포맷 로그 포매터"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # 추가 필드
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "session_id"):
            log_data["session_id"] = record.session_id
        if hasattr(record, "duration_ms"):
            log_data["duration_ms"] = record.duration_ms
        if hasattr(record, "status_code"):
            log_data["status_code"] = record.status_code
        if hasattr(record, "method"):
            log_data["method"] = record.method
        if hasattr(record, "path"):
            log_data["path"] = record.path
        
        # 예외 정보
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


class TextFormatter(logging.Formatter):
    """텍스트 포맷 로그 포매터"""
    
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        base = f"[{timestamp}] {record.levelname:8s} | {record.name}: {record.getMessage()}"
        
        extras = []
        if hasattr(record, "request_id"):
            extras.append(f"req={record.request_id[:8]}")
        if hasattr(record, "duration_ms"):
            extras.append(f"dur={record.duration_ms}ms")
        if hasattr(record, "status_code"):
            extras.append(f"status={record.status_code}")
        
        if extras:
            base += f" | {' '.join(extras)}"
        
        return base


def setup_logging():
    """로깅 설정 초기화"""
    # 루트 로거 설정
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, LOG_LEVEL.upper()))
    
    # 기존 핸들러 제거
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # 새 핸들러 추가
    handler = logging.StreamHandler(sys.stdout)
    
    if LOG_FORMAT == "json":
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(TextFormatter())
    
    root_logger.addHandler(handler)
    
    # AUTUS 로거
    autus_logger = logging.getLogger("autus")
    autus_logger.setLevel(getattr(logging, LOG_LEVEL.upper()))
    
    return autus_logger


# ================================================================
# LOGGING MIDDLEWARE
# ================================================================

class LoggingMiddleware(BaseHTTPMiddleware):
    """요청/응답 로깅 미들웨어"""
    
    def __init__(self, app):
        super().__init__(app)
        self.logger = logging.getLogger("autus.http")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 요청 ID 생성
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # 시작 시간
        start_time = time.time()
        
        # 요청 로깅
        self.logger.info(
            f"Request: {request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": str(request.url.path),
                "client_ip": request.client.host if request.client else None
            }
        )
        
        # 요청 처리
        try:
            response = await call_next(request)
        except Exception as e:
            # 예외 로깅
            duration_ms = int((time.time() - start_time) * 1000)
            self.logger.error(
                f"Request failed: {str(e)}",
                extra={
                    "request_id": request_id,
                    "duration_ms": duration_ms,
                    "method": request.method,
                    "path": str(request.url.path)
                },
                exc_info=True
            )
            raise
        
        # 응답 로깅
        duration_ms = int((time.time() - start_time) * 1000)
        
        log_level = logging.INFO
        if response.status_code >= 500:
            log_level = logging.ERROR
        elif response.status_code >= 400:
            log_level = logging.WARNING
        
        self.logger.log(
            log_level,
            f"Response: {response.status_code} ({duration_ms}ms)",
            extra={
                "request_id": request_id,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "method": request.method,
                "path": str(request.url.path)
            }
        )
        
        # 응답 헤더에 요청 ID 추가
        response.headers["X-Request-ID"] = request_id
        
        return response





