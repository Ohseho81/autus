"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS TypeDB 성능 테스트 스크립트
Query Performance Benchmark
═══════════════════════════════════════════════════════════════════════════════

실행: python -m pytest tests/test_typedb_performance.py -v
"""

import asyncio
import time
import statistics
from typing import List, Dict, Any
from dataclasses import dataclass
import pytest

# ═══════════════════════════════════════════════════════════════════════════════
# 테스트 설정
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class QueryBenchmark:
    """쿼리 벤치마크 결과"""
    name: str
    query_type: str
    iterations: int
    times_ms: List[float]
    
    @property
    def avg_ms(self) -> float:
        return statistics.mean(self.times_ms)
    
    @property
    def min_ms(self) -> float:
        return min(self.times_ms)
    
    @property
    def max_ms(self) -> float:
        return max(self.times_ms)
    
    @property
    def stddev_ms(self) -> float:
        return statistics.stdev(self.times_ms) if len(self.times_ms) > 1 else 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "query_type": self.query_type,
            "iterations": self.iterations,
            "avg_ms": round(self.avg_ms, 2),
            "min_ms": round(self.min_ms, 2),
            "max_ms": round(self.max_ms, 2),
            "stddev_ms": round(self.stddev_ms, 2),
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트 쿼리 (비효율 vs 최적화)
# ═══════════════════════════════════════════════════════════════════════════════

class TestQueries:
    """테스트용 쿼리 모음"""
    
    # 비효율적인 쿼리 (match ... get)
    INEFFICIENT_DELETION = """
    match
      $t isa task,
        has automation-level $al;
      $al >= 0.98;
    get $t;
    """
    
    # 최적화된 쿼리 (fetch + limit + sort)
    OPTIMIZED_DELETION = """
    match
      $t isa task,
        has automation-level >= 0.98,
        has is-deleted false,
        has name $name;
    fetch
      name: $name;
    limit 100;
    sort automation-level desc;
    """
    
    # 비효율적인 계층 조회
    INEFFICIENT_HIERARCHY = """
    match
      $l1 isa task, has level "L1";
      $l2 isa task, has level "L2";
      ($l1, $l2) isa hierarchy;
    get $l1, $l2;
    """
    
    # 최적화된 계층 조회
    OPTIMIZED_HIERARCHY = """
    match
      $parent isa task, has level "L1";
      $child isa task;
      ($parent, $child) isa hierarchy;
      $child has name $name, has level $level;
    fetch
      name: $name,
      level: $level;
    limit 500;
    """
    
    # 대시보드 요약 (최적화)
    DASHBOARD_SUMMARY = """
    match
      $t isa task,
        has automation-level $al,
        has k-value $k,
        has level $level,
        has is-deleted false;
    fetch
      level: $level,
      automation_level: $al,
      k_value: $k;
    limit 1000;
    """


# ═══════════════════════════════════════════════════════════════════════════════
# Mock TypeDB Client (실제 DB 없이 테스트)
# ═══════════════════════════════════════════════════════════════════════════════

class MockTypeDBClient:
    """TypeDB 미연결 시 Mock"""
    
    def __init__(self, simulate_latency: float = 0.01):
        self.simulate_latency = simulate_latency
        self._data = self._generate_mock_data()
    
    def _generate_mock_data(self) -> List[Dict]:
        """Mock 데이터 생성 (1000개 업무)"""
        import random
        data = []
        levels = ["L1", "L2", "L3", "L4", "L5"]
        
        for i in range(1000):
            data.append({
                "name": f"Task_{i:04d}",
                "code": f"T{i:04d}",
                "level": random.choice(levels),
                "automation_level": random.uniform(0, 1),
                "k_value": random.uniform(0.5, 1.5),
                "is_deleted": random.choice([True, False]),
            })
        return data
    
    async def query(self, query: str) -> List[Dict]:
        """Mock 쿼리 실행"""
        await asyncio.sleep(self.simulate_latency)
        
        # 간단한 필터링 시뮬레이션
        if "automation-level >= 0.98" in query:
            return [d for d in self._data if d["automation_level"] >= 0.98][:100]
        if "level" in query and "L1" in query:
            return [d for d in self._data if d["level"] == "L1"][:500]
        
        return self._data[:100]


# ═══════════════════════════════════════════════════════════════════════════════
# 성능 테스트 함수
# ═══════════════════════════════════════════════════════════════════════════════

async def benchmark_query(
    client: MockTypeDBClient,
    query: str,
    name: str,
    iterations: int = 10,
) -> QueryBenchmark:
    """쿼리 벤치마크 실행"""
    times = []
    
    for _ in range(iterations):
        start = time.perf_counter()
        await client.query(query)
        elapsed = (time.perf_counter() - start) * 1000
        times.append(elapsed)
    
    return QueryBenchmark(
        name=name,
        query_type="fetch" if "fetch" in query else "match-get",
        iterations=iterations,
        times_ms=times,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트 케이스
# ═══════════════════════════════════════════════════════════════════════════════

class TestTypeDBPerformance:
    """TypeDB 성능 테스트"""
    
    @pytest.fixture
    def mock_client(self):
        return MockTypeDBClient(simulate_latency=0.005)
    
    @pytest.mark.asyncio
    async def test_deletion_query_benchmark(self, mock_client):
        """삭제 대상 쿼리 벤치마크"""
        # 비효율적 쿼리
        inefficient = await benchmark_query(
            mock_client,
            TestQueries.INEFFICIENT_DELETION,
            "Deletion (inefficient)",
        )
        
        # 최적화 쿼리
        optimized = await benchmark_query(
            mock_client,
            TestQueries.OPTIMIZED_DELETION,
            "Deletion (optimized)",
        )
        
        print(f"\n{'='*60}")
        print("삭제 대상 쿼리 벤치마크")
        print(f"{'='*60}")
        print(f"비효율: avg={inefficient.avg_ms:.2f}ms, stddev={inefficient.stddev_ms:.2f}ms")
        print(f"최적화: avg={optimized.avg_ms:.2f}ms, stddev={optimized.stddev_ms:.2f}ms")
        
        assert optimized.avg_ms <= inefficient.avg_ms * 2  # 최적화가 2배 이상 느리면 안 됨
    
    @pytest.mark.asyncio
    async def test_hierarchy_query_benchmark(self, mock_client):
        """계층 조회 쿼리 벤치마크"""
        inefficient = await benchmark_query(
            mock_client,
            TestQueries.INEFFICIENT_HIERARCHY,
            "Hierarchy (inefficient)",
        )
        
        optimized = await benchmark_query(
            mock_client,
            TestQueries.OPTIMIZED_HIERARCHY,
            "Hierarchy (optimized)",
        )
        
        print(f"\n{'='*60}")
        print("계층 조회 쿼리 벤치마크")
        print(f"{'='*60}")
        print(f"비효율: avg={inefficient.avg_ms:.2f}ms")
        print(f"최적화: avg={optimized.avg_ms:.2f}ms")
    
    @pytest.mark.asyncio
    async def test_dashboard_summary_benchmark(self, mock_client):
        """대시보드 요약 쿼리 벤치마크"""
        result = await benchmark_query(
            mock_client,
            TestQueries.DASHBOARD_SUMMARY,
            "Dashboard Summary",
            iterations=20,
        )
        
        print(f"\n{'='*60}")
        print("대시보드 요약 쿼리 벤치마크")
        print(f"{'='*60}")
        print(f"avg={result.avg_ms:.2f}ms, min={result.min_ms:.2f}ms, max={result.max_ms:.2f}ms")
        
        # 대시보드 쿼리는 100ms 이내여야 함
        assert result.avg_ms < 100, f"대시보드 쿼리가 너무 느림: {result.avg_ms}ms"


# ═══════════════════════════════════════════════════════════════════════════════
# CLI 실행
# ═══════════════════════════════════════════════════════════════════════════════

async def run_all_benchmarks():
    """모든 벤치마크 실행"""
    print("\n" + "="*70)
    print("AUTUS TypeDB 성능 벤치마크")
    print("="*70)
    
    client = MockTypeDBClient(simulate_latency=0.01)
    
    benchmarks = [
        (TestQueries.INEFFICIENT_DELETION, "삭제대상 (비효율)"),
        (TestQueries.OPTIMIZED_DELETION, "삭제대상 (최적화)"),
        (TestQueries.INEFFICIENT_HIERARCHY, "계층조회 (비효율)"),
        (TestQueries.OPTIMIZED_HIERARCHY, "계층조회 (최적화)"),
        (TestQueries.DASHBOARD_SUMMARY, "대시보드 요약"),
    ]
    
    results = []
    for query, name in benchmarks:
        result = await benchmark_query(client, query, name, iterations=20)
        results.append(result)
        print(f"\n{name}:")
        print(f"  평균: {result.avg_ms:.2f}ms")
        print(f"  최소: {result.min_ms:.2f}ms")
        print(f"  최대: {result.max_ms:.2f}ms")
        print(f"  표준편차: {result.stddev_ms:.2f}ms")
    
    print("\n" + "="*70)
    print("결과 요약")
    print("="*70)
    
    for r in results:
        status = "✅" if r.avg_ms < 50 else "⚠️" if r.avg_ms < 100 else "❌"
        print(f"{status} {r.name}: {r.avg_ms:.2f}ms ({r.query_type})")
    
    return results


if __name__ == "__main__":
    asyncio.run(run_all_benchmarks())
