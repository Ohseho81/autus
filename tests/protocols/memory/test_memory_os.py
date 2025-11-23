"""
Tests for MemoryOS class

High-level interface for Local Memory OS
"""
import pytest
import tempfile
import os
from pathlib import Path
from protocols.memory.memory_os import MemoryOS


class TestMemoryOS:
    """Test suite for MemoryOS class"""

    @pytest.fixture
    def temp_db(self):
        """Create temporary database for testing"""
        import uuid
        db_path = f"/tmp/test_memory_os_{uuid.uuid4().hex}.db"
        if os.path.exists(db_path):
            os.remove(db_path)
        yield db_path
        if os.path.exists(db_path):
            os.remove(db_path)

    @pytest.fixture
    def memory(self, temp_db):
        """Create MemoryOS instance"""
        return MemoryOS(db_path=temp_db)

    def test_init(self, temp_db):
        """Test MemoryOS initialization"""
        memory = MemoryOS(db_path=temp_db)
        assert memory is not None
        assert memory.store is not None
        assert memory.vector_search is not None
        memory.close()

    def test_set_get_preference(self, memory):
        """Test preference setting and getting"""
        memory.set_preference("test_key", "test_value", "test")
        
        result = memory.get_preference("test_key")
        assert result == "test_value"

    def test_learn_get_patterns(self, memory):
        """Test pattern learning and retrieval"""
        memory.learn_pattern("test_pattern", {"data": "value"})
        
        patterns = memory.get_patterns("test_pattern")
        assert len(patterns) == 1
        assert patterns[0]["type"] == "test_pattern"

    def test_set_get_context(self, memory):
        """Test context setting and getting"""
        memory.set_context("test_context", "test_value")
        
        result = memory.get_context("test_context")
        assert result == "test_value"

    def test_search(self, memory):
        """Test search functionality"""
        memory.set_preference("timezone", "Asia/Seoul", "system")
        memory.set_preference("language", "ko", "system")
        
        results = memory.search("timezone", limit=5)
        assert len(results) > 0
        assert any("timezone" in r.get("id", "") for r in results)

    def test_vector_search(self, memory):
        """Test vector search"""
        memory.set_preference("test_key", "test value", "category")
        
        results = memory.vector_search("test", limit=5)
        assert isinstance(results, list)

    def test_semantic_search(self, memory):
        """Test semantic search"""
        memory.set_preference("work_hours", "09:00-18:00", "behavior")
        
        results = memory.semantic_search("work", limit=5)
        assert isinstance(results, list)

    def test_get_memory_summary(self, memory):
        """Test memory summary"""
        memory.set_preference("key1", "value1", "cat1")
        memory.learn_pattern("pattern1", {"data": 1})
        memory.set_context("context1", "value1")
        
        summary = memory.get_memory_summary()
        assert "preferences" in summary
        assert "patterns" in summary
        assert "context" in summary
        assert summary["preferences"] >= 1
        assert summary["patterns"] >= 1
        assert summary["context"] >= 1

    def test_export_memory(self, memory, tmp_path):
        """Test memory export"""
        memory.set_preference("key1", "value1", "cat1")
        
        yaml_path = tmp_path / "memory.yaml"
        memory.export_memory(str(yaml_path))
        
        assert yaml_path.exists()

    def test_context_manager(self, temp_db):
        """Test context manager usage"""
        with MemoryOS(db_path=temp_db) as memory:
            memory.set_preference("key", "value", "cat")
            result = memory.get_preference("key")
            assert result == "value"
        # 연결이 닫혔는지 확인 (다시 사용 시도 시 에러)

    def test_multiple_preferences_search(self, memory):
        """Test searching multiple preferences"""
        memory.set_preference("timezone", "Asia/Seoul", "system")
        memory.set_preference("language", "ko", "system")
        memory.set_preference("theme", "dark", "ui")
        
        results = memory.search("system", limit=10)
        assert len(results) >= 2  # timezone과 language는 system 카테고리


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

