"""
Rate limiting middleware for FastAPI
Integrates with AdvancedRateLimiter for per-endpoint rate control
"""

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Callable
from api.rate_limiter import rate_limiter
import logging

logger = logging.getLogger(__name__)

# Endpoints exempt from rate limiting
EXEMPT_PATHS = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/monitoring",
    "/metrics"
}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware for enforcing rate limits"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> any:
        """Process request with rate limiting"""
        
        # Check if path is exempt
        for exempt_path in EXEMPT_PATHS:
            if request.url.path.startswith(exempt_path):
                return await call_next(request)
        
        # Get client ID
        client_id = rate_limiter.get_client_id(request)
        endpoint_path = request.url.path
        
        try:
            # Check rate limit for this endpoint
            limit_info = rate_limiter._limiter.check(client_id, endpoint_path)
            
            # Add rate limit headers to response
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit_info["limit"])
            response.headers["X-RateLimit-Remaining"] = str(limit_info["remaining"])
            response.headers["X-RateLimit-Reset"] = str(limit_info["reset_in"])
            
            return response
        
        except HTTPException as e:
            # Re-raise rate limit exceptions (429)
            raise e
        except Exception as e:
            logger.error(f"Rate limit check error: {e}")
            # Allow request on error (fail-open)
            return await call_next(request)
