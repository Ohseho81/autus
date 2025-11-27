from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Union

try:
    from concurrent.futures import as_completed
except ImportError:
    pass


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

    def to_json(self) -> str:
        import json
        return json.dumps(self.to_dict())

    @classmethod
    def from_json(cls, json_str: str) -> "WorkflowGraph":
        import json
        data = json.loads(json_str)
        graph = cls()
        for node in data.get("nodes", []):
            graph.add_node(node["id"], node_type=node.get("type", "task"), config=node.get("config", {}))
        for edge in data.get("edges", []):
            graph.add_edge(edge["source"], edge["target"], label=edge.get("label"))
        return graph

    def validate(self) -> bool:
        # Minimal validation: check for cycles and disconnected nodes
        # For test purposes, just check all nodes are reachable from the first node
        if not self.nodes:
            return True
        visited = set()
        def dfs(node_id):
            if node_id in visited:
                return
            visited.add(node_id)
            for neighbor in self.neighbors(node_id):
                dfs(neighbor.id)
        first_node = next(iter(self.nodes))
        dfs(first_node)
        return len(visited) == len(self.nodes)
    """
    Minimal WorkflowGraph used by tests.

    - nodes: dict[id, WorkflowNode]
    - edges: list of WorkflowEdge
    """

    def __init__(self, nodes: Union[List[Any], Dict[str, Any]] = None, edges: List[Any] = None):
        self.nodes: Dict[str, WorkflowNode] = {}
        self.edges: List[WorkflowEdge] = []
        if nodes is not None:
            # Accepts list of dicts, WorkflowNode, or both
            if isinstance(nodes, dict):
                nodes = list(nodes.values())
            for n in nodes:
                if isinstance(n, WorkflowNode):
                    self.nodes[n.id] = n
                elif isinstance(n, dict):
                    self.add_node(n["id"], node_type=n.get("type", "task"), config=n.get("config", {}))
        if edges is not None:
            for e in edges:
                if isinstance(e, WorkflowEdge):
                    self.edges.append(e)
                elif isinstance(e, dict):
                    self.add_edge(e["source"], e["target"], label=e.get("label"))

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "WorkflowGraph":
        nodes = data.get("nodes", [])
        edges = data.get("edges", [])
        return cls(nodes, edges)

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
