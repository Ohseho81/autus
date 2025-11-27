"""
Tests for Behavioral Pattern Tracker
"""

import pytest
from protocols.identity.core import IdentityCore
from protocols.identity.pattern_tracker import (
    BehavioralPatternTracker,
    WorkflowIntegration,
    MemoryIntegration
)


def test_tracker_initialization():
    """Test tracker initialization"""
    identity = IdentityCore("test_seed")
    tracker = BehavioralPatternTracker(identity)

    assert tracker.identity == identity
    assert len(tracker.patterns) == 0
    assert identity.get_surface() is not None


def test_track_workflow_completion():
    """Test workflow completion tracking"""
    identity = IdentityCore("test_seed")
    tracker = BehavioralPatternTracker(identity)

    tracker.track_workflow_completion(
        workflow_id="wf_001",
        nodes_executed=["node1", "node2"],
        duration_seconds=1.5,
        success=True,
        context={"env": "test"}
    )

    assert len(tracker.patterns) == 1
    assert tracker.patterns[0]['type'] == 'workflow_completion'
    assert tracker.patterns[0]['workflow_id'] == "wf_001"


def test_track_preference_update():
    """Test preference update tracking"""
    identity = IdentityCore("test_seed")
    tracker = BehavioralPatternTracker(identity)

    tracker.track_preference_update(
        preference_key="theme",
        preference_value="dark",
        context={"source": "ui"}
    )

    assert len(tracker.patterns) == 1
    assert tracker.patterns[0]['type'] == 'preference_update'


def test_track_context_switch():
    """Test context switch tracking"""
    identity = IdentityCore("test_seed")
    tracker = BehavioralPatternTracker(identity)

    tracker.track_context_switch(
        from_context="work",
        to_context="personal"
    )

    assert len(tracker.patterns) == 1
    assert tracker.patterns[0]['type'] == 'context_switch'


def test_pattern_summary():
    """Test pattern summary"""
    identity = IdentityCore("test_seed")
    tracker = BehavioralPatternTracker(identity)

    # Add various patterns
    tracker.track_workflow_completion("wf_001", [], 1.0, True)
    tracker.track_preference_update("key1", "value1")
    tracker.track_context_switch("a", "b")

    summary = tracker.get_pattern_summary()

    assert summary['total_patterns'] == 3
    assert 'workflow_completion' in summary['pattern_types']
    assert 'preference_update' in summary['pattern_types']
    assert 'context_switch' in summary['pattern_types']


def test_surface_evolution():
    """Test surface evolution from patterns"""
    identity = IdentityCore("test_seed")
    tracker = BehavioralPatternTracker(identity)

    surface_before = identity.get_surface().get_state()

    # Track pattern
    tracker.track_workflow_completion("wf_001", [], 1.0, True)

    surface_after = identity.get_surface().get_state()

    # Surface should have evolved
    assert surface_after['pattern_count'] > surface_before['pattern_count']


def test_workflow_integration():
    """Test workflow integration"""
    identity = IdentityCore("test_seed")
    tracker = BehavioralPatternTracker(identity)

    workflow_graph = {
        'metadata': {'id': 'test_wf'},
        'nodes': [{'id': 'n1'}, {'id': 'n2'}]
    }

    WorkflowIntegration.track_from_workflow_graph(tracker, workflow_graph)

    assert len(tracker.patterns) >= 1


def test_export_import():
    """Test export/import"""
    identity = IdentityCore("test_seed")
    tracker = BehavioralPatternTracker(identity)

    tracker.track_workflow_completion("wf_001", [], 1.0, True)

    exported = tracker.export_to_dict()

    assert 'patterns' in exported
    assert 'pattern_summary' in exported
    assert len(exported['patterns']) >= 1






