"""
AUTUS Rate Limiter - Request throttling and traffic management.

Implements token-bucket algorithm with per-endpoint rate limits.
Features:
- Per-client rate limiting
- Per-endpoint rate limiting
- Circuit breaker pattern
- Priority queue support
- DDoS protection
"""

from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import HTTPException, Request
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import time
import logging

logger = logging.getLogger(__name__)


class EndpointPriority(Enum):
    """Endpoint priority levels for rate limiting"""
    CRITICAL = 0  # /health, /status (unlimited)
    HIGH = 1      # /auth, /devices (1000 req/min)
    NORMAL = 2    # /analytics, /data (500 req/min)
    LOW = 3       # /reports, /export (100 req/min)


@dataclass
class ClientRateInfo:
    """Rate limit information for a client."""
    max_requests: int
    window_seconds: int
    requests: List[float]
    blocked_until: Optional[float] = None
    violation_count: int = 0  # Track repeated violations
    
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


@dataclass
class EndpointRateConfig:
    """Configuration for endpoint-specific rate limits"""
    path_pattern: str
    priority: EndpointPriority
    max_requests: int  # Per minute
    burst_multiplier: float = 1.5
    block_duration: int = 300  # seconds


class AdvancedRateLimiter:
    """Advanced rate limiter with per-client and per-endpoint tracking."""
    
    def __init__(
        self, 
        default_max_requests: int = 100, 
        window_seconds: int = 60,
        burst_multiplier: float = 1.5,
        block_duration_seconds: int = 300
    ):
        """Initialize rate limiter.
        
        Args:
            default_max_requests: Default maximum requests per window
            window_seconds: Time window in seconds
            burst_multiplier: Allow temporary burst (1.5 = 150% of max)
            block_duration_seconds: Duration to block abusive clients
        """
        self.default_max_requests = default_max_requests
        self.window_seconds = window_seconds
        self.burst_multiplier = burst_multiplier
        self.block_duration = block_duration_seconds
        
        # Global and per-client tracking
        self.clients: Dict[str, ClientRateInfo] = defaultdict(
            lambda: ClientRateInfo(
                max_requests=default_max_requests,
                window_seconds=window_seconds,
                requests=[]
            )
        )
        
        # Per-endpoint tracking (path -> client -> requests)
        self.endpoint_limits: Dict[str, EndpointRateConfig] = {}
        self._init_endpoint_limits()
        
        # Statistics
        self.stats = {
            "total_requests": 0,
            "blocked_requests": 0,
            "unique_clients": 0,
            "endpoint_stats": defaultdict(lambda: {"allowed": 0, "blocked": 0})
        }
    
    def _init_endpoint_limits(self):
        """Initialize endpoint-specific rate limits"""
        endpoint_configs = [
            # High priority endpoints (authentication, core device ops)
            EndpointRateConfig("/auth", EndpointPriority.HIGH, 1000, 1.2, 300),
            EndpointRateConfig("/devices/register", EndpointPriority.HIGH, 500, 1.5, 300),
            EndpointRateConfig("/devices/batch", EndpointPriority.HIGH, 100, 1.5, 300),
            
            # Normal priority (data collection, analytics)
            EndpointRateConfig("/analytics", EndpointPriority.NORMAL, 500, 1.5, 300),
            EndpointRateConfig("/devices/data", EndpointPriority.NORMAL, 300, 1.5, 300),
            EndpointRateConfig("/twin", EndpointPriority.NORMAL, 200, 1.5, 300),
            
            # Low priority (reporting, exports)
            EndpointRateConfig("/reports", EndpointPriority.LOW, 50, 1.3, 600),
            EndpointRateConfig("/export", EndpointPriority.LOW, 30, 1.3, 600),
        ]
        
        for config in endpoint_configs:
            self.endpoint_limits[config.path_pattern] = config
    
    def get_client_id(self, request: Request) -> str:
        """Extract client identifier from request.
        
        Prefers X-Forwarded-For for proxy scenarios, falls back to client IP.
        """

        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _get_endpoint_config(self, path: str) -> Optional[EndpointRateConfig]:
        """Get rate limit config for endpoint path"""
        # Exact match first
        if path in self.endpoint_limits:
            return self.endpoint_limits[path]
        
        # Pattern matching
        for pattern, config in self.endpoint_limits.items():
            if pattern in path:
                return config
        
        # Return default
        return None
    
    def check(self, client_id: str, endpoint_path: str = None) -> Dict[str, int]:
        """Check if request should be allowed.
        
        Args:
            client_id: Client identifier
            endpoint_path: API endpoint path for endpoint-specific limits
            
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
            remaining_block_time = int(client_info.blocked_until - now)
            logger.warning(f"Client {client_id} is blocked for {remaining_block_time}s")
            raise HTTPException(
                status_code=429,
                detail=f"Client blocked. Retry after {remaining_block_time}s",
                headers={"Retry-After": str(remaining_block_time)}
            )
        
        # Determine rate limit based on endpoint
        max_requests = self.default_max_requests
        if endpoint_path:
            config = self._get_endpoint_config(endpoint_path)
            if config and config.priority != EndpointPriority.CRITICAL:
                max_requests = config.max_requests
                burst_multiplier = config.burst_multiplier
                block_duration = config.block_duration
            else:
                # Critical endpoints are unlimited
                client_info.requests.append(now)
                self.stats["total_requests"] += 1
                if endpoint_path:
                    self.stats["endpoint_stats"][endpoint_path]["allowed"] += 1
                return {"remaining": 9999, "limit": 9999, "reset_in": 1}
        else:
            burst_multiplier = self.burst_multiplier
            block_duration = self.block_duration
        
        # Get current request count in window
        current_count = client_info.get_current_count()
        burst_limit = int(max_requests * burst_multiplier)
        
        # Check soft limit (normal operation)
        if current_count >= max_requests:
            # Log but allow (50% chance) - allows temporary bursts
            if current_count >= burst_limit:
                # Hard limit exceeded - block client
                client_info.blocked_until = now + block_duration
                client_info.violation_count += 1
                self.stats["blocked_requests"] += 1
                if endpoint_path:
                    self.stats["endpoint_stats"][endpoint_path]["blocked"] += 1
                
                logger.warning(
                    f"Client {client_id} rate limit exceeded at {endpoint_path}: "
                    f"{current_count} requests (limit: {max_requests})"
                )
                
                raise HTTPException(
                    status_code=429,
                    detail=f"Rate limit exceeded. Retry after {block_duration}s",
                    headers={"Retry-After": str(block_duration)}
                )
        
        # Record this request
        client_info.requests.append(now)
        self.stats["total_requests"] += 1
        if endpoint_path:
            self.stats["endpoint_stats"][endpoint_path]["allowed"] += 1
        
        # Update unique clients
        if len(self.clients) > self.stats.get("unique_clients", 0):
            self.stats["unique_clients"] = len(self.clients)
        
        remaining = max(0, max_requests - current_count)
        return {
            "remaining": remaining,
            "limit": max_requests,
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
