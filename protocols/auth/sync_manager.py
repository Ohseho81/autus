"""
Zero Auth Protocol - Advanced Sync Management

Conflict resolution, multi-device management, sync history tracking
"""

import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from pathlib import Path
from protocols.identity.core import IdentityCore
from protocols.auth.qr_sync import DeviceSync


class SyncConflictResolver:
    """
    Resolve conflicts when syncing identities from multiple devices
    """

    @staticmethod
    def resolve_position_conflict(
        pos1: Tuple[float, float, float],
        pos2: Tuple[float, float, float],
        strategy: str = 'weighted_average'
    ) -> Tuple[float, float, float]:
        """
        Resolve position conflicts

        Args:
            pos1: Position from device 1
            pos2: Position from device 2
            strategy: 'average', 'weighted_average', 'newer', 'older'

        Returns:
            Resolved position
        """
        if strategy == 'average':
            return (
                (pos1[0] + pos2[0]) / 2,
                (pos1[1] + pos2[1]) / 2,
                (pos1[2] + pos2[2]) / 2
            )
        elif strategy == 'weighted_average':
            # Weight by pattern count (more patterns = more weight)
            return (
                (pos1[0] * 0.6 + pos2[0] * 0.4),
                (pos1[1] * 0.6 + pos2[1] * 0.4),
                (pos1[2] * 0.6 + pos2[2] * 0.4)
            )
        elif strategy == 'newer':
            return pos2  # Assume pos2 is newer
        else:  # older
            return pos1

    @staticmethod
    def merge_evolution_histories(
        history1: List[Dict],
        history2: List[Dict],
        max_size: int = 100
    ) -> List[Dict]:
        """
        Merge evolution histories from two devices

        Args:
            history1: History from device 1
            history2: History from device 2
            max_size: Maximum history size

        Returns:
            Merged and sorted history
        """
        # Combine and sort by timestamp
        combined = history1 + history2
        combined.sort(key=lambda x: x.get('timestamp', ''))

        # Remove duplicates (same timestamp and pattern_type)
        seen = set()
        unique = []
        for item in combined:
            key = (item.get('timestamp'), item.get('pattern_type'))
            if key not in seen:
                seen.add(key)
                unique.append(item)

        # Return last N items
        return unique[-max_size:]

    @staticmethod
    def resolve_radius_conflict(
        radius1: float,
        radius2: float,
        pattern_count1: int,
        pattern_count2: int
    ) -> float:
        """
        Resolve radius conflicts (stability)

        Args:
            radius1: Radius from device 1
            radius2: Radius from device 2
            pattern_count1: Pattern count from device 1
            pattern_count2: Pattern count from device 2

        Returns:
            Resolved radius
        """
        # Use the larger radius (more stable)
        return max(radius1, radius2)

    @staticmethod
    def resolve_texture_conflict(
        texture1: float,
        texture2: float
    ) -> float:
        """
        Resolve texture conflicts (diversity)

        Args:
            texture1: Texture from device 1
            texture2: Texture from device 2

        Returns:
            Resolved texture (average)
        """
        return (texture1 + texture2) / 2

    @staticmethod
    def resolve_color_conflict(
        color1: List[float],
        color2: List[float]
    ) -> List[float]:
        """
        Resolve color conflicts (emotional tone)

        Args:
            color1: Color from device 1 [R, G, B]
            color2: Color from device 2 [R, G, B]

        Returns:
            Resolved color (weighted average)
        """
        return [
            (color1[0] * 0.6 + color2[0] * 0.4),
            (color1[1] * 0.6 + color2[1] * 0.4),
            (color1[2] * 0.6 + color2[2] * 0.4)
        ]


class SyncHistory:
    """
    Track synchronization history
    """

    def __init__(self, storage_path: str = ".autus/auth/sync_history.json"):
        """
        Initialize sync history

        Args:
            storage_path: Path to store sync history
        """
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        self.history: List[Dict] = []
        self._load_history()

    def _load_history(self) -> None:
        """Load history from file"""
        if self.storage_path.exists():
            try:
                with open(self.storage_path, 'r') as f:
                    self.history = json.load(f)
            except Exception:
                self.history = []
        else:
            self.history = []

    def _save_history(self) -> None:
        """Save history to file"""
        try:
            with open(self.storage_path, 'w') as f:
                json.dump(self.history, f, indent=2)
        except Exception:
            pass

    def record_sync(
        self,
        source_device: str,
        target_device: str,
        sync_type: str,
        success: bool,
        metadata: Optional[Dict] = None
    ) -> None:
        """
        Record a sync event

        Args:
            source_device: Source device identifier
            target_device: Target device identifier
            sync_type: Type of sync ('qr', 'manual', etc.)
            success: Whether sync was successful
            metadata: Additional metadata
        """
        record = {
            'timestamp': datetime.now().isoformat(),
            'source_device': source_device,
            'target_device': target_device,
            'sync_type': sync_type,
            'success': success,
            'metadata': metadata or {}
        }

        self.history.append(record)

        # Keep only last 1000 records
        if len(self.history) > 1000:
            self.history = self.history[-1000:]

        self._save_history()

    def get_sync_summary(self) -> Dict:
        """
        Get sync summary statistics

        Returns:
            Dictionary with sync statistics
        """
        if not self.history:
            return {
                'total_syncs': 0,
                'successful_syncs': 0,
                'failed_syncs': 0,
                'success_rate': 0.0,
                'sync_types': {},
                'recent_syncs': []
            }

        successful = sum(1 for h in self.history if h.get('success', False))
        failed = len(self.history) - successful

        sync_types = {}
        for h in self.history:
            stype = h.get('sync_type', 'unknown')
            sync_types[stype] = sync_types.get(stype, 0) + 1

        return {
            'total_syncs': len(self.history),
            'successful_syncs': successful,
            'failed_syncs': failed,
            'success_rate': successful / len(self.history) if self.history else 0,
            'sync_types': sync_types,
            'recent_syncs': self.history[-10:]  # Last 10
        }

    def get_device_syncs(self, device_id: str) -> List[Dict]:
        """
        Get all syncs for a specific device

        Args:
            device_id: Device identifier

        Returns:
            List of sync records
        """
        return [
            h for h in self.history
            if h.get('source_device') == device_id or h.get('target_device') == device_id
        ]


class AdvancedDeviceSync(DeviceSync):
    """
    Advanced device sync with conflict resolution and history tracking
    """

    def __init__(self, identity_core: IdentityCore, device_id: Optional[str] = None):
        """
        Initialize advanced device sync

        Args:
            identity_core: IdentityCore instance
            device_id: Device identifier (optional, uses hash if not provided)
        """
        super().__init__(identity_core)
        # Use seed hash for device ID
        import hashlib
        seed_hash = hashlib.sha256(identity_core.seed.encode('utf-8') if isinstance(identity_core.seed, str) else identity_core.seed).hexdigest()
        self.device_id = device_id or seed_hash[:16]
        self.conflict_resolver = SyncConflictResolver()
        self.sync_history = SyncHistory()

    def sync_from_qr_bytes(self, qr_image_bytes: bytes, source_device_id: Optional[str] = None) -> Tuple[bool, Dict]:
        """
        Sync identity from QR code bytes with conflict resolution

        Args:
            qr_image_bytes: PNG image bytes
            source_device_id: Source device identifier

        Returns:
            Tuple of (success, sync_metadata)
        """
        identity_data = self.qr_scanner.scan_from_bytes(qr_image_bytes)

        if identity_data is None:
            self.sync_history.record_sync(
                source_device_id or 'unknown',
                self.device_id,
                'qr',
                False,
                {'error': 'failed_to_scan'}
            )
            return False, {'error': 'failed_to_scan'}

        # Import identity
        try:
            # IdentityCore uses import_from_sync() for base64 sync data
            if 'sync_data' in identity_data:
                synced_identity = IdentityCore.import_from_sync(identity_data['sync_data'])
            else:
                # Fallback: try to create from seed_hash if available
                if 'seed_hash' in identity_data:
                    synced_identity = IdentityCore(identity_data['seed_hash'].encode())
                else:
                    raise ValueError("No sync_data or seed_hash in identity_data")
            
            # Restore surface if present
            if 'surface' in identity_data and identity_data.get('surface'):
                from protocols.identity.surface import IdentitySurface
                synced_identity.surface = IdentitySurface.from_dict(identity_data['surface'])

            sync_metadata = {
                'source_pattern_count': synced_identity.surface.pattern_count if synced_identity.surface else 0,
                'target_pattern_count': self.identity_core.surface.pattern_count if self.identity_core.surface else 0,
                'conflicts_resolved': []
            }

            # Merge surfaces if both exist
            if synced_identity.surface and self.identity_core.surface:
                # Resolve conflicts
                pos1 = self.identity_core.surface.position
                pos2 = synced_identity.surface.position
                resolved_pos = self.conflict_resolver.resolve_position_conflict(pos1, pos2)
                sync_metadata['conflicts_resolved'].append('position')

                radius1 = self.identity_core.surface.radius
                radius2 = synced_identity.surface.radius
                resolved_radius = self.conflict_resolver.resolve_radius_conflict(
                    radius1, radius2,
                    self.identity_core.surface.pattern_count,
                    synced_identity.surface.pattern_count
                )
                sync_metadata['conflicts_resolved'].append('radius')

                texture1 = self.identity_core.surface.texture
                texture2 = synced_identity.surface.texture
                resolved_texture = self.conflict_resolver.resolve_texture_conflict(texture1, texture2)
                sync_metadata['conflicts_resolved'].append('texture')

                color1 = self.identity_core.surface.color
                color2 = synced_identity.surface.color
                resolved_color = self.conflict_resolver.resolve_color_conflict(color1, color2)
                sync_metadata['conflicts_resolved'].append('color')

                # Merge evolution histories
                merged_history = self.conflict_resolver.merge_evolution_histories(
                    self.identity_core.surface.evolution_history,
                    synced_identity.surface.evolution_history
                )

                # Apply resolved values
                self.identity_core.surface.position = resolved_pos
                self.identity_core.surface.radius = resolved_radius
                self.identity_core.surface.texture = resolved_texture
                self.identity_core.surface.color = resolved_color
                self.identity_core.surface.evolution_history = merged_history

                # Update pattern count (sum)
                self.identity_core.surface.pattern_count = max(
                    self.identity_core.surface.pattern_count,
                    synced_identity.surface.pattern_count
                )

            # Record successful sync
            self.sync_history.record_sync(
                source_device_id or 'unknown',
                self.device_id,
                'qr',
                True,
                sync_metadata
            )

            return True, sync_metadata

        except Exception as e:
            self.sync_history.record_sync(
                source_device_id or 'unknown',
                self.device_id,
                'qr',
                False,
                {'error': str(e)}
            )
            return False, {'error': str(e)}

    def get_sync_statistics(self) -> Dict:
        """
        Get sync statistics

        Returns:
            Dictionary with sync statistics
        """
        return self.sync_history.get_sync_summary()

    def get_device_syncs(self) -> List[Dict]:
        """
        Get all syncs for this device

        Returns:
            List of sync records
        """
        return self.sync_history.get_device_syncs(self.device_id)
