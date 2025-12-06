from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import HTTPException, Request
from typing import Dict, List

class RateLimiter:
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window = timedelta(seconds=window_seconds)
        self.requests: Dict[str, List[datetime]] = defaultdict(list)

    def get_client_id(self, request: Request) -> str:
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0]
        return request.client.host if request.client else "unknown"

    def check(self, client_id: str) -> dict:
        now = datetime.now()
        cutoff = now - self.window
        self.requests[client_id] = [t for t in self.requests[client_id] if t > cutoff]
        
        remaining = self.max_requests - len(self.requests[client_id])
        
        if remaining <= 0:
            raise HTTPException(
                status_code=429, 
                detail="Rate limit exceeded",
                headers={"Retry-After": "60"}
            )
        
        self.requests[client_id].append(now)
        return {"remaining": remaining, "limit": self.max_requests}

    def get_stats(self) -> dict:
        return {
            "active_clients": len(self.requests),
            "total_requests": sum(len(r) for r in self.requests.values())
        }

rate_limiter = RateLimiter(max_requests=100, window_seconds=60)
