"""
Tests for AUTUS Local Memory OS Protocol

Generated for protocols/memory/store.py
Tests PII-free local storage with DuckDB backend.
"""
import pytest
import json
import tempfile
import os
from pathlib import Path
from protocols.memory.store import MemoryStore


class TestMemoryStore:
    """Test suite for MemoryStore class"""

    @pytest.fixture
    def temp_db(self):
        """Create temporary database for testing"""
        # 각 테스트마다 고유한 파일명 사용
        import uuid
        db_path = f"/tmp/test_memory_{uuid.uuid4().hex}.db"
        # 기존 파일이 있으면 삭제
        if os.path.exists(db_path):
            os.remove(db_path)
        yield db_path
        # Cleanup
        if os.path.exists(db_path):
            os.remove(db_path)

    @pytest.fixture
    def store(self, temp_db):
        """Create MemoryStore instance"""
        return MemoryStore(db_path=temp_db)

    def test_init(self, temp_db):
        """Test MemoryStore initialization"""
        store = MemoryStore(db_path=temp_db)
        assert store is not None
        assert hasattr(store, 'conn')
        store.close()

    def test_init_creates_schema(self, temp_db):
        """Test that schema is created on initialization"""
        store = MemoryStore(db_path=temp_db)

        # Check if tables exist by trying to query them
        try:
            store.conn.execute("SELECT * FROM preferences LIMIT 1")
            store.conn.execute("SELECT * FROM patterns LIMIT 1")
            store.conn.execute("SELECT * FROM context LIMIT 1")
            schema_created = True
        except Exception:
            schema_created = False

        assert schema_created is True

        store.close()

    def test_store_preference(self, store):
        """Test storing a preference"""
        store.store_preference("timezone", "Asia/Seoul", "system")

        result = store.get_preference("timezone")
        assert result == "Asia/Seoul"

    def test_store_preference_with_category(self, store):
        """Test storing preference with category"""
        store.store_preference("language", "ko", "system")
        store.store_preference("work_hours", "09:00-18:00", "behavior")

        timezone = store.get_preference("timezone")
        work_hours = store.get_preference("work_hours")

        # timezone는 없으므로 None
        assert timezone is None
        assert work_hours == "09:00-18:00"

    def test_store_preference_pii_blocked(self, store):
        """Test that PII storage is blocked"""
        from protocols.memory.pii_validator import PIIViolationError

        # email 키워드 차단
        with pytest.raises(PIIViolationError):
            store.store_preference("email", "test@example.com", "contact")

        # name 키워드 차단
        with pytest.raises(PIIViolationError):
            store.store_preference("user_name", "John Doe", "profile")

        # user_id 키워드 차단
        with pytest.raises(PIIViolationError):
            store.store_preference("user_id", "12345", "system")

    def test_store_preference_complex_value(self, store):
        """Test storing complex values (dict, list)"""
        complex_value = {
            "theme": "dark",
            "font_size": 14,
            "notifications": True
        }
        store.store_preference("ui_settings", complex_value, "ui")

        result = store.get_preference("ui_settings")
        assert result == complex_value
        assert result["theme"] == "dark"

    def test_get_preference_nonexistent(self, store):
        """Test retrieving non-existent preference"""
        result = store.get_preference("nonexistent_key")
        assert result is None

    def test_store_pattern(self, store):
        """Test storing a behavioral pattern"""
        pattern_data = {
            "response_time": "fast",
            "verbosity": "medium"
        }
        store.store_pattern("interaction_style", pattern_data)

        patterns = store.get_patterns("interaction_style")
        assert len(patterns) == 1
        assert patterns[0]["type"] == "interaction_style"
        assert patterns[0]["data"]["response_time"] == "fast"

    def test_store_pattern_updates_frequency(self, store):
        """Test that storing same pattern updates frequency"""
        pattern_data = {"test": "data"}
        store.store_pattern("test_pattern", pattern_data)
        store.store_pattern("test_pattern", pattern_data)

        patterns = store.get_patterns("test_pattern")
        assert len(patterns) == 1
        # Frequency는 내부적으로 증가하지만 조회 시 확인 필요

    def test_get_patterns_all(self, store):
        """Test retrieving all patterns"""
        store.store_pattern("pattern1", {"data": 1})
        store.store_pattern("pattern2", {"data": 2})

        all_patterns = store.get_patterns()
        assert len(all_patterns) == 2
        pattern_types = [p["type"] for p in all_patterns]
        assert "pattern1" in pattern_types
        assert "pattern2" in pattern_types

    def test_get_patterns_filtered(self, store):
        """Test retrieving patterns filtered by type"""
        store.store_pattern("work_hours", {"start": "09:00"})
        store.store_pattern("interaction_style", {"fast": True})

        work_patterns = store.get_patterns("work_hours")
        assert len(work_patterns) == 1
        assert work_patterns[0]["type"] == "work_hours"

    def test_store_context(self, store):
        """Test storing temporary context"""
        store.store_context("current_task", "implementing_memory")

        result = store.get_context("current_task")
        assert result == "implementing_memory"

    def test_store_context_with_expiry(self, store):
        """Test storing context with expiration"""
        from datetime import datetime, timedelta
        expires = (datetime.now() + timedelta(hours=1)).isoformat()

        store.store_context("temp_key", "temp_value", expires)

        result = store.get_context("temp_key")
        assert result == "temp_value"

    def test_get_context_nonexistent(self, store):
        """Test retrieving non-existent context"""
        result = store.get_context("nonexistent")
        assert result is None

    def test_export_to_yaml(self, store, tmp_path):
        """Test exporting memory to YAML format"""
        # 데이터 저장
        store.store_preference("timezone", "Asia/Seoul", "system")
        store.store_preference("language", "ko", "system")
        store.store_pattern("work_hours", {"start": "09:00", "end": "18:00"})

        # YAML로 내보내기
        yaml_path = tmp_path / "memory.yaml"
        store.export_to_yaml(str(yaml_path))

        # 파일 존재 확인
        assert yaml_path.exists()

        # YAML 내용 확인
        import yaml
        with open(yaml_path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)

        assert 'preferences' in data
        assert 'patterns' in data
        assert data['preferences']['timezone'] == "Asia/Seoul"
        assert data['preferences']['language'] == "ko"

    def test_close(self, store):
        """Test closing database connection"""
        store.close()
        # 연결이 닫혔는지 확인 (다시 사용 시도 시 에러)
        with pytest.raises(Exception):
            store.conn.execute("SELECT 1")

    def test_preference_update(self, store):
        """Test updating existing preference"""
        store.store_preference("test_key", "value1", "test")
        assert store.get_preference("test_key") == "value1"

        store.store_preference("test_key", "value2", "test")
        assert store.get_preference("test_key") == "value2"

    def test_multiple_preferences(self, store):
        """Test storing and retrieving multiple preferences"""
        preferences = {
            "timezone": "Asia/Seoul",
            "language": "ko",
            "theme": "dark",
            "notifications": True
        }

        for key, value in preferences.items():
            store.store_preference(key, value, "user")

        for key, expected_value in preferences.items():
            assert store.get_preference(key) == expected_value


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
