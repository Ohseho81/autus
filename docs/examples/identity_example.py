"""
Zero Identity Usage Examples

Examples for Zero Identity protocol
"""

from protocols.identity.core import IdentityCore
from protocols.identity.pattern_tracker import BehavioralPatternTracker


def example_basic_identity():
    """Basic identity creation"""
    # Create identity from device ID
    identity = IdentityCore("device_001")

    # Get core hash
    hash_value = identity.get_core_hash()
    print(f"Identity hash: {hash_value}")

    # Create surface
    surface = identity.create_surface()
    print(f"Surface position: {surface.position}")
    print(f"Surface radius: {surface.radius}")


def example_identity_evolution():
    """Identity evolution with patterns"""
    identity = IdentityCore("device_001")
    tracker = BehavioralPatternTracker(identity)

    # Track workflow completions
    for i in range(10):
        tracker.track_workflow_completion(f"workflow_{i}", {
            "nodes_executed": i + 1,
            "total_time": float(i + 1) * 10,
            "success": True
        })

    # Check evolution
    surface = identity.get_surface()
    print(f"Pattern count: {surface.pattern_count}")
    print(f"Position: {surface.position}")

    # Get summary
    summary = tracker.get_pattern_summary()
    print(f"Total patterns: {summary['total_patterns']}")


def example_context_identity():
    """Context-based identity representations"""
    identity = IdentityCore("device_001")
    tracker = BehavioralPatternTracker(identity)

    # Track some patterns
    tracker.track_workflow_completion("work_workflow", {
        "nodes_executed": 5,
        "total_time": 10.0,
        "success": True
    })

    # Get context representations
    work_rep = tracker.get_context_identity("work")
    personal_rep = tracker.get_context_identity("personal")
    creative_rep = tracker.get_context_identity("creative")

    print(f"Work identity position: {work_rep['position']}")
    print(f"Personal identity position: {personal_rep['position']}")
    print(f"Creative identity position: {creative_rep['position']}")


def example_identity_export():
    """Export and restore identity"""
    # Create and evolve
    identity1 = IdentityCore("device_001")
    tracker1 = BehavioralPatternTracker(identity1)

    tracker1.track_workflow_completion("test", {
        "nodes_executed": 1,
        "total_time": 1.0,
        "success": True
    })

    # Export
    exported = identity1.export_to_dict()

    # Restore
    identity2 = IdentityCore.from_dict(exported)

    # Verify
    assert identity2.get_core_hash() == identity1.get_core_hash()
    print("Identity restored successfully")


def example_preference_tracking():
    """Track preference changes"""
    identity = IdentityCore("device_001")
    tracker = BehavioralPatternTracker(identity)

    # Track preference changes
    tracker.track_preference_change("editor", "vim", "vscode", "tools")
    tracker.track_preference_change("language", "javascript", "python", "development")

    # Check evolution
    surface = identity.get_surface()
    print(f"Evolved after {surface.pattern_count} patterns")


def example_context_switching():
    """Track context switches"""
    identity = IdentityCore("device_001")
    tracker = BehavioralPatternTracker(identity)

    # Track context switches
    tracker.track_context_switch("work", "personal")
    tracker.track_context_switch("personal", "creative")
    tracker.track_context_switch("creative", "work")

    # Get context identity
    work_identity = tracker.get_context_identity("work")
    print(f"Work context identity: {work_identity['position']}")
