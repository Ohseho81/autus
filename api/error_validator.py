"""
Error response consistency validator and fixer

Ensures all API endpoints return standardized error responses.
Validates that all routes use AutousException for error handling.
"""

import logging
from typing import Dict, List, Callable, Any
from api.errors import AutousException, ErrorCode, ErrorDetail
import inspect

logger = logging.getLogger(__name__)


class ErrorResponseValidator:
    """Validates and ensures error response consistency"""
    
    def __init__(self):
        self.validation_results = []
        self.issues_found = 0
        self.routes_checked = 0
    
    def validate_endpoint(
        self,
        endpoint_name: str,
        func: Callable,
        expected_error_codes: List[ErrorCode] = None
    ) -> Dict[str, Any]:
        """
        Validate a single endpoint for error handling
        
        Args:
            endpoint_name: Name of endpoint
            func: Endpoint function
            expected_error_codes: List of error codes this endpoint should raise
            
        Returns:
            Validation result dict
        """
        self.routes_checked += 1
        result = {
            "endpoint": endpoint_name,
            "status": "valid",
            "issues": [],
            "recommendations": []
        }
        
        # Check function signature
        sig = inspect.signature(func)
        has_request = any(param.annotation == "Request" for param in sig.parameters.values())
        
        # Check if function has proper error handling
        source = inspect.getsource(func)
        
        # Check for AutousException usage
        if "AutousException" not in source and "HTTPException" in source:
            result["issues"].append("Uses HTTPException instead of AutousException")
            result["recommendations"].append("Replace HTTPException with AutousException for consistency")
            self.issues_found += 1
        
        # Check for try-except blocks
        if "try:" not in source:
            result["issues"].append("No try-except error handling")
            result["recommendations"].append("Add try-except blocks for error scenarios")
            self.issues_found += 1
        
        # Check for proper error response
        if "ErrorResponse" not in source and "detail=" not in source:
            result["issues"].append("May not be returning proper error responses")
            result["recommendations"].append("Ensure all errors return ErrorResponse or use AutousException")
            self.issues_found += 1
        
        # Update status
        if result["issues"]:
            result["status"] = "needs_review"
        
        self.validation_results.append(result)
        return result
    
    def get_validation_report(self) -> Dict[str, Any]:
        """Get comprehensive validation report"""
        return {
            "routes_checked": self.routes_checked,
            "issues_found": self.issues_found,
            "success_rate": round(((self.routes_checked - self.issues_found) / self.routes_checked * 100), 2) if self.routes_checked > 0 else 0,
            "results": self.validation_results
        }
    
    def print_report(self):
        """Print validation report to logger"""
        report = self.get_validation_report()
        logger.info(f"\n{'='*60}")
        logger.info(f"ERROR RESPONSE VALIDATION REPORT")
        logger.info(f"{'='*60}")
        logger.info(f"Routes checked: {report['routes_checked']}")
        logger.info(f"Issues found: {report['issues_found']}")
        logger.info(f"Success rate: {report['success_rate']}%")
        logger.info(f"{'='*60}\n")
        
        for result in report["results"]:
            if result["status"] == "needs_review":
                logger.warning(f"\n⚠️  {result['endpoint']}")
                for issue in result["issues"]:
                    logger.warning(f"   - {issue}")
                for rec in result["recommendations"]:
                    logger.info(f"   ✓ {rec}")


class ErrorResponseFactory:
    """Factory for creating standardized error responses"""
    
    @staticmethod
    def validation_error(
        field: str,
        message: str,
        value: Any = None
    ) -> AutousException:
        """Create validation error response"""
        detail = ErrorDetail(field=field, message=message, value=value)
        return AutousException(
            code=ErrorCode.VALIDATION_ERROR,
            message=f"Validation failed: {message}",
            status_code=422,
            details=[detail]
        )
    
    @staticmethod
    def not_found(
        resource_type: str,
        identifier: Any
    ) -> AutousException:
        """Create not found error response"""
        return AutousException(
            code=ErrorCode.NOT_FOUND,
            message=f"{resource_type} not found: {identifier}",
            status_code=404
        )
    
    @staticmethod
    def unauthorized(
        reason: str = "Authentication required"
    ) -> AutousException:
        """Create unauthorized error response"""
        return AutousException(
            code=ErrorCode.UNAUTHORIZED,
            message=reason,
            status_code=401
        )
    
    @staticmethod
    def forbidden(
        reason: str = "Access denied"
    ) -> AutousException:
        """Create forbidden error response"""
        return AutousException(
            code=ErrorCode.FORBIDDEN,
            message=reason,
            status_code=403
        )
    
    @staticmethod
    def conflict(
        resource: str,
        reason: str
    ) -> AutousException:
        """Create conflict error response"""
        return AutousException(
            code=ErrorCode.CONFLICT,
            message=f"Conflict: {reason}",
            status_code=409
        )
    
    @staticmethod
    def internal_error(
        message: str = "Internal server error"
    ) -> AutousException:
        """Create internal error response"""
        return AutousException(
            code=ErrorCode.INTERNAL_ERROR,
            message=message,
            status_code=500
        )
    
    @staticmethod
    def rate_limited(
        retry_after: int = 60
    ) -> AutousException:
        """Create rate limit error response"""
        return AutousException(
            code=ErrorCode.RATE_LIMITED,
            message=f"Rate limit exceeded. Retry after {retry_after}s",
            status_code=429
        )
    
    @staticmethod
    def service_unavailable(
        service: str
    ) -> AutousException:
        """Create service unavailable error response"""
        return AutousException(
            code=ErrorCode.SERVICE_UNAVAILABLE,
            message=f"Service unavailable: {service}",
            status_code=503
        )


# Global validator instance
validator = ErrorResponseValidator()


# Usage examples in endpoints:
"""
from api.error_validator import ErrorResponseFactory

@app.post("/devices/register")
async def register_device(device: Device):
    try:
        # Validate input
        if not device.id:
            raise ErrorResponseFactory.validation_error(
                field="device_id",
                message="Device ID is required"
            )
        
        # Check if exists
        if device.id in devices_db:
            raise ErrorResponseFactory.conflict(
                resource="device",
                reason="Device already registered"
            )
        
        # Process
        devices_db[device.id] = device
        return {"status": "success", "device_id": device.id}
    
    except AutousException:
        raise  # Let exception handler deal with it
    except Exception as e:
        raise ErrorResponseFactory.internal_error(str(e))
"""
