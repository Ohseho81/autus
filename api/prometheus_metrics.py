"""
AUTUS Prometheus Metrics Integration

Collects and exposes metrics for Prometheus monitoring:
- HTTP request metrics (latency, count, errors)
- Database query metrics
- System resource metrics
- Business metrics
"""

from prometheus_client import Counter, Histogram, Gauge, CollectorRegistry
from prometheus_client import start_http_server, generate_latest
import time
from typing import Optional
from functools import wraps


# Create registry
registry = CollectorRegistry()

# ===== Request Metrics =====
http_requests_total = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

http_request_duration_seconds = Histogram(
    'http_request_duration_seconds',
    'HTTP request latency in seconds',
    ['method', 'endpoint'],
    buckets=(0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0),
    registry=registry
)

http_request_size_bytes = Histogram(
    'http_request_size_bytes',
    'HTTP request body size in bytes',
    ['method', 'endpoint'],
    buckets=(100, 1000, 10000, 100000, 1000000),
    registry=registry
)

http_response_size_bytes = Histogram(
    'http_response_size_bytes',
    'HTTP response body size in bytes',
    ['method', 'endpoint'],
    buckets=(100, 1000, 10000, 100000, 1000000),
    registry=registry
)

# ===== Database Metrics =====
db_query_duration_seconds = Histogram(
    'db_query_duration_seconds',
    'Database query latency in seconds',
    ['query_type'],
    buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5),
    registry=registry
)

db_queries_total = Counter(
    'db_queries_total',
    'Total database queries',
    ['query_type', 'status'],
    registry=registry
)

db_connection_pool_size = Gauge(
    'db_connection_pool_size',
    'Database connection pool size',
    registry=registry
)

db_active_connections = Gauge(
    'db_active_connections',
    'Active database connections',
    registry=registry
)

# ===== Error Metrics =====
errors_total = Counter(
    'errors_total',
    'Total errors',
    ['error_type', 'endpoint'],
    registry=registry
)

# ===== Business Metrics =====
devices_total = Gauge(
    'devices_total',
    'Total devices in system',
    registry=registry
)

devices_online = Gauge(
    'devices_online',
    'Online devices',
    registry=registry
)

events_processed_total = Counter(
    'events_processed_total',
    'Total events processed',
    ['event_type'],
    registry=registry
)

packs_executed_total = Counter(
    'packs_executed_total',
    'Total pack executions',
    ['pack_type', 'status'],
    registry=registry
)

# ===== System Metrics =====
system_cpu_usage = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage',
    registry=registry
)

system_memory_usage = Gauge(
    'system_memory_usage_percent',
    'System memory usage percentage',
    registry=registry
)

system_disk_usage = Gauge(
    'system_disk_usage_percent',
    'System disk usage percentage',
    registry=registry
)

# ===== Rate Limiter Metrics =====
rate_limiter_requests_total = Counter(
    'rate_limiter_requests_total',
    'Total requests processed by rate limiter',
    ['client_id', 'status'],
    registry=registry
)

rate_limiter_blocked_clients = Gauge(
    'rate_limiter_blocked_clients',
    'Number of currently blocked clients',
    registry=registry
)

# ===== Health Check Metrics =====
health_check_duration_seconds = Histogram(
    'health_check_duration_seconds',
    'Health check duration in seconds',
    ['component'],
    buckets=(0.01, 0.05, 0.1, 0.5, 1.0),
    registry=registry
)

health_check_status = Gauge(
    'health_check_status',
    'Health check status (1=healthy, 0=unhealthy)',
    ['component'],
    registry=registry
)


class MetricsCollector:
    """Utility class for recording metrics."""
    
    @staticmethod
    def record_request(method: str, endpoint: str, status_code: int, duration: float):
        """Record HTTP request metrics.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            status_code: HTTP status code
            duration: Request duration in seconds
        """
        http_requests_total.labels(method=method, endpoint=endpoint, status=status_code).inc()
        http_request_duration_seconds.labels(method=method, endpoint=endpoint).observe(duration)
    
    @staticmethod
    def record_response_size(method: str, endpoint: str, size_bytes: int):
        """Record response size."""
        http_response_size_bytes.labels(method=method, endpoint=endpoint).observe(size_bytes)
    
    @staticmethod
    def record_db_query(query_type: str, duration: float, success: bool = True):
        """Record database query metrics.
        
        Args:
            query_type: Type of query (SELECT, INSERT, UPDATE, DELETE)
            duration: Query duration in seconds
            success: Whether query succeeded
        """
        db_query_duration_seconds.labels(query_type=query_type).observe(duration)
        status = "success" if success else "error"
        db_queries_total.labels(query_type=query_type, status=status).inc()
    
    @staticmethod
    def record_error(error_type: str, endpoint: str):
        """Record error occurrence."""
        errors_total.labels(error_type=error_type, endpoint=endpoint).inc()
    
    @staticmethod
    def record_event_processed(event_type: str):
        """Record processed event."""
        events_processed_total.labels(event_type=event_type).inc()
    
    @staticmethod
    def record_pack_execution(pack_type: str, success: bool):
        """Record pack execution."""
        status = "success" if success else "failure"
        packs_executed_total.labels(pack_type=pack_type, status=status).inc()
    
    @staticmethod
    def update_devices_count(total: int, online: int):
        """Update device counts."""
        devices_total.set(total)
        devices_online.set(online)
    
    @staticmethod
    def update_system_resources(cpu_percent: float, memory_percent: float, disk_percent: float):
        """Update system resource metrics."""
        system_cpu_usage.set(cpu_percent)
        system_memory_usage.set(memory_percent)
        system_disk_usage.set(disk_percent)
    
    @staticmethod
    def record_health_check(component: str, duration: float, healthy: bool):
        """Record health check metrics."""
        health_check_duration_seconds.labels(component=component).observe(duration)
        health_check_status.labels(component=component).set(1 if healthy else 0)


def start_metrics_server(port: int = 8000):
    """Start Prometheus metrics HTTP server.
    
    Args:
        port: Port to serve metrics on (default: 8000)
    """
    try:
        start_http_server(port, registry=registry)
        print(f"✅ Prometheus metrics server started on port {port}")
        print(f"   Access metrics at: http://localhost:{port}/metrics")
    except Exception as e:
        print(f"❌ Failed to start metrics server: {e}")


def get_metrics_text():
    """Get current metrics as text."""
    return generate_latest(registry).decode('utf-8')
