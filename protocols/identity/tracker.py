"""
Behavioral Pattern Tracker

Tracks behavioral patterns from Memory OS and Workflow Graph
and evolves Identity Surface accordingly.

No PII - only behavioral characteristics.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

from protocols.identity.core import IdentityCore
from protocols.identity.surface import IdentitySurface

logger = logging.getLogger(__name__)


class BehavioralPatternTracker:
    """
    Tracks behavioral patterns and evolves Identity Surface

    Integrates with:
    - MemoryOS: Preference and pattern changes
    - WorkflowGraph: Workflow execution patterns
    """

    def __init__(self, identity_core: IdentityCore):
        """
        Initialize tracker with Identity Core

        Args:
            identity_core: IdentityCore instance
        """
        self.identity_core = identity_core
        self.surface = identity_core.get_surface() or identity_core.create_surface()

        # Pattern tracking
        self.pattern_history: List[Dict] = []
        self.last_pattern_time: Optional[datetime] = None

    def track_memory_pattern(self, pattern_type: str, pattern_data: Dict[str, Any]) -> None:
        """
        Track pattern from Memory OS

        Args:
            pattern_type: Type of pattern (e.g., 'preference_change', 'context_switch')
            pattern_data: Pattern data from MemoryOS
        """
        pattern = {
            'type': f'memory_{pattern_type}',
            'source': 'memory_os',
            'context': pattern_data,
            'timestamp': datetime.now().isoformat(),
            'metadata': {
                'pattern_type': pattern_type,
                'data_keys': list(pattern_data.keys()) if isinstance(pattern_data, dict) else []
            }
        }

        self._process_pattern(pattern)

    def track_workflow_pattern(self, workflow_id: str, node_id: str,
                              execution_data: Dict[str, Any]) -> None:
        """
        Track pattern from Workflow Graph execution

        Args:
            workflow_id: Workflow identifier
            node_id: Node that was executed
            execution_data: Execution metadata
        """
        pattern = {
            'type': 'workflow_execution',
            'source': 'workflow_graph',
            'context': {
                'workflow_id': workflow_id,
                'node_id': node_id,
                'execution_data': execution_data
            },
            'timestamp': datetime.now().isoformat(),
            'metadata': {
                'workflow_id': workflow_id,
                'node_id': node_id,
                'execution_time': execution_data.get('execution_time', 0),
                'success': execution_data.get('success', True)
            }
        }

        self._process_pattern(pattern)

    def track_preference_change(self, key: str, old_value: Any, new_value: Any,
                               category: str = "general") -> None:
        """
        Track preference change from MemoryOS

        Args:
            key: Preference key
            old_value: Previous value
            new_value: New value
            category: Preference category
        """
        pattern = {
            'type': 'preference_change',
            'source': 'memory_os',
            'context': {
                'key': key,
                'category': category,
                'value_change': {
                    'old': str(old_value)[:50],  # Truncate to avoid PII
                    'new': str(new_value)[:50]
                }
            },
            'timestamp': datetime.now().isoformat(),
            'metadata': {
                'category': category,
                'has_change': old_value != new_value
            }
        }

        self._process_pattern(pattern)

    def track_context_switch(self, old_context: str, new_context: str) -> None:
        """
        Track context switch

        Args:
            old_context: Previous context
            new_context: New context
        """
        pattern = {
            'type': 'context_switch',
            'source': 'memory_os',
            'context': {
                'old_context': old_context,
                'new_context': new_context
            },
            'timestamp': datetime.now().isoformat(),
            'metadata': {
                'context_change': old_context != new_context
            }
        }

        self._process_pattern(pattern)

    def track_workflow_completion(self, workflow_id: str,
                                 completion_data: Dict[str, Any]) -> None:
        """
        Track workflow completion

        Args:
            workflow_id: Workflow identifier
            completion_data: Completion metadata
        """
        pattern = {
            'type': 'workflow_completion',
            'source': 'workflow_graph',
            'context': {
                'workflow_id': workflow_id,
                'completion_data': completion_data
            },
            'timestamp': datetime.now().isoformat(),
            'metadata': {
                'workflow_id': workflow_id,
                'nodes_executed': completion_data.get('nodes_executed', 0),
                'total_time': completion_data.get('total_time', 0),
                'success': completion_data.get('success', True)
            }
        }

        self._process_pattern(pattern)

    def _process_pattern(self, pattern: Dict) -> None:
        """
        Process pattern and evolve surface

        Args:
            pattern: Pattern dictionary
        """
        # Validate pattern (no PII)
        self._validate_pattern(pattern)

        # Evolve surface
        self.surface.evolve(pattern)

        # Record in history
        self.pattern_history.append(pattern)
        self.last_pattern_time = datetime.now()

        # Keep only last 1000 patterns
        if len(self.pattern_history) > 1000:
            self.pattern_history = self.pattern_history[-1000:]

        logger.debug(f"Pattern tracked: {pattern['type']}")

    def _validate_pattern(self, pattern: Dict) -> None:
        """
        Validate pattern contains no PII

        Args:
            pattern: Pattern to validate

        Raises:
            ValueError: If PII detected
        """
        from protocols.memory.pii_validator import PIIValidator

        # Check all string values in pattern
        def check_dict(d: Dict, path: str = "") -> None:
            for key, value in d.items():
                current_path = f"{path}.{key}" if path else key

                if isinstance(value, str):
                    PIIValidator.validate(current_path, value)
                elif isinstance(value, dict):
                    check_dict(value, current_path)
                elif isinstance(value, (list, tuple)):
                    for i, item in enumerate(value):
                        if isinstance(item, dict):
                            check_dict(item, f"{current_path}[{i}]")
                        elif isinstance(item, str):
                            PIIValidator.validate(f"{current_path}[{i}]", item)

        check_dict(pattern)

    def get_pattern_summary(self) -> Dict[str, Any]:
        """
        Get summary of tracked patterns

        Returns:
            Dictionary with pattern statistics
        """
        pattern_types = {}
        for pattern in self.pattern_history:
            ptype = pattern.get('type', 'unknown')
            pattern_types[ptype] = pattern_types.get(ptype, 0) + 1

        return {
            'total_patterns': len(self.pattern_history),
            'pattern_types': pattern_types,
            'last_pattern_time': self.last_pattern_time.isoformat() if self.last_pattern_time else None,
            'surface_state': self.surface.get_state()
        }

    def get_context_identity(self, context: str) -> Dict[str, Any]:
        """
        Get identity representation for specific context

        Args:
            context: Context identifier

        Returns:
            Context-specific identity representation
        """
        return self.surface.get_context_representation(context)

    def export_tracking_data(self) -> Dict[str, Any]:
        """
        Export tracking data (for backup/analysis)

        Returns:
            Dictionary with tracking data
        """
        return {
            'identity_core': self.identity_core.export_to_dict(),
            'pattern_count': len(self.pattern_history),
            'pattern_summary': self.get_pattern_summary(),
            'last_pattern_time': self.last_pattern_time.isoformat() if self.last_pattern_time else None
        }
