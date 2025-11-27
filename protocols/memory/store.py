"""
Local-first memory storage with DuckDB backend.

Store user preferences, patterns, and context entirely on device.
Zero server sync. GDPR compliant by design.

Important: NO PII (Personally Identifiable Information) should be stored.
Only behavioral patterns, preferences, and anonymous context.
"""
import duckdb
import json
from pathlib import Path
from typing import Any, Dict, Optional, List
from contextlib import contextmanager
import yaml
from protocols.memory.pii_validator import PIIValidator, PIIViolationError
from core.utils.paths import ensure_dir


class MemoryStore:
    """
    MemoryStore class for local-first memory storage with DuckDB backend.

    Stores only non-PII data:
    - Preferences (timezone, language, work_hours, etc.)
    - Behavioral patterns (interaction_style, response_time, etc.)
    - Workflow context (anonymous patterns only)
    """

    @property
    def db_path(self):
        """테스트 호환용 db_path"""
        return getattr(self, '_db_path', ".autus/memory/memory.db")

    def __init__(self, db_path: str = ".autus/memory/memory.db") -> None:
        """
        Initialize a new instance of the MemoryStore class.

        Args:
            db_path (str): The path to the DuckDB database file.
        """
        # 디렉토리 생성
        ensure_dir(Path(db_path).parent)

        self._db_path = db_path
        try:
            self.conn = duckdb.connect(db_path)
            self._init_schema()
        except Exception as e:
            raise MemoryError(f"Failed to connect to the database: {e}") from e

    def _init_schema(self) -> None:
        """Initialize database schema if not exists."""
        # Preferences 테이블 (PII 없음)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS preferences (
                key TEXT PRIMARY KEY,
                value TEXT,
                category TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Patterns 테이블 (행동 패턴, PII 없음)
        # pattern_type을 PRIMARY KEY로 사용 (중복 방지)
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS patterns (
                pattern_type TEXT PRIMARY KEY,
                pattern_data TEXT,
                frequency INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Context 테이블 (익명 컨텍스트, PII 없음)
        # context_key를 PRIMARY KEY로 사용
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS context (
                context_key TEXT PRIMARY KEY,
                context_value TEXT,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

    @contextmanager
    def transaction(self):
        """
        트랜잭션 컨텍스트 매니저

        사용 예:
            with store.transaction():
                store.store_preference("key1", "value1")
                store.store_preference("key2", "value2")
        """
        try:
            yield self
            # DuckDB는 자동 커밋이지만 명시적으로 커밋
            self.conn.execute("COMMIT")
        except Exception as e:
            # 롤백 (DuckDB는 자동 롤백)
            self.conn.execute("ROLLBACK")
            raise

    def store_preference(self, key: str, value: Any, category: str = "general") -> None:
        """
        Store a preference (non-PII only).

        Args:
            key (str): The preference key (e.g., 'timezone', 'language')
            value (Any): The preference value (will be JSON serialized)
            category (str): Category of preference (e.g., 'ui', 'behavior')

        Raises:
            PIIViolationError: PII가 감지된 경우
        """
        # 강화된 PII 검증
        PIIValidator.validate(key, value)

        try:
            value_str = json.dumps(value) if not isinstance(value, str) else value
            # DuckDB는 ON CONFLICT를 다르게 처리
            self.conn.execute(
                "INSERT OR REPLACE INTO preferences (key, value, category, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)",
                (key, value_str, category)
            )
        except PIIViolationError:
            raise
        except Exception as e:
            raise Exception(f"Failed to store preference: {e}")

    def get_preference(self, key: str) -> Optional[Any]:
        """
        Retrieve a preference by its key.

        Args:
            key (str): The preference key

        Returns:
            Optional[Any]: The preference value, or None if not found
        """
        try:
            result = self.conn.execute(
                "SELECT value FROM preferences WHERE key = ?",
                (key,)
            ).fetchone()

            if result:
                value_str = result[0]
                try:
                    return json.loads(value_str)
                except json.JSONDecodeError:
                    return value_str
            return None
        except Exception as e:
            raise Exception(f"Failed to retrieve preference: {e}")

    def store_pattern(self, pattern_type: str, pattern_data: Dict[str, Any]) -> None:
        """
        Store a behavioral pattern (non-PII only).

        Args:
            pattern_type (str): Type of pattern (e.g., 'work_hours', 'interaction_style')
            pattern_data (Dict[str, Any]): Pattern data (will be JSON serialized)
        """
        try:
            pattern_json = json.dumps(pattern_data)
            # pattern_type이 PRIMARY KEY이므로 INSERT OR REPLACE 사용
            self.conn.execute(
                "INSERT OR REPLACE INTO patterns (pattern_type, pattern_data, frequency, updated_at) "
                "VALUES (?, ?, COALESCE((SELECT frequency FROM patterns WHERE pattern_type = ?), 0) + 1, CURRENT_TIMESTAMP)",
                (pattern_type, pattern_json, pattern_type)
            )
        except Exception as e:
            raise Exception(f"Failed to store pattern: {e}")

    def get_patterns(self, pattern_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieve patterns, optionally filtered by type.

        Args:
            pattern_type (Optional[str]): Filter by pattern type

        Returns:
            List[Dict[str, Any]]: List of patterns
        """
        try:
            if pattern_type:
                results = self.conn.execute(
                    "SELECT pattern_type, pattern_data, frequency FROM patterns WHERE pattern_type = ?",
                    (pattern_type,)
                ).fetchall()
            else:
                results = self.conn.execute(
                    "SELECT pattern_type, pattern_data, frequency FROM patterns"
                ).fetchall()

            patterns = []
            for row in results:
                try:
                    data = json.loads(row[1])
                except (json.JSONDecodeError, TypeError):
                    data = row[1]
                patterns.append({
                    'type': row[0],
                    'data': data,
                    'frequency': row[2]
                })
            return patterns
        except Exception as e:
            raise Exception(f"Failed to retrieve patterns: {e}")

    def store_context(self, context_key: str, context_value: Any, expires_at: Optional[str] = None) -> None:
        """
        Store temporary context (non-PII only).

        Args:
            context_key (str): Context key
            context_value (Any): Context value
            expires_at (Optional[str]): Expiration timestamp (ISO format)
        """
        try:
            value_str = json.dumps(context_value) if not isinstance(context_value, str) else context_value
            # context_key가 PRIMARY KEY이므로 INSERT OR REPLACE 사용
            self.conn.execute(
                "INSERT OR REPLACE INTO context (context_key, context_value, expires_at) VALUES (?, ?, ?)",
                (context_key, value_str, expires_at)
            )
        except Exception as e:
            raise Exception(f"Failed to store context: {e}")

    def get_context(self, context_key: str) -> Optional[Any]:
        """
        Retrieve context by key.

        Args:
            context_key (str): Context key

        Returns:
            Optional[Any]: Context value, or None if not found or expired
        """
        try:
            result = self.conn.execute(
                "SELECT context_value, expires_at FROM context WHERE context_key = ? "
                "AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)",
                (context_key,)
            ).fetchone()

            if result:
                value_str = result[0]
                try:
                    return json.loads(value_str)
                except json.JSONDecodeError:
                    return value_str
            return None
        except Exception as e:
            raise Exception(f"Failed to retrieve context: {e}")

    def export_to_yaml(self, output_path: str = ".autus/memory.yaml") -> None:
        """
        Export memory to AUTUS standard YAML format.

        Args:
            output_path (str): Path to output YAML file
        """
        try:
            # Preferences 가져오기
            prefs = {}
            pref_results = self.conn.execute("SELECT key, value, category FROM preferences").fetchall()
            for row in pref_results:
                key = row[0]
                try:
                    value = json.loads(row[1])
                except json.JSONDecodeError:
                    value = row[1]
                prefs[key] = value

            # Patterns 가져오기
            patterns = {}
            pattern_results = self.conn.execute(
                "SELECT pattern_type, pattern_data FROM patterns"
            ).fetchall()
            for row in pattern_results:
                pattern_type = row[0]
                pattern_data = json.loads(row[1])
                patterns[pattern_type] = pattern_data

            # YAML로 저장
            data = {
                'preferences': prefs,
                'patterns': patterns
            }

            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                yaml.dump(data, f, default_flow_style=False, allow_unicode=True)

        except Exception as e:
            raise Exception(f"Failed to export to YAML: {e}")

    def close(self) -> None:
        """Close the database connection."""
        if hasattr(self, 'conn'):
            self.conn.close()


if __name__ == "__main__":
    # 테스트
    store = MemoryStore()

    # Preference 저장
    store.store_preference("timezone", "Asia/Seoul", "system")
    store.store_preference("language", "ko", "system")
    store.store_preference("work_hours", "09:00-18:00", "behavior")

    # Pattern 저장
    store.store_pattern("interaction_style", {
        "response_time": "fast",
        "verbosity": "medium"
    })

    # 조회
    print("Timezone:", store.get_preference("timezone"))
    print("Patterns:", store.get_patterns())

    # YAML로 내보내기
    store.export_to_yaml()
    print("✅ Exported to .autus/memory.yaml")

    store.close()
