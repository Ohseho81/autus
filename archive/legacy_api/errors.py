"""
AUTUS Standard Error Handling
Unified error response format with Pydantic validation for all API endpoints
"""

from fastapi import HTTPException
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Any, Dict, Optional, List
from enum import Enum


class ErrorCode(Enum):
    """Standard error codes"""
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    CONFLICT = "CONFLICT"
    INTERNAL_ERROR = "INTERNAL_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    BAD_REQUEST = "BAD_REQUEST"
    RATE_LIMITED = "RATE_LIMITED"
    RESOURCE_LOCKED = "RESOURCE_LOCKED"


class ErrorDetail(BaseModel):
    """Individual error detail with field information"""
    field: str = Field(..., description="Field that caused the error")
    message: str = Field(..., description="Error message for this field")
    value: Optional[Any] = Field(None, description="Value that caused the error")


class ErrorResponse(BaseModel):
    """Standard error response model with Pydantic validation"""
    error_code: ErrorCode = Field(..., description="Standard error code")
    message: str = Field(..., description="Human-readable error message")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="Timestamp of error")
    path: Optional[str] = Field(None, description="Request path that caused error")
    request_id: Optional[str] = Field(None, description="Unique request ID for tracing")
    details: List[ErrorDetail] = Field(default_factory=list, description="Additional error details")
    
    class Config:
        schema_extra = {
            "example": {
                "error_code": "VALIDATION_ERROR",
                "message": "Validation failed for request",
                "timestamp": "2024-12-07T10:30:00.000000",
                "path": "/api/devices/register",
                "request_id": "req_abc123",
                "details": [
                    {
                        "field": "device_id",
                        "message": "Device ID is required",
                        "value": None
                    }
                ]
            }
        }
    
    def dict(self, **kwargs):
        """Convert to dictionary for JSON serialization"""
        data = super().dict(**kwargs)
        data["error_code"] = data["error_code"].value if isinstance(data["error_code"], ErrorCode) else data["error_code"]
        return data


class AutousException(HTTPException):
    """AUTUS standard exception class with type safety"""
    
    def __init__(
        self,
        code: ErrorCode,
        message: str,
        status_code: int = 500,
        details: Optional[List[ErrorDetail]] = None,
        request_id: Optional[str] = None
    ):
        self.error_code = code
        self.error_message = message
        self.error_details = details or []
        self.request_id = request_id
        
        # Create typed ErrorResponse
        response = ErrorResponse(
            error_code=code,
            message=message,
            path=None,
            request_id=request_id,
            details=details or []
        )
        
        super().__init__(
            status_code=status_code,
            detail=response.dict()
        )


# Success response model
class SuccessResponse(BaseModel):
    """Standard success response model"""
    status: str = Field(default="success", description="Response status")
    data: Optional[Any] = Field(None, description="Response data")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(), description="Response timestamp")
    request_id: Optional[str] = Field(None, description="Request ID for tracing")
    
    class Config:
        schema_extra = {
            "example": {
                "status": "success",
                "data": {"id": "device_123", "name": "Main Device"},
                "timestamp": "2024-12-07T10:30:00.000000",
                "request_id": "req_abc123"
            }
        }


# Common error instances
class ValidationError(AutousException):
    """422 Validation error"""
    def __init__(self, message: str, details: Optional[List[ErrorDetail]] = None):
        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            status_code=422,
            details=details
        )


class NotFoundError(AutousException):
    """404 Not found"""
    def __init__(self, resource: str, identifier: Any = None):
        message = f"{resource} not found"
        if identifier:
            message += f": {identifier}"
        super().__init__(
            code=ErrorCode.NOT_FOUND,
            message=message,
            status_code=404
        )


class UnauthorizedError(AutousException):
    """401 Unauthorized"""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            code=ErrorCode.UNAUTHORIZED,
            message=message,
            status_code=401
        )


class ForbiddenError(AutousException):
    """403 Forbidden"""
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            code=ErrorCode.FORBIDDEN,
            message=message,
            status_code=403
        )


class ConflictError(AutousException):
    """409 Conflict"""
    def __init__(self, message: str, details: Optional[List[ErrorDetail]] = None):
        super().__init__(
            code=ErrorCode.CONFLICT,
            message=message,
            status_code=409,
            details=details
        )


class InternalError(AutousException):
    """500 Internal server error"""
    def __init__(self, message: str = "Internal server error", details: Optional[List[ErrorDetail]] = None):
        super().__init__(
            code=ErrorCode.INTERNAL_ERROR,
            message=message,
            status_code=500,
            details=details
        )


class ServiceUnavailableError(AutousException):
    """503 Service unavailable"""
    def __init__(self, service: str = "Service"):
        super().__init__(
            code=ErrorCode.SERVICE_UNAVAILABLE,
            message=f"{service} is currently unavailable",
            status_code=503
        )


class BadRequestError(AutousException):
    """400 Bad request"""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            code=ErrorCode.BAD_REQUEST,
            message=message,
            status_code=400,
            details=details
        )
