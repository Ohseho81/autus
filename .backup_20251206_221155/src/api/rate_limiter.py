"""
AUTUS Rate Limiter - Request throttling and traffic management.

Implements token-bucket algorithm for fair request distribution.
Tracks per-client rate limits with configurable windows.
"""

from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import HTTPException, Request
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import time


@dataclass
class ClientRateInfo:
    """Rate limit information for a client."""
    max_requests: int
    window_seconds: int
    requests: List[float]
    blocked_until: Optional[float] = None
    
    def get_current_count(self) -> int:
        """Get count of requests in current window."""
        now = time.time()
        cutoff = now - self.window_seconds
        self.requests = [t for t in self.requests if t > cutoff]
        return len(self.requests)
    
    def is_blocked(self) -> bool:
        """Check if client is currently blocked."""
        if self.blocked_until is None:
            return False
        if time.time() < self.blocked_until:
            return True
        self.blocked_until = None
        return False


class AdvancedRateLimiter:
    """Advanced rate limiter with per-client tracking and circuit breaking."""
    
    def __init__(
        self, 
        max_requests: int = 100, 
        window_seconds: int = 60,
        burst_multiplier: float = 1.5,
        block_duration_seconds: int = 300
    ):
        """Initialize rate limiter.
        
        Args:
            max_requests: Maximum requests per window
            window_seconds: Time window in seconds
            burst_multiplier: Allow temporary burst (1.5 = 150% of max)
            block_duration_seconds: Duration to block abusive clients
        """
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.burst_multiplier = burst_multiplier
        self.block_duration = block_duration_seconds
        self.clients: Dict[str, ClientRateInfo] = defaultdict(
            lambda: ClientRateInfo(
                max_requests=max_requests,
                window_seconds=window_seconds,
                requests=[]
            )
        )
        self.stats = {
            "total_requests": 0,
            "blocked_requests": 0,
            "unique_clients": 0
        }
    
    def get_client_id(self, request: Request) -> str:
        """Extract client identifier from request.
        
        Prefers X-Forwarded-For for proxy scenarios, falls back to client IP.
        """
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def check(self, client_id: str) -> Dict[str, int]:
        """Check if request should be allowed.
        
        Args:
            client_id: Client identifier
            
        Returns:
            Dict with remaining requests and limit info
            
        Raises:
            HTTPException: If rate limit exceeded
        """
        now = time.time()
        client_info = self.clients[client_id]
        
        # Check if client is blocked (circuit breaker)
        if client_info.is_blocked():
            self.stats["blocked_requests"] += 1
            raise HTTPException(
                status_code=429,
                detail="Client temporarily blocked due to excessive requests",
                headers={"Retry-After": str(int(client_info.blocked_until - now))}
            )
        
        # Get current request count in window
        current_count = client_info.get_current_count()
        burst_limit = int(self.max_requests * self.burst_multiplier)
        
        # Check hard limit (with burst allowance)
        if current_count >= burst_limit:
            # Client is abusing - block them
            client_info.blocked_until = now + self.block_duration
            self.stats["blocked_requests"] += 1
            raise HTTPException(
                status_code=429,
                detail=f"Rate limit exceeded. Client blocked for {self.block_duration}s",
                headers={"Retry-After": str(self.block_duration)}
            )
        
        # Record this request
        client_info.requests.append(now)
        self.stats["total_requests"] += 1
        
        # Update unique clients
        if len(self.clients) > self.stats.get("unique_clients", 0):
            self.stats["unique_clients"] = len(self.clients)
        
        remaining = self.max_requests - current_count
        return {
            "remaining": max(0, remaining),
            "limit": self.max_requests,
            "reset_in": self.window_seconds
        }
    
    def get_stats(self) -> Dict[str, any]:
        """Get rate limiter statistics."""
        active_clients = len([c for c in self.clients.values() if len(c.requests) > 0])
        total_requests = sum(len(c.get_current_count() for c in self.clients.values()))
        
        return {
            "active_clients": active_clients,
            "total_requests": self.stats["total_requests"],
            "blocked_requests": self.stats["blocked_requests"],
            "unique_clients": self.stats["unique_clients"],
            "block_duration_seconds": self.block_duration,
            "max_requests_per_window": self.max_requests,
            "window_seconds": self.window_seconds
        }
    
    def reset_client(self, client_id: str) -> bool:
        """Reset rate limit for a specific client (admin operation).
        
        Args:
            client_id: Client identifier to reset
            
        Returns:
            True if reset successful
        """
        if client_id in self.clients:
            self.clients[client_id].requests = []
            self.clients[client_id].blocked_until = None
            return True
        return False
    
    def get_blocked_clients(self) -> List[str]:
        """Get list of currently blocked clients."""
        now = time.time()
        return [
            client_id for client_id, info in self.clients.items()
            if info.is_blocked() or (info.blocked_until and info.blocked_until > now)
        ]


# Legacy interface for backward compatibility
class RateLimiter:
    """Backward compatible rate limiter wrapper."""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self._limiter = AdvancedRateLimiter(max_requests, window_seconds)
    
    def get_client_id(self, request: Request) -> str:
        return self._limiter.get_client_id(request)
    
    def check(self, client_id: str) -> dict:
        return self._limiter.check(client_id)
    
    def get_stats(self) -> dict:
        return self._limiter.get_stats()


# Singleton instance
rate_limiter = RateLimiter(max_requests=100, window_seconds=60)
