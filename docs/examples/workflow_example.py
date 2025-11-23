"""
Workflow Graph Usage Examples

Examples for Workflow Graph protocol
"""

from protocols.workflow import WorkflowGraph


def example_basic_workflow():
    """Create basic workflow"""
    # Create nodes
    nodes = [
        {'id': 'start', 'type': 'trigger', 'name': 'Start'},
        {'id': 'process', 'type': 'action', 'name': 'Process'},
        {'id': 'end', 'type': 'end', 'name': 'End'}
    ]
    
    # Create edges
    edges = [
        {'source': 'start', 'target': 'process'},
        {'source': 'process', 'target': 'end'}
    ]
    
    # Create workflow
    graph = WorkflowGraph(nodes, edges)
    
    # Validate
    if graph.validate():
        print("Workflow is valid")
    
    # Export
    json_str = graph.to_json()
    print(f"Workflow JSON: {json_str}")


def example_complex_workflow():
    """Create complex workflow with 10+ nodes"""
    # Create nodes
    nodes = [
        {'id': 'start', 'type': 'trigger'},
        {'id': 'validate', 'type': 'action'},
        {'id': 'process1', 'type': 'action'},
        {'id': 'process2', 'type': 'action'},
        {'id': 'process3', 'type': 'action'},
        {'id': 'merge', 'type': 'action'},
        {'id': 'transform', 'type': 'action'},
        {'id': 'validate2', 'type': 'action'},
        {'id': 'output', 'type': 'action'},
        {'id': 'end', 'type': 'end'}
    ]
    
    # Create edges (DAG)
    edges = [
        {'source': 'start', 'target': 'validate'},
        {'source': 'validate', 'target': 'process1'},
        {'source': 'validate', 'target': 'process2'},
        {'source': 'validate', 'target': 'process3'},
        {'source': 'process1', 'target': 'merge'},
        {'source': 'process2', 'target': 'merge'},
        {'source': 'process3', 'target': 'merge'},
        {'source': 'merge', 'target': 'transform'},
        {'source': 'transform', 'target': 'validate2'},
        {'source': 'validate2', 'target': 'output'},
        {'source': 'output', 'target': 'end'}
    ]
    
    # Create and validate
    graph = WorkflowGraph(nodes, edges)
    assert graph.validate() is True
    print(f"Complex workflow created with {len(nodes)} nodes")


def example_workflow_serialization():
    """Serialize and deserialize workflow"""
    # Create workflow
    nodes = [
        {'id': 'start', 'type': 'trigger'},
        {'id': 'end', 'type': 'end'}
    ]
    edges = [
        {'source': 'start', 'target': 'end'}
    ]
    
    graph1 = WorkflowGraph(nodes, edges)
    
    # Serialize
    json_str = graph1.to_json()
    
    # Deserialize
    graph2 = WorkflowGraph.from_json(json_str)
    
    # Verify
    assert len(graph2.nodes) == len(graph1.nodes)
    assert len(graph2.edges) == len(graph1.edges)
    print("Workflow serialization successful")


def example_parallel_branches():
    """Create workflow with parallel execution branches"""
    nodes = [
        {'id': 'start', 'type': 'trigger'},
        {'id': 'branch1', 'type': 'action'},
        {'id': 'branch2', 'type': 'action'},
        {'id': 'branch3', 'type': 'action'},
        {'id': 'merge', 'type': 'action'},
        {'id': 'end', 'type': 'end'}
    ]
    
    edges = [
        {'source': 'start', 'target': 'branch1'},
        {'source': 'start', 'target': 'branch2'},
        {'source': 'start', 'target': 'branch3'},
        {'source': 'branch1', 'target': 'merge'},
        {'source': 'branch2', 'target': 'merge'},
        {'source': 'branch3', 'target': 'merge'},
        {'source': 'merge', 'target': 'end'}
    ]
    
    graph = WorkflowGraph(nodes, edges)
    assert graph.validate() is True
    print("Parallel branches workflow created")


def example_linear_workflow():
    """Create linear workflow (chain)"""
    nodes = [
        {'id': f'step_{i}', 'type': 'action'} for i in range(5)
    ]
    nodes.insert(0, {'id': 'start', 'type': 'trigger'})
    nodes.append({'id': 'end', 'type': 'end'})
    
    edges = [
        {'source': nodes[i]['id'], 'target': nodes[i+1]['id']}
        for i in range(len(nodes) - 1)
    ]
    
    graph = WorkflowGraph(nodes, edges)
    assert graph.validate() is True
    print(f"Linear workflow created with {len(nodes)} nodes")

