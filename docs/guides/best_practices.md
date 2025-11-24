# Best Practices Guide

Best practices for developing with AUTUS.

## Privacy First

### Never Store PII

**❌ Bad:**
```python
memory.set_preference("user_email", "user@example.com")
memory.set_preference("phone_number", "010-1234-5678")
memory.learn_pattern("user_name", {"name": "John Doe"})
```

**✅ Good:**
```python
memory.set_preference("notification_method", "email")
memory.set_preference("contact_preference", "preferred")
memory.learn_pattern("interaction_style", {"verbosity": "medium"})
```

### Use Anonymous Identifiers

```python
# ❌ Bad
identity = IdentityCore("user@example.com")  # PII!

# ✅ Good
identity = IdentityCore("device_001")  # Anonymous
identity = IdentityCore(str(uuid.uuid4()))  # Random UUID
```

## Memory Management

### Use Context Managers

**❌ Bad:**
```python
memory = MemoryOS()
memory.set_preference("key", "value")
# Forgot to close!
```

**✅ Good:**
```python
with MemoryOS() as memory:
    memory.set_preference("key", "value")
    # Automatically closed
```

### Batch Operations

**❌ Bad:**
```python
for i in range(1000):
    memory.set_preference(f"key_{i}", f"value_{i}")
```

**✅ Good:**
```python
# Use transaction if available
with memory.store.transaction():
    for i in range(1000):
        memory.set_preference(f"key_{i}", f"value_{i}")
```

## Identity Evolution

### Track Meaningful Patterns

**❌ Bad:**
```python
# Too frequent, not meaningful
for i in range(10000):
    tracker.track_workflow_completion(f"wf_{i}", {"data": i})
```

**✅ Good:**
```python
# Track significant events
tracker.track_workflow_completion("daily_coding", {
    "nodes_executed": 10,
    "total_time": 3600,
    "success": True
})
```

### Use Context Appropriately

```python
# Get context-specific identity
work_identity = tracker.get_context_identity("work")
personal_identity = tracker.get_context_identity("personal")

# Use appropriate context
if current_context == "work":
    identity_rep = work_identity
```

## Error Handling

### Use Custom Exceptions

**❌ Bad:**
```python
try:
    memory.set_preference("email", "user@example.com")
except Exception as e:
    print(f"Error: {e}")
```

**✅ Good:**
```python
from core.exceptions import MemoryError, PIIViolationError

try:
    memory.set_preference("email", "user@example.com")
except PIIViolationError as e:
    print(f"PII detected: {e}")
    # Handle PII violation
except MemoryError as e:
    print(f"Memory error: {e}")
    # Handle memory error
```

### Validate Before Operations

```python
# Validate data before storing
from protocols.memory.pii_validator import PIIValidator

key = "user_preference"
value = "some_value"

# Check before storing
is_pii, reason = PIIValidator.contains_pii(key, value)
if is_pii:
    raise ValueError(f"Cannot store PII: {reason}")

memory.set_preference(key, value)
```

## Code Organization

### Use Utilities

**❌ Bad:**
```python
# Repeated code
Path("output").mkdir(parents=True, exist_ok=True)
logger = logging.getLogger(__name__)
```

**✅ Good:**
```python
from core.utils.paths import ensure_dir
from core.utils.logging import get_logger

ensure_dir("output")
logger = get_logger(__name__)
```

### Type Hints

**❌ Bad:**
```python
def process_data(data):
    return data
```

**✅ Good:**
```python
from typing import Dict, Any, Optional

def process_data(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    return data
```

## Testing

### Use Fixtures

**❌ Bad:**
```python
def test_memory():
    memory = MemoryOS(db_path="/tmp/test.db")
    # Test code
    # Cleanup manually
```

**✅ Good:**
```python
@pytest.fixture
def memory_os(temp_db):
    return MemoryOS(db_path=temp_db)

def test_memory(memory_os):
    memory_os.set_preference("key", "value")
    # Automatic cleanup
```

### Test Privacy

```python
def test_no_pii_stored():
    """Ensure no PII is stored"""
    memory = MemoryOS()

    # Try to store PII
    with pytest.raises(PIIViolationError):
        memory.set_preference("email", "user@example.com")

    # Verify nothing stored
    assert memory.get_preference("email") is None
```

## Performance

### Limit Search Results

```python
# Don't return all results
results = memory.search("query")  # Could be thousands

# Limit appropriately
results = memory.search("query", limit=10)
```

### Use Appropriate Data Structures

```python
# For frequent lookups
preferences = {}  # Dict for O(1) lookup

# For sequential access
patterns = []  # List for iteration
```

## Security

### Never Commit Secrets

```bash
# Use .gitignore
echo ".env" >> .gitignore
echo ".autus/" >> .gitignore
echo "*.db" >> .gitignore
```

### Validate Inputs

```python
# Always validate user inputs
def set_preference_safe(key: str, value: Any):
    # Validate key
    if not key or not isinstance(key, str):
        raise ValueError("Invalid key")

    # Validate value
    if value is None:
        raise ValueError("Value cannot be None")

    # Check PII
    PIIValidator.validate(key, value)

    # Store
    memory.set_preference(key, value)
```

## Documentation

### Document Public APIs

```python
def complex_function(param1: str, param2: int) -> Dict[str, Any]:
    """
    Complex function that does something important.

    Args:
        param1: Description of param1
        param2: Description of param2

    Returns:
        Dictionary with results

    Raises:
        ValueError: If param1 is invalid
        TypeError: If param2 is wrong type

    Example:
        >>> result = complex_function("test", 42)
        >>> print(result['status'])
        'success'
    """
    # Implementation
    pass
```

### Keep Examples Updated

```python
# Update examples when API changes
# docs/examples/memory_example.py
# Should reflect current API
```

## ARMP Compliance

### Register Custom Risks

```python
from core.armp.enforcer import enforcer, Risk, Severity, RiskCategory

custom_risk = Risk(
    name="Custom Risk",
    category=RiskCategory.SECURITY,
    severity=Severity.HIGH,
    description="Description",
    prevention=lambda: None,
    detection=lambda: False,
    response=lambda: None,
    recovery=lambda: None
)

enforcer.register_risk(custom_risk)
```

### Monitor Regularly

```python
# Start monitoring in production
from core.armp.monitor import monitor

monitor.start()

# Check status periodically
if monitor.is_running():
    metrics = monitor.get_metrics()
    if metrics['violation_count'] > 10:
        # Alert
        pass
```

## Workflow Design

### Keep Workflows Simple

**❌ Bad:**
```python
# Too complex, hard to understand
nodes = [100+ nodes]
edges = [200+ edges]
```

**✅ Good:**
```python
# Simple, clear workflow
nodes = [
    {'id': 'start', 'type': 'trigger'},
    {'id': 'process', 'type': 'action'},
    {'id': 'end', 'type': 'end'}
]
edges = [
    {'source': 'start', 'target': 'process'},
    {'source': 'process', 'target': 'end'}
]
```

### Validate Early

```python
# Validate before execution
graph = WorkflowGraph(nodes, edges)
if not graph.validate():
    raise ValueError("Invalid workflow")

# Then use
json_str = graph.to_json()
```

## Summary

1. **Privacy First**: Never store PII
2. **Use Context Managers**: Automatic resource cleanup
3. **Handle Errors**: Use custom exceptions
4. **Test Thoroughly**: Especially privacy
5. **Document APIs**: Help other developers
6. **Follow ARMP**: Register risks, monitor
7. **Keep It Simple**: Simple code is maintainable code




