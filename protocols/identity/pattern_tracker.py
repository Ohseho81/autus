"""
Behavioral Pattern Tracker

Connects Identity Surface with Workflow Graph and Memory OS.
Tracks behavioral patterns and evolves identity accordingly.
"""

from typing import Dict, List, Optional
from datetime import datetime
from protocols.identity.core import IdentityCore
from protocols.identity.surface import IdentitySurface


class BehavioralPatternTracker:
    """
    Tracks behavioral patterns and evolves Identity Surface

    Integrates with:
    - Workflow Graph: Task completion patterns
    - Memory OS: Preference and context patterns
    """

    def __init__(self, identity_core: IdentityCore):
        """
        Initialize tracker with identity core

        Args:
            identity_core: IdentityCore instance
        """
        self.identity = identity_core
        self.patterns: List[Dict] = []

        # Ensure surface exists
        if self.identity.get_surface() is None:
            self.identity.create_surface()

    @property
    def surface(self) -> "IdentitySurface":
        """테스트 호환용 surface 속성"""
        return self.identity.get_surface()

    def track_workflow_completion(
        self,
        workflow_id: str,
        nodes_executed: List[str] = None,
        duration_seconds: float = 0.0,
        success: bool = True,
        context: Optional[Dict] = None
    ) -> None:
        """
        Track workflow completion pattern

        Args:
            workflow_id: Workflow identifier
            nodes_executed: List of executed node IDs
            duration_seconds: Execution duration
            success: Whether workflow succeeded
            context: Additional context data
        """
        pattern = {
            'type': 'workflow_completion',
            'workflow_id': workflow_id,
            'nodes_executed': nodes_executed,
            'duration_seconds': duration_seconds,
            'success': success,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        }

        # Record pattern
        self.patterns.append(pattern)

        # Evolve surface
        self.identity.evolve_surface(pattern)

        # Keep only last 1000 patterns
        if len(self.patterns) > 1000:
            self.patterns = self.patterns[-1000:]

    def track_workflow_pattern(
        self,
        workflow_type: str,
        frequency: str,
        context: Optional[Dict] = None
    ) -> None:
        """
        Track recurring workflow pattern

        Args:
            workflow_type: Type of workflow (e.g., 'code_generation')
            frequency: 'daily', 'weekly', 'hourly', etc.
            context: Additional context
        """
        pattern = {
            'type': 'workflow_pattern',
            'workflow_type': workflow_type,
            'frequency': frequency,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        }

        self.patterns.append(pattern)
        self.identity.evolve_surface(pattern)

    def track_preference_update(
        self,
        preference_key: str,
        preference_value: str,
        context: Optional[Dict] = None
    ) -> None:
        """
        Track preference update from Memory OS

        Args:
            preference_key: Preference identifier
            preference_value: Preference value
            context: Additional context
        """
        pattern = {
            'type': 'preference_update',
            'preference_key': preference_key,
            'preference_value': preference_value,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        }

        self.patterns.append(pattern)
        self.identity.evolve_surface(pattern)

    def track_context_switch(
        self,
        from_context: str,
        to_context: str,
        metadata: Optional[Dict] = None
    ) -> None:
        """
        Track context switch

        Args:
            from_context: Previous context
            to_context: New context
            metadata: Additional metadata
        """
        pattern = {
            'type': 'context_switch',
            'from_context': from_context,
            'to_context': to_context,
            'metadata': metadata or {},
            'timestamp': datetime.now().isoformat()
        }

        self.patterns.append(pattern)
        self.identity.evolve_surface(pattern)

    def track_memory_pattern(
        self,
        pattern_type: str,
        pattern_data: Dict,
        context: Optional[Dict] = None
    ) -> None:
        """
        Track pattern from Memory OS

        Args:
            pattern_type: Type of memory pattern
            pattern_data: Pattern data from Memory OS
            context: Additional context
        """
        pattern = {
            'type': 'memory_pattern',
            'pattern_type': pattern_type,
            'pattern_data': pattern_data,
            'context': context or {},
            'timestamp': datetime.now().isoformat()
        }

        self.patterns.append(pattern)
        self.identity.evolve_surface(pattern)

    def get_pattern_summary(self) -> Dict:
        """
        Get summary of tracked patterns

        Returns:
            Dictionary with pattern statistics
        """
        if not self.patterns:
            return {
                'total_patterns': 0,
                'pattern_types': {},
                'recent_patterns': []
            }

        # Count by type
        pattern_types = {}
        for pattern in self.patterns:
            ptype = pattern.get('type', 'unknown')
            pattern_types[ptype] = pattern_types.get(ptype, 0) + 1

        return {
            'total_patterns': len(self.patterns),
            'pattern_types': pattern_types,
            'recent_patterns': self.patterns[-10:]  # Last 10
        }

    def get_surface_evolution(self) -> List[Dict]:
        """
        Get surface evolution history

        Returns:
            List of evolution states
        """
        surface = self.identity.get_surface()
        if surface:
            return surface.evolution_history
        return []

    def export_to_dict(self) -> Dict:
        """Export tracker state"""
        return {
            'patterns': self.patterns[-100:],  # Last 100 only
            'pattern_summary': self.get_pattern_summary()
        }


class WorkflowIntegration:
    """
    Integration with Workflow Graph Protocol
    """

    @staticmethod
    def track_from_workflow_graph(
        tracker: BehavioralPatternTracker,
        workflow_graph: Dict
    ) -> None:
        """
        Track patterns from WorkflowGraph execution

        Args:
            tracker: BehavioralPatternTracker instance
            workflow_graph: Workflow graph dictionary
        """
        # Extract workflow info
        workflow_id = workflow_graph.get('metadata', {}).get('id', 'unknown')
        nodes = workflow_graph.get('nodes', [])

        # Track workflow pattern
        tracker.track_workflow_pattern(
            workflow_type='graph_execution',
            frequency='on_demand',
            context={
                'node_count': len(nodes),
                'workflow_id': workflow_id
            }
        )


class MemoryIntegration:
    """
    Integration with Memory OS Protocol
    """

    @staticmethod
    def track_from_memory_os(
        tracker: BehavioralPatternTracker,
        memory_os
    ) -> None:
        """
        Track patterns from Memory OS

        Args:
            tracker: BehavioralPatternTracker instance
            memory_os: MemoryOS instance
        """
        # Get recent patterns from memory
        try:
            patterns = memory_os.get_patterns()

            for pattern in patterns:
                tracker.track_memory_pattern(
                    pattern_type=pattern.get('type', 'general'),
                    pattern_data=pattern,
                    context={'source': 'memory_os'}
                )
        except Exception as e:
            # Memory OS might not have patterns yet
            pass

    @staticmethod
    def sync_preferences(
        tracker: BehavioralPatternTracker,
        memory_os
    ) -> None:
        """
        Sync preferences from Memory OS

        Args:
            tracker: BehavioralPatternTracker instance
            memory_os: MemoryOS instance
        """
        # Get summary for preference keys
        try:
            summary = memory_os.get_memory_summary()
            preference_count = summary.get('preferences', 0)

            if preference_count > 0:
                tracker.track_memory_pattern(
                    pattern_type='preferences_loaded',
                    pattern_data={'count': preference_count},
                    context={'source': 'memory_os'}
                )
        except Exception as e:
            pass

