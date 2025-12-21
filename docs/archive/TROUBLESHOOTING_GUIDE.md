"""
AUTUS v4.8 Performance Troubleshooting Guide

Quick reference for diagnosing and solving common performance issues
"""

TROUBLESHOOTING_GUIDE = {
    "high_api_latency": {
        "title": "API Response Time Too High (>100ms)",
        "diagnosis": [
            "1. Check /monitoring/performance/dashboard for overall metrics",
            "2. Identify slowest endpoint via /monitoring/performance/endpoint/{name}",
            "3. Check cache hit rate at /cache/stats (target: >80%)",
            "4. Monitor DB query performance via /monitoring/performance/metrics"
        ],
        "solutions": [
            {
                "issue": "Cache hit rate below 60%",
                "actions": [
                    "Run POST /maintenance/cache/warmup to pre-cache common endpoints",
                    "Increase TTL for frequently accessed data in api/cache.py",
                    "Check cache_invalidate() calls - may be clearing too aggressively"
                ]
            },
            {
                "issue": "Database queries slow (p95 > 500ms)",
                "actions": [
                    "Run VACUUM and ANALYZE on database",
                    "Check if missing indices via evolved/database_optimizer.py",
                    "Consider enabling query batching for bulk operations",
                    "Use /devices/batch endpoints instead of individual requests"
                ]
            },
            {
                "issue": "Specific endpoint slow only",
                "actions": [
                    "Check api/rate_limiter.py endpoint configuration",
                    "Verify endpoint not rate limited (see blocked clients list)",
                    "Profile endpoint handler for expensive operations",
                    "Consider implementing caching if missing"
                ]
            }
        ]
    },
    
    "high_network_usage": {
        "title": "Excessive Network Bandwidth",
        "diagnosis": [
            "1. Check response size trends in /monitoring/performance/metrics",
            "2. Verify Gzip compression enabled (should be 500B minimum)",
            "3. Monitor /monitoring/rate-limit/stats for blocked requests",
            "4. Check for large batch operations"
        ],
        "solutions": [
            {
                "issue": "Responses not compressed",
                "actions": [
                    "Verify GZipMiddleware in main.py (minimum_size=500)",
                    "Check client Accept-Encoding header",
                    "Restart API server to apply middleware changes"
                ]
            },
            {
                "issue": "Large response payloads",
                "actions": [
                    "Implement pagination for list endpoints",
                    "Add response filtering/limiting parameters",
                    "Use batch endpoints for bulk data (50-100 items per batch)",
                    "Consider field selection (return only needed fields)"
                ]
            }
        ]
    },
    
    "high_error_rate": {
        "title": "Increased Error Rate (>5%)",
        "diagnosis": [
            "1. Check error rates by endpoint: /monitoring/performance/endpoint/{name}",
            "2. Review error response patterns: /monitoring/error-validation/report",
            "3. Check rate limit blocks: /monitoring/rate-limit/blocked-clients",
            "4. Monitor recent metrics: /monitoring/performance/metrics"
        ],
        "solutions": [
            {
                "issue": "429 Rate Limited errors",
                "actions": [
                    "Check /monitoring/rate-limit/stats for limit thresholds",
                    "Adjust endpoint limits in api/rate_limiter.py if needed",
                    "Implement exponential backoff in clients",
                    "Use batch endpoints to reduce request count"
                ]
            },
            {
                "issue": "400 Validation errors",
                "actions": [
                    "Review API request payload schemas",
                    "Check api/errors.py for validation error details",
                    "Verify required fields are provided",
                    "Use /monitoring/error-validation/report to find issues"
                ]
            },
            {
                "issue": "500 Internal Server errors",
                "actions": [
                    "Check application logs for exceptions",
                    "Verify database connectivity",
                    "Check cache availability (Redis)",
                    "Review recent metric anomalies"
                ]
            }
        ]
    },
    
    "cache_issues": {
        "title": "Cache Performance Problems",
        "diagnosis": [
            "1. Check cache stats: /cache/stats",
            "2. Verify cache warmup status: /maintenance/cache/warming-status",
            "3. Monitor cache hit rates by endpoint: /monitoring/performance/dashboard",
            "4. Check for excessive cache invalidation"
        ],
        "solutions": [
            {
                "issue": "Low cache hit rate (< 50%)",
                "actions": [
                    "Increase TTL values in api/cache.py for stable data",
                    "Run cache warmup: POST /maintenance/cache/warmup",
                    "Review cache invalidation strategy - may be too aggressive",
                    "Ensure cache keys are consistent (same parameters = same key)"
                ]
            },
            {
                "issue": "Cache invalidation too frequent",
                "actions": [
                    "Review cache_invalidate() calls in routes",
                    "Use tag-based invalidation (more precise) instead of pattern matching",
                    "Only invalidate affected keys, not all keys with pattern",
                    "Consider selective invalidation by endpoint"
                ]
            },
            {
                "issue": "Redis connection errors",
                "actions": [
                    "Check Redis service status",
                    "Verify connection string in .env",
                    "Check firewall/network connectivity",
                    "Monitor Redis memory usage (may be full)",
                    "Review evolved/kafka_producer.py for fallback handling"
                ]
            }
        ]
    },
    
    "rate_limit_issues": {
        "title": "Unexpected Rate Limiting",
        "diagnosis": [
            "1. Check blocked clients: /monitoring/rate-limit/blocked-clients",
            "2. Review rate limit stats: /monitoring/rate-limit/stats",
            "3. Check endpoint-specific limits: api/rate_limiter.py EndpointPriority",
            "4. Monitor request patterns in /monitoring/performance/metrics"
        ],
        "solutions": [
            {
                "issue": "Legitimate clients being blocked",
                "actions": [
                    "Check client IP (may be shared by multiple users)",
                    "Reset client limit: POST /monitoring/rate-limit/reset/{client_id}",
                    "Increase burst_multiplier in api/rate_limiter.py",
                    "Adjust max_requests for specific endpoint priority"
                ]
            },
            {
                "issue": "Rate limits too restrictive",
                "actions": [
                    "Adjust max_requests in AdvancedRateLimiter.__init__",
                    "Increase burst_multiplier (1.5 = 150% allowance)",
                    "Adjust block_duration_seconds (time before unblock)",
                    "Review EndpointPriority configuration for specific endpoints"
                ]
            }
        ]
    },
    
    "database_performance": {
        "title": "Database Query Bottlenecks",
        "diagnosis": [
            "1. Monitor DB query times in performance metrics",
            "2. Check index usage via evolved/database_optimizer.py",
            "3. Review query patterns in /monitoring/performance/metrics",
            "4. Analyze table sizes: evolved/database_optimizer.py.analyze_table_sizes()"
        ],
        "solutions": [
            {
                "issue": "Missing indices on high-query tables",
                "actions": [
                    "Run evolved/database_optimizer.py.create_optimal_indices()",
                    "Check existing indices: evolved/database_optimizer.py.analyze_table_sizes()",
                    "Add compound indices for common WHERE+ORDER BY patterns",
                    "Monitor query plans for full table scans"
                ]
            },
            {
                "issue": "Query time variance (some fast, some slow)",
                "actions": [
                    "Enable query result caching for read-heavy endpoints",
                    "Use batch processing for bulk operations",
                    "Consider query optimization (reduce columns, add WHERE clauses)",
                    "Profile specific slow queries"
                ]
            }
        ]
    },
    
    "celery_task_issues": {
        "title": "Background Task Problems",
        "diagnosis": [
            "1. Check Celery configuration in evolved/celery_app.py",
            "2. Monitor task timeouts and retries",
            "3. Review queue depths and worker status",
            "4. Check task error logs"
        ],
        "solutions": [
            {
                "issue": "Tasks timing out (>120s)",
                "actions": [
                    "Check task_soft_time_limit in evolved/celery_app.py (currently 120s)",
                    "Increase timeout if task legitimately needs more time",
                    "Break long tasks into smaller sub-tasks",
                    "Optimize task code for performance"
                ]
            },
            {
                "issue": "Tasks failing and retrying",
                "actions": [
                    "Check retry_count in CallbackTask (currently 2 max)",
                    "Increase exponential backoff start_countdown",
                    "Review task dependencies and ordering",
                    "Check for transient errors (network, temporary unavailability)"
                ]
            }
        ]
    },
    
    "memory_pressure": {
        "title": "High Memory Usage",
        "diagnosis": [
            "1. Check /monitoring/performance/metrics for cache size",
            "2. Monitor PerformanceMonitor.max_metrics (limited to 10k)",
            "3. Check RequestContext memory usage (limited to 1k)",
            "4. Review cache size and eviction policy"
        ],
        "solutions": [
            {
                "issue": "Performance monitor consuming memory",
                "actions": [
                    "Reduce max_metrics in api/performance_monitor.py PerformanceMonitor",
                    "Increase metric collection interval",
                    "Reset metrics periodically: POST /monitoring/performance/reset",
                    "Export metrics to time-series database for long-term storage"
                ]
            },
            {
                "issue": "Cache consuming excessive memory",
                "actions": [
                    "Review cache TTL values in api/cache.py",
                    "Reduce cache_size in Redis configuration",
                    "Implement cache eviction policy (LRU)",
                    "Monitor cache growth over time"
                ]
            }
        ]
    }
}


def get_troubleshooting_guide(issue_category: str = None) -> dict:
    """Get troubleshooting guide section"""
    if issue_category and issue_category in TROUBLESHOOTING_GUIDE:
        return TROUBLESHOOTING_GUIDE[issue_category]
    return TROUBLESHOOTING_GUIDE


def print_quick_reference():
    """Print quick reference of all diagnostic endpoints"""
    print("\n" + "="*60)
    print("AUTUS v4.8 QUICK DIAGNOSTIC REFERENCE")
    print("="*60)
    print("\n📊 PERFORMANCE METRICS:")
    print("  GET  /monitoring/performance/dashboard          - Overall metrics")
    print("  GET  /monitoring/performance/endpoint/{name}    - Endpoint specific")
    print("  GET  /monitoring/performance/metrics            - Raw metrics")
    print("  POST /monitoring/performance/reset              - Clear metrics")
    
    print("\n💾 CACHE MANAGEMENT:")
    print("  GET  /cache/stats                               - Cache statistics")
    print("  POST /maintenance/cache/warmup                  - Trigger warmup")
    print("  GET  /maintenance/cache/warming-status          - Warmup status")
    
    print("\n🚦 RATE LIMITING:")
    print("  GET  /monitoring/rate-limit/stats               - Rate limit stats")
    print("  GET  /monitoring/rate-limit/blocked-clients     - Blocked IPs")
    print("  POST /monitoring/rate-limit/reset/{client}     - Reset limit")
    
    print("\n📡 REQUEST TRACKING:")
    print("  GET  /monitoring/requests/summary               - Request stats")
    print("  GET  /monitoring/requests/{request_id}          - Specific request")
    
    print("\n❌ ERROR HANDLING:")
    print("  GET  /monitoring/error-validation/report        - Error consistency")
    
    print("\n" + "="*60 + "\n")
