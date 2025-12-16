"""
API Monitoring & Analytics Module
Real-time monitoring of all 261 endpoints
"""

from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from collections import defaultdict
import json
import threading
import time

@dataclass
class EndpointMetrics:
    """Metrics for a single endpoint"""
    path: str
    method: str
    call_count: int = 0
    error_count: int = 0
    total_duration_ms: float = 0.0
    min_duration_ms: float = float('inf')
    max_duration_ms: float = 0.0
    last_called: Optional[str] = None
    status_codes: Dict[int, int] = None
    
    def __post_init__(self):
        if self.status_codes is None:
            self.status_codes = {}
    
    @property
    def avg_duration_ms(self) -> float:
        """Calculate average duration"""
        if self.call_count == 0:
            return 0.0
        return self.total_duration_ms / self.call_count
    
    @property
    def error_rate(self) -> float:
        """Calculate error rate percentage"""
        if self.call_count == 0:
            return 0.0
        return (self.error_count / self.call_count) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['avg_duration_ms'] = round(self.avg_duration_ms, 2)
        data['error_rate'] = round(self.error_rate, 2)
        data['p95_duration_ms'] = round(self.max_duration_ms * 0.95, 2)
        return data


class APIMonitor:
    """Real-time API monitoring system"""
    
    def __init__(self):
        self.metrics: Dict[str, EndpointMetrics] = {}
        self.lock = threading.RLock()
        self.request_history: List[Dict] = []
        self.max_history = 1000
        self.start_time = datetime.now()
    
    def record_request(
        self,
        path: str,
        method: str,
        duration_ms: float,
        status_code: int,
        is_error: bool = False
    ):
        """Record an API request"""
        with self.lock:
            endpoint_key = f"{method} {path}"
            
            if endpoint_key not in self.metrics:
                self.metrics[endpoint_key] = EndpointMetrics(
                    path=path,
                    method=method
                )
            
            m = self.metrics[endpoint_key]
            m.call_count += 1
            m.total_duration_ms += duration_ms
            m.min_duration_ms = min(m.min_duration_ms, duration_ms)
            m.max_duration_ms = max(m.max_duration_ms, duration_ms)
            m.last_called = datetime.now().isoformat()
            
            if status_code not in m.status_codes:
                m.status_codes[status_code] = 0
            m.status_codes[status_code] += 1
            
            if is_error:
                m.error_count += 1
            
            # Add to history
            self.request_history.append({
                "timestamp": datetime.now().isoformat(),
                "endpoint": endpoint_key,
                "duration_ms": duration_ms,
                "status_code": status_code,
                "is_error": is_error
            })
            
            # Trim history
            if len(self.request_history) > self.max_history:
                self.request_history = self.request_history[-self.max_history:]
    
    def get_all_metrics(self) -> Dict[str, Any]:
        """Get all endpoint metrics"""
        with self.lock:
            return {
                endpoint: m.to_dict()
                for endpoint, m in self.metrics.items()
            }
    
    def get_summary(self) -> Dict[str, Any]:
        """Get overall system summary"""
        with self.lock:
            if not self.metrics:
                return {
                    "total_endpoints": 0,
                    "total_requests": 0,
                    "total_errors": 0,
                    "error_rate": 0.0,
                    "avg_response_time_ms": 0.0,
                    "uptime_seconds": 0
                }
            
            total_requests = sum(m.call_count for m in self.metrics.values())
            total_errors = sum(m.error_count for m in self.metrics.values())
            total_duration = sum(m.total_duration_ms for m in self.metrics.values())
            uptime = (datetime.now() - self.start_time).total_seconds()
            
            return {
                "total_endpoints": len(self.metrics),
                "total_requests": total_requests,
                "total_errors": total_errors,
                "error_rate": round((total_errors / total_requests * 100) if total_requests > 0 else 0, 2),
                "avg_response_time_ms": round(total_duration / total_requests if total_requests > 0 else 0, 2),
                "uptime_seconds": int(uptime),
                "uptime_human": self._format_uptime(uptime),
                "start_time": self.start_time.isoformat()
            }
    
    def get_slow_endpoints(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get slowest endpoints"""
        with self.lock:
            endpoints = [
                {**m.to_dict(), "key": k}
                for k, m in self.metrics.items()
            ]
            endpoints.sort(key=lambda x: x['avg_duration_ms'], reverse=True)
            return endpoints[:limit]
    
    def get_error_endpoints(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get endpoints with highest error rates"""
        with self.lock:
            endpoints = [
                {**m.to_dict(), "key": k}
                for k, m in self.metrics.items()
                if m.error_count > 0
            ]
            endpoints.sort(key=lambda x: x['error_rate'], reverse=True)
            return endpoints[:limit]
    
    def get_recent_requests(self, limit: int = 50) -> List[Dict]:
        """Get recent requests"""
        with self.lock:
            return self.request_history[-limit:]
    
    def get_status_code_distribution(self) -> Dict[int, int]:
        """Get distribution of status codes"""
        with self.lock:
            distribution = defaultdict(int)
            for m in self.metrics.values():
                for status, count in m.status_codes.items():
                    distribution[status] += count
            return dict(distribution)
    
    def reset(self):
        """Reset all metrics"""
        with self.lock:
            self.metrics.clear()
            self.request_history.clear()
            self.start_time = datetime.now()
    
    @staticmethod
    def _format_uptime(seconds: float) -> str:
        """Format uptime in human readable format"""
        days = int(seconds // 86400)
        hours = int((seconds % 86400) // 3600)
        minutes = int((seconds % 3600) // 60)
        
        parts = []
        if days > 0:
            parts.append(f"{days}d")
        if hours > 0:
            parts.append(f"{hours}h")
        if minutes > 0:
            parts.append(f"{minutes}m")
        
        return " ".join(parts) if parts else "< 1m"


# Global monitor instance
api_monitor = APIMonitor()


def get_monitor() -> APIMonitor:
    """Get global monitor instance"""
    return api_monitor
