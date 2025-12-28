"""
AUTUS Error Handler
===================

전역 에러 핸들링 미들웨어

Version: 1.0.0
Status: PRODUCTION
"""

import traceback
import logging
from typing import Callable
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError

logger = logging.getLogger("autus.error")


# ================================================================
# CUSTOM EXCEPTIONS
# ================================================================

class AutusException(Exception):
    """AUTUS 기본 예외"""
    def __init__(self, message: str, code: str = "AUTUS_ERROR", status_code: int = 400):
        self.message = message
        self.code = code
        self.status_code = status_code
        super().__init__(message)


class CommitBlockedException(AutusException):
    """커밋 차단 예외"""
    def __init__(self, reason: str):
        super().__init__(
            message=f"Commit blocked: {reason}",
            code="COMMIT_BLOCKED",
            status_code=403
        )


class SessionNotFoundException(AutusException):
    """세션 미발견 예외"""
    def __init__(self, session_id: str):
        super().__init__(
            message=f"Session not found: {session_id}",
            code="SESSION_NOT_FOUND",
            status_code=404
        )


class ValidationFailedException(AutusException):
    """검증 실패 예외"""
    def __init__(self, field: str, message: str):
        super().__init__(
            message=f"Validation failed for {field}: {message}",
            code="VALIDATION_FAILED",
            status_code=422
        )


class DeterminismViolationException(AutusException):
    """결정론 위반 예외"""
    def __init__(self, details: str):
        super().__init__(
            message=f"Determinism violation: {details}",
            code="DETERMINISM_VIOLATION",
            status_code=500
        )


# ================================================================
# ERROR HANDLERS
# ================================================================

def setup_error_handlers(app: FastAPI):
    """에러 핸들러 설정"""
    
    @app.exception_handler(AutusException)
    async def autus_exception_handler(request: Request, exc: AutusException):
        """AUTUS 커스텀 예외 핸들러"""
        logger.warning(f"AutusException: {exc.code} - {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "code": exc.code,
                "message": exc.message,
                "path": str(request.url.path)
            }
        )
    
    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        """HTTP 예외 핸들러"""
        logger.warning(f"HTTPException: {exc.status_code} - {exc.detail}")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": True,
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "path": str(request.url.path)
            }
        )
    
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        """Pydantic 검증 예외 핸들러"""
        errors = []
        for error in exc.errors():
            field = ".".join(str(loc) for loc in error["loc"])
            errors.append({
                "field": field,
                "message": error["msg"],
                "type": error["type"]
            })
        
        logger.warning(f"ValidationError: {errors}")
        return JSONResponse(
            status_code=422,
            content={
                "error": True,
                "code": "VALIDATION_ERROR",
                "message": "입력 데이터가 유효하지 않습니다",
                "details": errors,
                "path": str(request.url.path)
            }
        )
    
    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        """일반 예외 핸들러 (500 에러)"""
        # 스택 트레이스 로깅
        logger.error(f"Unhandled exception: {str(exc)}")
        logger.error(traceback.format_exc())
        
        return JSONResponse(
            status_code=500,
            content={
                "error": True,
                "code": "INTERNAL_ERROR",
                "message": "서버 내부 오류가 발생했습니다",
                "path": str(request.url.path)
            }
        )





