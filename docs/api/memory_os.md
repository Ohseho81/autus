# Memory OS API Reference

Local-first memory storage with DuckDB backend. Zero server sync. GDPR compliant by design.

## MemoryOS

High-level interface for Local Memory OS.

### Methods

#### `__init__(db_path: str = ".autus/memory/memory.db")`

Initialize MemoryOS instance.

**Parameters:**
- `db_path` (str): Database file path

**Example:**
```python
from protocols.memory.memory_os import MemoryOS

memory = MemoryOS()
# or
memory = MemoryOS(db_path="custom/path/memory.db")
```

#### `set_preference(key: str, value: Any, category: str = "general") -> None`

Set a preference (non-PII only).

**Parameters:**
- `key` (str): Preference key (e.g., 'theme', 'language')
- `value` (Any): Preference value
- `category` (str): Category of preference (default: "general")

**Raises:**
- `PIIViolationError`: If PII detected

**Example:**
```python
memory.set_preference("theme", "dark", "ui")
memory.set_preference("language", "python", "development")
```

#### `get_preference(key: str) -> Optional[Any]`

Get preference value by key.

**Parameters:**
- `key` (str): Preference key

**Returns:**
- `Optional[Any]`: Preference value or None if not found

**Example:**
```python
theme = memory.get_preference("theme")
# Returns: "dark" or None
```

#### `learn_pattern(pattern_type: str, data: Dict[str, Any]) -> None`

Learn a behavioral pattern (non-PII only).

**Parameters:**
- `pattern_type` (str): Type of pattern (e.g., 'coding', 'meeting')
- `data` (Dict[str, Any]): Pattern data

**Example:**
```python
memory.learn_pattern("coding", {
    "language": "python",
    "framework": "django",
    "duration": 3600
})
```

#### `get_patterns(pattern_type: Optional[str] = None) -> List[Dict[str, Any]]`

Get patterns, optionally filtered by type.

**Parameters:**
- `pattern_type` (Optional[str]): Filter by pattern type (None for all)

**Returns:**
- `List[Dict[str, Any]]`: List of patterns

**Example:**
```python
all_patterns = memory.get_patterns()
coding_patterns = memory.get_patterns("coding")
```

#### `set_context(context_type: str, value: Any, expires_at: Optional[str] = None) -> None`

Set temporary context (non-PII only).

**Parameters:**
- `context_type` (str): Context type
- `value` (Any): Context value
- `expires_at` (Optional[str]): Expiration timestamp (ISO format)

**Example:**
```python
from datetime import datetime, timedelta

expires = (datetime.now() + timedelta(hours=1)).isoformat()
memory.set_context("work", {"project": "autus", "status": "active"}, expires_at=expires)
```

#### `get_context(context_type: str) -> Optional[Any]`

Get context by type.

**Parameters:**
- `context_type` (str): Context type

**Returns:**
- `Optional[Any]`: Context value or None if not found/expired

**Example:**
```python
work_context = memory.get_context("work")
```

#### `search(query: str, limit: int = 10) -> List[Dict[str, Any]]`

Semantic search (TF-IDF based).

**Parameters:**
- `query` (str): Search query
- `limit` (int): Maximum number of results (default: 10)

**Returns:**
- `List[Dict[str, Any]]`: Search results

**Example:**
```python
results = memory.search("python coding")
for result in results:
    print(result['text'])
```

#### `vector_search(query: str, limit: int = 10) -> List[Dict[str, Any]]`

Vector-based search (embedding ready).

**Parameters:**
- `query` (str): Search query
- `limit` (int): Maximum number of results (default: 10)

**Returns:**
- `List[Dict[str, Any]]`: Search results with similarity scores

**Example:**
```python
results = memory.vector_search("coding language")
for result in results:
    print(f"{result['text']} (score: {result.get('score', 0)})")
```

#### `export_memory(output_path: str = ".autus/memory.yaml") -> None`

Export memory to YAML format.

**Parameters:**
- `output_path` (str): Output file path

**Example:**
```python
memory.export_memory("backup/memory.yaml")
```

#### `get_memory_summary() -> Dict[str, Any]`

Get memory statistics.

**Returns:**
- `Dict[str, Any]`: Statistics with preferences, patterns, context counts

**Example:**
```python
summary = memory.get_memory_summary()
print(f"Total: {summary['total']}")
print(f"Preferences: {summary['preferences']}")
```

#### `close() -> None`

Close database connection.

**Example:**
```python
memory.close()
```

### Context Manager

MemoryOS supports context manager protocol:

```python
with MemoryOS() as memory:
    memory.set_preference("theme", "dark")
    # Automatically closed on exit
```

## Privacy Guarantees

- **No PII**: All PII is blocked at storage level
- **Local-first**: All data stored locally, no server sync
- **GDPR Compliant**: By design, no personal data collection

## Error Handling

- `PIIViolationError`: Raised when PII is detected
- `MemoryError`: Raised on database errors




