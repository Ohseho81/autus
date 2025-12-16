#!/usr/bin/env python3
"""
AUTUS v4.8 성능 대시보드 & 프로파일링 도구
[M1] + [T2] + [D1] 통합 실행

사용법:
    python performance_dashboard.py --dashboard     # 실시간 성능 추적
    python performance_dashboard.py --cache         # 캐시 검증 (80% 목표)
    python performance_dashboard.py --profile       # 병목 프로파일링
    python performance_dashboard.py --all           # 전체 실행
"""

import asyncio
import httpx
import json
import time
import sys
import statistics
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass
from pathlib import Path
import cProfile
import pstats
from io import StringIO


@dataclass
class PerformanceMetrics:
    """성능 메트릭"""
    endpoint: str
    response_time_ms: float
    status_code: int
    timestamp: datetime


class PerformanceDashboard:
    """[M1] 실시간 성능 추적"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.metrics: List[PerformanceMetrics] = []
    
    async def fetch_dashboard(self) -> Dict:
        """대시보드 데이터 조회"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/monitoring/performance/dashboard"
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def fetch_endpoint_metrics(self, endpoint_name: str) -> Dict:
        """특정 엔드포인트 메트릭"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/monitoring/performance/endpoint/{endpoint_name}"
                )
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def print_dashboard(self, data: Dict):
        """대시보드 출력"""
        print("\n" + "="*80)
        print("🎯 AUTUS v4.8 성능 대시보드 [M1]")
        print("="*80)
        print(f"⏱️  업데이트: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        if "error" in data:
            print(f"❌ 오류: {data['error']}")
            print("💡 팁: main.py가 http://localhost:8000에서 실행 중인지 확인하세요")
            return
        
        # 전체 메트릭
        if "aggregate_metrics" in data:
            agg = data["aggregate_metrics"]
            print("📊 전체 메트릭")
            print(f"  • 총 요청: {agg.get('total_requests', 0):,}")
            print(f"  • 평균 응답시간: {agg.get('average_response_time', 0):.2f}ms")
            print(f"  • P95 응답시간: {agg.get('p95_response_time', 0):.2f}ms")
            print(f"  • P99 응답시간: {agg.get('p99_response_time', 0):.2f}ms")
            print(f"  • 캐시 히트율: {agg.get('cache_hit_rate', 0):.1f}%")
            print(f"  • 에러율: {agg.get('error_rate', 0):.2f}%\n")
        
        # 엔드포인트별 성능
        if "endpoint_benchmarks" in data:
            print("🔍 엔드포인트별 성능")
            benchmarks = data["endpoint_benchmarks"]
            
            # 응답시간 기준 정렬
            sorted_endpoints = sorted(
                benchmarks,
                key=lambda x: x.get("p95_response_time", 0),
                reverse=True
            )
            
            for ep in sorted_endpoints[:10]:  # 상위 10개
                name = ep.get("endpoint", "unknown")
                p95 = ep.get("p95_response_time", 0)
                error_rate = ep.get("error_rate", 0)
                cache_hit = ep.get("cache_hit_rate", 0)
                
                # 상태 표시
                status = "🟢"
                if p95 > 100:
                    status = "🟡"
                if p95 > 200:
                    status = "🔴"
                
                print(f"  {status} {name}")
                print(f"     └─ P95: {p95:.2f}ms | 에러: {error_rate:.2f}% | 캐시: {cache_hit:.1f}%")
        
        print("\n" + "="*80)
    
    async def continuous_monitor(self, interval: int = 30, duration: int = 300):
        """지속적 모니터링"""
        print(f"\n📡 {duration//60}분간 {interval}초 간격으로 모니터링 중...")
        print("(Ctrl+C로 중단)\n")
        
        start_time = time.time()
        try:
            while time.time() - start_time < duration:
                data = await self.fetch_dashboard()
                self.print_dashboard(data)
                
                if time.time() - start_time < duration:
                    await asyncio.sleep(interval)
        except KeyboardInterrupt:
            print("\n\n⏹️  모니터링 중단됨")


class CacheValidator:
    """[T2] 캐시 검증 - 80% 목표"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.cache_times: Dict[str, List[float]] = {}
    
    async def get_cache_stats(self) -> Dict:
        """캐시 통계 조회"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/cache/stats")
                return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    async def benchmark_endpoint(
        self,
        endpoint: str,
        iterations: int = 100
    ) -> Dict:
        """엔드포인트 캐시 성능 벤치마크"""
        times = []
        hits = 0
        misses = 0
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            for i in range(iterations):
                try:
                    start = time.time()
                    response = await client.get(
                        f"{self.base_url}{endpoint}",
                        headers={"X-Cache-Debug": "true"}
                    )
                    elapsed = (time.time() - start) * 1000
                    times.append(elapsed)
                    
                    # 캐시 히트 감지 (응답 헤더)
                    if response.headers.get("X-Cache-Hit") == "true":
                        hits += 1
                    else:
                        misses += 1
                    
                    # 적응적 지연 (서버 부하 방지)
                    await asyncio.sleep(0.01)
                except Exception as e:
                    print(f"❌ 요청 오류: {e}")
        
        if not times:
            return None
        
        return {
            "endpoint": endpoint,
            "iterations": iterations,
            "total_time_ms": sum(times),
            "average_time_ms": statistics.mean(times),
            "median_time_ms": statistics.median(times),
            "p95_time_ms": sorted(times)[int(len(times)*0.95)],
            "min_time_ms": min(times),
            "max_time_ms": max(times),
            "cache_hits": hits,
            "cache_misses": misses,
            "hit_rate": (hits / (hits + misses) * 100) if (hits + misses) > 0 else 0
        }
    
    async def validate_cache(self, target_hit_rate: float = 80.0):
        """캐시 검증 (80% 목표)"""
        print("\n" + "="*80)
        print("💾 AUTUS v4.8 캐시 검증 [T2]")
        print("="*80)
        print(f"🎯 목표 캐시 히트율: {target_hit_rate}%\n")
        
        # 현재 캐시 통계
        stats = await self.get_cache_stats()
        if "error" in stats:
            print(f"❌ 오류: {stats['error']}")
            print("💡 팁: main.py가 실행 중인지 확인하세요")
            return
        
        print("📊 현재 캐시 통계")
        print(f"  • 전체 요청: {stats.get('total_requests', 0):,}")
        print(f"  • 캐시 히트: {stats.get('cache_hits', 0):,}")
        print(f"  • 캐시 미스: {stats.get('cache_misses', 0):,}")
        
        current_hit_rate = stats.get('hit_rate', 0)
        print(f"  • 현재 히트율: {current_hit_rate:.1f}%")
        
        # 목표 대비 상태
        delta = current_hit_rate - target_hit_rate
        if delta >= 0:
            print(f"  ✅ 목표 달성! (+{delta:.1f}%)\n")
        else:
            print(f"  ⚠️  목표 미달성 ({delta:.1f}%)\n")
        
        # 엔드포인트별 벤치마크
        print("🔍 엔드포인트별 캐시 성능")
        endpoints = [
            "/devices",
            "/analytics",
            "/config",
            "/cache/stats"
        ]
        
        results = []
        for endpoint in endpoints:
            print(f"  테스트 중: {endpoint}...", end=" ", flush=True)
            result = await self.benchmark_endpoint(endpoint, iterations=50)
            if result:
                results.append(result)
                hit_rate = result["hit_rate"]
                status = "✅" if hit_rate >= target_hit_rate else "⚠️"
                print(f"{status} {hit_rate:.1f}%")
            else:
                print("❌")
        
        # 결과 요약
        print("\n📈 벤치마크 결과\n")
        for r in results:
            print(f"  {r['endpoint']}")
            print(f"    └─ 응답시간: {r['average_time_ms']:.2f}ms (중앙값: {r['median_time_ms']:.2f}ms)")
            print(f"    └─ 캐시 히트율: {r['hit_rate']:.1f}% ({r['cache_hits']}/{r['cache_hits']+r['cache_misses']})")
            print(f"    └─ P95: {r['p95_time_ms']:.2f}ms")
        
        # 개선 권장사항
        print("\n💡 권장사항")
        low_hit_endpoints = [r for r in results if r["hit_rate"] < target_hit_rate]
        
        if low_hit_endpoints:
            print("  ⚠️  다음 엔드포인트의 캐시 히트율이 낮습니다:")
            for r in low_hit_endpoints:
                endpoint = r["endpoint"]
                hit_rate = r["hit_rate"]
                print(f"     • {endpoint}: {hit_rate:.1f}%")
                print(f"       → api/cache.py에서 TTL 증가 고려")
        else:
            print("  ✅ 모든 엔드포인트가 목표 히트율 달성!")
        
        print("\n" + "="*80)


class PerformanceProfiler:
    """[D1] 성능 프로파일링 - 병목 특정"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
    
    async def profile_endpoint(
        self,
        endpoint: str,
        method: str = "GET",
        iterations: int = 50
    ) -> Dict:
        """엔드포인트 성능 프로파일"""
        times = []
        errors = 0
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            for i in range(iterations):
                try:
                    start = time.perf_counter()
                    
                    if method == "GET":
                        await client.get(f"{self.base_url}{endpoint}")
                    elif method == "POST":
                        await client.post(
                            f"{self.base_url}{endpoint}",
                            json={}
                        )
                    
                    elapsed = (time.perf_counter() - start) * 1000
                    times.append(elapsed)
                except Exception as e:
                    errors += 1
        
        if not times:
            return None
        
        return {
            "endpoint": endpoint,
            "method": method,
            "iterations": iterations,
            "successful": len(times),
            "errors": errors,
            "times_ms": times,
            "min": min(times),
            "max": max(times),
            "mean": statistics.mean(times),
            "median": statistics.median(times),
            "p50": statistics.median(times),
            "p95": sorted(times)[int(len(times)*0.95)] if len(times) > 1 else times[0],
            "p99": sorted(times)[int(len(times)*0.99)] if len(times) > 1 else times[0],
            "stdev": statistics.stdev(times) if len(times) > 1 else 0
        }
    
    def print_profiling_report(self, profile_results: List[Dict]):
        """프로파일링 보고서 출력"""
        print("\n" + "="*80)
        print("⚡ AUTUS v4.8 성능 프로파일링 [D1]")
        print("="*80 + "\n")
        
        # 병목 정렬 (P95 기준)
        sorted_results = sorted(
            profile_results,
            key=lambda x: x["p95"],
            reverse=True
        )
        
        print("🔍 성능 분석 (P95 기준 정렬)\n")
        
        for i, result in enumerate(sorted_results, 1):
            endpoint = result["endpoint"]
            p95 = result["p95"]
            mean = result["mean"]
            errors = result["errors"]
            
            # 성능 등급
            if p95 < 50:
                grade = "🟢 EXCELLENT"
            elif p95 < 100:
                grade = "🟡 GOOD"
            elif p95 < 200:
                grade = "🟠 ACCEPTABLE"
            else:
                grade = "🔴 POOR"
            
            print(f"{i}. {endpoint} {grade}")
            print(f"   ├─ P95: {p95:.2f}ms")
            print(f"   ├─ Mean: {mean:.2f}ms")
            print(f"   ├─ Min/Max: {result['min']:.2f}ms / {result['max']:.2f}ms")
            print(f"   ├─ 성공: {result['successful']}/{result['iterations']}", end="")
            
            if errors > 0:
                print(f" (실패: {errors})")
            else:
                print()
            
            print(f"   └─ StdDev: {result['stdev']:.2f}ms\n")
        
        # 병목 분석
        print("🔴 병목 지점 분석\n")
        
        bottlenecks = [r for r in sorted_results if r["p95"] > 100]
        if bottlenecks:
            for b in bottlenecks:
                endpoint = b["endpoint"]
                p95 = b["p95"]
                print(f"⚠️  {endpoint}")
                print(f"   → P95: {p95:.2f}ms (목표: 100ms)")
                
                # 개선 제안
                if "/devices" in endpoint and "/batch" in endpoint:
                    print(f"   → 배치 크기 감소 고려 (api/batch_processor.py)")
                elif "/analytics" in endpoint:
                    print(f"   → DB 쿼리 최적화 또는 캐시 TTL 증가")
                elif "/cache" in endpoint:
                    print(f"   → Redis 연결 풀 확인")
                else:
                    print(f"   → 프로파일링으로 상세 분석 필요")
                print()
        else:
            print("✅ 모든 엔드포인트가 목표 내 성능\n")
        
        print("="*80)
    
    async def run_profiling(self):
        """전체 프로파일링 실행"""
        print("\n" + "="*80)
        print("⚡ AUTUS v4.8 성능 프로파일링 시작 [D1]")
        print("="*80 + "\n")
        
        endpoints = [
            ("/devices", "GET"),
            ("/analytics", "GET"),
            ("/cache/stats", "GET"),
            ("/health", "GET"),
        ]
        
        results = []
        
        for endpoint, method in endpoints:
            print(f"프로파일링: {method} {endpoint}...", end=" ", flush=True)
            result = await self.profile_endpoint(endpoint, method=method, iterations=50)
            if result:
                results.append(result)
                print(f"✅")
            else:
                print(f"❌")
        
        self.print_profiling_report(results)


async def main():
    """메인 실행"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="AUTUS v4.8 성능 대시보드 & 프로파일링"
    )
    parser.add_argument(
        "--dashboard", action="store_true",
        help="[M1] 실시간 성능 추적"
    )
    parser.add_argument(
        "--cache", action="store_true",
        help="[T2] 캐시 검증 (80% 목표)"
    )
    parser.add_argument(
        "--profile", action="store_true",
        help="[D1] 성능 프로파일링"
    )
    parser.add_argument(
        "--all", action="store_true",
        help="전체 실행"
    )
    parser.add_argument(
        "--url", default="http://localhost:8000",
        help="기본 URL (기본값: http://localhost:8000)"
    )
    parser.add_argument(
        "--duration", type=int, default=300,
        help="대시보드 모니터링 지속시간 (초, 기본값: 300)"
    )
    
    args = parser.parse_args()
    
    # 기본값: --all 실행
    if not any([args.dashboard, args.cache, args.profile, args.all]):
        args.all = True
    
    try:
        # [M1] 실시간 성능 추적
        if args.dashboard or args.all:
            dashboard = PerformanceDashboard(args.url)
            data = await dashboard.fetch_dashboard()
            dashboard.print_dashboard(data)
            
            # 지속적 모니터링 (--all이면 1회만)
            if args.dashboard:
                await dashboard.continuous_monitor(
                    interval=30,
                    duration=args.duration
                )
        
        # [T2] 캐시 검증
        if args.cache or args.all:
            validator = CacheValidator(args.url)
            await validator.validate_cache(target_hit_rate=80.0)
        
        # [D1] 성능 프로파일링
        if args.profile or args.all:
            profiler = PerformanceProfiler(args.url)
            await profiler.run_profiling()
    
    except KeyboardInterrupt:
        print("\n\n⏹️  중단됨")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 오류: {e}")
        sys.exit(1)


if __name__ == "__main__":
    print("\n")
    print("🚀 AUTUS v4.8 성능 분석 도구")
    print("   [M1] 실시간 성능 추적")
    print("   [T2] 캐시 검증")
    print("   [D1] 성능 프로파일링")
    print()
    
    asyncio.run(main())
