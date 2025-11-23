"""
Performance benchmark tests

Benchmarks for all protocols using pytest-benchmark
Target: <100ms for basic ops, <1s for complex
"""

import pytest
import tempfile
import shutil
from pathlib import Path

from protocols.memory.os import MemoryOS
from protocols.identity.core import IdentityCore
from protocols.identity.pattern_tracker import BehavioralPatternTracker
from protocols.auth.qr_sync import QRCodeGenerator
from protocols.workflow.graph import WorkflowGraph


@pytest.fixture
def temp_db():
    """Create temporary database"""
    temp_dir = tempfile.mkdtemp()
    db_path = Path(temp_dir) / "benchmark.db"
    yield str(db_path)
    shutil.rmtree(temp_dir)


class TestMemoryStoreBenchmarks:
    """Benchmark memory store operations"""

    def test_memory_store_insert_benchmark(self, benchmark, temp_db):
        """Benchmark memory store insert operations"""
        memory_os = MemoryOS(db_path=temp_db)
        
        def insert_operation():
            memory_os.store_preference("bench_key", "bench_value")
        
        result = benchmark(insert_operation)
        # Should be fast (<100ms)
        assert result.stats.mean < 0.1

    def test_memory_store_query_benchmark(self, benchmark, temp_db):
        """Benchmark memory store query operations"""
        memory_os = MemoryOS(db_path=temp_db)
        
        # Setup data
        for i in range(100):
            memory_os.store_preference(f"key_{i}", f"value_{i}")
        
        def query_operation():
            return memory_os.get_preference("key_50")
        
        result = benchmark(query_operation)
        # Should be very fast (<10ms)
        assert result.stats.mean < 0.01

    def test_memory_search_benchmark(self, benchmark, temp_db):
        """Benchmark memory search operations"""
        memory_os = MemoryOS(db_path=temp_db)
        
        # Setup data
        for i in range(1000):
            memory_os.store_preference(f"item_{i}", f"description of item {i}")
        
        def search_operation():
            return memory_os.search("item")
        
        result = benchmark(search_operation)
        # Should be fast (<100ms)
        assert result.stats.mean < 0.1


class TestVectorSearchBenchmarks:
    """Benchmark vector search performance"""

    def test_vector_search_100_items(self, benchmark, temp_db):
        """Benchmark vector search with 100 items"""
        memory_os = MemoryOS(db_path=temp_db)
        
        # Setup 100 items
        for i in range(100):
            memory_os.store_pattern(f"pattern_{i}", {
                "content": f"pattern content {i}",
                "category": "test"
            })
        
        def search_operation():
            return memory_os.vector_search("pattern content")
        
        result = benchmark(search_operation)
        assert result.stats.mean < 0.1

    def test_vector_search_1000_items(self, benchmark, temp_db):
        """Benchmark vector search with 1000 items"""
        memory_os = MemoryOS(db_path=temp_db)
        
        # Setup 1000 items
        for i in range(1000):
            memory_os.store_pattern(f"pattern_{i}", {
                "content": f"pattern content {i}",
                "category": "test"
            })
        
        def search_operation():
            return memory_os.vector_search("pattern content")
        
        result = benchmark(search_operation)
        assert result.stats.mean < 0.5

    def test_vector_search_10000_items(self, benchmark, temp_db):
        """Benchmark vector search with 10000 items"""
        memory_os = MemoryOS(db_path=temp_db)
        
        # Setup 10000 items (skip if too slow)
        for i in range(10000):
            memory_os.store_pattern(f"pattern_{i}", {
                "content": f"pattern content {i}",
                "category": "test"
            })
        
        def search_operation():
            return memory_os.vector_search("pattern content")
        
        result = benchmark(search_operation)
        # Should still be reasonable (<1s)
        assert result.stats.mean < 1.0


class TestIdentityEvolutionBenchmarks:
    """Benchmark identity evolution"""

    def test_identity_evolution_benchmark(self, benchmark):
        """Benchmark identity evolution"""
        identity = IdentityCore("benchmark_device")
        tracker = BehavioralPatternTracker(identity)
        
        def evolution_operation():
            tracker.track_workflow_completion("test_workflow", {
                "nodes_executed": 5,
                "total_time": 10.0,
                "success": True
            })
        
        result = benchmark(evolution_operation)
        # Should be very fast (<10ms)
        assert result.stats.mean < 0.01

    def test_identity_100_evolutions(self, benchmark):
        """Benchmark 100 identity evolutions"""
        identity = IdentityCore("benchmark_device")
        tracker = BehavioralPatternTracker(identity)
        
        def evolution_100():
            for i in range(100):
                tracker.track_workflow_completion(f"wf_{i}", {
                    "nodes_executed": i,
                    "total_time": float(i),
                    "success": True
                })
        
        result = benchmark(evolution_100)
        # Should be fast (<100ms)
        assert result.stats.mean < 0.1


class TestWorkflowExecutionBenchmarks:
    """Benchmark workflow execution"""

    def test_workflow_creation_benchmark(self, benchmark):
        """Benchmark workflow creation"""
        def create_workflow():
            graph = WorkflowGraph()
            graph.add_node("start", {})
            graph.add_node("end", {})
            graph.add_edge("start", "end")
            return graph
        
        result = benchmark(create_workflow)
        # Should be very fast (<1ms)
        assert result.stats.mean < 0.001

    def test_workflow_validation_benchmark(self, benchmark):
        """Benchmark workflow validation"""
        graph = WorkflowGraph()
        for i in range(10):
            graph.add_node(f"node_{i}", {})
        for i in range(9):
            graph.add_edge(f"node_{i}", f"node_{i+1}")
        
        def validate_operation():
            return graph.validate()
        
        result = benchmark(validate_operation)
        # Should be fast (<10ms)
        assert result.stats.mean < 0.01


class TestQRCodeBenchmarks:
    """Benchmark QR code operations"""

    def test_qr_generation_benchmark(self, benchmark):
        """Benchmark QR code generation"""
        generator = QRCodeGenerator()
        identity_data = {
            "seed_hash": "test_hash" * 8,
            "created_at": "2024-01-01T00:00:00"
        }
        
        def generate_operation():
            return generator.generate_identity_qr(identity_data)
        
        result = benchmark(generate_operation)
        # Should be fast (<100ms)
        assert result.stats.mean < 0.1

    def test_qr_bytes_generation_benchmark(self, benchmark):
        """Benchmark QR code bytes generation"""
        generator = QRCodeGenerator()
        identity_data = {
            "seed_hash": "test_hash" * 8,
            "created_at": "2024-01-01T00:00:00"
        }
        
        def generate_bytes():
            return generator.generate_qr_bytes(identity_data)
        
        result = benchmark(generate_bytes)
        # Should be fast (<100ms)
        assert result.stats.mean < 0.1

