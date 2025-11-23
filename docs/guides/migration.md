# Migration Guide

Migration guide for AUTUS protocol versions and breaking changes.

## Version History

### v0.2.0 → v0.3.0

**Breaking Changes:**
- `MemoryOS.store_preference()` → `MemoryOS.set_preference()`
- `MemoryOS.store_pattern()` → `MemoryOS.learn_pattern()`
- `MemoryOS.store_context()` → `MemoryOS.set_context()`
- `MemoryOS.export_to_yaml()` → `MemoryOS.export_memory()`

**Migration Steps:**

```python
# Old code
memory = MemoryOS()
memory.store_preference("key", "value")
memory.store_pattern("type", {"data": "value"})
memory.export_to_yaml("output.yaml")

# New code
memory = MemoryOS()
memory.set_preference("key", "value")
memory.learn_pattern("type", {"data": "value"})
memory.export_memory("output.yaml")
```

### v0.1.0 → v0.2.0

**Breaking Changes:**
- WorkflowGraph constructor changed
- Protocol export format updated

**Migration Steps:**

```python
# Old code
graph = WorkflowGraph()
graph.add_node("start", {})
graph.add_edge("start", "end")

# New code
nodes = [{'id': 'start', 'type': 'trigger'}]
edges = [{'source': 'start', 'target': 'end'}]
graph = WorkflowGraph(nodes, edges)
```

## Data Migration

### Memory Database Migration

If you have an existing memory database:

```python
from protocols.memory.store import MemoryStore
import json

# Old database
old_store = MemoryStore("old_memory.db")

# Export all data
preferences = {}
for row in old_store.conn.execute("SELECT key, value FROM preferences").fetchall():
    preferences[row[0]] = json.loads(row[1])

patterns = {}
for row in old_store.conn.execute("SELECT pattern_type, pattern_data FROM patterns").fetchall():
    patterns[row[0]] = json.loads(row[1])

# Import to new database
new_store = MemoryStore("new_memory.db")
for key, value in preferences.items():
    new_store.store_preference(key, value)

for pattern_type, pattern_data in patterns.items():
    new_store.store_pattern(pattern_type, pattern_data)
```

### Identity Migration

Identity data is forward-compatible. Simply use `from_dict()`:

```python
# Old export
old_data = identity.export_to_dict()

# New import
new_identity = IdentityCore.from_dict(old_data)
```

## Configuration Migration

### CLI Configuration

If you have old `.autus` files:

```yaml
# Old format
project: my_project
cells:
  cell1:
    command: "echo hello"

# New format (same, but with context)
project: my_project
cells:
  cell1:
    command: "echo hello"
context:
  env: development
```

## Deprecated Features

### Removed in v0.3.0

- `MemoryOS.get_statistics()` → Use `MemoryOS.get_memory_summary()`
- `WorkflowGraph.add_node()` → Use constructor with nodes list
- `WorkflowGraph.add_edge()` → Use constructor with edges list

### Deprecated (Will be removed in v0.4.0)

- `core/pack/openai_runner.py` → Use `core/pack/runner.py` with `provider="openai"`
- Direct `logging.getLogger()` → Use `core.utils.logging.get_logger()`

## Testing Migration

After migration, run tests:

```bash
# Run all tests
pytest tests/ -v

# Run protocol tests
pytest tests/protocols/ -v

# Run ARMP tests
pytest tests/armp/ -v
```

## Rollback

If migration fails, you can rollback:

1. Restore from backup
2. Use previous version
3. Check migration logs

```bash
# Check for backup
ls .autus/backups/

# Restore database
cp .autus/backups/memory_YYYYMMDD_HHMMSS.db .autus/memory/memory.db
```

## Need Help?

- Check `docs/api/` for API changes
- Review `CHANGELOG.md` for detailed changes
- Open issue on GitHub for migration questions

