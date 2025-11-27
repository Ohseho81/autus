"""
Advanced integration tests for Zero Identity protocol

Tests IdentityCore → IdentitySurface → PatternTracker workflow
Tests surface evolution, context-based representations, integrations
"""

import pytest
import tempfile
import shutil
from pathlib import Path

from protocols.identity.core import IdentityCore
from protocols.identity.surface import IdentitySurface
from protocols.identity.pattern_tracker import BehavioralPatternTracker


@pytest.fixture
def identity_core():
    """Create IdentityCore instance"""
    return IdentityCore("test_device_001")


@pytest.fixture
def tracker(identity_core):
    """Create BehavioralPatternTracker"""
    return BehavioralPatternTracker(identity_core)


class TestIdentityFullWorkflow:
    """Test complete Identity workflow"""

    def test_identity_core_to_surface_to_tracker(self, identity_core):
        """Test IdentityCore → IdentitySurface → PatternTracker workflow"""
        # 1. Create core
        assert identity_core is not None
        core_hash = identity_core.get_core_hash()
        assert len(core_hash) == 64  # SHA256

        # 2. Create surface
        surface = identity_core.create_surface()
        assert surface is not None
        assert surface.core_hash == core_hash

        # 3. Create tracker
        tracker = BehavioralPatternTracker(identity_core)
        assert tracker is not None
        assert tracker.surface == surface

        # 4. Track pattern
        tracker.track_workflow_completion("test_workflow", {
            "nodes_executed": 5,
            "total_time": 10.5,
            "success": True
        })

        # 5. Verify evolution
        assert surface.pattern_count >= 1
        assert len(surface.evolution_history) >= 1


class TestIdentitySurfaceEvolution:
    """Test surface evolution over many patterns"""

    def test_surface_evolution_100_patterns(self, tracker):
        """Test surface evolution over 100+ patterns"""
        initial_state = tracker.surface.get_state()
        initial_count = initial_state['pattern_count']

        # Add 100 patterns
        for i in range(100):
            tracker.track_workflow_completion(f"workflow_{i}", {
                "nodes_executed": i,
                "total_time": float(i),
                "success": True
            })

        # Verify evolution
        final_state = tracker.surface.get_state()
        assert final_state['pattern_count'] == initial_count + 100

        # Position should have evolved
        assert final_state['position'] != initial_state['position']

        # Radius should increase (stability)
        assert final_state['radius'] >= initial_state['radius']

        # Texture should increase (diversity)
        assert final_state['texture'] >= initial_state['texture']

    def test_surface_evolution_consistency(self, tracker):
        """Test that evolution is consistent"""
        states = []

        for i in range(10):
            tracker.track_workflow_completion(f"wf_{i}", {
                "nodes_executed": 1,
                "total_time": 1.0,
                "success": True
            })
            states.append(tracker.surface.get_state())

        # Pattern count should increase consistently
        for i in range(1, len(states)):
            assert states[i]['pattern_count'] == states[i-1]['pattern_count'] + 1


class TestIdentityContextRepresentations:
    """Test context-based identity representations"""

    def test_context_representations(self, tracker):
        """Test context-based representations"""
        # Track some patterns
        for i in range(10):
            tracker.track_workflow_completion(f"wf_{i}", {
                "nodes_executed": 1,
                "total_time": 1.0,
                "success": True
            })

        # Get representations for different contexts
        work_rep = tracker.get_context_identity("work")
        personal_rep = tracker.get_context_identity("personal")
        creative_rep = tracker.get_context_identity("creative")

        # All should be valid
        assert work_rep['context'] == "work"
        assert personal_rep['context'] == "personal"
        assert creative_rep['context'] == "creative"

        # Positions should be similar but different
        assert work_rep['position'] != personal_rep['position']
        assert work_rep['position'] != creative_rep['position']

        # Base state should be same
        assert work_rep['base_state']['pattern_count'] == personal_rep['base_state']['pattern_count']

    def test_context_consistency(self, tracker):
        """Test context representation consistency"""
        # Same context should give same representation (deterministic)
        rep1 = tracker.get_context_identity("work")
        rep2 = tracker.get_context_identity("work")

        assert rep1['context'] == rep2['context']
        assert rep1['position'] == rep2['position']
        assert rep1['radius'] == rep2['radius']


class TestIdentityExportImport:
    """Test export/import cycle"""

    def test_export_import_cycle(self, tracker):
        """Test complete export/import cycle"""
        # Track patterns
        for i in range(20):
            tracker.track_workflow_completion(f"wf_{i}", {
                "nodes_executed": 1,
                "total_time": 1.0,
                "success": True
            })

        # Export
        exported = tracker.export_tracking_data()
        assert exported is not None
        assert 'identity_core' in exported
        assert 'pattern_count' in exported

        # Create new tracker from exported data
        identity_core2 = IdentityCore.from_dict(exported['identity_core'])
        tracker2 = BehavioralPatternTracker(identity_core2)

        # Verify same core hash
        assert tracker2.identity_core.get_core_hash() == tracker.identity_core.get_core_hash()

        # Verify surface exists
        assert tracker2.surface is not None

    def test_export_no_pii(self, tracker):
        """Test that export contains no PII"""
        # Track patterns
        tracker.track_workflow_completion("test", {
            "nodes_executed": 1,
            "total_time": 1.0,
            "success": True
        })

        # Export
        exported = tracker.export_tracking_data()
        exported_str = str(exported)

        # Should not contain seed
        assert "test_device_001" not in exported_str

        # Should only contain hash
        assert tracker.identity_core.get_core_hash() in exported_str


class TestIdentityMemoryIntegration:
    """Test integration with Memory OS"""

    def test_identity_with_memory_patterns(self, tracker, temp_db):
        """Test storing identity patterns in Memory OS"""
        from protocols.memory.os import MemoryOS

        memory_os = MemoryOS(db_path=temp_db)

        # Track pattern
        tracker.track_workflow_completion("test_workflow", {
            "nodes_executed": 5,
            "total_time": 10.0,
            "success": True
        })

        # Store pattern summary in memory
        pattern_summary = tracker.get_pattern_summary()
        memory_os.learn_pattern("identity_pattern", pattern_summary)

        # Verify stored
        results = memory_os.search("identity")
        assert len(results) > 0

    def test_memory_patterns_evolve_identity(self, tracker, temp_db):
        """Test that memory patterns evolve identity"""
        from protocols.memory.os import MemoryOS

        memory_os = MemoryOS(db_path=temp_db)

        # Store preferences in memory
        memory_os.set_preference("editor", "vscode")
        memory_os.set_preference("language", "python")

        # Track preference changes
        tracker.track_preference_change("editor", "vim", "vscode", "tools")
        tracker.track_preference_change("language", "javascript", "python", "tools")

        # Verify identity evolved
        assert tracker.surface.pattern_count >= 2


class TestIdentityWorkflowIntegration:
    """Test integration with Workflow Graph"""

    def test_workflow_execution_evolves_identity(self, tracker):
        """Test that workflow execution evolves identity"""
        from protocols.workflow.graph import WorkflowGraph

        # Create and execute workflow
        graph = WorkflowGraph()
        graph.add_node("start", {"type": "start"})
        graph.add_node("process", {"type": "process"})
        graph.add_edge("start", "process")

        # Track workflow execution
        tracker.track_workflow_pattern("test_workflow", "process", {
            "execution_time": 1.5,
            "success": True
        })

        # Verify evolution
        assert tracker.surface.pattern_count >= 1

    def test_multiple_workflows_evolution(self, tracker):
        """Test evolution from multiple workflows"""
        # Track multiple workflows
        for i in range(10):
            tracker.track_workflow_completion(f"workflow_{i}", {
                "nodes_executed": i + 1,
                "total_time": float(i + 1),
                "success": True
            })

        # Verify evolution
        summary = tracker.get_pattern_summary()
        assert summary['total_patterns'] >= 10

        # Surface should have evolved
        state = tracker.surface.get_state()
        assert state['pattern_count'] >= 10


@pytest.fixture
def temp_db():
    """Create temporary database"""
    temp_dir = tempfile.mkdtemp()
    db_path = Path(temp_dir) / "test_memory.db"
    yield str(db_path)
    shutil.rmtree(temp_dir)
