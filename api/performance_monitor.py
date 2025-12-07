"""
Performance benchmark and metrics collection for AUTUS

Measures:
- API response times per endpoint
- Cache hit/miss rates
- Database query performance
- Batch processing efficiency
- Rate limiter effectiveness
"""

import time
import asyncio
import logging
from typing import Dict, List, Tuple
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """Individual performance measurement"""
    endpoint: str
    operation: str  # "read", "write", "batch", "compute"
    response_time_ms: float
    status_code: int = 200
    cache_hit: bool = False
    batch_size: int = 0
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())


@dataclass
class BenchmarkResult:
    """Aggregated benchmark result"""
    endpoint: str
    total_requests: int
    avg_response_time_ms: float
    p50_response_time_ms: float  # Median
    p95_response_time_ms: float  # 95th percentile
    p99_response_time_ms: float  # 99th percentile
    min_response_time_ms: float
    max_response_time_ms: float
    cache_hit_rate: float
    error_rate: float


class PerformanceMonitor:
    """Monitor and collect performance metrics"""
    
    def __init__(self, max_metrics: int = 10000):
        self.metrics: List[PerformanceMetric] = []
        self.max_metrics = max_metrics
        self.endpoint_timings: Dict[str, List[float]] = defaultdict(list)
        self.cache_stats: Dict[str, Dict] = defaultdict(lambda: {"hits": 0, "misses": 0})
    
    def record_metric(self, metric: PerformanceMetric):
        """Record a performance metric"""
        self.metrics.append(metric)
        
        # Maintain endpoint timings
        self.endpoint_timings[metric.endpoint].append(metric.response_time_ms)
        
        # Track cache stats
        if metric.cache_hit:
            self.cache_stats[metric.endpoint]["hits"] += 1
        else:
            self.cache_stats[metric.endpoint]["misses"] += 1
        
        # Keep memory bounded
        if len(self.metrics) > self.max_metrics:
            self.metrics = self.metrics[-self.max_metrics:]
    
    def get_benchmark_result(self, endpoint: str) -> BenchmarkResult:
        """Get benchmark result for endpoint"""
        timings = self.endpoint_timings.get(endpoint, [])
        
        if not timings:
            return BenchmarkResult(
                endpoint=endpoint,
                total_requests=0,
                avg_response_time_ms=0,
                p50_response_time_ms=0,
                p95_response_time_ms=0,
                p99_response_time_ms=0,
                min_response_time_ms=0,
                max_response_time_ms=0,
                cache_hit_rate=0,
                error_rate=0
            )
        
        sorted_timings = sorted(timings)
        
        # Calculate percentiles
        p50_idx = int(len(sorted_timings) * 0.50)
        p95_idx = int(len(sorted_timings) * 0.95)
        p99_idx = int(len(sorted_timings) * 0.99)
        
        # Calculate cache hit rate
        cache_info = self.cache_stats.get(endpoint, {"hits": 0, "misses": 0})
        total_cache = cache_info["hits"] + cache_info["misses"]
        cache_hit_rate = (cache_info["hits"] / total_cache * 100) if total_cache > 0 else 0
        
        # Calculate error rate
        endpoint_metrics = [m for m in self.metrics if m.endpoint == endpoint]
        errors = sum(1 for m in endpoint_metrics if m.status_code >= 400)
        error_rate = (errors / len(endpoint_metrics) * 100) if endpoint_metrics else 0
        
        return BenchmarkResult(
            endpoint=endpoint,
            total_requests=len(timings),
            avg_response_time_ms=round(sum(timings) / len(timings), 2),
            p50_response_time_ms=round(sorted_timings[p50_idx], 2),
            p95_response_time_ms=round(sorted_timings[p95_idx], 2),
            p99_response_time_ms=round(sorted_timings[p99_idx], 2),
            min_response_time_ms=round(min(timings), 2),
            max_response_time_ms=round(max(timings), 2),
            cache_hit_rate=round(cache_hit_rate, 2),
            error_rate=round(error_rate, 2)
        )
    
    def get_all_benchmarks(self) -> Dict[str, BenchmarkResult]:
        """Get benchmark results for all endpoints"""
        endpoints = set(self.endpoint_timings.keys())
        return {ep: self.get_benchmark_result(ep) for ep in endpoints}
    
    def get_summary_report(self) -> Dict:
        """Get comprehensive performance summary"""
        all_benchmarks = self.get_all_benchmarks()
        
        # Calculate overall metrics
        all_timings = []
        for timings in self.endpoint_timings.values():
            all_timings.extend(timings)
        
        if all_timings:
            sorted_timings = sorted(all_timings)
            overall_avg = sum(all_timings) / len(all_timings)
            overall_p95 = sorted_timings[int(len(sorted_timings) * 0.95)]
            overall_p99 = sorted_timings[int(len(sorted_timings) * 0.99)]
        else:
            overall_avg = overall_p95 = overall_p99 = 0
        
        # Calculate total cache stats
        total_hits = sum(stats["hits"] for stats in self.cache_stats.values())
        total_misses = sum(stats["misses"] for stats in self.cache_stats.values())
        total_cache = total_hits + total_misses
        overall_cache_hit_rate = (total_hits / total_cache * 100) if total_cache > 0 else 0
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "total_requests": len(all_timings),
            "endpoints_monitored": len(all_benchmarks),
            "overall_metrics": {
                "avg_response_time_ms": round(overall_avg, 2),
                "p95_response_time_ms": round(overall_p95, 2),
                "p99_response_time_ms": round(overall_p99, 2),
                "cache_hit_rate": round(overall_cache_hit_rate, 2)
            },
            "endpoint_benchmarks": {
                ep: {
                    "requests": br.total_requests,
                    "avg_ms": br.avg_response_time_ms,
                    "p95_ms": br.p95_response_time_ms,
                    "p99_ms": br.p99_response_time_ms,
                    "cache_hit_rate": br.cache_hit_rate,
                    "error_rate": br.error_rate
                }
                for ep, br in all_benchmarks.items()
            }
        }
    
    def export_metrics_json(self, limit: int = 100) -> List[Dict]:
        """Export recent metrics as JSON"""
        recent = self.metrics[-limit:]
        return [
            {
                "endpoint": m.endpoint,
                "operation": m.operation,
                "response_time_ms": m.response_time_ms,
                "status_code": m.status_code,
                "cache_hit": m.cache_hit,
                "batch_size": m.batch_size,
                "timestamp": m.timestamp
            }
            for m in recent
        ]
    
    def reset(self):
        """Reset all metrics"""
        self.metrics = []
        self.endpoint_timings = defaultdict(list)
        self.cache_stats = defaultdict(lambda: {"hits": 0, "misses": 0})


# Global monitor instance
perf_monitor = PerformanceMonitor()


# Utility function for recording metrics
def record_endpoint_metric(
    endpoint: str,
    operation: str,
    response_time_ms: float,
    status_code: int = 200,
    cache_hit: bool = False,
    batch_size: int = 0
):
    """Record endpoint performance metric"""
    metric = PerformanceMetric(
        endpoint=endpoint,
        operation=operation,
        response_time_ms=response_time_ms,
        status_code=status_code,
        cache_hit=cache_hit,
        batch_size=batch_size
    )
    perf_monitor.record_metric(metric)
