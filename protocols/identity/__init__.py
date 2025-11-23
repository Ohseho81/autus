"""
Zero Identity Protocol

3D Identity System without PII
"""

from protocols.identity.core import IdentityCore
from protocols.identity.surface import IdentitySurface
# Import from pattern_tracker.py (newer version with integrations)
from protocols.identity.pattern_tracker import (
    BehavioralPatternTracker,
    WorkflowIntegration,
    MemoryIntegration
)

__all__ = [
    'IdentityCore',
    'IdentitySurface',
    'BehavioralPatternTracker',
    'WorkflowIntegration',
    'MemoryIntegration'
]
