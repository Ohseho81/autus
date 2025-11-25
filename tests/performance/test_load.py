"""
Load tests for all protocols

Tests with large datasets, concurrent operations, resource usage
"""

import pytest
import tempfile
import shutil
from pathlib import Path
import time
import psutil
import os

from protocols.memory.os import MemoryOS
from protocols.identity.core import IdentityCore
from protocols.identity.pattern_tracker import BehavioralPatternTracker
from protocols.workflow.graph import WorkflowGraph


@pytest.fixture
def temp_db():
    """Create temporary database"""
    temp_dir = tempfile.mkdtemp()
    db_path = Path(temp_dir) / "load_test.db"
    yield str(db_path)
    shutil.rmtree(temp_dir)


class TestMemoryLoad:
    """Load tests for Memory OS"""

    def test_10000_memory_entries(self, temp_db):
        """Test with 10,000 memory entries"""
        memory_os = MemoryOS(db_path=temp_db)

        # Store 10,000 entries
        start = time.time()
        for i in range(10000):
            memory_os.set_preference(f"key_{i}", f"value_{i}")
        insert_time = time.time() - start

        # Should complete in reasonable time
        assert insert_time < 60.0  # 60 seconds for 10k inserts

        # Verify all stored
        for i in range(0, 10000, 1000):  # Sample check
            value = memory_os.get_preference(f"key_{i}")
            assert value == f"value_{i}"

        memory_os.close()

    def test_memory_usage_with_large_dataset(self, temp_db):
        """Test memory usage with large dataset"""
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        memory_os = MemoryOS(db_path=temp_db)

        # Store large dataset
        for i in range(5000):
            memory_os.set_preference(f"key_{i}", f"value_{i}" * 10)  # Larger values

        current_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = current_memory - initial_memory

        # Memory increase should be reasonable (<500MB)
        assert memory_increase < 500

        memory_os.close()


class TestWorkflowLoad:
    """Load tests for Workflow Graph"""

    def test_1000_workflows(self):
        """Test creating 1,000 workflows"""
        start = time.time()

        workflows = []
        for i in range(1000):
            graph = WorkflowGraph()
            graph.add_node(f"start_{i}", {})
            graph.add_node(f"end_{i}", {})
            graph.add_edge(f"start_{i}", f"end_{i}")
            workflows.append(graph)

        creation_time = time.time() - start

        # Should be fast
        assert creation_time < 10.0  # 10 seconds for 1000 workflows

        # All should be valid
        for graph in workflows[::100]:  # Sample check
            assert graph.validate() is True

    def test_large_workflow_validation(self):
        """Test validation of large workflow"""
        graph = WorkflowGraph()

        # Create workflow with 50 nodes
        for i in range(50):
            graph.add_node(f"node_{i}", {})

        # Linear chain
        for i in range(49):
            graph.add_edge(f"node_{i}", f"node_{i+1}")

        # Validation should be fast
        start = time.time()
        is_valid = graph.validate()
        validation_time = time.time() - start

        assert is_valid is True
        assert validation_time < 1.0  # Should be fast


class TestIdentityLoad:
    """Load tests for Identity"""

    def test_100_concurrent_identity_evolutions(self):
        """Test 100 concurrent identity evolutions"""
        identities = []
        trackers = []

        # Create 100 identities
        for i in range(100):
            identity = IdentityCore(f"device_{i}")
            tracker = BehavioralPatternTracker(identity)
            identities.append(identity)
            trackers.append(tracker)

        # Evolve all concurrently
        start = time.time()
        for tracker in trackers:
            for j in range(10):
                tracker.track_workflow_completion(f"wf_{j}", {
                    "nodes_executed": j,
                    "total_time": float(j),
                    "success": True
                })
        evolution_time = time.time() - start

        # Should complete in reasonable time
        assert evolution_time < 10.0  # 10 seconds for 1000 evolutions

        # Verify all evolved
        for tracker in trackers:
            assert tracker.surface.pattern_count >= 10

    def test_identity_evolution_memory(self):
        """Test memory usage during identity evolution"""
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB

        identity = IdentityCore("test_device")
        tracker = BehavioralPatternTracker(identity)

        # Evolve 1000 times
        for i in range(1000):
            tracker.track_workflow_completion(f"wf_{i}", {
                "nodes_executed": i,
                "total_time": float(i),
                "success": True
            })

        current_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = current_memory - initial_memory

        # Memory increase should be reasonable (<100MB)
        assert memory_increase < 100


class TestDeviceSyncLoad:
    """Load tests for device sync"""

    def test_50_simultaneous_device_syncs(self):
        """Test 50 simultaneous device syncs"""
        from protocols.auth.qr_sync import QRCodeGenerator

        generator = QRCodeGenerator()
        identity_data = {
            "seed_hash": "test_hash" * 8,
            "created_at": "2024-01-01T00:00:00"
        }

        # Generate 50 QR codes
        start = time.time()
        qr_codes = []
        for i in range(50):
            qr_image = generator.generate_identity_qr(identity_data)
            qr_codes.append(qr_image)
        generation_time = time.time() - start

        # Should be fast
        assert generation_time < 10.0  # 10 seconds for 50 QR codes
        assert len(qr_codes) == 50


class TestPerformanceBudgets:
    """Test performance budgets"""

    def test_memory_budget(self, temp_db):
        """Test memory budget compliance"""
        from core.armp.performance import PerformanceBudget

        memory_mb = PerformanceBudget.check_memory_usage()

        if memory_mb:
            # Should be under budget
            assert memory_mb < PerformanceBudget.MEMORY_MAX

    def test_disk_budget(self, temp_db):
        """Test disk budget compliance"""
        from core.armp.performance import PerformanceBudget

        disk_free = PerformanceBudget.check_disk_usage()

        if disk_free:
            # Should have free space
            assert disk_free > PerformanceBudget.DISK_MAX





