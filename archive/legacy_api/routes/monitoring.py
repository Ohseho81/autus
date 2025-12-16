"""
Monitoring Endpoints - Real-time API metrics and performance tracking

Endpoints:
  GET /api/v1/monitoring/health - System health status
  GET /api/v1/monitoring/summary - Overall system summary
  GET /api/v1/monitoring/endpoints - All endpoints metrics
  GET /api/v1/monitoring/slow - Slowest endpoints
  GET /api/v1/monitoring/errors - Endpoints with errors
  GET /api/v1/monitoring/recent - Recent requests
  GET /api/v1/monitoring/status-codes - Status code distribution
  GET /api/v1/monitoring/dashboard - Full dashboard data
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
from typing import Dict, Any, List
from api.monitoring import get_monitor

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """System health status"""
    monitor = get_monitor()
    summary = monitor.get_summary()
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "endpoints_tracked": summary["total_endpoints"],
        "total_requests": summary["total_requests"],
        "error_rate": summary["error_rate"],
        "uptime": summary["uptime_human"]
    }


@router.get("/summary")
async def get_summary() -> Dict[str, Any]:
    """Overall system summary"""
    monitor = get_monitor()
    return monitor.get_summary()


@router.get("/endpoints")
async def get_all_endpoints(
    limit: int = None,
    sort_by: str = "call_count"
) -> Dict[str, Any]:
    """Get all endpoints metrics with sorting"""
    monitor = get_monitor()
    metrics = monitor.get_all_metrics()
    
    # Sort options
    if sort_by == "call_count":
        sorted_metrics = sorted(
            metrics.items(),
            key=lambda x: x[1]["call_count"],
            reverse=True
        )
    elif sort_by == "avg_duration_ms":
        sorted_metrics = sorted(
            metrics.items(),
            key=lambda x: x[1]["avg_duration_ms"],
            reverse=True
        )
    elif sort_by == "error_rate":
        sorted_metrics = sorted(
            metrics.items(),
            key=lambda x: x[1]["error_rate"],
            reverse=True
        )
    else:
        sorted_metrics = list(metrics.items())
    
    # Apply limit
    if limit:
        sorted_metrics = sorted_metrics[:limit]
    
    return {
        "total_endpoints": len(metrics),
        "endpoints": {k: v for k, v in sorted_metrics},
        "sort_by": sort_by,
        "limit": limit
    }


@router.get("/slow")
async def get_slow_endpoints(limit: int = 10) -> Dict[str, Any]:
    """Get slowest endpoints (by average response time)"""
    monitor = get_monitor()
    slow = monitor.get_slow_endpoints(limit)
    
    return {
        "title": "Slowest Endpoints",
        "limit": limit,
        "total": len(slow),
        "endpoints": slow
    }


@router.get("/errors")
async def get_error_endpoints(limit: int = 10) -> Dict[str, Any]:
    """Get endpoints with highest error rates"""
    monitor = get_monitor()
    errors = monitor.get_error_endpoints(limit)
    
    return {
        "title": "Endpoints with Errors",
        "limit": limit,
        "total": len(errors),
        "endpoints": errors
    }


@router.get("/recent")
async def get_recent_requests(limit: int = 50) -> Dict[str, Any]:
    """Get recent API requests"""
    monitor = get_monitor()
    recent = monitor.get_recent_requests(limit)
    
    return {
        "title": "Recent Requests",
        "limit": limit,
        "total": len(recent),
        "requests": recent
    }


@router.get("/status-codes")
async def get_status_code_distribution() -> Dict[str, Any]:
    """Get distribution of HTTP status codes"""
    monitor = get_monitor()
    distribution = monitor.get_status_code_distribution()
    
    # Group by category
    categories = {
        "2xx_success": sum(v for k, v in distribution.items() if 200 <= k < 300),
        "3xx_redirect": sum(v for k, v in distribution.items() if 300 <= k < 400),
        "4xx_client_error": sum(v for k, v in distribution.items() if 400 <= k < 500),
        "5xx_server_error": sum(v for k, v in distribution.items() if 500 <= k < 600),
    }
    
    return {
        "title": "HTTP Status Code Distribution",
        "by_code": distribution,
        "by_category": categories
    }


@router.get("/dashboard")
async def get_dashboard_data() -> Dict[str, Any]:
    """Complete dashboard data"""
    monitor = get_monitor()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "summary": monitor.get_summary(),
        "slow_endpoints": monitor.get_slow_endpoints(10),
        "error_endpoints": monitor.get_error_endpoints(10),
        "recent_requests": monitor.get_recent_requests(20),
        "status_codes": monitor.get_status_code_distribution(),
        "total_metrics": len(monitor.get_all_metrics())
    }


@router.post("/reset")
async def reset_metrics() -> Dict[str, str]:
    """Reset all monitoring data (admin only)"""
    monitor = get_monitor()
    monitor.reset()
    
    return {
        "status": "success",
        "message": "All monitoring data has been reset",
        "timestamp": datetime.now().isoformat()
    }
