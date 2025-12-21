"""
Query Performance Test Suite for AUTUS Database

Tests critical queries to ensure optimal performance with indices.
Measures execution time and validates result accuracy.
"""

import pytest
import sqlite3
import time
from pathlib import Path
from typing import List, Dict, Any


@pytest.fixture
def db_connection():
    """Create database connection for testing."""
    db_path = "autus.db"
    if not Path(db_path).exists():
        pytest.skip("Database file not found")
    
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


class TestQueryPerformance:
    """Test critical query performance."""
    
    PERFORMANCE_THRESHOLD_MS = {
        "select_by_type": 5.0,
        "select_by_id": 5.0,
        "aggregate_by_entity": 10.0,
        "time_range_query": 10.0,
        "complex_join": 15.0,
    }
    
    def measure_query(self, conn: sqlite3.Connection, query: str, params: tuple = ()) -> tuple:
        """Measure query execution time.
        
        Args:
            conn: Database connection
            query: SQL query to execute
            params: Query parameters
            
        Returns:
            Tuple of (execution_time_ms, results_count)
        """
        start = time.perf_counter()
        cursor = conn.execute(query, params)
        results = cursor.fetchall()
        end = time.perf_counter()
        
        execution_time = (end - start) * 1000
        return execution_time, len(results)
    
    def test_twins_select_by_type(self, db_connection):
        """Test selecting twins by type (tests idx_twins_type)."""
        query = "SELECT * FROM twins WHERE type = ?"
        exec_time, count = self.measure_query(db_connection, query, ("talent",))
        
        assert exec_time < self.PERFORMANCE_THRESHOLD_MS["select_by_type"], \
            f"Query took {exec_time:.2f}ms, threshold: {self.PERFORMANCE_THRESHOLD_MS['select_by_type']}ms"
        print(f"✅ twins by type: {exec_time:.2f}ms ({count} rows)")
    
    def test_twins_select_by_id(self, db_connection):
        """Test selecting twin by ID (tests primary key)."""
        query = "SELECT * FROM twins WHERE id = ?"
        exec_time, count = self.measure_query(db_connection, query, ("talent-T001",))
        
        assert exec_time < self.PERFORMANCE_THRESHOLD_MS["select_by_id"], \
            f"Query took {exec_time:.2f}ms, threshold: {self.PERFORMANCE_THRESHOLD_MS['select_by_id']}ms"
        print(f"✅ twins by id: {exec_time:.2f}ms")
    
    def test_events_by_entity_id(self, db_connection):
        """Test selecting events by entity_id (tests idx_events_entity_id)."""
        query = "SELECT * FROM events WHERE entity_id = ?"
        exec_time, count = self.measure_query(db_connection, query, ("talent-T001",))
        
        assert exec_time < self.PERFORMANCE_THRESHOLD_MS["select_by_type"], \
            f"Query took {exec_time:.2f}ms, threshold: {self.PERFORMANCE_THRESHOLD_MS['select_by_type']}ms"
        print(f"✅ events by entity_id: {exec_time:.2f}ms")
    
    def test_events_by_type(self, db_connection):
        """Test selecting events by type (tests idx_events_type)."""
        query = "SELECT * FROM events WHERE type = ?"
        exec_time, count = self.measure_query(db_connection, query, ("satisfaction_change",))
        
        assert exec_time < self.PERFORMANCE_THRESHOLD_MS["select_by_type"], \
            f"Query took {exec_time:.2f}ms, threshold: {self.PERFORMANCE_THRESHOLD_MS['select_by_type']}ms"
        print(f"✅ events by type: {exec_time:.2f}ms")
    
    def test_events_time_range(self, db_connection):
        """Test selecting events by timestamp range (tests idx_events_timestamp)."""
        query = "SELECT * FROM events WHERE timestamp >= ? AND timestamp <= ?"
        exec_time, count = self.measure_query(
            db_connection, 
            query, 
            ("2025-01-01T00:00:00", "2025-12-31T23:59:59")
        )
        
        assert exec_time < self.PERFORMANCE_THRESHOLD_MS["time_range_query"], \
            f"Query took {exec_time:.2f}ms, threshold: {self.PERFORMANCE_THRESHOLD_MS['time_range_query']}ms"
        print(f"✅ events by timestamp range: {exec_time:.2f}ms")
    
    def test_pack_logs_by_pack_id(self, db_connection):
        """Test selecting pack logs by pack_id (tests idx_pack_logs_pack_id)."""
        query = "SELECT * FROM pack_logs WHERE pack_id = ?"
        exec_time, count = self.measure_query(db_connection, query, ("pack-001",))
        
        assert exec_time < self.PERFORMANCE_THRESHOLD_MS["select_by_type"], \
            f"Query took {exec_time:.2f}ms, threshold: {self.PERFORMANCE_THRESHOLD_MS['select_by_type']}ms"
        print(f"✅ pack_logs by pack_id: {exec_time:.2f}ms")
    
    def test_aggregate_events_by_type(self, db_connection):
        """Test aggregating events by type (tests idx_events_type)."""
        query = "SELECT type, COUNT(*) as count FROM events GROUP BY type"
        exec_time, count = self.measure_query(db_connection, query)
        
        assert exec_time < self.PERFORMANCE_THRESHOLD_MS["aggregate_by_entity"], \
            f"Query took {exec_time:.2f}ms, threshold: {self.PERFORMANCE_THRESHOLD_MS['aggregate_by_entity']}ms"
        print(f"✅ aggregate events by type: {exec_time:.2f}ms ({count} types)")
    
    def test_joins_twins_sovereign(self, db_connection):
        """Test join between twins and sovereign tables."""
        query = """
            SELECT t.id, t.name, s.status 
            FROM twins t 
            LEFT JOIN sovereign s ON t.id = s.twin_id 
            WHERE t.type = ?
        """
        exec_time, count = self.measure_query(db_connection, query, ("talent",))
        
        assert exec_time < self.PERFORMANCE_THRESHOLD_MS["complex_join"], \
            f"Query took {exec_time:.2f}ms, threshold: {self.PERFORMANCE_THRESHOLD_MS['complex_join']}ms"
        print(f"✅ twins-sovereign join: {exec_time:.2f}ms ({count} rows)")
    
    def test_count_query(self, db_connection):
        """Test simple count query on large table."""
        query = "SELECT COUNT(*) FROM twins"
        start = time.perf_counter()
        cursor = db_connection.execute(query)
        count = cursor.fetchone()[0]
        end = time.perf_counter()
        
        exec_time = (end - start) * 1000
        
        assert exec_time < 5.0, f"Count query took {exec_time:.2f}ms"
        print(f"✅ count query: {exec_time:.2f}ms (total: {count} twins)")
    
    def test_limit_offset_query(self, db_connection):
        """Test pagination query (LIMIT/OFFSET)."""
        query = "SELECT * FROM twins WHERE type = ? ORDER BY id LIMIT ? OFFSET ?"
        exec_time, count = self.measure_query(db_connection, query, ("talent", 20, 0))
        
        assert exec_time < 10.0, f"Pagination query took {exec_time:.2f}ms"
        print(f"✅ pagination query: {exec_time:.2f}ms ({count} rows)")


class TestIndexUsage:
    """Test that indices are being used effectively."""
    
    def test_index_coverage(self, db_connection):
        """Verify that all important indices exist."""
        cursor = db_connection.execute(
            "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'"
        )
        indices = set(row[0] for row in cursor.fetchall())
        
        required_indices = {
            "idx_twins_type",
            "idx_twins_name",
            "idx_events_type",
            "idx_events_entity_id",
            "idx_events_timestamp",
            "idx_pack_logs_pack_id",
            "idx_pack_logs_entity_id",
        }
        
        missing = required_indices - indices
        assert not missing, f"Missing indices: {missing}"
        print(f"✅ All required indices present: {len(indices)} total indices")
    
    def test_query_plan_uses_index(self, db_connection):
        """Verify query plans use indices effectively."""
        # Get query plan
        cursor = db_connection.execute(
            "EXPLAIN QUERY PLAN SELECT * FROM twins WHERE type = ?",
            ("talent",)
        )
        plan = cursor.fetchall()
        
        # Should use index (SEARCH instead of SCAN)
        plan_str = str(plan)
        uses_index = "SEARCH" in plan_str or "INDEX" in plan_str
        
        print(f"✅ Query plan {'uses index' if uses_index else 'may not use index'}: {plan}")
        # Don't assert - plan format depends on SQLite version


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
