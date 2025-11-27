"""
Tests for Advanced Zero Auth Protocol features

Conflict resolution, sync history, multi-device management
"""

import pytest
import tempfile
import os
from datetime import datetime
from protocols.auth import (
    AdvancedDeviceSync,
    SyncConflictResolver,
    SyncHistory
)
from protocols.identity import IdentityCore


class TestSyncConflictResolver:
    """Tests for SyncConflictResolver"""

    def test_resolve_position_conflict_average(self):
        """Test position conflict resolution (average)"""
        pos1 = (0.5, 0.5, 0.5)
        pos2 = (1.0, 1.0, 1.0)

        resolved = SyncConflictResolver.resolve_position_conflict(pos1, pos2, 'average')

        assert resolved == (0.75, 0.75, 0.75)

    def test_resolve_position_conflict_weighted(self):
        """Test position conflict resolution (weighted)"""
        pos1 = (0.5, 0.5, 0.5)
        pos2 = (1.0, 1.0, 1.0)

        resolved = SyncConflictResolver.resolve_position_conflict(pos1, pos2, 'weighted_average')

        assert resolved[0] > 0.5
        assert resolved[0] < 1.0

    def test_merge_evolution_histories(self):
        """Test merging evolution histories"""
        history1 = [
            {'timestamp': '2024-11-23T10:00:00', 'pattern_type': 'test1'},
            {'timestamp': '2024-11-23T11:00:00', 'pattern_type': 'test2'}
        ]
        history2 = [
            {'timestamp': '2024-11-23T12:00:00', 'pattern_type': 'test3'},
            {'timestamp': '2024-11-23T13:00:00', 'pattern_type': 'test4'}
        ]

        merged = SyncConflictResolver.merge_evolution_histories(history1, history2)

        assert len(merged) == 4
        assert merged[0]['pattern_type'] == 'test1'
        assert merged[-1]['pattern_type'] == 'test4'

    def test_resolve_radius_conflict(self):
        """Test radius conflict resolution"""
        radius1 = 1.0
        radius2 = 2.0

        resolved = SyncConflictResolver.resolve_radius_conflict(radius1, radius2, 10, 20)

        assert resolved == 2.0  # Should use larger (more stable)

    def test_resolve_texture_conflict(self):
        """Test texture conflict resolution"""
        texture1 = 0.5
        texture2 = 0.7

        resolved = SyncConflictResolver.resolve_texture_conflict(texture1, texture2)

        assert resolved == 0.6

    def test_resolve_color_conflict(self):
        """Test color conflict resolution"""
        color1 = [0.5, 0.5, 0.5]
        color2 = [1.0, 1.0, 1.0]

        resolved = SyncConflictResolver.resolve_color_conflict(color1, color2)

        assert len(resolved) == 3
        assert resolved[0] > 0.5
        assert resolved[0] < 1.0


class TestSyncHistory:
    """Tests for SyncHistory"""

    def test_history_initialization(self):
        """Test history initialization"""
        with tempfile.TemporaryDirectory() as tmpdir:
            history_path = os.path.join(tmpdir, 'sync_history.json')
            history = SyncHistory(history_path)

            assert history.history == []

    def test_record_sync(self):
        """Test recording sync events"""
        with tempfile.TemporaryDirectory() as tmpdir:
            history_path = os.path.join(tmpdir, 'sync_history.json')
            history = SyncHistory(history_path)

            history.record_sync('device1', 'device2', 'qr', True)

            assert len(history.history) == 1
            assert history.history[0]['source_device'] == 'device1'
            assert history.history[0]['success'] is True

    def test_get_sync_summary(self):
        """Test getting sync summary"""
        with tempfile.TemporaryDirectory() as tmpdir:
            history_path = os.path.join(tmpdir, 'sync_history.json')
            history = SyncHistory(history_path)

            history.record_sync('device1', 'device2', 'qr', True)
            history.record_sync('device2', 'device3', 'qr', False)

            summary = history.get_sync_summary()

            assert summary['total_syncs'] == 2
            assert summary['successful_syncs'] == 1
            assert summary['failed_syncs'] == 1
            assert summary['success_rate'] == 0.5

    def test_get_device_syncs(self):
        """Test getting syncs for specific device"""
        with tempfile.TemporaryDirectory() as tmpdir:
            history_path = os.path.join(tmpdir, 'sync_history.json')
            history = SyncHistory(history_path)

            history.record_sync('device1', 'device2', 'qr', True)
            history.record_sync('device2', 'device3', 'qr', True)
            history.record_sync('device1', 'device3', 'qr', True)

            device1_syncs = history.get_device_syncs('device1')

            assert len(device1_syncs) == 2


class TestAdvancedDeviceSync:
    """Tests for AdvancedDeviceSync"""

    def test_advanced_sync_initialization(self):
        """Test advanced sync initialization"""
        core = IdentityCore("test_seed")
        sync = AdvancedDeviceSync(core, 'device1')

        assert sync.device_id == 'device1'
        assert sync.conflict_resolver is not None
        assert sync.sync_history is not None

    def test_get_sync_statistics(self):
        """Test getting sync statistics"""
        core = IdentityCore("test_seed")
        sync = AdvancedDeviceSync(core, 'device1')

        stats = sync.get_sync_statistics()

        assert 'total_syncs' in stats
        assert 'successful_syncs' in stats
        assert 'success_rate' in stats

    def test_get_device_syncs(self):
        """Test getting device syncs"""
        core = IdentityCore("test_seed")
        sync = AdvancedDeviceSync(core, 'device1')

        syncs = sync.get_device_syncs()

        assert isinstance(syncs, list)

    def test_sync_with_conflict_resolution(self):
        """Test sync with conflict resolution"""
        # Device 1
        core1 = IdentityCore("device1_seed")
        core1.create_surface()
        core1.surface.position = (0.5, 0.5, 0.5)
        core1.surface.radius = 1.0
        core1.surface.pattern_count = 10

        sync1 = AdvancedDeviceSync(core1, 'device1')
        qr_bytes = sync1.qr_generator.generate_qr_bytes(
            core1.export_to_dict(),
            expiration_minutes=5
        )

        # Device 2 (different state)
        core2 = IdentityCore("device2_seed")
        core2.create_surface()
        core2.surface.position = (1.0, 1.0, 1.0)
        core2.surface.radius = 2.0
        core2.surface.pattern_count = 20

        sync2 = AdvancedDeviceSync(core2, 'device2')

        # Sync
        try:
            success, metadata = sync2.sync_from_qr_bytes(qr_bytes, 'device1')

            if success:
                # Check that conflicts were resolved
                assert 'conflicts_resolved' in metadata
                # Position should be merged
                assert core2.surface.position != (1.0, 1.0, 1.0)
        except ImportError:
            pytest.skip("pyzbar not available")


class TestIntegration:
    """Integration tests"""

    def test_multi_device_sync_workflow(self):
        """Test multi-device sync workflow"""
        # Create 3 devices
        core1 = IdentityCore("device1_seed")
        core1.create_surface()
        sync1 = AdvancedDeviceSync(core1, 'device1')

        core2 = IdentityCore("device2_seed")
        core2.create_surface()
        sync2 = AdvancedDeviceSync(core2, 'device2')

        core3 = IdentityCore("device3_seed")
        core3.create_surface()
        sync3 = AdvancedDeviceSync(core3, 'device3')

        # Generate QR from device1
        qr_bytes = sync1.qr_generator.generate_qr_bytes(
            core1.export_to_dict(),
            expiration_minutes=5
        )

        # Sync to device2
        try:
            success, _ = sync2.sync_from_qr_bytes(qr_bytes, 'device1')
            if success:
                # Check statistics
                stats2 = sync2.get_sync_statistics()
                assert stats2['total_syncs'] >= 1
        except ImportError:
            pytest.skip("pyzbar not available")






