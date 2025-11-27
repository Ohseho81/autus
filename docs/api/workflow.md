# Workflow Graph API Reference

AUTUS Workflow Graph Standard Format. The protocol that all SaaS companies must support for personal behavior patterns.

## WorkflowGraph

### Methods

#### `__init__(nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]])`

Initialize the AUTUS Workflow Graph.

**Parameters:**
- `nodes` (List[Dict]): List of nodes, each must have 'id' and 'type'
- `edges` (List[Dict]): List of edges, each must have 'source' and 'target'

**Example:**
```python
from protocols.workflow import WorkflowGraph

nodes = [
    {'id': 'start', 'type': 'trigger', 'name': 'wake_up'},
    {'id': 'process', 'type': 'action', 'name': 'check_email'},
    {'id': 'end', 'type': 'end', 'name': 'finish'}
]
edges = [
    {'source': 'start', 'target': 'process'},
    {'source': 'process', 'target': 'end'}
]

graph = WorkflowGraph(nodes, edges)
```

#### `validate() -> bool`

Validate the WorkflowGraph against AUTUS standard.

**Returns:**
- `bool`: True if valid, False otherwise

**Example:**
```python
if graph.validate():
    print("Workflow is valid")
else:
    print("Workflow validation failed")
```

#### `to_json() -> str`

Convert the WorkflowGraph to AUTUS standard JSON format.

**Returns:**
- `str`: JSON string representation

**Example:**
```python
json_str = graph.to_json()
with open("workflow.json", "w") as f:
    f.write(json_str)
```

#### `from_json(json_str: str) -> WorkflowGraph`

Create a WorkflowGraph from AUTUS standard JSON (class method).

**Parameters:**
- `json_str` (str): JSON string in AUTUS format

**Returns:**
- `WorkflowGraph`: Parsed WorkflowGraph instance

**Example:**
```python
with open("workflow.json", "r") as f:
    json_str = f.read()
graph = WorkflowGraph.from_json(json_str)
```

## Node Structure

Each node must have:
- `id` (str): Unique node identifier
- `type` (str): Node type (trigger, action, condition, end, etc.)

Optional fields:
- `name` (str): Human-readable name
- `metadata` (Dict): Additional metadata

## Edge Structure

Each edge must have:
- `source` (str): Source node ID
- `target` (str): Target node ID

Optional fields:
- `type` (str): Edge type (sequence, conditional, etc.)
- `condition` (Dict): Conditional logic

## Validation Rules

1. All nodes must have 'id' and 'type'
2. All edges must have 'source' and 'target'
3. Source and target nodes must exist
4. No cycles allowed (DAG only)

## Example Workflow

```python
# Create workflow
graph = WorkflowGraph(
    nodes=[
        {'id': 'start', 'type': 'trigger'},
        {'id': 'validate', 'type': 'action'},
        {'id': 'process', 'type': 'action'},
        {'id': 'end', 'type': 'end'}
    ],
    edges=[
        {'source': 'start', 'target': 'validate'},
        {'source': 'validate', 'target': 'process'},
        {'source': 'process', 'target': 'end'}
    ]
)

# Validate
if graph.validate():
    # Export
    json_str = graph.to_json()
    print("Workflow exported successfully")
```






