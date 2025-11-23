# Zero Identity Protocol

**AUTUS Protocol #3: Zero Identity**

3D Identity System without PII - Privacy by Architecture

---

## Overview

The Zero Identity Protocol implements Article I of the AUTUS Constitution: **No identity storage, no PII, only behavioral characteristics**.

### Core Principles

1. **No PII**: Never stores personally identifiable information
2. **3D Identity**: Represents identity as evolving 3D surface
3. **Behavioral Patterns**: Identity evolves based on behavior, not personal data
4. **Local Only**: All identity data stored locally, never transmitted

---

## Architecture

```
IdentityCore (Immutable)
    ↓
IdentitySurface (Evolving)
    ↓
BehavioralPatternTracker (Integration)
```

### Components

1. **IdentityCore**: Immutable seed-based identity hash
2. **IdentitySurface**: 3D representation that evolves with behavior
3. **BehavioralPatternTracker**: Tracks patterns from MemoryOS and WorkflowGraph

---

## API Reference

### IdentityCore

Core identity without any PII.

```python
from protocols.identity import IdentityCore

# Create identity from seed (any string, no PII!)
seed = "device_id_abc123"  # Device ID, random string, etc.
core = IdentityCore(seed)

# Get core hash
hash = core.get_core_hash()  # SHA256 hash

# Create surface
surface = core.create_surface()

# Evolve surface with pattern
pattern = {
    'type': 'workflow_completion',
    'context': {'workflow_id': 'workflow_1'},
    'timestamp': '2024-11-23T12:00:00'
}
core.evolve_surface(pattern)

# Export/Import
data = core.export_to_dict()
restored = IdentityCore.from_dict(data)
```

#### Methods

- `__init__(seed: str)`: Initialize from seed
- `get_core_hash() -> str`: Get SHA256 hash
- `create_surface() -> IdentitySurface`: Create 3D surface
- `get_surface() -> Optional[IdentitySurface]`: Get existing surface
- `evolve_surface(pattern: dict) -> None`: Evolve with pattern
- `export_to_dict() -> dict`: Export to dictionary
- `from_dict(data: dict) -> IdentityCore`: Import from dictionary

---

### IdentitySurface

3D Identity Surface that evolves based on behavioral patterns.

```python
from protocols.identity import IdentitySurface

# Create surface from core hash
core_hash = "a" * 64  # SHA256 hash
surface = IdentitySurface(core_hash)

# Get current state
state = surface.get_state()
# {
#     'core_hash': '...',
#     'position': (x, y, z),
#     'radius': 1.0,
#     'texture': 0.5,
#     'color': [r, g, b],
#     'pattern_count': 0,
#     'created_at': '...',
#     'age_seconds': 0.0
# }

# Evolve with pattern
pattern = {
    'type': 'preference_change',
    'context': {'key': 'theme', 'value': 'dark'},
    'timestamp': '2024-11-23T12:00:00'
}
surface.evolve(pattern)

# Get context-specific representation
work_identity = surface.get_context_representation('work')
personal_identity = surface.get_context_representation('personal')

# Calculate distance to another surface
other_surface = IdentitySurface("b" * 64)
distance = surface.get_distance_to(other_surface)

# Export/Import
data = surface.export_to_dict()
restored = IdentitySurface.from_dict(data)
```

#### Properties

- **position** (x, y, z): Current behavioral state in 3D space
- **radius**: Stability/consistency (increases with consistent patterns)
- **texture**: Pattern diversity (0.0 to 1.0)
- **color** (RGB): Emotional tone based on patterns

#### Methods

- `__init__(core_hash: str)`: Initialize from core hash
- `evolve(pattern: Dict) -> None`: Evolve based on pattern
- `get_state() -> Dict`: Get current state
- `get_context_representation(context: str) -> Dict`: Get context-specific identity
- `get_distance_to(other: IdentitySurface) -> float`: Calculate distance
- `export_to_dict() -> Dict`: Export to dictionary
- `from_dict(data: Dict) -> IdentitySurface`: Import from dictionary

---

### BehavioralPatternTracker

Tracks behavioral patterns and evolves Identity Surface.

```python
from protocols.identity import IdentityCore, BehavioralPatternTracker

# Create tracker
core = IdentityCore("device_id_abc123")
tracker = BehavioralPatternTracker(core)

# Track MemoryOS patterns
tracker.track_preference_change('theme', 'light', 'dark', 'ui')
tracker.track_context_switch('work', 'personal')
tracker.track_memory_pattern('preference_change', {'key': 'theme'})

# Track WorkflowGraph patterns
tracker.track_workflow_pattern('workflow_1', 'node_1', {
    'execution_time': 1.5,
    'success': True
})
tracker.track_workflow_completion('workflow_1', {
    'nodes_executed': 5,
    'total_time': 1.5,
    'success': True
})

# Get context-specific identity
work_identity = tracker.get_context_identity('work')

# Get pattern summary
summary = tracker.get_pattern_summary()
# {
#     'total_patterns': 5,
#     'pattern_types': {'preference_change': 2, 'workflow_completion': 1, ...},
#     'last_pattern_time': '2024-11-23T12:00:00',
#     'surface_state': {...}
# }

# Export tracking data
data = tracker.export_tracking_data()
```

#### Methods

- `__init__(identity_core: IdentityCore)`: Initialize with core
- `track_memory_pattern(type: str, data: Dict) -> None`: Track MemoryOS pattern
- `track_workflow_pattern(workflow_id: str, node_id: str, data: Dict) -> None`: Track workflow execution
- `track_preference_change(key: str, old: Any, new: Any, category: str) -> None`: Track preference change
- `track_context_switch(old: str, new: str) -> None`: Track context switch
- `track_workflow_completion(workflow_id: str, data: Dict) -> None`: Track workflow completion
- `get_pattern_summary() -> Dict`: Get pattern statistics
- `get_context_identity(context: str) -> Dict`: Get context-specific identity
- `export_tracking_data() -> Dict`: Export tracking data

---

## Usage Examples

### Basic Usage

```python
from protocols.identity import IdentityCore, BehavioralPatternTracker

# 1. Create identity
seed = "my_device_id_12345"  # No PII!
core = IdentityCore(seed)
tracker = BehavioralPatternTracker(core)

# 2. Track behavior
tracker.track_preference_change('theme', 'light', 'dark', 'ui')
tracker.track_workflow_completion('daily_workflow', {
    'nodes_executed': 10,
    'total_time': 5.2,
    'success': True
})

# 3. Get identity state
state = tracker.surface.get_state()
print(f"Position: {state['position']}")
print(f"Patterns: {state['pattern_count']}")

# 4. Get context-specific identity
work_identity = tracker.get_context_identity('work')
print(f"Work position: {work_identity['position']}")
```

### Integration with MemoryOS

```python
from protocols.identity import IdentityCore, BehavioralPatternTracker
from protocols.memory import MemoryOS

# Create identity and memory
core = IdentityCore("device_id")
tracker = BehavioralPatternTracker(core)
memory = MemoryOS()

# When preference changes
old_value = memory.get_preference('theme')
memory.set_preference('theme', 'dark', 'ui')
new_value = memory.get_preference('theme')

# Track the change
tracker.track_preference_change('theme', old_value, new_value, 'ui')
```

### Integration with WorkflowGraph

```python
from protocols.identity import IdentityCore, BehavioralPatternTracker
from protocols.workflow import WorkflowGraph

# Create identity
core = IdentityCore("device_id")
tracker = BehavioralPatternTracker(core)

# When workflow executes
workflow = WorkflowGraph(nodes=[...], edges=[...])
# ... execute workflow ...

# Track completion
tracker.track_workflow_completion('workflow_id', {
    'nodes_executed': len(workflow.nodes),
    'total_time': execution_time,
    'success': True
})
```

### Context-Based Identity

```python
from protocols.identity import IdentityCore, BehavioralPatternTracker

core = IdentityCore("device_id")
tracker = BehavioralPatternTracker(core)

# Get different identity representations for different contexts
work_identity = tracker.get_context_identity('work')
personal_identity = tracker.get_context_identity('personal')
creative_identity = tracker.get_context_identity('creative')

# Each context has slightly different position/radius
# but same core identity
assert work_identity['base_state']['core_hash'] == personal_identity['base_state']['core_hash']
```

---

## Privacy Guarantees

### No PII Storage

- **Never stores**: Email, name, phone, address, SSN, etc.
- **Only stores**: Behavioral patterns, preferences (anonymized), workflow data
- **Validation**: All patterns validated with `PIIValidator` before storage

### Local-Only Storage

- All identity data stored locally (`.autus/identity/`)
- Never transmitted to servers
- No cloud sync (except user-initiated QR code sync)

### PII Validation

```python
# PII detection example
try:
    tracker.track_preference_change('user_email', 'old@test.com', 'new@test.com')
except PIIViolationError as e:
    print(f"PII detected: {e}")
    # Pattern rejected, identity not evolved
```

---

## Evolution Algorithm

### Position Evolution

- Small deterministic drift based on pattern hash
- Different pattern types cause different movements
- Position bounded to reasonable range

### Radius Evolution

- Increases slowly with each pattern (stability)
- Represents consistency of behavior
- Maximum radius: 2.0

### Texture Evolution

- Increases with diverse patterns
- Represents pattern diversity
- Maximum texture: 1.0

### Color Evolution

- Subtle shifts based on pattern metadata
- Represents emotional tone
- RGB values bounded [0.0, 1.0]

---

## Data Format

### Identity Export Format

```json
{
    "seed_hash": "sha256_hash_here",
    "created_at": "2024-11-23T12:00:00",
    "surface": {
        "core_hash": "sha256_hash_here",
        "position": [0.616, -0.736, 0.205],
        "radius": 1.001,
        "texture": 0.501,
        "color": [0.5, 0.5, 0.5],
        "pattern_count": 5,
        "created_at": "2024-11-23T12:00:00",
        "evolution_history": [...]
    }
}
```

---

## Testing

All components are fully tested:

```bash
pytest tests/protocols/identity/test_identity.py -v
```

**Test Coverage:**
- IdentityCore: 5 tests
- IdentitySurface: 6 tests
- BehavioralPatternTracker: 10 tests
- Integration: 1 test

**Total: 22 tests, all passing**

---

## Compliance

### Constitution Article I: Zero Identity

✅ **No login system**: No authentication required
✅ **No email collection**: Never requests or stores email
✅ **No names/accounts**: No user accounts or personal names
✅ **No authentication servers**: All identity local
✅ **No user databases**: No identity fields in databases

### Constitution Article II: Privacy by Architecture

✅ **No PII**: All patterns validated with PIIValidator
✅ **Local storage**: All data stored locally
✅ **No data mining**: Impossible to extract PII

---

## Future Enhancements

- [ ] 3D Visualizer (Three.js integration)
- [ ] QR Code sync between devices
- [ ] Identity similarity metrics
- [ ] Pattern clustering and analysis
- [ ] Export to standard formats

---

## References

- [AUTUS Constitution](../CONSTITUTION.md) - Article I: Zero Identity
- [Local Memory OS](./memory.md) - Pattern storage
- [Workflow Graph](./workflow.md) - Workflow execution

---

**Version**: 1.0.0
**Status**: Production Ready
**Last Updated**: 2024-11-23
