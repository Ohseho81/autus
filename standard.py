#!/usr/bin/env python3
"""
AUTUS Workflow Graph Standard Format

The protocol that all SaaS companies must support for personal behavior patterns.
"""

import json
from typing import Dict, List, Any


class WorkflowGraph:
    """
    AUTUS Workflow Graph Standard Format
    
    Attributes
    ----------
    nodes : List[Dict[str, Any]]
        List of workflow nodes with id, type, and metadata
    edges : List[Dict[str, Any]]
        List of workflow edges connecting nodes
    """
    
    def __init__(self, nodes: List[Dict[str, Any]], edges: List[Dict[str, Any]]) -> None:
        """
        Initialize the AUTUS Workflow Graph.
        
        Parameters
        ----------
        nodes : List[Dict[str, Any]]
            List of nodes, each must have 'id' and 'type'
        edges : List[Dict[str, Any]]
            List of edges, each must have 'source' and 'target'
        """
        self.nodes = nodes
        self.edges = edges

    def validate(self) -> bool:
        """
        Validate the WorkflowGraph against AUTUS standard.
        
        Returns
        -------
        bool
            True if valid, False otherwise
        """
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
        """
        Convert the WorkflowGraph to AUTUS standard JSON format.
        
        Returns
        -------
        str
            JSON string representation
        """
        return json.dumps({
            'nodes': self.nodes,
            'edges': self.edges
        })

    @classmethod
    def from_json(cls, json_str: str) -> 'WorkflowGraph':
        """
        Create a WorkflowGraph from AUTUS standard JSON.
        
        Parameters
        ----------
        json_str : str
            JSON string in AUTUS format
            
        Returns
        -------
        WorkflowGraph
            Parsed WorkflowGraph instance
        """
        data = json.loads(json_str)
        return cls(data['nodes'], data['edges'])


if __name__ == "__main__":
    # Example: Personal morning routine workflow
    nodes = [
        {'id': '1', 'type': 'trigger', 'name': 'wake_up', 'time': '07:00'},
        {'id': '2', 'type': 'action', 'name': 'check_email', 'app': 'gmail'},
        {'id': '3', 'type': 'condition', 'name': 'has_urgent', 'threshold': 'high'},
        {'id': '4', 'type': 'action', 'name': 'notify_slack', 'app': 'slack'}
    ]
    
    edges = [
        {'source': '1', 'target': '2', 'type': 'sequence'},
        {'source': '2', 'target': '3', 'type': 'conditional'},
        {'source': '3', 'target': '4', 'type': 'if_true'}
    ]
    
    graph = WorkflowGraph(nodes, edges)

    if graph.validate():
        print("✅ Workflow graph is valid (AUTUS standard)")
        print(f"\n📋 JSON Format:\n{graph.to_json()}")
        
        # Test serialization
        json_str = graph.to_json()
        new_graph = WorkflowGraph.from_json(json_str)
        print(f"\n✅ Deserialization successful")
        print(f"Nodes: {len(new_graph.nodes)}")
        print(f"Edges: {len(new_graph.edges)}")
    else:
        print("❌ Workflow graph is not valid")
