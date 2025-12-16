"""
Request tracking middleware for distributed tracing and debugging

Features:
- Automatic Request ID generation (UUID v4)
- X-Request-ID header extraction/injection
- Request metadata tracking (method, path, status, duration)
- Structured logging with correlation IDs
- OpenTelemetry compatibility
"""

import uuid
import time
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)

# Request context storage
REQUEST_ID_HEADER = "X-Request-ID"
REQUEST_CONTEXT = {}


class RequestTrackingMiddleware(BaseHTTPMiddleware):
    """Middleware for tracking requests with unique IDs and metadata"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with tracking"""
        
        # Extract or generate Request ID
        request_id = request.headers.get(REQUEST_ID_HEADER)
        if not request_id:
            request_id = str(uuid.uuid4())
        
        # Store in request state for downstream access
        request.state.request_id = request_id
        
        # Extract trace context
        trace_parent = request.headers.get("traceparent")
        trace_state = request.headers.get("tracestate")
        
        # Track request metadata
        request_start_time = time.time()
        method = request.method
        path = request.url.path
        query_params = dict(request.query_params)
        client_host = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Store context for logging
        REQUEST_CONTEXT[request_id] = {
            "request_id": request_id,
            "method": method,
            "path": path,
            "query_params": query_params,
            "client": client_host,
            "user_agent": user_agent,
            "trace_parent": trace_parent,
            "trace_state": trace_state,
            "start_time": request_start_time
        }
        
        # Log incoming request
        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": method,
                "path": path,
                "client": client_host,
                "trace_parent": trace_parent
            }
        )
        
        try:
            # Call next middleware/endpoint
            response = await call_next(request)
            
            # Calculate request duration
            request_duration_ms = (time.time() - request_start_time) * 1000
            
            # Add Request ID to response headers
            response.headers[REQUEST_ID_HEADER] = request_id
            
            # Record in API monitor
            try:
                from api.monitoring import get_monitor
                monitor = get_monitor()
                is_error = response.status_code >= 400
                monitor.record_request(
                    path=path,
                    method=method,
                    duration_ms=request_duration_ms,
                    status_code=response.status_code,
                    is_error=is_error
                )
            except Exception as e:
                logger.warning(f"Failed to record monitoring data: {e}")
            
            # Log response
            logger.info(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "method": method,
                    "path": path,
                    "status_code": response.status_code,
                    "duration_ms": round(request_duration_ms, 2)
                }
            )
            
            # Update context with response info
            if request_id in REQUEST_CONTEXT:
                REQUEST_CONTEXT[request_id].update({
                    "status_code": response.status_code,
                    "duration_ms": request_duration_ms,
                    "completed_at": time.time()
                })
            
            return response
            
        except Exception as exc:
            # Calculate request duration
            request_duration_ms = (time.time() - request_start_time) * 1000
            
            # Log error
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "method": method,
                    "path": path,
                    "error": str(exc),
                    "duration_ms": round(request_duration_ms, 2)
                },
                exc_info=True
            )
            
            # Re-raise exception
            raise
        
        finally:
            # Cleanup old context (keep last 1000 requests)
            if len(REQUEST_CONTEXT) > 1000:
                oldest_key = min(REQUEST_CONTEXT.keys(), 
                               key=lambda k: REQUEST_CONTEXT[k].get("start_time", 0))
                del REQUEST_CONTEXT[oldest_key]


def get_request_id() -> str:
    """Get current request ID from context"""
    # This would typically come from context vars in production
    # For now, return from REQUEST_CONTEXT
    return list(REQUEST_CONTEXT.values())[-1].get("request_id", "unknown") if REQUEST_CONTEXT else "unknown"


def get_request_context(request_id: str = None) -> dict:
    """Get request context metadata"""
    if request_id:
        return REQUEST_CONTEXT.get(request_id, {})
    # Get latest request context
    return list(REQUEST_CONTEXT.values())[-1] if REQUEST_CONTEXT else {}


def get_all_requests_summary() -> dict:
    """Get summary of all tracked requests"""
    total_requests = len(REQUEST_CONTEXT)
    completed = sum(1 for ctx in REQUEST_CONTEXT.values() if "completed_at" in ctx)
    
    avg_duration = 0
    if REQUEST_CONTEXT:
        durations = [ctx.get("duration_ms", 0) for ctx in REQUEST_CONTEXT.values() if "duration_ms" in ctx]
        avg_duration = sum(durations) / len(durations) if durations else 0
    
    return {
        "total_tracked": total_requests,
        "completed": completed,
        "in_progress": total_requests - completed,
        "average_duration_ms": round(avg_duration, 2),
        "context_size": len(REQUEST_CONTEXT)
    }
