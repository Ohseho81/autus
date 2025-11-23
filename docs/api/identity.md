# Zero Identity API Reference

Zero Identity Protocol - Core identity without PII.

## IdentityCore

Core identity without any PII. Based on a seed value (device ID, random string, etc.). Creates deterministic but anonymous identity.

### Methods

#### `__init__(seed: str)`

Initialize identity from seed.

**Parameters:**
- `seed` (str): Any string (device ID, random string, etc.) - **No PII allowed!**

**Example:**
```python
from protocols.identity.core import IdentityCore

identity = IdentityCore("device_001")
# Seed is hashed, never stored
```

#### `get_core_hash() -> str`

Get the core identity hash (SHA256).

**Returns:**
- `str`: 64-character hex digest

**Example:**
```python
hash_value = identity.get_core_hash()
# Returns: "a1b2c3d4e5f6..."
```

#### `create_surface() -> IdentitySurface`

Create 3D Identity Surface.

**Returns:**
- `IdentitySurface`: Surface instance

**Example:**
```python
surface = identity.create_surface()
```

#### `get_surface() -> Optional[IdentitySurface]`

Get existing surface (or None).

**Returns:**
- `Optional[IdentitySurface]`: Surface instance or None

#### `evolve_surface(pattern: dict) -> None`

Evolve surface with behavioral pattern.

**Parameters:**
- `pattern` (dict): Behavioral pattern from Memory OS or Workflow

**Example:**
```python
pattern = {
    "type": "workflow_completion",
    "context": {"workflow_id": "daily_coding"},
    "timestamp": "2024-01-01T00:00:00"
}
identity.evolve_surface(pattern)
```

#### `export_to_dict() -> dict`

Export identity to dictionary.

**Returns:**
- `dict`: Identity data (no PII)

**Example:**
```python
data = identity.export_to_dict()
# Contains: seed_hash, created_at, surface
```

#### `from_dict(data: dict) -> IdentityCore`

Import identity from dictionary (class method).

**Parameters:**
- `data` (dict): Identity data

**Returns:**
- `IdentityCore`: Restored identity instance

**Example:**
```python
identity2 = IdentityCore.from_dict(data)
```

## IdentitySurface

3D Identity Surface that evolves based on behavioral patterns. No PII, only behavioral characteristics.

### Properties

- **Position (x, y, z)**: Current behavioral state
- **Radius**: Consistency/stability
- **Texture**: Pattern diversity
- **Color**: Emotional tone (RGB)

### Methods

#### `evolve(pattern: Dict) -> None`

Evolve surface based on behavioral pattern.

**Parameters:**
- `pattern` (Dict): Behavioral pattern

**Example:**
```python
surface.evolve({
    "type": "workflow_completion",
    "context": {"workflow_id": "test"}
})
```

#### `get_state() -> Dict`

Get current surface state.

**Returns:**
- `Dict`: Current surface properties

**Example:**
```python
state = surface.get_state()
print(f"Position: {state['position']}")
print(f"Pattern count: {state['pattern_count']}")
```

#### `get_context_representation(context: str) -> Dict`

Get identity representation for specific context.

**Parameters:**
- `context` (str): Context identifier (e.g., 'work', 'personal', 'creative')

**Returns:**
- `Dict`: Context-specific identity representation

**Example:**
```python
work_identity = surface.get_context_representation("work")
personal_identity = surface.get_context_representation("personal")
```

#### `get_distance_to(other: IdentitySurface) -> float`

Calculate distance to another surface.

**Parameters:**
- `other` (IdentitySurface): Other surface

**Returns:**
- `float`: Distance in 3D space

**Example:**
```python
distance = surface1.get_distance_to(surface2)
# Useful for identity similarity/proximity
```

## BehavioralPatternTracker

Tracks behavioral patterns and evolves Identity Surface. Integrates with MemoryOS and WorkflowGraph.

### Methods

#### `__init__(identity_core: IdentityCore)`

Initialize tracker with Identity Core.

**Parameters:**
- `identity_core` (IdentityCore): IdentityCore instance

**Example:**
```python
from protocols.identity.pattern_tracker import BehavioralPatternTracker

tracker = BehavioralPatternTracker(identity)
```

#### `track_workflow_completion(workflow_id: str, completion_data: Dict[str, Any]) -> None`

Track workflow completion.

**Parameters:**
- `workflow_id` (str): Workflow identifier
- `completion_data` (Dict[str, Any]): Completion metadata

**Example:**
```python
tracker.track_workflow_completion("daily_coding", {
    "nodes_executed": 5,
    "total_time": 10.5,
    "success": True
})
```

#### `track_preference_change(key: str, old_value: Any, new_value: Any, category: str = "general") -> None`

Track preference change from MemoryOS.

**Parameters:**
- `key` (str): Preference key
- `old_value` (Any): Previous value
- `new_value` (Any): New value
- `category` (str): Preference category

**Example:**
```python
tracker.track_preference_change("editor", "vim", "vscode", "tools")
```

#### `track_context_switch(old_context: str, new_context: str) -> None`

Track context switch.

**Parameters:**
- `old_context` (str): Previous context
- `new_context` (str): New context

**Example:**
```python
tracker.track_context_switch("work", "personal")
```

#### `get_pattern_summary() -> Dict[str, Any]`

Get summary of tracked patterns.

**Returns:**
- `Dict[str, Any]`: Pattern statistics

**Example:**
```python
summary = tracker.get_pattern_summary()
print(f"Total patterns: {summary['total_patterns']}")
```

## Privacy Guarantees

- **No PII**: Seed is hashed immediately, never stored
- **Anonymous**: Only behavioral patterns, no personal information
- **Deterministic**: Same seed produces same hash, but no reverse lookup

