"""
Identity Surface

3D Identity Surface that evolves based on behavioral patterns.
No PII, only behavioral characteristics.
"""

import math
from datetime import datetime
from typing import Dict, List, Tuple, Optional
import hashlib
import json


class IdentitySurface:
    """
    3D Identity Surface

    The surface represents evolving behavioral patterns in 3D space.
    No PII - only behavioral characteristics.

    Characteristics:
    - Position (x, y, z): Current behavioral state
    - Radius: Consistency/stability
    - Texture: Pattern diversity
    - Color: Emotional tone
    """

    def __init__(self, core_hash: str):
        """
        Initialize surface from core hash

        Args:
            core_hash: SHA256 hash from IdentityCore
        """
        self.core_hash = core_hash
        self.created_at = datetime.now()

        # Initialize position from core hash
        self.position = self._hash_to_position(core_hash)

        # Surface properties
        self.radius = 1.0  # Stability
        self.texture = 0.5  # Pattern diversity
        self.color = [0.5, 0.5, 0.5]  # RGB emotional tone

        # Evolution tracking
        self.evolution_history: List[Dict] = []
        self.pattern_count = 0

    def _hash_to_position(self, hash_str: str) -> Tuple[float, float, float]:
        """
        Convert hash to 3D position

        Deterministic mapping from hash to coordinates
        """
        # Take first 24 chars (8 per coordinate)
        x_hex = hash_str[0:8]
        y_hex = hash_str[8:16]
        z_hex = hash_str[16:24]

        # Convert to [-1, 1] range
        x = (int(x_hex, 16) / 0xFFFFFFFF) * 2 - 1
        y = (int(y_hex, 16) / 0xFFFFFFFF) * 2 - 1
        z = (int(z_hex, 16) / 0xFFFFFFFF) * 2 - 1

        return (x, y, z)

    def evolve(self, pattern: Dict) -> None:
        """
        Evolve surface based on behavioral pattern

        Args:
            pattern: Behavioral pattern from Memory OS or Workflow Graph
                    {
                        'type': 'workflow_completion',
                        'context': {...},
                        'timestamp': '...',
                        'metadata': {...}
                    }
        """
        # Update pattern count
        self.pattern_count += 1

        # Extract pattern characteristics
        pattern_type = pattern.get('type', 'unknown')
        context = pattern.get('context', {})

        # Evolve position (small drift based on pattern)
        position_delta = self._calculate_position_delta(pattern)
        self.position = (
            self.position[0] + position_delta[0],
            self.position[1] + position_delta[1],
            self.position[2] + position_delta[2]
        )

        # Evolve radius (stability increases with consistency)
        self._evolve_radius(pattern)

        # Evolve texture (diversity)
        self._evolve_texture(pattern)

        # Evolve color (emotional tone)
        self._evolve_color(pattern)

        # Record evolution
        self.evolution_history.append({
            'timestamp': datetime.now().isoformat(),
            'pattern_type': pattern_type,
            'position': self.position,
            'radius': self.radius,
            'texture': self.texture,
            'color': self.color
        })

        # Keep only last 100 evolutions
        if len(self.evolution_history) > 100:
            self.evolution_history = self.evolution_history[-100:]

    def _calculate_position_delta(self, pattern: Dict) -> Tuple[float, float, float]:
        """
        Calculate position change based on pattern

        Different pattern types cause different movements
        """
        pattern_type = pattern.get('type', 'unknown')

        # Small random-ish movement based on pattern
        pattern_hash = hashlib.sha256(
            json.dumps(pattern, sort_keys=True).encode()
        ).hexdigest()

        dx = (int(pattern_hash[0:8], 16) / 0xFFFFFFFF) * 0.01 - 0.005
        dy = (int(pattern_hash[8:16], 16) / 0xFFFFFFFF) * 0.01 - 0.005
        dz = (int(pattern_hash[16:24], 16) / 0xFFFFFFFF) * 0.01 - 0.005

        return (dx, dy, dz)

    def _evolve_radius(self, pattern: Dict) -> None:
        """
        Evolve radius (stability)

        Consistent patterns increase radius
        """
        # Increase radius slowly with each pattern
        self.radius = min(2.0, self.radius * 1.001)

    def _evolve_texture(self, pattern: Dict) -> None:
        """
        Evolve texture (pattern diversity)

        Diverse patterns increase texture
        """
        # Texture moves toward 1.0 with diverse patterns
        self.texture = min(1.0, self.texture + 0.001)

    def _evolve_color(self, pattern: Dict) -> None:
        """
        Evolve color (emotional tone)

        Pattern metadata influences color
        """
        # Subtle color shift based on pattern
        pattern_hash = hashlib.sha256(
            json.dumps(pattern, sort_keys=True).encode()
        ).hexdigest()

        dr = (int(pattern_hash[24:32], 16) / 0xFFFFFFFF) * 0.01 - 0.005
        dg = (int(pattern_hash[32:40], 16) / 0xFFFFFFFF) * 0.01 - 0.005
        db = (int(pattern_hash[40:48], 16) / 0xFFFFFFFF) * 0.01 - 0.005

        self.color[0] = max(0.0, min(1.0, self.color[0] + dr))
        self.color[1] = max(0.0, min(1.0, self.color[1] + dg))
        self.color[2] = max(0.0, min(1.0, self.color[2] + db))

    def get_state(self) -> Dict:
        """
        Get current surface state

        Returns:
            Dict with current surface properties
        """
        return {
            'core_hash': self.core_hash,
            'position': self.position,
            'radius': self.radius,
            'texture': self.texture,
            'color': self.color,
            'pattern_count': self.pattern_count,
            'created_at': self.created_at.isoformat(),
            'age_seconds': (datetime.now() - self.created_at).total_seconds()
        }

    def get_context_representation(self, context: str) -> Dict:
        """
        Get identity representation for specific context

        Args:
            context: Context identifier (e.g., 'work', 'personal', 'creative')

        Returns:
            Context-specific identity representation
        """
        # Hash context to get deterministic variation
        context_hash = hashlib.sha256(context.encode()).hexdigest()

        # Slight variation based on context
        ctx_mod = int(context_hash[:8], 16) / 0xFFFFFFFF

        return {
            'context': context,
            'position': (
                self.position[0] * (1 + ctx_mod * 0.1),
                self.position[1] * (1 + ctx_mod * 0.1),
                self.position[2] * (1 + ctx_mod * 0.1)
            ),
            'radius': self.radius * (1 + ctx_mod * 0.05),
            'base_state': self.get_state()
        }

    def get_distance_to(self, other: 'IdentitySurface') -> float:
        """
        Calculate distance to another surface

        Useful for identity similarity/proximity
        """
        dx = self.position[0] - other.position[0]
        dy = self.position[1] - other.position[1]
        dz = self.position[2] - other.position[2]

        return math.sqrt(dx*dx + dy*dy + dz*dz)

    def export_to_dict(self) -> Dict:
        """Export surface to dictionary"""
        return {
            'core_hash': self.core_hash,
            'position': self.position,
            'radius': self.radius,
            'texture': self.texture,
            'color': self.color,
            'pattern_count': self.pattern_count,
            'created_at': self.created_at.isoformat(),
            'evolution_history': self.evolution_history[-10:]  # Last 10 only
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'IdentitySurface':
        """Import surface from dictionary"""
        surface = cls(data['core_hash'])
        surface.position = tuple(data['position'])
        surface.radius = data['radius']
        surface.texture = data['texture']
        surface.color = data['color']
        surface.pattern_count = data['pattern_count']
        surface.created_at = datetime.fromisoformat(data['created_at'])
        surface.evolution_history = data.get('evolution_history', [])
        return surface

