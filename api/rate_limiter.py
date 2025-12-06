"""
AUTUS Rate Limiter - Protect API from abuse
"""
from datetime import datetime, timedelta
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request


class RateLimiter:
    """Simple rate limiter for API protection."""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = timedelta(seconds=window_seconds)
        self.requests: Dict[str, List[datetime]] = defaultdict(list)
        self.blocked: Dict[str, datetime] = {}

    def get_client_id(self, request: Request) -> str:
        """Extract client identifier from request."""
        # Try to get real IP from headers (for proxied requests)
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def check(self, client_id: str) -> bool:
        """Check if request is allowed."""
        now = datetime.now()
        
        # Check if client is blocked
        if client_id in self.blocked:
            if now < self.blocked[client_id]:
                raise HTTPException(
                    status_code=429,
                    detail={
                        "error": "Rate limit exceeded",
                        "retry_after": (self.blocked[client_id] - now).seconds
                    }
                )
            else:
                del self.blocked[client_id]
        
        # Clean old requests
        cutoff = now - self.window
        self.requests[client_id] = [
            t for t in self.requests[client_id] if t > cutoff
        ]
        
        # Check rate limit
        if len(self.requests[client_id]) >= self.max_requests:
            # Block for 1 minute
            self.blocked[client_id] = now + timedelta(minutes=1)
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "Rate limit exceeded",
                    "max_requests": self.max_requests,
                    "window_seconds": self.window.seconds,
                    "retry_after": 60
                }
            )
        
        # Record request
        self.requests[client_id].append(now)
        return True

    def get_usage(self, client_id: str) -> dict:
        """Get rate limit usage for a client."""
        now = datetime.now()
        cutoff = now - self.window
        current = len([t for t in self.requests[client_id] if t > cutoff])
        return {
            "current": current,
            "max": self.max_requests,
            "remaining": self.max_requests - current,
            "reset_in": self.window.seconds
        }


# Global rate limiter instance (100 requests per minute)
rate_limiter = RateLimiter(max_requests=100, window_seconds=60)

