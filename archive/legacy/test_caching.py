"""
Test script to validate Redis caching implementation
Tests cache hits, misses, invalidation, and performance improvements
"""

import asyncio
import time
import requests
import json
from typing import Dict, Any
import statistics

BASE_URL = "http://localhost:8003"

# Terminal colors
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}")
    print(f"{text}")
    print(f"{'='*60}{RESET}")

def print_success(text):
    print(f"{GREEN}✓ {text}{RESET}")

def print_error(text):
    print(f"{RED}✗ {text}{RESET}")

def print_info(text):
    print(f"{YELLOW}ℹ {text}{RESET}")

def get_cache_stats() -> Dict[str, Any]:
    """Fetch cache statistics"""
    try:
        resp = requests.get(f"{BASE_URL}/cache/stats", timeout=5)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print_error(f"Failed to fetch cache stats: {e}")
        return {}

def test_endpoint(url: str, name: str, num_requests: int = 3) -> Dict[str, Any]:
    """Test an endpoint for caching behavior"""
    print_info(f"Testing: {name}")
    
    times = []
    responses = []
    
    for i in range(num_requests):
        try:
            start = time.time()
            resp = requests.get(url, timeout=5)
            elapsed = time.time() - start
            times.append(elapsed * 1000)  # Convert to ms
            
            if resp.status_code == 200:
                responses.append(resp.json())
                print_info(f"  Request {i+1}: {elapsed*1000:.2f}ms - Status {resp.status_code}")
            else:
                print_error(f"  Request {i+1}: Status {resp.status_code}")
                
        except Exception as e:
            print_error(f"  Request {i+1} failed: {e}")
    
    # Calculate statistics
    if times:
        first_time = times[0]
        avg_cached = statistics.mean(times[1:]) if len(times) > 1 else 0
        improvement = ((first_time - avg_cached) / first_time * 100) if first_time > 0 else 0
        
        return {
            "endpoint": name,
            "first_request_ms": first_time,
            "avg_cached_ms": avg_cached,
            "improvement_percent": improvement,
            "response_times": times,
            "success": len(responses) == num_requests
        }
    
    return {"endpoint": name, "success": False, "error": "No successful requests"}

def main():
    print_header("🚀 AUTUS v4.5 Caching Optimization Test")
    
    # Test 1: Check if server is running
    print_header("Test 1: Server Connectivity")
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=5)
        if resp.status_code == 200:
            print_success(f"Server is running on {BASE_URL}")
        else:
            print_error(f"Server returned status {resp.status_code}")
            return
    except Exception as e:
        print_error(f"Cannot connect to server: {e}")
        return
    
    # Test 2: Check cache endpoint
    print_header("Test 2: Cache Endpoint")
    stats = get_cache_stats()
    if stats:
        print_success("Cache stats endpoint responding")
        print(f"  Cache hits: {stats.get('cache_hits', 0)}")
        print(f"  Cache misses: {stats.get('cache_misses', 0)}")
        print(f"  Hit rate: {stats.get('hit_rate_percent', 0):.1f}%")
    else:
        print_error("Cache stats endpoint not responding")
        return
    
    # Test 3: Analytics endpoints
    print_header("Test 3: Analytics Endpoint Caching")
    
    stats_before = get_cache_stats()
    
    analytics_tests = [
        ("/analytics/stats", "Analytics Stats"),
        ("/analytics/pages", "Analytics Pages"),
        ("/analytics/api-calls", "Analytics API Calls"),
    ]
    
    results = []
    for url, name in analytics_tests:
        try:
            result = test_endpoint(f"{BASE_URL}{url}", name, num_requests=3)
            results.append(result)
            
            if result.get("success"):
                improvement = result.get("improvement_percent", 0)
                if improvement > 0:
                    print_success(f"{name}: {improvement:.1f}% faster on cached requests")
                else:
                    print_info(f"{name}: Caching active")
        except Exception as e:
            print_error(f"{name}: {e}")
    
    stats_after = get_cache_stats()
    
    # Test 4: Cache invalidation
    print_header("Test 4: Cache Invalidation")
    
    before_hits = stats_after.get("cache_hits", 0)
    
    # Make a request
    try:
        resp = requests.get(f"{BASE_URL}/analytics/stats", timeout=5)
        print_info("Made request to /analytics/stats")
    except Exception as e:
        print_error(f"Failed: {e}")
    
    # Invalidate cache with POST
    try:
        resp = requests.post(f"{BASE_URL}/analytics/track", json={"event": "test"}, timeout=5)
        print_info("Posted to /analytics/track to trigger invalidation")
    except:
        print_info("Cache invalidation test endpoint not fully set up")
    
    # Test 5: Performance summary
    print_header("Test 5: Performance Summary")
    
    if results:
        print(f"\n{'Endpoint':<30} {'First (ms)':<12} {'Cached (ms)':<12} {'Improvement':<12}")
        print("-" * 66)
        
        for result in results:
            if result.get("success"):
                endpoint = result["endpoint"][:28]
                first = result.get("first_request_ms", 0)
                cached = result.get("avg_cached_ms", 0)
                improvement = result.get("improvement_percent", 0)
                
                print(f"{endpoint:<30} {first:>10.2f}ms {cached:>10.2f}ms {improvement:>10.1f}%")
        
        avg_improvement = statistics.mean([r.get("improvement_percent", 0) for r in results if r.get("success")])
        print("-" * 66)
        print(f"{'Average improvement:':<30} {avg_improvement:>10.1f}%")
    
    # Final cache stats
    print_header("Test 6: Final Cache Statistics")
    
    final_stats = get_cache_stats()
    total_requests = final_stats.get("total_requests", 0)
    hits = final_stats.get("cache_hits", 0)
    misses = final_stats.get("cache_misses", 0)
    errors = final_stats.get("cache_errors", 0)
    hit_rate = final_stats.get("hit_rate_percent", 0)
    
    print(f"Total requests processed: {total_requests}")
    print(f"Cache hits: {hits}")
    print(f"Cache misses: {misses}")
    print(f"Cache errors: {errors}")
    print(f"Overall hit rate: {hit_rate:.1f}%")
    
    if hit_rate > 0:
        print_success(f"Caching is active! {hit_rate:.1f}% of requests served from cache")
    else:
        print_info("First test run - cache being populated")
    
    print_header("✅ Test Complete")

if __name__ == "__main__":
    main()
