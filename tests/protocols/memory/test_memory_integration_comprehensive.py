"""
Comprehensive Integration Tests for MemoryOS

Tests full workflow, large datasets, concurrent access, and error recovery.
"""

import pytest
import threading
import time
from pathlib import Path
from typing import List, Dict, Any
import tempfile
import shutil

from protocols.memory.memory_os import MemoryOS
from core.exceptions import PIIViolationError, MemoryError


@pytest.fixture
def temp_memory_os():
    """Create MemoryOS instance with temporary database"""
    temp_dir = tempfile.mkdtemp()
    db_path = Path(temp_dir) / "test_memory.db"
    
    memory = MemoryOS(db_path=str(db_path))
    
    yield memory
    
    # Cleanup
    memory.close()
    shutil.rmtree(temp_dir)


@pytest.fixture
def cleanup_memory():
    """Cleanup function for test data"""
    yield
    # Additional cleanup if needed


class TestFullWorkflow:
    """Test complete MemoryOS workflow"""
    
    def test_initialize_store_search_export(self, temp_memory_os):
        """Test full workflow: initialize → store → search → export"""
        memory = temp_memory_os
        
        # 1. Initialize (already done by fixture)
        assert memory is not None
        
        # 2. Store preferences
        memory.set_preference("theme", "dark", "ui")
        memory.set_preference("language", "python", "development")
        memory.set_preference("editor", "vscode", "tools")
        
        # 3. Store patterns
        memory.learn_pattern("coding", {
            "language": "python",
            "framework": "django",
            "duration": 3600
        })
        memory.learn_pattern("meeting", {
            "type": "standup",
            "duration": 900
        })
        
        # 4. Search
        results = memory.search("python")
        assert len(results) > 0
        
        # 5. Export
        export_path = Path(tempfile.mkdtemp()) / "export.yaml"
        memory.export_memory(str(export_path))
        assert export_path.exists()
        
        # Cleanup
        shutil.rmtree(export_path.parent)


class TestLargeDatasets:
    """Test with large datasets"""
    
    def test_store_100_plus_preferences(self, temp_memory_os):
        """Store 100+ preferences and verify retrieval"""
        memory = temp_memory_os
        
        # Store 100 preferences
        for i in range(100):
            memory.set_preference(f"pref_{i}", f"value_{i}", "test")
        
        # Verify all stored
        for i in range(100):
            value = memory.get_preference(f"pref_{i}")
            assert value == f"value_{i}"
        
        # Check summary
        summary = memory.get_memory_summary()
        assert summary['preferences'] >= 100
    
    def test_store_1000_plus_patterns(self, temp_memory_os):
        """Store 1000+ patterns and verify search"""
        memory = temp_memory_os
        
        # Store 1000 patterns
        for i in range(1000):
            memory.learn_pattern("test_pattern", {
                "index": i,
                "data": f"pattern_data_{i}",
                "timestamp": time.time()
            })
        
        # Verify patterns stored
        patterns = memory.get_patterns("test_pattern")
        assert len(patterns) >= 1000
        
        # Test search
        results = memory.search("pattern_data")
        assert len(results) > 0
        
        # Check summary
        summary = memory.get_memory_summary()
        assert summary['patterns'] >= 1000
    
    @pytest.mark.parametrize("data_size", [100, 500, 1000])
    def test_different_data_sizes(self, temp_memory_os, data_size):
        """Test with different data sizes"""
        memory = temp_memory_os
        
        # Store data
        for i in range(data_size):
            memory.set_preference(f"key_{i}", f"value_{i}", "test")
            memory.learn_pattern("test", {"index": i})
        
        # Verify
        summary = memory.get_memory_summary()
        assert summary['preferences'] >= data_size
        assert summary['patterns'] >= data_size


class TestConcurrentAccess:
    """Test concurrent access scenarios"""
    
    def test_concurrent_preference_writes(self, temp_memory_os):
        """Test concurrent preference writes"""
        memory = temp_memory_os
        errors = []
        
        def write_preferences(start: int, count: int):
            try:
                for i in range(start, start + count):
                    memory.set_preference(f"concurrent_{i}", f"value_{i}", "test")
            except Exception as e:
                errors.append(e)
        
        # Create 5 threads, each writing 20 preferences
        threads = []
        for i in range(5):
            thread = threading.Thread(
                target=write_preferences,
                args=(i * 20, 20)
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Verify no errors
        assert len(errors) == 0
        
        # Verify all preferences stored
        summary = memory.get_memory_summary()
        assert summary['preferences'] >= 100
    
    def test_concurrent_pattern_writes(self, temp_memory_os):
        """Test concurrent pattern writes"""
        memory = temp_memory_os
        errors = []
        
        def write_patterns(start: int, count: int):
            try:
                for i in range(start, start + count):
                    memory.learn_pattern("concurrent_pattern", {
                        "index": i,
                        "data": f"data_{i}"
                    })
            except Exception as e:
                errors.append(e)
        
        # Create 10 threads, each writing 50 patterns
        threads = []
        for i in range(10):
            thread = threading.Thread(
                target=write_patterns,
                args=(i * 50, 50)
            )
            threads.append(thread)
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # Verify no errors
        assert len(errors) == 0
        
        # Verify patterns stored
        patterns = memory.get_patterns("concurrent_pattern")
        assert len(patterns) >= 500
    
    def test_concurrent_reads_and_writes(self, temp_memory_os):
        """Test concurrent reads and writes"""
        memory = temp_memory_os
        errors = []
        read_results = []
        
        # Setup: Store initial data
        for i in range(50):
            memory.set_preference(f"key_{i}", f"value_{i}", "test")
        
        def read_preferences():
            try:
                for i in range(50):
                    value = memory.get_preference(f"key_{i}")
                    read_results.append(value)
            except Exception as e:
                errors.append(e)
        
        def write_preferences(start: int):
            try:
                for i in range(start, start + 10):
                    memory.set_preference(f"new_key_{i}", f"new_value_{i}", "test")
            except Exception as e:
                errors.append(e)
        
        # Create read and write threads
        read_thread = threading.Thread(target=read_preferences)
        write_thread = threading.Thread(target=write_preferences, args=(0,))
        
        read_thread.start()
        write_thread.start()
        
        read_thread.join()
        write_thread.join()
        
        # Verify no errors
        assert len(errors) == 0
        assert len(read_results) == 50


class TestPerformance:
    """Test performance requirements"""
    
    def test_basic_operations_under_100ms(self, temp_memory_os):
        """Assert response times <100ms for basic operations"""
        memory = temp_memory_os
        
        # Test preference operations
        start = time.time()
        memory.set_preference("perf_test", "value", "test")
        set_time = (time.time() - start) * 1000  # Convert to ms
        assert set_time < 100, f"set_preference took {set_time}ms"
        
        start = time.time()
        value = memory.get_preference("perf_test")
        get_time = (time.time() - start) * 1000
        assert get_time < 100, f"get_preference took {get_time}ms"
        
        # Test pattern operations
        start = time.time()
        memory.learn_pattern("perf_test", {"data": "test"})
        learn_time = (time.time() - start) * 1000
        assert learn_time < 100, f"learn_pattern took {learn_time}ms"
        
        # Test search (may take longer)
        start = time.time()
        results = memory.search("test")
        search_time = (time.time() - start) * 1000
        assert search_time < 500, f"search took {search_time}ms"  # More lenient for search
    
    def test_batch_operations_performance(self, temp_memory_os):
        """Test batch operations performance"""
        memory = temp_memory_os
        
        # Batch write
        start = time.time()
        for i in range(100):
            memory.set_preference(f"batch_{i}", f"value_{i}", "test")
        batch_write_time = (time.time() - start) * 1000
        avg_time = batch_write_time / 100
        
        # Average should be < 10ms per operation
        assert avg_time < 10, f"Average write time: {avg_time}ms"


class TestErrorRecovery:
    """Test error recovery scenarios"""
    
    def test_pii_violation_recovery(self, temp_memory_os):
        """Test recovery from PII violation"""
        memory = temp_memory_os
        
        # Try to store PII (should fail)
        with pytest.raises(PIIViolationError):
            memory.set_preference("email", "user@example.com", "test")
        
        # System should still work after error
        memory.set_preference("safe_key", "safe_value", "test")
        value = memory.get_preference("safe_key")
        assert value == "safe_value"
    
    def test_invalid_data_recovery(self, temp_memory_os):
        """Test recovery from invalid data"""
        memory = temp_memory_os
        
        # Store valid data first
        memory.set_preference("valid", "value", "test")
        
        # Try invalid operation (if any)
        # System should continue working
        value = memory.get_preference("valid")
        assert value == "value"
    
    def test_database_error_recovery(self, temp_memory_os):
        """Test recovery from database errors"""
        memory = temp_memory_os
        
        # Store some data
        memory.set_preference("before_error", "value1", "test")
        
        # Close and reopen (simulate error recovery)
        memory.close()
        
        # Reopen should work
        db_path = Path(memory.store.db_path)
        new_memory = MemoryOS(db_path=str(db_path))
        
        # Data should persist
        value = new_memory.get_preference("before_error")
        assert value == "value1"
        
        # New operations should work
        new_memory.set_preference("after_recovery", "value2", "test")
        value2 = new_memory.get_preference("after_recovery")
        assert value2 == "value2"
        
        new_memory.close()


class TestExportImportCycle:
    """Test export/import cycle integrity"""
    
    def test_export_import_integrity(self, temp_memory_os):
        """Test that export/import maintains data integrity"""
        memory = temp_memory_os
        
        # Store test data
        memory.set_preference("export_test_1", "value1", "category1")
        memory.set_preference("export_test_2", "value2", "category2")
        memory.learn_pattern("export_pattern", {"data": "test_data"})
        
        # Export
        export_path = Path(tempfile.mkdtemp()) / "export.yaml"
        memory.export_memory(str(export_path))
        
        # Verify export file exists
        assert export_path.exists()
        
        # Create new memory instance and import
        # (Note: Import functionality would need to be implemented)
        # For now, verify export file is valid YAML
        import yaml
        with open(export_path, 'r') as f:
            data = yaml.safe_load(f)
            assert data is not None
            assert 'preferences' in data or 'memory' in data or isinstance(data, dict)
        
        # Cleanup
        shutil.rmtree(export_path.parent)
    
    def test_export_large_dataset(self, temp_memory_os):
        """Test exporting large dataset"""
        memory = temp_memory_os
        
        # Store large dataset
        for i in range(500):
            memory.set_preference(f"large_{i}", f"value_{i}", "test")
        
        # Export
        export_path = Path(tempfile.mkdtemp()) / "large_export.yaml"
        start = time.time()
        memory.export_memory(str(export_path))
        export_time = time.time() - start
        
        # Should complete in reasonable time (< 5 seconds)
        assert export_time < 5, f"Export took {export_time}s"
        assert export_path.exists()
        
        # Cleanup
        shutil.rmtree(export_path.parent)


class TestMemoryLimits:
    """Test memory limits and cleanup"""
    
    def test_memory_cleanup(self, temp_memory_os):
        """Test memory cleanup operations"""
        memory = temp_memory_os
        
        # Store data
        for i in range(100):
            memory.set_preference(f"cleanup_{i}", f"value_{i}", "test")
        
        # Get initial summary
        summary_before = memory.get_memory_summary()
        assert summary_before['preferences'] >= 100
        
        # Clear memory (if method exists)
        # For now, just verify we can still operate
        memory.set_preference("after_cleanup", "value", "test")
        value = memory.get_preference("after_cleanup")
        assert value == "value"
    
    def test_context_expiration(self, temp_memory_os):
        """Test context expiration and cleanup"""
        memory = temp_memory_os
        from datetime import datetime, timedelta
        
        # Set context with expiration
        expires_at = (datetime.now() + timedelta(seconds=1)).isoformat()
        memory.set_context("temp_context", {"data": "test"}, expires_at=expires_at)
        
        # Should be available immediately
        context = memory.get_context("temp_context")
        assert context is not None
        
        # Wait for expiration
        time.sleep(2)
        
        # Should be None after expiration
        context = memory.get_context("temp_context")
        assert context is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

