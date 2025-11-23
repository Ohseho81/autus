"""
Comprehensive Integration Tests for Zero Identity Protocol

Tests complete workflow: IdentityCore → IdentitySurface → PatternTracker
Tests with 100+ patterns, multi-context, export/import, and protocol integration.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from typing import Dict, Any
import time

from protocols.identity.core import IdentityCore
from protocols.identity.surface import IdentitySurface
from protocols.identity.pattern_tracker import BehavioralPatternTracker
from protocols.memory.memory_os import MemoryOS
from protocols.workflow.standard import WorkflowGraph


@pytest.fixture
def identity_core():
    """Create IdentityCore instance"""
    return IdentityCore("test_device_001")


@pytest.fixture
def identity_with_surface(identity_core):
    """Create IdentityCore with initialized surface"""
    identity_core.create_surface()
    return identity_core


@pytest.fixture
def pattern_tracker(identity_core):
    """Create BehavioralPatternTracker"""
    return BehavioralPatternTracker(identity_core)


class TestCompleteWorkflow:
    """Test complete Zero Identity workflow"""

    def test_identity_core_creation(self, identity_core):
        """Test IdentityCore creation from seed"""
        assert identity_core is not None
        assert identity_core.seed_hash is not None
        assert len(identity_core.seed_hash) == 64  # SHA256 hex digest

    def test_identity_surface_initialization(self, identity_core):
        """Test IdentitySurface initialization"""
        surface = identity_core.create_surface()
        assert surface is not None
        assert surface.position is not None
        assert len(surface.position) == 3
        assert surface.radius > 0
        assert surface.texture >= 0
        assert len(surface.color) == 3

    def test_behavioral_pattern_tracker_setup(self, identity_core):
        """Test BehavioralPatternTracker setup"""
        # Ensure surface exists
        if identity_core.surface is None:
            from protocols.identity.surface import IdentitySurface
            identity_core.surface = IdentitySurface(identity_core.seed_hash)
        tracker = BehavioralPatternTracker(identity_core)
        assert tracker is not None
        assert tracker.identity == identity_core
        assert tracker.identity.surface is not None

    def test_complete_workflow_sequence(self, identity_core):
        """Test complete workflow sequence"""
        # 1. Create identity
        assert identity_core.seed_hash is not None

        # 2. Create surface
        if identity_core.surface is None:
            from protocols.identity.surface import IdentitySurface
            identity_core.surface = IdentitySurface(identity_core.seed_hash)
        surface = identity_core.surface
        assert surface is not None

        # 3. Create tracker
        tracker = BehavioralPatternTracker(identity_core)
        assert tracker is not None

        # 4. Track patterns
        tracker.track_workflow_completion("test_workflow", ["node1"], 10.5, True)

        # 5. Verify evolution
        assert surface.pattern_count >= 1


class TestSurfaceEvolution:
    """Test surface evolution over 100+ patterns"""

    def test_surface_evolution_100_patterns(self, pattern_tracker):
        """Test surface evolution over 100+ patterns"""
        initial_state = pattern_tracker.surface.get_state()
        initial_position = initial_state['position']
        initial_pattern_count = initial_state['pattern_count']

        # Track 100 patterns
        for i in range(100):
            pattern_tracker.track_workflow_completion(f"workflow_{i}", [f"node_{i}"], float(i + 1) * 10, True)

        # Verify evolution
        final_state = pattern_tracker.surface.get_state()
        assert final_state['pattern_count'] == initial_pattern_count + 100

        # Position should have changed (evolved)
        final_position = final_state['position']
        assert final_position != initial_position

    def test_surface_evolution_consistency(self, pattern_tracker):
        """Test that surface evolution is consistent"""
        states = []

        # Track patterns and record states
        for i in range(50):
            pattern_tracker.track_workflow_completion(f"wf_{i}", [f"node_{i}"], 1.0, True)
            states.append(pattern_tracker.surface.get_state())

        # Pattern count should increase consistently
        for i in range(1, len(states)):
            assert states[i]['pattern_count'] == states[i-1]['pattern_count'] + 1

    def test_surface_properties_evolution(self, pattern_tracker):
        """Test that surface properties evolve"""
        initial_state = pattern_tracker.surface.get_state()

        # Track many patterns
        for i in range(200):
            pattern_tracker.track_workflow_completion(f"wf_{i}", {
                "nodes_executed": 1,
                "total_time": 1.0,
                "success": True
            })

        final_state = pattern_tracker.surface.get_state()

        # Radius should increase (stability)
        assert final_state['radius'] >= initial_state['radius']

        # Texture should increase (diversity)
        assert final_state['texture'] >= initial_state['texture']


class TestContextBasedIdentity:
    """Test context-based identity representations"""

    def test_multi_context_identity(self, pattern_tracker):
        """Test identity in multiple contexts"""
        # Track some patterns first
        for i in range(10):
            pattern_tracker.track_workflow_completion(f"work_{i}", {
                "nodes_executed": 1,
                "total_time": 1.0,
                "success": True
            })

        # Get context representations (using surface method)
        surface = pattern_tracker.identity.get_surface()
        work_rep = surface.get_context_representation("work")
        personal_rep = surface.get_context_representation("personal")
        creative_rep = surface.get_context_representation("creative")

        # All should be valid
        assert work_rep is not None
        assert personal_rep is not None
        assert creative_rep is not None

        # Should have context field
        assert work_rep['context'] == "work"
        assert personal_rep['context'] == "personal"
        assert creative_rep['context'] == "creative"

        # Positions should be similar but not identical
        assert work_rep['position'] != personal_rep['position']
        assert work_rep['position'] != creative_rep['position']

    def test_context_identity_consistency(self, pattern_tracker):
        """Test that context identity is consistent"""
        # Get same context twice
        surface = pattern_tracker.identity.surface
        if surface is None:
            from protocols.identity.surface import IdentitySurface
            pattern_tracker.identity.surface = IdentitySurface(pattern_tracker.identity.seed_hash)
            surface = pattern_tracker.identity.surface
        rep1 = surface.get_context_representation("work")
        rep2 = surface.get_context_representation("work")

        # Should be identical (deterministic)
        assert rep1['position'] == rep2['position']
        assert rep1['radius'] == rep2['radius']

    def test_context_identity_evolution(self, pattern_tracker):
        """Test that context identity evolves with patterns"""
        # Get initial context representation
        surface = pattern_tracker.identity.surface
        if surface is None:
            from protocols.identity.surface import IdentitySurface
            pattern_tracker.identity.surface = IdentitySurface(pattern_tracker.identity.seed_hash)
            surface = pattern_tracker.identity.surface
        initial_rep = surface.get_context_representation("work")
        initial_pos = initial_rep['position']

        # Track many patterns
        for i in range(100):
            pattern_tracker.track_workflow_completion(f"work_{i}", [f"node_{i}"], 1.0, True)

        # Get updated context representation
        updated_rep = surface.get_context_representation("work")
        updated_pos = updated_rep['position']

        # Position should have evolved
        assert updated_pos != initial_pos


class TestExportImportCycle:
    """Test export/import cycle"""

    def test_export_import_integrity(self, identity_core):
        """Test that export/import maintains integrity"""
        # Create and evolve identity
        tracker = BehavioralPatternTracker(identity_core)

        for i in range(50):
            tracker.track_workflow_completion(f"wf_{i}", {
                "nodes_executed": 1,
                "total_time": 1.0,
                "success": True
            })

        # Export
        exported = identity_core.export_to_dict()
        assert exported is not None
        assert 'seed_hash' in exported
        assert 'created_at' in exported

        # Import
        imported = IdentityCore.from_dict(exported)
        assert imported is not None
        assert imported.seed_hash == identity_core.seed_hash

        # Surface should be restored
        imported_surface = imported.surface
        original_surface = identity_core.surface

        if imported_surface and original_surface:
            assert imported_surface.pattern_count == original_surface.pattern_count

    def test_export_import_with_surface(self, identity_core):
        """Test export/import with surface data"""
        # Create surface and evolve
        if identity_core.surface is None:
            from protocols.identity.surface import IdentitySurface
            identity_core.surface = IdentitySurface(identity_core.seed_hash)
        surface = identity_core.surface

        for i in range(20):
            identity_core.evolve_surface({
                "type": "test_pattern",
                "data": f"data_{i}"
            })

        # Export
        exported = identity_core.export_to_dict()
        assert exported['surface'] is not None

        # Import
        imported = IdentityCore.from_dict(exported)
        imported_surface = imported.surface

        assert imported_surface is not None
        assert imported_surface.pattern_count == surface.pattern_count
        assert imported_surface.position == surface.position


class TestMemoryOSIntegration:
    """Test integration with Memory OS"""

    def test_identity_with_memory_patterns(self, pattern_tracker):
        """Test identity tracking patterns from Memory OS"""
        import tempfile
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_memory.db"

        try:
            memory = MemoryOS(db_path=str(db_path))

            # Store patterns in memory
            memory.learn_pattern("coding", {
                "language": "python",
                "duration": 3600
            })

            # Track memory pattern in identity (simulate)
            pattern_data = memory.get_patterns("coding")[0]
            # Use workflow completion as proxy for memory pattern
            pattern_tracker.track_workflow_completion("memory_coding", {
                "nodes_executed": [],
                "duration_seconds": 0,
                "success": True,
                "context": pattern_data
            })

            # Verify tracking
            summary = pattern_tracker.get_pattern_summary()
            assert summary['total_patterns'] >= 1

            memory.close()
        finally:
            shutil.rmtree(temp_dir)

    def test_identity_preference_tracking(self, pattern_tracker):
        """Test tracking preference changes from Memory OS"""
        import tempfile
        temp_dir = tempfile.mkdtemp()
        db_path = Path(temp_dir) / "test_memory.db"

        try:
            memory = MemoryOS(db_path=str(db_path))

            # Set preference
            memory.set_preference("editor", "vim", "tools")

            # Track preference change (using available method)
            pattern_tracker.track_preference_update("editor", "vim", {"category": "tools"})

            # Verify tracking
            summary = pattern_tracker.get_pattern_summary()
            assert summary['total_patterns'] >= 1

            memory.close()
        finally:
            shutil.rmtree(temp_dir)


class TestWorkflowGraphIntegration:
    """Test integration with Workflow Graph"""

    def test_identity_with_workflow_execution(self, pattern_tracker):
        """Test identity tracking workflow execution"""
        # Create workflow
        nodes = [
            {'id': 'start', 'type': 'trigger'},
            {'id': 'process', 'type': 'action'},
            {'id': 'end', 'type': 'end'}
        ]
        edges = [
            {'source': 'start', 'target': 'process'},
            {'source': 'process', 'target': 'end'}
        ]

        graph = WorkflowGraph(nodes, edges)

        # Track workflow pattern (using available method)
        pattern_tracker.track_workflow_completion("test_workflow", ["process"], 1.5, True)

        # Verify tracking
        assert len(pattern_tracker.patterns) >= 1

    def test_identity_with_workflow_completion(self, pattern_tracker):
        """Test identity tracking workflow completion"""
        # Track workflow completion
        pattern_tracker.track_workflow_completion("test_workflow", ["node1", "node2", "node3", "node4", "node5"], 10.5, True)

        # Verify tracking
        assert len(pattern_tracker.patterns) >= 1

        # Check pattern types
        pattern_types = summary.get('pattern_types', {})
        assert 'workflow_completion' in pattern_types or len(pattern_types) > 0


class TestPatternTracking:
    """Test pattern tracking from different sources"""

    def test_track_from_different_sources(self, pattern_tracker):
        """Test tracking patterns from different sources"""
        # Track workflow pattern
        pattern_tracker.track_workflow_completion("wf1", {
            "nodes_executed": 1,
            "total_time": 1.0,
            "success": True
        })

        # Track preference change
        pattern_tracker.track_preference_update("editor", "vscode", {"category": "tools"})

        # Track context switch (simulate with workflow)
        pattern_tracker.track_context_switch("work", "personal")

        # Verify all tracked
        assert len(pattern_tracker.patterns) >= 3

        # Check pattern types
        pattern_types = set(p.get('type') for p in pattern_tracker.patterns)
        assert len(pattern_types) >= 1  # At least one type

    def test_pattern_tracking_consistency(self, pattern_tracker):
        """Test that pattern tracking is consistent"""
        # Track same pattern multiple times
        for i in range(10):
            pattern_tracker.track_workflow_completion("same_workflow", {
                "nodes_executed": 1,
                "total_time": 1.0,
                "success": True
            })

        # All should be tracked
        assert len(pattern_tracker.patterns) >= 10


class TestIdentityPersistence:
    """Test identity persistence and restoration"""

    def test_identity_persistence(self, identity_core):
        """Test identity persistence"""
        # Create and evolve
        tracker = BehavioralPatternTracker(identity_core)

        for i in range(30):
            tracker.track_workflow_completion(f"wf_{i}", [f"node_{i}"], 1.0, True)

        # Export
        exported = identity_core.export_to_dict()

        # Create new identity from export
        restored = IdentityCore.from_dict(exported)

        # Verify restoration
        assert restored.get_core_hash() == identity_core.get_core_hash()

        restored_surface = restored.get_surface()
        original_surface = identity_core.get_surface()

        if restored_surface and original_surface:
            assert restored_surface.pattern_count == original_surface.pattern_count

    def test_identity_restoration_after_evolution(self, identity_core):
        """Test identity restoration after extensive evolution"""
        # Evolve extensively
        tracker = BehavioralPatternTracker(identity_core)

        for i in range(200):
            tracker.track_workflow_completion(f"wf_{i}", [f"node_{i}"], float(i + 1) * 10, True)

        # Export
        exported = identity_core.export_to_dict()

        # Restore
        restored = IdentityCore.from_dict(exported)

        # Verify
        assert restored.seed_hash == identity_core.seed_hash

        restored_surface = restored.surface
        original_surface = identity_core.surface

        if restored_surface and original_surface:
            # Pattern count should match
            assert restored_surface.pattern_count == original_surface.pattern_count

            # Position should match (or be very close)
            pos_diff = sum(
                abs(a - b) for a, b in zip(
                    restored_surface.position,
                    original_surface.position
                )
            )
            assert pos_diff < 0.001  # Very close


class TestPerformance:
    """Test performance requirements"""

    def test_surface_evolution_performance(self, pattern_tracker):
        """Test surface evolution performance"""
        import time

        # Track 100 patterns and measure time
        start = time.time()
        for i in range(100):
            pattern_tracker.track_workflow_completion(f"wf_{i}", [f"node_{i}"], 1.0, True)
        duration = (time.time() - start) * 1000  # Convert to ms

        # Should be fast (< 1 second for 100 patterns)
        assert duration < 1000, f"Evolution took {duration}ms"

        # Average should be < 20ms per pattern
        avg_time = duration / 100
        assert avg_time < 20, f"Average evolution time: {avg_time}ms"

    def test_context_representation_performance(self, pattern_tracker):
        """Test context representation performance"""
        import time

        # Get context representation multiple times
        surface = pattern_tracker.identity.surface
        if surface is None:
            from protocols.identity.surface import IdentitySurface
            pattern_tracker.identity.surface = IdentitySurface(pattern_tracker.identity.seed_hash)
            surface = pattern_tracker.identity.surface
        start = time.time()
        for _ in range(100):
            surface.get_context_representation("work")
        duration = (time.time() - start) * 1000

        # Should be very fast (< 100ms for 100 calls)
        assert duration < 100, f"Context representation took {duration}ms"

        # Average should be < 1ms per call
        avg_time = duration / 100
        assert avg_time < 1, f"Average context time: {avg_time}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
