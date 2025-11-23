"""
Comprehensive integration tests for Memory OS

Tests full workflow: initialize → store → search → export
Tests with large datasets, concurrent access, error recovery
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

from protocols.memory.store import MemoryStore
from protocols.memory.memory_os import MemoryOS


@pytest.fixture
def temp_db():
    """Create temporary database for testing"""
    temp_dir = tempfile.mkdtemp()
    db_path = Path(temp_dir) / "test_memory.db"
    yield str(db_path)
    shutil.rmtree(temp_dir)


@pytest.fixture
def memory_os(temp_db):
    """Create MemoryOS instance"""
    return MemoryOS(db_path=temp_db)


class TestMemoryOSFullWorkflow:
    """Test complete Memory OS workflow"""

    def test_full_workflow_initialize_store_search_export(self, memory_os):
        """Test complete workflow: initialize → store → search → export"""
        # 1. Initialize
        assert memory_os is not None
        
        # 2. Store preferences
        memory_os.set_preference("theme", "dark")
        memory_os.set_preference("language", "python")
        memory_os.set_preference("editor", "vscode")
        
        # 3. Store patterns
        memory_os.learn_pattern("coding", {"language": "python", "framework": "django"})
        memory_os.learn_pattern("meeting", {"type": "standup", "duration": 15})
        
        # 4. Store context
        memory_os.set_context("work", {"project": "autus", "status": "active"})
        
        # 5. Search
        results = memory_os.search("python")
        assert len(results) > 0
        
        # 6. Vector search
        vector_results = memory_os.vector_search("coding language")
        assert len(vector_results) > 0
        
        # 7. Export (to file, then read)
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            export_path = f.name
        memory_os.export_memory(export_path)
        
        # Verify file exists
        from pathlib import Path
        assert Path(export_path).exists()
        Path(export_path).unlink()  # Cleanup


class TestMemoryOSLargeDataset:
    """Test Memory OS with large datasets"""

    def test_store_100_preferences(self, memory_os):
        """Test storing 100+ preferences"""
        for i in range(100):
            memory_os.set_preference(f"key_{i}", f"value_{i}")
        
        # Verify all stored
        for i in range(100):
            value = memory_os.get_preference(f"key_{i}")
            assert value == f"value_{i}"

    def test_store_1000_patterns(self, memory_os):
        """Test storing 1000+ patterns"""
        for i in range(1000):
            memory_os.learn_pattern(f"pattern_{i}", {"index": i, "data": f"data_{i}"})
        
        # Verify count
        summary = memory_os.get_memory_summary()
        assert summary.get("patterns", 0) >= 1000

    def test_search_large_dataset(self, memory_os):
        """Test search performance with large dataset"""
        # Store large dataset
        for i in range(500):
            memory_os.set_preference(f"item_{i}", f"description of item {i}")
            memory_os.learn_pattern(f"pattern_{i}", {"content": f"pattern content {i}"})
        
        # Search
        start = time.time()
        results = memory_os.search("item")
        duration = time.time() - start
        
        assert len(results) > 0
        assert duration < 1.0  # Should be fast


class TestMemoryOSConcurrentAccess:
    """Test concurrent access to Memory OS"""

    def test_concurrent_preference_storage(self, memory_os):
        """Test concurrent preference storage"""
        def store_preference(index):
            memory_os.set_preference(f"concurrent_{index}", f"value_{index}")
            return memory_os.get_preference(f"concurrent_{index}")
        
        # Store from 10 threads
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(store_preference, i) for i in range(100)]
            results = [f.result() for f in as_completed(futures)]
        
        # Verify all stored
        assert len(results) == 100
        for i in range(100):
            value = memory_os.get_preference(f"concurrent_{i}")
            assert value == f"value_{i}"

    def test_concurrent_search(self, memory_os):
        """Test concurrent search operations"""
        # Setup data
        for i in range(100):
            memory_os.set_preference(f"search_{i}", f"content {i}")
        
        def search(query):
            return memory_os.search(query)
        
        # Search from multiple threads
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(search, "content") for _ in range(20)]
            results = [f.result() for f in as_completed(futures)]
        
        # All searches should succeed
        assert len(results) == 20
        assert all(len(r) > 0 for r in results)


class TestMemoryOSErrorRecovery:
    """Test error recovery scenarios"""

    def test_recovery_from_corrupted_db(self, temp_db):
        """Test recovery from corrupted database"""
        # Create corrupted database (empty file)
        Path(temp_db).write_text("")
        
        # Should handle gracefully
        try:
            memory_os = MemoryOS(db_path=temp_db)
            # Should recreate database
            memory_os.store_preference("test", "value")
            assert memory_os.get_preference("test") == "value"
        except Exception:
            pytest.fail("Should recover from corrupted database")

    def test_recovery_from_missing_db(self, temp_db):
        """Test recovery from missing database"""
        # Delete database
        if Path(temp_db).exists():
            Path(temp_db).unlink()
        
        # Should create new database
        memory_os = MemoryOS(db_path=temp_db)
        memory_os.store_preference("test", "value")
        assert memory_os.get_preference("test") == "value"

    def test_handles_invalid_preference_key(self, memory_os):
        """Test handling of invalid preference keys"""
        # Should handle None or empty keys
        with pytest.raises((ValueError, TypeError)):
            memory_os.set_preference(None, "value")
        
        with pytest.raises((ValueError, TypeError)):
            memory_os.set_preference("", "value")


class TestMemoryOSMemoryLimits:
    """Test memory limit handling"""

    def test_memory_statistics(self, memory_os):
        """Test memory statistics"""
        # Store some data
        for i in range(10):
            memory_os.set_preference(f"key_{i}", f"value_{i}")
        
        summary = memory_os.get_memory_summary()
        
        assert "preferences" in summary
        assert "patterns" in summary
        assert "context" in summary
        assert summary["preferences"] >= 10

    def test_export_with_large_data(self, memory_os):
        """Test export with large dataset"""
        # Store large dataset
        for i in range(200):
            memory_os.set_preference(f"key_{i}", f"value_{i}")
            memory_os.learn_pattern(f"pattern_{i}", {"data": f"data_{i}"})
        
        # Export should succeed (to file)
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.yaml', delete=False) as f:
            export_path = f.name
        memory_os.export_memory(export_path)
        
        # Verify file exists and has content
        from pathlib import Path
        assert Path(export_path).exists()
        file_size = Path(export_path).stat().st_size
        assert file_size > 0
        Path(export_path).unlink()  # Cleanup


class TestMemoryOSIntegration:
    """Integration tests with other protocols"""

    def test_memory_with_identity_patterns(self, memory_os):
        """Test storing identity-related patterns"""
        from protocols.identity.core import IdentityCore
        from protocols.identity.pattern_tracker import BehavioralPatternTracker
        
        # Create identity
        identity = IdentityCore("test_device")
        tracker = BehavioralPatternTracker(identity)
        
        # Track pattern
        tracker.track_workflow_completion("test_workflow", "node_1", {
            "execution_time": 1.5,
            "success": True
        })
        
        # Store in memory
        pattern_data = tracker.get_pattern_summary()
        memory_os.learn_pattern("identity_pattern", pattern_data)
        
        # Verify stored
        results = memory_os.search("identity")
        assert len(results) > 0

    def test_memory_with_workflow_data(self, memory_os):
        """Test storing workflow execution data"""
        from protocols.workflow.graph import WorkflowGraph
        
        # Create workflow
        graph = WorkflowGraph()
        graph.add_node("start", {"type": "start"})
        graph.add_node("process", {"type": "process"})
        graph.add_edge("start", "process")
        
        # Store workflow metadata
        workflow_data = graph.to_dict()
        memory_os.set_context("workflow_execution", workflow_data)
        
        # Verify stored
        results = memory_os.search("workflow")
        assert len(results) > 0

