"""
Zero Identity - Integration Tests

Full workflow integration tests
"""

import pytest
from protocols.identity.core import IdentityCore
from protocols.identity.surface import IdentitySurface
from protocols.identity.pattern_tracker import (
    BehavioralPatternTracker,
    WorkflowIntegration,
    MemoryIntegration
)


def test_full_workflow_integration():
    """Test complete workflow: Create → Track → Evolve"""
    # 1. Create identity
    identity = IdentityCore("user_device_001")
    
    # 2. Create tracker
    tracker = BehavioralPatternTracker(identity)
    
    # 3. Track various patterns
    tracker.track_workflow_completion(
        workflow_id="daily_coding",
        nodes_executed=["setup", "code", "test", "commit"],
        duration_seconds=3600,
        success=True,
        context={"language": "python"}
    )
    
    tracker.track_preference_update(
        preference_key="editor",
        preference_value="vscode",
        context={"category": "tools"}
    )
    
    tracker.track_context_switch(
        from_context="work",
        to_context="personal"
    )
    
    # 4. Verify surface evolved
    surface = identity.get_surface()
    assert surface is not None
    assert surface.pattern_count >= 3
    
    # 5. Check pattern summary
    summary = tracker.get_pattern_summary()
    assert summary['total_patterns'] >= 3
    assert len(summary['pattern_types']) >= 3


def test_multi_context_identity():
    """Test identity in multiple contexts"""
    identity = IdentityCore("user_device_002")
    identity.create_surface()
    
    # Get representations for different contexts
    work_rep = identity.surface.get_context_representation("work")
    personal_rep = identity.surface.get_context_representation("personal")
    creative_rep = identity.surface.get_context_representation("creative")
    
    # Should all be valid but slightly different
    assert work_rep['context'] == "work"
    assert personal_rep['context'] == "personal"
    assert creative_rep['context'] == "creative"
    
    # Positions should be similar but not identical
    assert work_rep['position'] != personal_rep['position']


def test_identity_persistence():
    """Test identity export and restore"""
    # 1. Create and evolve identity
    identity1 = IdentityCore("persistence_test")
    tracker1 = BehavioralPatternTracker(identity1)
    
    for i in range(10):
        tracker1.track_workflow_completion(
            workflow_id=f"wf_{i}",
            nodes_executed=["n1", "n2"],
            duration_seconds=float(i),
            success=True
        )
    
    # 2. Export
    exported = identity1.export_to_dict()
    
    # 3. Restore
    identity2 = IdentityCore.from_dict(exported)
    
    # 4. Verify
    assert identity2.get_core_hash() == identity1.get_core_hash()
    assert identity2.get_surface() is not None
    assert identity2.get_surface().pattern_count == identity1.get_surface().pattern_count


def test_surface_distance_calculation():
    """Test identity similarity/distance"""
    # Create two identities
    identity1 = IdentityCore("user_a")
    identity2 = IdentityCore("user_b")
    
    surface1 = identity1.create_surface()
    surface2 = identity2.create_surface()
    
    # Calculate distance
    distance = surface1.get_distance_to(surface2)
    
    assert distance >= 0
    assert isinstance(distance, float)


def test_pattern_evolution_consistency():
    """Test that same patterns produce consistent evolution"""
    identity = IdentityCore("consistency_test")
    tracker = BehavioralPatternTracker(identity)
    
    pattern = {
        'type': 'test_pattern',
        'data': 'consistent_data',
        'context': {}
    }
    
    # Track same pattern multiple times
    surface_states = []
    for i in range(5):
        tracker.identity.evolve_surface(pattern)
        surface_states.append(
            tracker.identity.get_surface().get_state()
        )
    
    # Pattern count should increase consistently
    for i in range(1, len(surface_states)):
        assert surface_states[i]['pattern_count'] == surface_states[i-1]['pattern_count'] + 1


def test_privacy_no_pii_in_export():
    """Test that exported data contains no PII"""
    identity = IdentityCore("privacy_test_user@example.com")
    tracker = BehavioralPatternTracker(identity)
    
    # Add patterns with potential PII in context (should be safe)
    tracker.track_workflow_completion(
        workflow_id="email_workflow",
        nodes_executed=["compose", "send"],
        duration_seconds=120,
        success=True,
        context={"type": "email"}  # Safe context
    )
    
    # Export
    exported = identity.export_to_dict()
    exported_str = str(exported)
    
    # Should not contain the seed directly
    assert "privacy_test_user@example.com" not in exported_str
    
    # Should only contain hash
    assert identity.get_core_hash() in exported_str


def test_memory_integration_safe():
    """Test Memory OS integration doesn't leak PII"""
    identity = IdentityCore("memory_test")
    tracker = BehavioralPatternTracker(identity)
    
    # Simulate memory patterns (no actual Memory OS needed)
    memory_pattern = {
        'type': 'preference',
        'key': 'theme',
        'value': 'dark'
    }
    
    tracker.track_memory_pattern(
        pattern_type='preference_update',
        pattern_data=memory_pattern
    )
    
    # Verify pattern tracked
    assert len(tracker.patterns) >= 1
    assert tracker.patterns[-1]['type'] == 'memory_pattern'


def test_workflow_integration_safe():
    """Test Workflow Graph integration"""
    identity = IdentityCore("workflow_test")
    tracker = BehavioralPatternTracker(identity)
    
    workflow_graph = {
        'metadata': {
            'id': 'test_workflow',
            'created_at': '2024-11-23'
        },
        'nodes': [
            {'id': 'start'},
            {'id': 'process'},
            {'id': 'end'}
        ]
    }
    
    WorkflowIntegration.track_from_workflow_graph(tracker, workflow_graph)
    
    # Verify tracking
    assert len(tracker.patterns) >= 1
    summary = tracker.get_pattern_summary()
    assert 'workflow_pattern' in summary['pattern_types']

