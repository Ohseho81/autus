"""
Pattern Analyzer for Auto Spec Generator

This module analyzes reality events and automatically generates feature specifications
when patterns are detected in user behavior and system interactions.
"""

from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, Counter
import logging
from enum import Enum
import re
import json

logger = logging.getLogger(__name__)


class PatternType(Enum):
    """Types of patterns that can be detected."""
    WORKFLOW = "workflow"
    USER_BEHAVIOR = "user_behavior"
    DATA_FLOW = "data_flow"
    ERROR_PATTERN = "error_pattern"
    PERFORMANCE = "performance"
    INTEGRATION = "integration"


class ConfidenceLevel(Enum):
    """Confidence levels for pattern detection."""
    LOW = 0.3
    MEDIUM = 0.6
    HIGH = 0.8
    VERY_HIGH = 0.9


@dataclass
class RealityEvent:
    """Represents a single reality event for analysis."""
    timestamp: datetime
    event_type: str
    user_id: Optional[str]
    session_id: Optional[str]
    component: str
    action: str
    context: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: Set[str] = field(default_factory=set)


@dataclass
class DetectedPattern:
    """Represents a detected pattern in reality events."""
    pattern_id: str
    pattern_type: PatternType
    confidence: float
    frequency: int
    first_seen: datetime
    last_seen: datetime
    events: List[RealityEvent]
    description: str
    characteristics: Dict[str, Any]
    suggested_spec: Optional[Dict[str, Any]] = None


@dataclass
class FeatureSpec:
    """Auto-generated feature specification."""
    spec_id: str
    title: str
    description: str
    pattern_ids: List[str]
    requirements: List[str]
    acceptance_criteria: List[str]
    priority: str
    confidence_score: float
    generated_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)


class PatternDetector:
    """Base class for pattern detection strategies."""
    
    def __init__(self, pattern_type: PatternType, min_confidence: float = 0.5):
        self.pattern_type = pattern_type
        self.min_confidence = min_confidence
    
    def detect(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect patterns in the given events."""
        raise NotImplementedError("Subclasses must implement detect method")
    
    def calculate_confidence(self, events: List[RealityEvent], **kwargs) -> float:
        """Calculate confidence score for detected pattern."""
        raise NotImplementedError("Subclasses must implement calculate_confidence method")


class WorkflowPatternDetector(PatternDetector):
    """Detects recurring workflow patterns in user actions."""
    
    def __init__(self, min_sequence_length: int = 3, min_occurrences: int = 5):
        super().__init__(PatternType.WORKFLOW)
        self.min_sequence_length = min_sequence_length
        self.min_occurrences = min_occurrences
    
    def detect(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect workflow patterns in events."""
        try:
            patterns = []
            sequences = self._extract_action_sequences(events)
            common_sequences = self._find_common_sequences(sequences)
            
            for sequence, occurrences in common_sequences.items():
                if len(sequence) >= self.min_sequence_length and occurrences >= self.min_occurrences:
                    pattern_events = self._find_pattern_events(events, sequence)
                    confidence = self.calculate_confidence(pattern_events, occurrences=occurrences)
                    
                    if confidence >= self.min_confidence:
                        pattern = DetectedPattern(
                            pattern_id=f"workflow_{hash(sequence)}",
                            pattern_type=self.pattern_type,
                            confidence=confidence,
                            frequency=occurrences,
                            first_seen=min(e.timestamp for e in pattern_events),
                            last_seen=max(e.timestamp for e in pattern_events),
                            events=pattern_events,
                            description=f"Recurring workflow: {' -> '.join(sequence)}",
                            characteristics={
                                "sequence": sequence,
                                "sequence_length": len(sequence),
                                "occurrences": occurrences
                            }
                        )
                        patterns.append(pattern)
            
            return patterns
        except Exception as e:
            logger.error(f"Error detecting workflow patterns: {e}")
            return []
    
    def calculate_confidence(self, events: List[RealityEvent], **kwargs) -> float:
        """Calculate confidence based on frequency and consistency."""
        occurrences = kwargs.get('occurrences', 1)
        total_events = len(events)
        
        # Base confidence on frequency
        frequency_score = min(occurrences / 10.0, 0.8)
        
        # Adjust for consistency (time distribution)
        consistency_score = self._calculate_consistency(events)
        
        return min(frequency_score * 0.7 + consistency_score * 0.3, 1.0)
    
    def _extract_action_sequences(self, events: List[RealityEvent]) -> List[Tuple[str, ...]]:
        """Extract action sequences from events grouped by session."""
        sequences = []
        sessions = defaultdict(list)
        
        # Group events by session
        for event in events:
            if event.session_id:
                sessions[event.session_id].append(event)
        
        # Extract sequences from each session
        for session_events in sessions.values():
            session_events.sort(key=lambda e: e.timestamp)
            actions = [f"{e.component}.{e.action}" for e in session_events]
            
            # Create sliding windows of different sizes
            for window_size in range(self.min_sequence_length, min(len(actions) + 1, 10)):
                for i in range(len(actions) - window_size + 1):
                    sequences.append(tuple(actions[i:i + window_size]))
        
        return sequences
    
    def _find_common_sequences(self, sequences: List[Tuple[str, ...]]) -> Dict[Tuple[str, ...], int]:
        """Find sequences that occur frequently."""
        return {seq: count for seq, count in Counter(sequences).items() 
                if count >= self.min_occurrences}
    
    def _find_pattern_events(self, events: List[RealityEvent], sequence: Tuple[str, ...]) -> List[RealityEvent]:
        """Find events that match the detected sequence pattern."""
        matching_events = []
        sessions = defaultdict(list)
        
        # Group events by session
        for event in events:
            if event.session_id:
                sessions[event.session_id].append(event)
        
        # Find matching sequences in sessions
        for session_events in sessions.values():
            session_events.sort(key=lambda e: e.timestamp)
            actions = [f"{e.component}.{e.action}" for e in session_events]
            
            for i in range(len(actions) - len(sequence) + 1):
                if tuple(actions[i:i + len(sequence)]) == sequence:
                    matching_events.extend(session_events[i:i + len(sequence)])
        
        return matching_events
    
    def _calculate_consistency(self, events: List[RealityEvent]) -> float:
        """Calculate consistency score based on time distribution."""
        if len(events) < 2:
            return 0.0
        
        timestamps = [e.timestamp for e in events]
        timestamps.sort()
        
        # Calculate time intervals
        intervals = []
        for i in range(1, len(timestamps)):
            intervals.append((timestamps[i] - timestamps[i-1]).total_seconds())
        
        if not intervals:
            return 0.0
        
        # Lower variance in intervals = higher consistency
        mean_interval = sum(intervals) / len(intervals)
        variance = sum((x - mean_interval) ** 2 for x in intervals) / len(intervals)
        
        # Normalize to 0-1 scale
        return max(0.0, 1.0 - (variance ** 0.5) / (mean_interval + 1))


class UserBehaviorPatternDetector(PatternDetector):
    """Detects patterns in user behavior and preferences."""
    
    def __init__(self, min_user_sessions: int = 3):
        super().__init__(PatternType.USER_BEHAVIOR)
        self.min_user_sessions = min_user_sessions
    
    def detect(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect user behavior patterns."""
        try:
            patterns = []
            user_behaviors = self._analyze_user_behaviors(events)
            
            for behavior_type, behavior_data in user_behaviors.items():
                if behavior_data['sessions'] >= self.min_user_sessions:
                    confidence = self.calculate_confidence(
                        behavior_data['events'],
                        sessions=behavior_data['sessions'],
                        users=behavior_data['users']
                    )
                    
                    if confidence >= self.min_confidence:
                        pattern = DetectedPattern(
                            pattern_id=f"behavior_{hash(behavior_type)}",
                            pattern_type=self.pattern_type,
                            confidence=confidence,
                            frequency=len(behavior_data['events']),
                            first_seen=min(e.timestamp for e in behavior_data['events']),
                            last_seen=max(e.timestamp for e in behavior_data['events']),
                            events=behavior_data['events'],
                            description=f"User behavior pattern: {behavior_type}",
                            characteristics=behavior_data
                        )
                        patterns.append(pattern)
            
            return patterns
        except Exception as e:
            logger.error(f"Error detecting user behavior patterns: {e}")
            return []
    
    def calculate_confidence(self, events: List[RealityEvent], **kwargs) -> float:
        """Calculate confidence based on user adoption and frequency."""
        sessions = kwargs.get('sessions', 1)
        users = kwargs.get('users', 1)
        
        # Base confidence on user adoption
        adoption_score = min(users / 10.0, 0.8)
        
        # Base confidence on session frequency
        frequency_score = min(sessions / 20.0, 0.8)
        
        return min(adoption_score * 0.6 + frequency_score * 0.4, 1.0)
    
    def _analyze_user_behaviors(self, events: List[RealityEvent]) -> Dict[str, Dict[str, Any]]:
        """Analyze user behaviors from events."""
        behaviors = defaultdict(lambda: {
            'events': [],
            'sessions': set(),
            'users': set(),
            'components': Counter(),
            'actions': Counter()
        })
        
        for event in events:
            # Create behavior signature
            behavior_key = f"{event.component}_{event.action}"
            
            behaviors[behavior_key]['events'].append(event)
            if event.session_id:
                behaviors[behavior_key]['sessions'].add(event.session_id)
            if event.user_id:
                behaviors[behavior_key]['users'].add(event.user_id)
            behaviors[behavior_key]['components'][event.component] += 1
            behaviors[behavior_key]['actions'][event.action] += 1
        
        # Convert sets to counts
        for behavior_data in behaviors.values():
            behavior_data['sessions'] = len(behavior_data['sessions'])
            behavior_data['users'] = len(behavior_data['users'])
        
        return dict(behaviors)


class SpecGenerator:
    """Generates feature specifications from detected patterns."""
    
    def __init__(self, min_confidence: float = 0.6):
        self.min_confidence = min_confidence
        self.spec_templates = self._load_spec_templates()
    
    def generate_specs(self, patterns: List[DetectedPattern]) -> List[FeatureSpec]:
        """Generate feature specifications from detected patterns."""
        try:
            specs = []
            
            # Group related patterns
            pattern_groups = self._group_related_patterns(patterns)
            
            for group in pattern_groups:
                spec = self._generate_spec_for_pattern_group(group)
                if spec and spec.confidence_score >= self.min_confidence:
                    specs.append(spec)
            
            return specs
        except Exception as e:
            logger.error(f"Error generating specs: {e}")
            return []
    
    def _generate_spec_for_pattern_group(self, patterns: List[DetectedPattern]) -> Optional[FeatureSpec]:
        """Generate a feature spec for a group of related patterns."""
        try:
            if not patterns:
                return None
            
            primary_pattern = max(patterns, key=lambda p: p.confidence)
            pattern_type = primary_pattern.pattern_type
            
            # Get appropriate template
            template = self.spec_templates.get(pattern_type.value, self.spec_templates['default'])
            
            # Calculate combined confidence
            combined_confidence = self._calculate_combined_confidence(patterns)
            
            # Generate spec content
            title = self._generate_title(patterns)
            description = self._generate_description(patterns)
            requirements = self._generate_requirements(patterns)
            acceptance_criteria = self._generate_acceptance_criteria(patterns)
            priority = self._determine_priority(patterns, combined_confidence)
            
            spec = FeatureSpec(
                spec_id=f"spec_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{hash(tuple(p.pattern_id for p in patterns))}",
                title=title,
                description=description,
                pattern_ids=[p.pattern_id for p in patterns],
                requirements=requirements,
                acceptance_criteria=acceptance_criteria,
                priority=priority,
                confidence_score=combined_confidence,
                generated_at=datetime.now(),
                metadata={
                    'pattern_types': [p.pattern_type.value for p in patterns],
                    'total_events': sum(len(p.events) for p in patterns),
                    'date_range': {
                        'start': min(p.first_seen for p in patterns).isoformat(),
                        'end': max(p.last_seen for p in patterns).isoformat()
                    }
                }
            )
            
            return spec
        except Exception as e:
            logger.error(f"Error generating spec for pattern group: {e}")
            return None
    
    def _group_related_patterns(self, patterns: List[DetectedPattern]) -> List[List[DetectedPattern]]:
        """Group related patterns together."""
        # Simple grouping by pattern type for now
        groups = defaultdict(list)
        for pattern in patterns:
            groups[pattern.pattern_type].append(pattern)
        
        return list(groups.values())
    
    def _calculate_combined_confidence(self, patterns: List[DetectedPattern]) -> float:
        """Calculate combined confidence score for multiple patterns."""
        if not patterns:
            return 0.0
        
        # Weighted average based on frequency
        total_weight = sum(p.frequency for p in patterns)
        if total_weight == 0:
            return sum(p.confidence for p in patterns) / len(patterns)
        
        weighted_sum = sum(p.confidence * p.frequency for p in patterns)
        return weighted_sum / total_weight
    
    def _generate_title(self, patterns: List[DetectedPattern]) -> str:
        """Generate title for the feature spec."""
        primary_pattern = max(patterns, key=lambda p: p.confidence)
        pattern_type = primary_pattern.pattern_type.value.replace('_', ' ').title()
        
        return f"Auto-Generated: {pattern_type} Enhancement"
    
    def _generate_description(self, patterns: List[DetectedPattern]) -> str:
        """Generate description for the feature spec."""
        primary_pattern = max(patterns, key=lambda p: p.confidence)
        
        description_parts = [
            f"This feature specification was auto-generated based on detected patterns in user behavior.",
            f"Primary pattern: {primary_pattern.description}",
            f"Pattern confidence: {primary_pattern.confidence:.2f}",
            f"Observed frequency: {primary_pattern.frequency} occurrences"
        ]
        
        if len(patterns) > 1:
            description_parts.append(f"Related patterns: {len(patterns) - 1} additional patterns detected")
        
        return '\n'.join(description_parts)
    
    def _generate_requirements(self, patterns: List[DetectedPattern]) -> List[str]:
        """Generate requirements based on patterns."""
        requirements = []
        
        for pattern in patterns:
            if pattern.pattern_type == PatternType.WORKFLOW:
                requirements.extend(self._generate_workflow_requirements(pattern))
            elif pattern.pattern_type == PatternType.USER_BEHAVIOR:
                requirements.extend(self._generate_behavior_requirements(pattern))
            # Add more pattern-specific requirements as needed
        
        return list(set(requirements))  # Remove duplicates
    
    def _generate_acceptance_criteria(self, patterns: List[DetectedPattern]) -> List[str]:
        """Generate acceptance criteria based on patterns."""
        criteria = []
        
        for pattern in patterns:
            criteria.append(f"Pattern '{pattern.description}' should be supported efficiently")
            criteria.append(f"Performance should handle {pattern.frequency} similar operations")
        
        return criteria
    
    def _determine_priority(self, patterns: List[DetectedPattern], confidence: float) -> str:
        """Determine priority based on patterns and confidence."""
        total_frequency = sum(p.frequency for p in patterns)
        
        if confidence >= 0.8 and total_frequency >= 50:
            return "High"
        elif confidence >= 0.6 and total_frequency >= 20:
            return "Medium"
        else:
            return "Low"
    
    def _generate_workflow_requirements(self, pattern: DetectedPattern) -> List[str]:
        """Generate workflow-specific requirements."""
        sequence = pattern.characteristics.get('sequence', [])
        
        return [
            f"System should support streamlined workflow: {' -> '.join(sequence)}",
            "Workflow should be optimized for efficiency",
            "User should be able to complete workflow in minimal steps"
        ]
    
    def _generate_behavior_requirements(self, pattern: DetectedPattern) -> List[str]:
        """Generate behavior-specific requirements."""
        return [
            "System should adapt to common user behaviors",
            "Interface should support detected usage patterns",
            "User experience should be optimized for frequent actions"
        ]
    
    def _load_spec_templates(self) -> Dict[str, Dict[str, Any]]:
        """Load specification templates for different pattern types."""
        return {
            'workflow': {
                'title_prefix': 'Workflow Enhancement',
                'focus_areas': ['efficiency', 'user_experience', 'automation']
            },
            'user_behavior': {
                'title_prefix': 'User Experience Enhancement',
                'focus_areas': ['usability', 'personalization', 'accessibility']
            },
            'default': {
                'title_prefix': 'System Enhancement',
                'focus_areas': ['functionality', 'performance', 'reliability']
            }
        }


class PatternAnalyzer:
    """Main pattern analyzer that coordinates detection and spec generation."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}
        self.detectors = self._initialize_detectors()
        self.spec_generator = SpecGenerator(
            min_confidence=self.config.get('min_spec_confidence', 0.6)
        )
        self.detected_patterns: List[DetectedPattern] = []
        self.generated_specs: List[FeatureSpec] = []
    
    def analyze_events(self, events: List[RealityEvent]) -> Tuple[List[DetectedPattern], List[FeatureSpec]]:
        """Analyze reality events and generate feature specs."""
        try:
            logger.info(f"Analyzing {len(events)} reality events")
            
            # Detect patterns using all detectors
            all_patterns = []
            for detector in self.detectors:
                try:
                    patterns = detector.detect(events)
                    all_patterns.extend(patterns)
                    logger.info(f"{detector.__class__.__name__} detected {len(patterns)} patterns")
                except Exception as e:
                    logger.error(f"Error in {detector.__class__.__name__}: {e}")
            
            # Store detected patterns
            self.detected_patterns = all_patterns
            
            # Generate specs from patterns
            specs = self.spec_generator.generate_specs(all_patterns)
            self.generated_specs = specs
            
            logger.info(f"Generated {len(specs)} feature specifications")
            return all_patterns, specs
            
        except Exception as e:
            logger.error(f"Error analyzing events: {e}")
            return [], []
    
    def get_pattern_summary(self) -> Dict[str, Any]:
        """Get summary of detected patterns."""
        if not self.detected_patterns:
            return {}
        
        pattern_types = Counter(p.pattern_type.value for p in self.detected_patterns)
        confidence_distribution = {
            'high': len([p for p in self.detected_patterns if p.confidence >= 0.8]),
            'medium': len([p for p in self.detected_patterns if 0.6 <= p.confidence < 0.8]),
            'low': len([p for p in self.detected_patterns if p.confidence < 0.6])
        }
        
        return {
            'total_patterns': len(self.detected_patterns),
            'pattern_types': dict(pattern_types),
            'confidence_distribution': confidence_distribution,
            'avg_confidence': sum(p.confidence for p in self.detected_patterns) / len(self.detected_patterns),
            'date_range': {
                'start': min(p.first_seen for p in self.detected_patterns).isoformat(),
                'end': max(p.last_seen for p in self.detected_patterns).isoformat()
            }
        }
    
    def export_specs(self, format_type: str = 'json') -> str:
        """Export generated specs in specified format."""
        try:
            if format_type.lower() == 'json':
                return self._export_specs_json()
            elif format_type.lower() == 'markdown':
                return self._export_specs_markdown()
            else:
                raise ValueError(f"Unsupported format: {format_type}")
        except Exception as e:
            logger.error(f"Error exporting specs: {e}")
            return ""
    
    def _initialize_detectors(self) -> List[PatternDetector]:
        """Initialize pattern detectors."""
        detectors = []
        
        # Add workflow pattern detector
        workflow_config = self.config.get('workflow_detector', {})
        detectors.append(WorkflowPatternDetector(
            min_sequence_length=workflow_config.get('min_sequence_length', 3),
            min_occurrences=workflow_config.get('min_occurrences', 5)
        ))
        
        # Add user behavior pattern detector
        behavior_config = self.config.get('behavior_detector', {})
        detectors.append(UserBehaviorPatternDetector(
            min_user_sessions=behavior_config.get('min_user_sessions', 3)
        ))
        
        return detectors
    
    def _export_specs_json(self) -> str:
        """Export specs as JSON."""
        specs_data = []
        for spec in self.generated_specs:
            spec_dict = {
                'spec_id': spec.spec_id,
                'title': spec.title,
                'description': spec.description,
                'pattern_ids': spec.pattern_ids,
                'requirements': spec.requirements,
                'acceptance_criteria': spec.acceptance_criteria,
                'priority': spec.priority,
                'confidence_score': spec.confidence_score,
                'generated_at': spec.generated_at.isoformat(),
                'metadata': spec.metadata
            }
            specs_data.append(spec_dict)
        
        return json.dumps(specs_data, indent=2)
    
    def _export_specs_markdown(self) -> str:
        """Export specs as Markdown."""
        lines = ["# Auto-Generated Feature Specifications\n"]
        
        for spec in self.generated_specs:
            lines.extend([
                f"## {spec.title}",
                f"**Spec ID:** {spec.spec_id}",
                f"**Priority:** {spec.priority}",
                f"**Confidence:** {spec.confidence_score:.2f}",
                f"**Generated:** {spec.generated_at.isoformat()}",
                "",
                "### Description",
                spec.description,
                "",
                "### Requirements",
                *[f"- {req}" for req in spec.requirements],
                "",
                "### Acceptance Criteria",
                *[f"- {criteria}" for criteria in spec.acceptance_criteria],
                "",
                "---",
                ""
            ])
        
        return '\n'.join(lines)
