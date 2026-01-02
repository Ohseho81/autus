#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    📝 AUTUS EMPIRE - Logging & Error Handling                             ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

로깅 시스템 + 글로벌 에러 핸들러
"""

import os
import sys
import traceback
from datetime import datetime
from typing import Optional, Dict, Any
from functools import wraps

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Loguru (선택적)
try:
    from loguru import logger
    LOGURU_AVAILABLE = True
except ImportError:
    import logging
    logger = logging.getLogger("autus")
    LOGURU_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

class LogConfig:
    """로깅 설정"""
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "logs/autus.log")
    LOG_FORMAT = "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>"
    LOG_ROTATION = "10 MB"
    LOG_RETENTION = "7 days"
    JSON_LOGS = os.getenv("JSON_LOGS", "false").lower() == "true"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Loguru 설정
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_logging():
    """로깅 시스템 초기화"""
    if LOGURU_AVAILABLE:
        # 기존 핸들러 제거
        logger.remove()
        
        # 콘솔 출력
        logger.add(
            sys.stdout,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            colorize=True,
        )
        
        # 파일 출력
        os.makedirs(os.path.dirname(LogConfig.LOG_FILE), exist_ok=True)
        logger.add(
            LogConfig.LOG_FILE,
            format=LogConfig.LOG_FORMAT,
            level=LogConfig.LOG_LEVEL,
            rotation=LogConfig.LOG_ROTATION,
            retention=LogConfig.LOG_RETENTION,
            compression="zip",
        )
        
        # JSON 로그 (프로덕션용)
        if LogConfig.JSON_LOGS:
            logger.add(
                "logs/autus.json",
                format="{message}",
                level=LogConfig.LOG_LEVEL,
                rotation=LogConfig.LOG_ROTATION,
                serialize=True,
            )
        
        logger.info("🏛️ AUTUS Empire 로깅 시스템 초기화 완료")
    else:
        # 기본 logging 사용
        logging.basicConfig(
            level=getattr(logging, LogConfig.LOG_LEVEL),
            format="%(asctime)s | %(levelname)-8s | %(name)s:%(funcName)s:%(lineno)d - %(message)s",
        )
        logger.info("📝 기본 로깅 시스템 초기화 (loguru 미설치)")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 에러 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

class ErrorResponse(BaseModel):
    """에러 응답 모델"""
    success: bool = False
    error_code: str
    message: str
    detail: Optional[str] = None
    timestamp: str
    path: Optional[str] = None
    request_id: Optional[str] = None


class ErrorCodes:
    """에러 코드"""
    # 400 - Bad Request
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    
    # 401 - Unauthorized
    UNAUTHORIZED = "UNAUTHORIZED"
    INVALID_TOKEN = "INVALID_TOKEN"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    
    # 403 - Forbidden
    FORBIDDEN = "FORBIDDEN"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    
    # 404 - Not Found
    NOT_FOUND = "NOT_FOUND"
    CUSTOMER_NOT_FOUND = "CUSTOMER_NOT_FOUND"
    PLAYER_NOT_FOUND = "PLAYER_NOT_FOUND"
    
    # 409 - Conflict
    ALREADY_EXISTS = "ALREADY_EXISTS"
    DUPLICATE_ENTRY = "DUPLICATE_ENTRY"
    
    # 429 - Too Many Requests
    RATE_LIMITED = "RATE_LIMITED"
    
    # 500 - Internal Server Error
    INTERNAL_ERROR = "INTERNAL_ERROR"
    DATABASE_ERROR = "DATABASE_ERROR"


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = ErrorCodes.INTERNAL_ERROR,
        status_code: int = 500,
        detail: Optional[str] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.detail = detail
        super().__init__(message)


class CustomerNotFoundError(AutusException):
    """고객 미발견 예외"""
    def __init__(self, user_id: str):
        super().__init__(
            message=f"Customer not found: {user_id}",
            error_code=ErrorCodes.CUSTOMER_NOT_FOUND,
            status_code=404,
        )


class PlayerNotFoundError(AutusException):
    """플레이어 미발견 예외"""
    def __init__(self, employee_id: str):
        super().__init__(
            message=f"Player not found: {employee_id}",
            error_code=ErrorCodes.PLAYER_NOT_FOUND,
            status_code=404,
        )


class RateLimitError(AutusException):
    """Rate Limit 예외"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            message="Too many requests",
            error_code=ErrorCodes.RATE_LIMITED,
            status_code=429,
            detail=f"Retry after {retry_after} seconds",
        )


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 글로벌 에러 핸들러
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """글로벌 에러 핸들러 등록"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(f"[{exc.error_code}] {exc.message} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=exc.error_code,
                message=exc.message,
                detail=exc.detail,
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 처리"""
        logger.warning(f"[HTTP {exc.status_code}] {exc.detail} - {request.url.path}")
        
        return JSONResponse(
            status_code=exc.status_code,
            content=ErrorResponse(
                error_code=f"HTTP_{exc.status_code}",
                message=exc.detail or "An error occurred",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
            ).model_dump(),
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 처리 (500)"""
        error_id = datetime.now().strftime("%Y%m%d%H%M%S%f")
        
        # 상세 로그
        logger.error(f"[ERROR-{error_id}] Unhandled exception: {exc}")
        logger.error(f"Traceback:\n{traceback.format_exc()}")
        
        return JSONResponse(
            status_code=500,
            content=ErrorResponse(
                error_code=ErrorCodes.INTERNAL_ERROR,
                message="Internal server error",
                detail=f"Error ID: {error_id}",
                timestamp=datetime.now().isoformat(),
                path=str(request.url.path),
                request_id=error_id,
            ).model_dump(),
        )
    
    logger.info("🛡️ 글로벌 에러 핸들러 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 요청 로깅 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════════════════

def setup_request_logging(app: FastAPI):
    """요청/응답 로깅 미들웨어"""
    
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        """모든 요청 로깅"""
        start_time = datetime.now()
        
        # 요청 로깅
        logger.info(f"→ {request.method} {request.url.path}")
        
        # 응답 처리
        response = await call_next(request)
        
        # 응답 시간 계산
        duration = (datetime.now() - start_time).total_seconds() * 1000
        
        # 응답 로깅
        status_emoji = "✅" if response.status_code < 400 else "❌"
        logger.info(f"← {status_emoji} {response.status_code} ({duration:.2f}ms)")
        
        return response
    
    logger.info("📊 요청 로깅 미들웨어 등록 완료")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 데코레이터
# ═══════════════════════════════════════════════════════════════════════════════════════════

def log_function(func):
    """함수 실행 로깅 데코레이터"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        logger.debug(f"Calling {func.__name__}")
        try:
            result = await func(*args, **kwargs)
            logger.debug(f"{func.__name__} completed")
            return result
        except Exception as e:
            logger.error(f"{func.__name__} failed: {e}")
            raise
    return wrapper


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 초기화 함수
# ═══════════════════════════════════════════════════════════════════════════════════════════

def init_logging_system(app: FastAPI):
    """로깅 시스템 전체 초기화"""
    setup_logging()
    setup_error_handlers(app)
    setup_request_logging(app)
    
    logger.info("━" * 60)
    logger.info("🏛️ AUTUS EMPIRE - Logging System Initialized")
    logger.info(f"   Log Level: {LogConfig.LOG_LEVEL}")
    logger.info(f"   Log File: {LogConfig.LOG_FILE}")
    logger.info(f"   Loguru Available: {LOGURU_AVAILABLE}")
    logger.info("━" * 60)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Export
# ═══════════════════════════════════════════════════════════════════════════════════════════

__all__ = [
    "logger",
    "setup_logging",
    "setup_error_handlers",
    "setup_request_logging",
    "init_logging_system",
    "AutusException",
    "CustomerNotFoundError",
    "PlayerNotFoundError",
    "RateLimitError",
    "ErrorCodes",
    "ErrorResponse",
    "log_function",
]





















