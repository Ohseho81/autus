"""
Tests for Zero Identity Protocol

Tests IdentityCore, IdentitySurface, and BehavioralPatternTracker
"""

import pytest
from datetime import datetime
from protocols.identity.core import IdentityCore
from protocols.identity.surface import IdentitySurface
from protocols.identity.tracker import BehavioralPatternTracker
from protocols.memory.pii_validator import PIIViolationError


class TestIdentityCore:
    """Tests for IdentityCore"""

    def test_core_creation(self):
        """Test IdentityCore creation"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)

        assert core.seed_hash is not None
        assert len(core.seed_hash) == 64  # SHA256 hex length
        assert core.created_at is not None

    def test_core_hash_consistency(self):
        """Test that same seed produces same hash"""
        seed = "This is a seed string of 32 bytes"
        core1 = IdentityCore(seed)
        core2 = IdentityCore(seed)

        assert core1.get_core_hash() == core2.get_core_hash()

    def test_surface_creation(self):
        """Test surface creation"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        surface = core.create_surface()

        assert surface is not None
        assert isinstance(surface, IdentitySurface)
        assert surface.core_hash == core.get_core_hash()

    def test_surface_evolution(self):
        """Test surface evolution"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        surface = core.create_surface()

        initial_position = surface.position
        initial_radius = surface.radius

        pattern = {
            'type': 'test_pattern',
            'context': {'test': 'data'},
            'timestamp': datetime.now().isoformat()
        }

        surface.evolve(pattern)

        assert surface.pattern_count == 1
        assert surface.radius > initial_radius
        assert surface.position != initial_position

    def test_export_import(self):
        """Test export and import"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        core.create_surface()

        # Evolve surface
        core.evolve_surface({
            'type': 'test',
            'context': {},
            'timestamp': datetime.now().isoformat()
        })

        # Export
        exported = core.export_to_dict()
        assert 'seed_hash' in exported
        assert 'surface' in exported

        # Import
        imported = IdentityCore.from_dict(exported)
        assert imported.seed_hash == core.seed_hash
        assert imported.surface is not None
        assert imported.surface.pattern_count == core.surface.pattern_count


class TestIdentitySurface:
    """Tests for IdentitySurface"""

    def test_surface_initialization(self):
        """Test surface initialization"""
        core_hash = "a" * 64  # Dummy hash
        surface = IdentitySurface(core_hash)

        assert surface.core_hash == core_hash
        assert surface.position is not None
        assert len(surface.position) == 3
        assert surface.radius == 1.0
        assert surface.texture == 0.5
        assert len(surface.color) == 3

    def test_position_hash_mapping(self):
        """Test deterministic position mapping"""
        core_hash = "a" * 64
        surface1 = IdentitySurface(core_hash)
        surface2 = IdentitySurface(core_hash)

        assert surface1.position == surface2.position

    def test_evolution(self):
        """Test surface evolution"""
        core_hash = "a" * 64
        surface = IdentitySurface(core_hash)

        initial_state = surface.get_state()

        pattern = {
            'type': 'test',
            'context': {'key': 'value'},
            'timestamp': datetime.now().isoformat()
        }

        surface.evolve(pattern)

        new_state = surface.get_state()
        assert new_state['pattern_count'] == 1
        assert new_state['pattern_count'] > initial_state['pattern_count']
        assert len(surface.evolution_history) == 1

    def test_context_representation(self):
        """Test context-specific representation"""
        core_hash = "a" * 64
        surface = IdentitySurface(core_hash)

        work_identity = surface.get_context_representation('work')
        personal_identity = surface.get_context_representation('personal')

        assert work_identity['context'] == 'work'
        assert personal_identity['context'] == 'personal'
        assert work_identity['position'] != personal_identity['position']

    def test_distance_calculation(self):
        """Test distance between surfaces"""
        core_hash1 = "a" * 64
        core_hash2 = "b" * 64

        surface1 = IdentitySurface(core_hash1)
        surface2 = IdentitySurface(core_hash2)

        distance = surface1.get_distance_to(surface2)
        assert distance >= 0
        assert isinstance(distance, float)

    def test_export_import(self):
        """Test surface export and import"""
        core_hash = "a" * 64
        surface = IdentitySurface(core_hash)

        # Evolve
        surface.evolve({
            'type': 'test',
            'context': {},
            'timestamp': datetime.now().isoformat()
        })

        # Export
        exported = surface.export_to_dict()

        # Import
        imported = IdentitySurface.from_dict(exported)

        assert imported.core_hash == surface.core_hash
        assert imported.position == surface.position
        assert imported.radius == surface.radius
        assert imported.pattern_count == surface.pattern_count


class TestBehavioralPatternTracker:
    """Tests for BehavioralPatternTracker"""

    def test_tracker_initialization(self):
        """Test tracker initialization"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        assert tracker.identity_core == core
        assert tracker.surface is not None

    def test_memory_pattern_tracking(self):
        """Test memory pattern tracking"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        initial_count = tracker.surface.pattern_count

        tracker.track_memory_pattern('preference_change', {'key': 'theme', 'value': 'dark'})

        assert tracker.surface.pattern_count == initial_count + 1
        assert len(tracker.pattern_history) == 1

    def test_workflow_pattern_tracking(self):
        """Test workflow pattern tracking"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        tracker.track_workflow_pattern('workflow_1', 'node_1', {
            'execution_time': 1.5,
            'success': True
        })

        assert len(tracker.pattern_history) == 1
        assert tracker.pattern_history[0]['type'] == 'workflow_execution'

    def test_preference_change_tracking(self):
        """Test preference change tracking"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        tracker.track_preference_change('theme', 'light', 'dark', 'ui')

        assert len(tracker.pattern_history) == 1
        pattern = tracker.pattern_history[0]
        assert pattern['type'] == 'preference_change'
        assert pattern['context']['key'] == 'theme'

    def test_context_switch_tracking(self):
        """Test context switch tracking"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        tracker.track_context_switch('work', 'personal')

        assert len(tracker.pattern_history) == 1
        pattern = tracker.pattern_history[0]
        assert pattern['type'] == 'context_switch'
        assert pattern['context']['old_context'] == 'work'
        assert pattern['context']['new_context'] == 'personal'

    def test_workflow_completion_tracking(self):
        """Test workflow completion tracking"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        tracker.track_workflow_completion('workflow_1', {
            'nodes_executed': 5,
            'total_time': 1.5,
            'success': True
        })

        assert len(tracker.pattern_history) == 1
        pattern = tracker.pattern_history[0]
        assert pattern['type'] == 'workflow_completion'

    def test_pii_validation(self):
        """Test PII validation in patterns"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        # Try to track pattern with PII
        with pytest.raises(PIIViolationError):
            tracker.track_preference_change('user_email', 'old@test.com', 'new@test.com')

    def test_pattern_summary(self):
        """Test pattern summary"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        tracker.track_preference_change('theme', 'light', 'dark')
        tracker.track_workflow_completion('workflow_1', {'success': True})

        summary = tracker.get_pattern_summary()

        assert summary['total_patterns'] == 2
        assert 'pattern_types' in summary
        assert 'surface_state' in summary

    def test_context_identity(self):
        """Test context-specific identity"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        work_identity = tracker.get_context_identity('work')
        personal_identity = tracker.get_context_identity('personal')

        assert work_identity['context'] == 'work'
        assert personal_identity['context'] == 'personal'
        assert work_identity['position'] != personal_identity['position']

    def test_export_tracking_data(self):
        """Test export tracking data"""
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        tracker.track_preference_change('theme', 'light', 'dark')

        exported = tracker.export_tracking_data()

        assert 'identity_core' in exported
        assert 'pattern_count' in exported
        assert 'pattern_summary' in exported
        assert exported['pattern_count'] == 1


class TestIntegration:
    """Integration tests"""

    def test_full_workflow(self):
        """Test full identity workflow"""
        # Create identity
        seed = "This is a seed string of 32 bytes"
        core = IdentityCore(seed)
        tracker = BehavioralPatternTracker(core)

        # Track various patterns
        tracker.track_preference_change('theme', 'light', 'dark', 'ui')
        tracker.track_context_switch('work', 'personal')
        tracker.track_workflow_completion('workflow_1', {
            'nodes_executed': 5,
            'total_time': 1.5,
            'success': True
        })

        # Get context identity
        work_identity = tracker.get_context_identity('work')

        # Verify
        assert tracker.surface.pattern_count == 3
        assert work_identity['context'] == 'work'
        assert 'position' in work_identity

        # Export
        exported = tracker.export_tracking_data()
        assert exported['pattern_count'] == 3





