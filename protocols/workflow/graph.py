from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class WorkflowNode:
    id: str
    type: str = "task"
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowEdge:
    source: str
    target: str
    label: Optional[str] = None


class WorkflowGraph:
    """
    Minimal WorkflowGraph used by tests.

    - nodes: dict[id, WorkflowNode]
    - edges: list of WorkflowEdge
    """

    def __init__(self) -> None:
        self.nodes: Dict[str, WorkflowNode] = {}
        self.edges: List[WorkflowEdge] = []

    def add_node(self, node_id: str, node_type: str = "task", config: Optional[Dict[str, Any]] = None) -> WorkflowNode:
        if config is None:
            config = {}
        node = WorkflowNode(id=node_id, type=node_type, config=config)
        self.nodes[node_id] = node
        return node

    def add_edge(self, source: str, target: str, label: Optional[str] = None) -> WorkflowEdge:
        edge = WorkflowEdge(source=source, target=target, label=label)
        self.edges.append(edge)
        return edge

    def get_node(self, node_id: str) -> WorkflowNode:
        return self.nodes[node_id]

    def neighbors(self, node_id: str) -> List[WorkflowNode]:
        out_ids = [e.target for e in self.edges if e.source == node_id]
        return [self.nodes[nid] for nid in out_ids if nid in self.nodes]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "nodes": [
                {"id": n.id, "type": n.type, "config": n.config}
                for n in self.nodes.values()
            ],
            "edges": [
                {"source": e.source, "target": e.target, "label": e.label}
                for e in self.edges
            ],
        }
