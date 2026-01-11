"""
═══════════════════════════════════════════════════════════════════════════════
🛡️ AUTUS Global Error Handler
═══════════════════════════════════════════════════════════════════════════════

전역 에러 처리 미들웨어
"""

import traceback
import time
from typing import Callable, Optional
from datetime import datetime
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

logger = logging.getLogger("autus.errors")


# ═══════════════════════════════════════════════════════════════════════════════
# 커스텀 예외
# ═══════════════════════════════════════════════════════════════════════════════

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(
        self,
        message: str,
        error_code: str = "AUTUS_ERROR",
        status_code: int = 500,
        details: Optional[dict] = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class ValidationError(AutusException):
    """유효성 검증 에러"""
    def __init__(self, message: str, details: Optional[dict] = None):
        super().__init__(message, "VALIDATION_ERROR", 400, details)


class AuthenticationError(AutusException):
    """인증 에러"""
    def __init__(self, message: str = "인증이 필요합니다"):
        super().__init__(message, "AUTH_ERROR", 401)


class AuthorizationError(AutusException):
    """권한 에러"""
    def __init__(self, message: str = "권한이 없습니다"):
        super().__init__(message, "FORBIDDEN", 403)


class NotFoundError(AutusException):
    """리소스 없음 에러"""
    def __init__(self, resource: str, identifier: str):
        super().__init__(
            f"{resource} '{identifier}'을(를) 찾을 수 없습니다",
            "NOT_FOUND",
            404,
            {"resource": resource, "identifier": identifier},
        )


class RateLimitError(AutusException):
    """요청 제한 에러"""
    def __init__(self, retry_after: int = 60):
        super().__init__(
            "요청 제한을 초과했습니다",
            "RATE_LIMIT",
            429,
            {"retry_after": retry_after},
        )


class ServiceUnavailableError(AutusException):
    """서비스 불가 에러"""
    def __init__(self, service: str, message: str = "서비스를 사용할 수 없습니다"):
        super().__init__(message, "SERVICE_UNAVAILABLE", 503, {"service": service})


# ═══════════════════════════════════════════════════════════════════════════════
# 에러 응답 형식
# ═══════════════════════════════════════════════════════════════════════════════

def create_error_response(
    status_code: int,
    error_code: str,
    message: str,
    details: Optional[dict] = None,
    request_id: Optional[str] = None,
) -> JSONResponse:
    """표준 에러 응답 생성"""
    content = {
        "success": False,
        "error": {
            "code": error_code,
            "message": message,
            "status": status_code,
        },
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
    
    if details:
        content["error"]["details"] = details
    
    if request_id:
        content["request_id"] = request_id
    
    return JSONResponse(status_code=status_code, content=content)


# ═══════════════════════════════════════════════════════════════════════════════
# 에러 핸들러 등록
# ═══════════════════════════════════════════════════════════════════════════════

def setup_error_handlers(app: FastAPI):
    """에러 핸들러 설정"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 처리"""
        logger.warning(
            f"AutusException: {exc.error_code} - {exc.message}",
            extra={"details": exc.details, "path": request.url.path},
        )
        
        return create_error_response(
            status_code=exc.status_code,
            error_code=exc.error_code,
            message=exc.message,
            details=exc.details,
            request_id=getattr(request.state, "request_id", None),
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """요청 유효성 검증 에러"""
        errors = []
        for error in exc.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
            })
        
        logger.info(
            f"Validation error: {errors}",
            extra={"path": request.url.path},
        )
        
        return create_error_response(
            status_code=422,
            error_code="VALIDATION_ERROR",
            message="요청 데이터가 유효하지 않습니다",
            details={"errors": errors},
            request_id=getattr(request.state, "request_id", None),
        )
    
    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        """HTTP 예외 처리"""
        error_codes = {
            400: "BAD_REQUEST",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            408: "REQUEST_TIMEOUT",
            409: "CONFLICT",
            422: "UNPROCESSABLE_ENTITY",
            429: "TOO_MANY_REQUESTS",
            500: "INTERNAL_ERROR",
            502: "BAD_GATEWAY",
            503: "SERVICE_UNAVAILABLE",
            504: "GATEWAY_TIMEOUT",
        }
        
        error_code = error_codes.get(exc.status_code, "HTTP_ERROR")
        
        return create_error_response(
            status_code=exc.status_code,
            error_code=error_code,
            message=str(exc.detail) if exc.detail else "요청 처리 중 오류가 발생했습니다",
            request_id=getattr(request.state, "request_id", None),
        )
    
    @app.exception_handler(Exception)
    async def generic_exception_handler(request: Request, exc: Exception):
        """모든 예외 처리 (Fallback)"""
        # 스택 트레이스 로깅
        logger.error(
            f"Unhandled exception: {type(exc).__name__}: {exc}",
            extra={
                "path": request.url.path,
                "method": request.method,
                "traceback": traceback.format_exc(),
            },
        )
        
        # 프로덕션에서는 상세 에러 숨김
        import os
        is_production = os.getenv("ENV", "development") == "production"
        
        message = "서버 내부 오류가 발생했습니다"
        details = None
        
        if not is_production:
            details = {
                "exception": type(exc).__name__,
                "message": str(exc),
            }
        
        return create_error_response(
            status_code=500,
            error_code="INTERNAL_ERROR",
            message=message,
            details=details,
            request_id=getattr(request.state, "request_id", None),
        )


# ═══════════════════════════════════════════════════════════════════════════════
# Request ID 미들웨어
# ═══════════════════════════════════════════════════════════════════════════════

async def request_id_middleware(request: Request, call_next: Callable):
    """요청 ID 생성 미들웨어"""
    import uuid
    
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())[:8]
    request.state.request_id = request_id
    
    start_time = time.time()
    
    response = await call_next(request)
    
    # 응답 헤더에 Request ID 추가
    response.headers["X-Request-ID"] = request_id
    
    # 처리 시간 로깅
    process_time = (time.time() - start_time) * 1000
    logger.debug(
        f"{request.method} {request.url.path} - {response.status_code} ({process_time:.2f}ms)",
        extra={"request_id": request_id},
    )
    
    return response


# ═══════════════════════════════════════════════════════════════════════════════
# 내보내기
# ═══════════════════════════════════════════════════════════════════════════════

__all__ = [
    # Exceptions
    "AutusException",
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "RateLimitError",
    "ServiceUnavailableError",
    # Functions
    "setup_error_handlers",
    "create_error_response",
    "request_id_middleware",
]
