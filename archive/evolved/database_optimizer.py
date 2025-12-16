"""
AUTUS Database Optimizer - Performance tuning and schema optimization.

Implements:
- Optimal index creation strategy
- Query performance analysis
- Schema migration utilities
- Statistics and monitoring
"""

import sqlite3
import time
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
from dataclasses import dataclass
from datetime import datetime
import json


@dataclass
class IndexInfo:
    """Index metadata."""
    name: str
    table: str
    columns: List[str]
    is_unique: bool = False
    created_at: Optional[str] = None


@dataclass
class QueryStats:
    """Query performance statistics."""
    query: str
    execution_time_ms: float
    rows_affected: int
    timestamp: str


class DatabaseOptimizer:
    """Optimize SQLite database for production use."""
    
    def __init__(self, db_path: str = "autus.db"):
        """Initialize optimizer.
        
        Args:
            db_path: Path to SQLite database
        """
        self.db_path = db_path
        self.indices: Dict[str, IndexInfo] = {}
        self.query_stats: List[QueryStats] = []
        self.max_stats_history = 500
    
    def optimize_schema(self) -> Dict[str, Any]:
        """Execute complete schema optimization.
        
        Returns:
            Summary of optimizations applied
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute("PRAGMA journal_mode=WAL")  # Write-Ahead Logging
                conn.execute("PRAGMA synchronous=NORMAL")  # Faster writes
                conn.execute("PRAGMA cache_size=-64000")  # 64MB cache
                conn.execute("PRAGMA temp_store=MEMORY")  # In-memory temp
                conn.execute("PRAGMA foreign_keys=ON")  # Enforce FK constraints
                
            return {
                "status": "success",
                "optimizations": [
                    "WAL mode enabled",
                    "Synchronous mode optimized",
                    "Cache size increased to 64MB",
                    "Temporary storage moved to memory",
                    "Foreign key constraints enabled"
                ]
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def create_optimal_indices(self) -> Dict[str, Any]:
        """Create optimal indices for all tables with batch processing support.
        
        Returns:
            Summary of indices created
        """
        indices_to_create = {
            # twins table indices
            "idx_twins_type": ("twins", ["type"], True),
            "idx_twins_name": ("twins", ["name"], False),
            "idx_twins_type_version": ("twins", ["type", "version"], True),
            
            # events table indices (critical for query performance)
            "idx_events_type": ("events", ["type"], True),
            "idx_events_entity_id": ("events", ["entity_id"], True),
            "idx_events_timestamp": ("events", ["timestamp"], True),
            "idx_events_type_entity": ("events", ["type", "entity_id"], True),
            "idx_events_timestamp_type": ("events", ["timestamp", "type"], True),
            
            # pack_logs table indices (high query volume)
            "idx_pack_logs_pack_id": ("pack_logs", ["pack_id"], True),
            "idx_pack_logs_entity_id": ("pack_logs", ["entity_id"], True),
            "idx_pack_logs_timestamp": ("pack_logs", ["timestamp"], True),
            "idx_pack_logs_pack_entity": ("pack_logs", ["pack_id", "entity_id"], True),
            
            # packs table indices
            "idx_packs_type": ("packs", ["type"], False),
            "idx_packs_name": ("packs", ["name"], False),
            
            # webhooks table indices
            "idx_webhooks_active": ("webhooks", ["active"], False),
            
            # sovereign table indices (critical for relationships)
            "idx_sovereign_twin_id": ("sovereign", ["twin_id"], True),
            "idx_sovereign_zero_id": ("sovereign", ["zero_id"], True),
            "idx_sovereign_status": ("sovereign", ["status"], True),
            
            # users table indices
            "idx_users_username": ("users", ["username"], True),
            "idx_users_role": ("users", ["role"], False),
        }
        
        created = []
        failed = []
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Get existing indices
                cursor = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='index'"
                )
                existing = set(row[0] for row in cursor.fetchall())
                
                # Create new indices with batch execution
                for idx_name, (table, columns, is_unique) in indices_to_create.items():
                    if idx_name not in existing:
                        try:
                            col_str = ", ".join(columns)
                            unique_clause = "UNIQUE" if is_unique else ""
                            sql = f"CREATE {unique_clause} INDEX IF NOT EXISTS {idx_name} ON {table}({col_str})"
                            conn.execute(sql)
                            created.append(idx_name)
                            self.indices[idx_name] = IndexInfo(
                                name=idx_name,
                                table=table,
                                columns=columns,
                                is_unique=is_unique,
                                created_at=datetime.now().isoformat()
                            )
                        except Exception as e:
                            failed.append(f"{idx_name}: {str(e)}")
                
                conn.commit()
        except Exception as e:
            return {"status": "error", "message": str(e)}
        
        return {
            "status": "success",
            "created_count": len(created),
            "failed_count": len(failed),
            "created": created,
            "failed": failed
        }
    
    def analyze_table_sizes(self) -> Dict[str, Any]:
        """Analyze sizes of all tables.
        
        Returns:
            Table size information
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Get page count
                cursor = conn.execute("PRAGMA page_count")
                page_count = cursor.fetchone()[0]
                
                cursor = conn.execute("PRAGMA page_size")
                page_size = cursor.fetchone()[0]
                
                total_size_mb = (page_count * page_size) / (1024 * 1024)
                
                # Get table row counts
                cursor = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table'"
                )
                tables = [row[0] for row in cursor.fetchall()]
                
                table_stats = {}
                for table in tables:
                    cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                    row_count = cursor.fetchone()[0]
                    table_stats[table] = {
                        "rows": row_count,
                        "estimated_size_kb": max(1, row_count * 0.5)  # Rough estimate
                    }
                
                return {
                    "status": "success",
                    "total_size_mb": round(total_size_mb, 2),
                    "page_count": page_count,
                    "page_size": page_size,
                    "tables": table_stats
                }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def run_vacuum_and_analyze(self) -> Dict[str, Any]:
        """Optimize database with VACUUM and ANALYZE.
        
        Returns:
            Optimization results
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                start_time = time.time()
                
                # VACUUM - reclaim unused space
                conn.execute("VACUUM")
                
                # ANALYZE - update statistics
                conn.execute("ANALYZE")
                
                optimization_time = (time.time() - start_time) * 1000
                
                conn.commit()
            
            return {
                "status": "success",
                "message": "Database optimized with VACUUM and ANALYZE",
                "execution_time_ms": round(optimization_time, 2)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def check_query_plan(self, query: str) -> Dict[str, Any]:
        """Analyze query execution plan.
        
        Args:
            query: SQL query to analyze
            
        Returns:
            Query plan information
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(f"EXPLAIN QUERY PLAN\n{query}")
                plan = cursor.fetchall()
                
                return {
                    "status": "success",
                    "query": query,
                    "plan": [str(row) for row in plan]
                }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def get_index_statistics(self) -> Dict[str, Any]:
        """Get statistics about existing indices.
        
        Returns:
            Index statistics
        """
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute(
                    "SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'"
                )
                indices = []
                for row in cursor.fetchall():
                    indices.append({
                        "name": row[0],
                        "table": row[1],
                        "definition": row[2]
                    })
                
                return {
                    "status": "success",
                    "count": len(indices),
                    "indices": indices
                }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    def record_query_stats(self, query: str, execution_time_ms: float, rows_affected: int = 0) -> None:
        """Record query execution statistics.
        
        Args:
            query: SQL query executed
            execution_time_ms: Execution time in milliseconds
            rows_affected: Number of rows affected
        """
        stat = QueryStats(
            query=query[:100],  # Truncate long queries
            execution_time_ms=execution_time_ms,
            rows_affected=rows_affected,
            timestamp=datetime.now().isoformat()
        )
        self.query_stats.append(stat)
        
        # Keep only recent stats
        if len(self.query_stats) > self.max_stats_history:
            self.query_stats = self.query_stats[-self.max_stats_history:]
    
    def get_slow_queries(self, threshold_ms: float = 100) -> Dict[str, Any]:
        """Get queries slower than threshold.
        
        Args:
            threshold_ms: Execution time threshold in milliseconds
            
        Returns:
            Slow query statistics
        """
        slow = [s for s in self.query_stats if s.execution_time_ms > threshold_ms]
        
        # Group by query
        by_query = {}
        for stat in slow:
            if stat.query not in by_query:
                by_query[stat.query] = []
            by_query[stat.query].append(stat.execution_time_ms)
        
        summary = {}
        for query, times in by_query.items():
            summary[query] = {
                "count": len(times),
                "avg_ms": sum(times) / len(times),
                "max_ms": max(times),
                "min_ms": min(times)
            }
        
        return {
            "status": "success",
            "threshold_ms": threshold_ms,
            "slow_queries_count": len(slow),
            "queries": summary
        }
    
    def generate_optimization_report(self) -> str:
        """Generate comprehensive optimization report.
        
        Returns:
            Formatted report
        """
        sizes = self.analyze_table_sizes()
        indices = self.get_index_statistics()
        slow = self.get_slow_queries()
        
        report = f"""
╔══════════════════════════════════════════════════════════════════╗
║         AUTUS Database Optimization Report                      ║
║         Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}                    ║
╚══════════════════════════════════════════════════════════════════╝

📊 Database Size:
  - Total Size: {sizes.get('total_size_mb', 'N/A')} MB
  - Page Count: {sizes.get('page_count', 'N/A')}
  - Page Size: {sizes.get('page_size', 'N/A')} bytes

📋 Table Statistics:
"""
        
        if 'tables' in sizes:
            for table, stats in sizes['tables'].items():
                report += f"\n  {table}:\n"
                report += f"    - Rows: {stats['rows']:,}\n"
                report += f"    - Est. Size: {stats['estimated_size_kb']:.1f} KB\n"
        
        report += f"\n🔍 Index Statistics:\n"
        report += f"  - Total Indices: {indices.get('count', 0)}\n"
        
        report += f"\n⚡ Query Performance:\n"
        report += f"  - Slow Queries (>100ms): {slow.get('slow_queries_count', 0)}\n"
        
        if slow.get('queries'):
            report += "\n  Slow Query Details:\n"
            for query, stats in list(slow['queries'].items())[:5]:
                report += f"\n    Query: {query}...\n"
                report += f"    - Avg: {stats['avg_ms']:.2f}ms\n"
                report += f"    - Max: {stats['max_ms']:.2f}ms\n"
                report += f"    - Count: {stats['count']}\n"
        
        return report


# Singleton instance
db_optimizer = DatabaseOptimizer()
