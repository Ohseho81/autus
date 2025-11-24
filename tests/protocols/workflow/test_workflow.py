"""
Tests for AUTUS Workflow Graph Protocol

Generated for protocols/workflow/__init__.py
"""
import pytest
import json
from protocols.workflow import WorkflowGraph


class TestWorkflowGraph:
    """Test suite for WorkflowGraph class"""

    def test_init_valid_graph(self):
        """Test WorkflowGraph initialization with valid data"""
        nodes = [
            {'id': '1', 'type': 'trigger', 'name': 'wake_up'},
            {'id': '2', 'type': 'action', 'name': 'check_email'}
        ]
        edges = [
            {'source': '1', 'target': '2', 'type': 'sequence'}
        ]

        graph = WorkflowGraph(nodes, edges)

        assert graph.nodes == nodes
        assert graph.edges == edges
        assert len(graph.nodes) == 2
        assert len(graph.edges) == 1

    def test_validate_valid_graph(self):
        """Test validation of valid workflow graph"""
        nodes = [
            {'id': '1', 'type': 'trigger', 'name': 'wake_up'},
            {'id': '2', 'type': 'action', 'name': 'check_email'}
        ]
        edges = [
            {'source': '1', 'target': '2', 'type': 'sequence'}
        ]

        graph = WorkflowGraph(nodes, edges)
        assert graph.validate() is True

    def test_validate_missing_node_id(self):
        """Test validation fails when node missing 'id' field"""
        nodes = [
            {'type': 'trigger', 'name': 'wake_up'},  # Missing 'id'
            {'id': '2', 'type': 'action', 'name': 'check_email'}
        ]
        edges = [
            {'source': '1', 'target': '2', 'type': 'sequence'}
        ]

        graph = WorkflowGraph(nodes, edges)
        assert graph.validate() is False

    def test_validate_missing_node_type(self):
        """Test validation fails when node missing 'type' field"""
        nodes = [
            {'id': '1', 'name': 'wake_up'},  # Missing 'type'
            {'id': '2', 'type': 'action', 'name': 'check_email'}
        ]
        edges = [
            {'source': '1', 'target': '2', 'type': 'sequence'}
        ]

        graph = WorkflowGraph(nodes, edges)
        assert graph.validate() is False

    def test_validate_missing_edge_source(self):
        """Test validation fails when edge missing 'source' field"""
        nodes = [
            {'id': '1', 'type': 'trigger', 'name': 'wake_up'},
            {'id': '2', 'type': 'action', 'name': 'check_email'}
        ]
        edges = [
            {'target': '2', 'type': 'sequence'}  # Missing 'source'
        ]

        graph = WorkflowGraph(nodes, edges)
        assert graph.validate() is False

    def test_validate_missing_edge_target(self):
        """Test validation fails when edge missing 'target' field"""
        nodes = [
            {'id': '1', 'type': 'trigger', 'name': 'wake_up'},
            {'id': '2', 'type': 'action', 'name': 'check_email'}
        ]
        edges = [
            {'source': '1', 'type': 'sequence'}  # Missing 'target'
        ]

        graph = WorkflowGraph(nodes, edges)
        assert graph.validate() is False

    def test_to_json(self):
        """Test conversion to JSON format"""
        nodes = [
            {'id': '1', 'type': 'trigger', 'name': 'wake_up'},
            {'id': '2', 'type': 'action', 'name': 'check_email'}
        ]
        edges = [
            {'source': '1', 'target': '2', 'type': 'sequence'}
        ]

        graph = WorkflowGraph(nodes, edges)
        json_str = graph.to_json()

        assert isinstance(json_str, str)
        data = json.loads(json_str)
        assert 'nodes' in data
        assert 'edges' in data
        assert len(data['nodes']) == 2
        assert len(data['edges']) == 1

    def test_from_json(self):
        """Test creation from JSON string"""
        json_data = {
            'nodes': [
                {'id': '1', 'type': 'trigger', 'name': 'wake_up'},
                {'id': '2', 'type': 'action', 'name': 'check_email'}
            ],
            'edges': [
                {'source': '1', 'target': '2', 'type': 'sequence'}
            ]
        }
        json_str = json.dumps(json_data)

        graph = WorkflowGraph.from_json(json_str)

        assert isinstance(graph, WorkflowGraph)
        assert len(graph.nodes) == 2
        assert len(graph.edges) == 1
        assert graph.nodes[0]['id'] == '1'
        assert graph.edges[0]['source'] == '1'

    def test_serialization_roundtrip(self):
        """Test serialization and deserialization roundtrip"""
        nodes = [
            {'id': '1', 'type': 'trigger', 'name': 'wake_up', 'time': '07:00'},
            {'id': '2', 'type': 'action', 'name': 'check_email', 'app': 'gmail'},
            {'id': '3', 'type': 'condition', 'name': 'has_urgent', 'threshold': 'high'}
        ]
        edges = [
            {'source': '1', 'target': '2', 'type': 'sequence'},
            {'source': '2', 'target': '3', 'type': 'conditional'}
        ]

        original_graph = WorkflowGraph(nodes, edges)
        json_str = original_graph.to_json()
        restored_graph = WorkflowGraph.from_json(json_str)

        assert len(restored_graph.nodes) == len(original_graph.nodes)
        assert len(restored_graph.edges) == len(original_graph.edges)
        assert restored_graph.nodes[0]['id'] == original_graph.nodes[0]['id']
        assert restored_graph.edges[0]['source'] == original_graph.edges[0]['source']

    def test_empty_graph(self):
        """Test WorkflowGraph with empty nodes and edges"""
        graph = WorkflowGraph([], [])

        assert graph.nodes == []
        assert graph.edges == []
        assert graph.validate() is True  # Empty graph is valid

    def test_complex_workflow(self):
        """Test complex workflow with multiple nodes and edges"""
        nodes = [
            {'id': '1', 'type': 'trigger', 'name': 'wake_up', 'time': '07:00'},
            {'id': '2', 'type': 'action', 'name': 'check_email', 'app': 'gmail'},
            {'id': '3', 'type': 'condition', 'name': 'has_urgent', 'threshold': 'high'},
            {'id': '4', 'type': 'action', 'name': 'notify_slack', 'app': 'slack'},
            {'id': '5', 'type': 'action', 'name': 'read_news', 'app': 'rss'}
        ]
        edges = [
            {'source': '1', 'target': '2', 'type': 'sequence'},
            {'source': '2', 'target': '3', 'type': 'conditional'},
            {'source': '3', 'target': '4', 'type': 'if_true'},
            {'source': '3', 'target': '5', 'type': 'if_false'}
        ]

        graph = WorkflowGraph(nodes, edges)

        assert graph.validate() is True
        assert len(graph.nodes) == 5
        assert len(graph.edges) == 4

        json_str = graph.to_json()
        restored = WorkflowGraph.from_json(json_str)
        assert len(restored.nodes) == 5
        assert len(restored.edges) == 4


if __name__ == "__main__":
    pytest.main([__file__, "-v"])




