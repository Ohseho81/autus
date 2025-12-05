import json
from typing import Dict, List, Any

class WorkflowGraph:
    """
    AUTUS Workflow Graph Standard Format
    
    The protocol that all SaaS companies must support for personal behavior patterns.
    """
    
    def __init__(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> None:
        self.nodes = nodes
        self.edges = edges

    def validate(self) -> bool:
        """Validate the WorkflowGraph against AUTUS standard."""
        try:
            self._validate_nodes()
            self._validate_edges()
        except Exception as e:
            print(f"Validation Error: {str(e)}")
            return False
        return True

    def _validate_nodes(self) -> None:
        """Validate that all nodes have required fields."""
        for node in self.nodes:
            if 'id' not in node or 'type' not in node:
                raise ValueError("Each node must have 'id' and 'type' fields.")

    def _validate_edges(self) -> None:
        """Validate that all edges have required fields."""
        for edge in self.edges:
            if 'source' not in edge or 'target' not in edge:
                raise ValueError("Each edge must have 'source' and 'target' fields.")

    def to_json(self) -> str:
        """Convert the WorkflowGraph to AUTUS standard JSON format."""
        return json.dumps({
            'nodes': self.nodes,
            'edges': self.edges
        })

    @classmethod
    def from_json(cls, json_str: str) -> 'WorkflowGraph':
        """Create a WorkflowGraph from AUTUS standard JSON."""
        data = json.loads(json_str)
        return cls(data['nodes'], data['edges'])
