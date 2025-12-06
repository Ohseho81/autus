"""
Auto Spec Generator: Analyze Reality Events and auto-generate feature specs when patterns detected.

This module detects patterns in reality events that suggest the need for new feature specifications.
"""

import logging
from typing import Dict, List, Optional, Set, Tuple, Any
from dataclasses import dataclass, field
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from enum import Enum

from core.events.reality_event import RealityEvent
from core.specs.feature_spec import FeatureSpec
from core.patterns.pattern_analyzer import PatternAnalyzer
from core.utils.exceptions import SpecGenerationError


class PatternType(Enum):
    """Types of patterns that can trigger spec generation."""
    FREQUENCY_SPIKE = "frequency_spike"
    ERROR_CLUSTER = "error_cluster"
    FEATURE_GAP = "feature_gap"
    USER_REQUEST = "user_request"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    INTEGRATION_FAILURE = "integration_failure"


@dataclass
class DetectionPattern:
    """Represents a detected pattern that may need a spec."""
    pattern_type: PatternType
    confidence: float
    events: List[RealityEvent]
    suggested_priority: str
    description: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SpecSuggestion:
    """Represents a suggested feature spec based on detected patterns."""
    title: str
    description: str
    priority: str
    patterns: List[DetectionPattern]
    suggested_implementation: Optional[str] = None
    estimated_effort: Optional[str] = None
    dependencies: List[str] = field(default_factory=list)
    tags: Set[str] = field(default_factory=set)


class NeedDetector:
    """
    Analyzes reality events to detect patterns that suggest the need for new feature specs.
    
    This class monitors event streams and applies various detection algorithms to identify
    when new specifications should be generated automatically.
    """

    def __init__(
        self,
        pattern_analyzer: PatternAnalyzer,
        detection_window: timedelta = timedelta(hours=24),
        confidence_threshold: float = 0.7,
        max_events_buffer: int = 10000
    ) -> None:
        """
        Initialize the need detector.

        Args:
            pattern_analyzer: Analyzer for detecting patterns in events
            detection_window: Time window for pattern detection
            confidence_threshold: Minimum confidence for pattern detection
            max_events_buffer: Maximum number of events to keep in buffer
        """
        self.pattern_analyzer = pattern_analyzer
        self.detection_window = detection_window
        self.confidence_threshold = confidence_threshold
        self.max_events_buffer = max_events_buffer
        
        self.event_buffer: List[RealityEvent] = []
        self.detected_patterns: List[DetectionPattern] = []
        self.spec_suggestions: List[SpecSuggestion] = []
        
        self.logger = logging.getLogger(__name__)
        
        # Pattern detection configuration
        self.frequency_thresholds = {
            "error": 10,  # errors per hour
            "request": 100,  # requests per hour for new features
            "failure": 5  # failures per hour
        }
        
        self.pattern_detectors = {
            PatternType.FREQUENCY_SPIKE: self._detect_frequency_spikes,
            PatternType.ERROR_CLUSTER: self._detect_error_clusters,
            PatternType.FEATURE_GAP: self._detect_feature_gaps,
            PatternType.USER_REQUEST: self._detect_user_requests,
            PatternType.PERFORMANCE_DEGRADATION: self._detect_performance_issues,
            PatternType.INTEGRATION_FAILURE: self._detect_integration_failures,
        }

    def analyze_events(self, events: List[RealityEvent]) -> List[DetectionPattern]:
        """
        Analyze a batch of reality events for patterns.

        Args:
            events: List of reality events to analyze

        Returns:
            List of detected patterns

        Raises:
            SpecGenerationError: If analysis fails
        """
        try:
            self._update_event_buffer(events)
            
            patterns = []
            for pattern_type, detector in self.pattern_detectors.items():
                try:
                    detected = detector(self.event_buffer)
                    patterns.extend(detected)
                except Exception as e:
                    self.logger.warning(f"Failed to detect {pattern_type}: {e}")
            
            # Filter by confidence threshold
            high_confidence_patterns = [
                p for p in patterns if p.confidence >= self.confidence_threshold
            ]
            
            self.detected_patterns.extend(high_confidence_patterns)
            self._cleanup_old_patterns()
            
            return high_confidence_patterns
            
        except Exception as e:
            raise SpecGenerationError(f"Pattern analysis failed: {e}")

    def generate_spec_suggestions(
        self,
        patterns: Optional[List[DetectionPattern]] = None
    ) -> List[SpecSuggestion]:
        """
        Generate feature spec suggestions based on detected patterns.

        Args:
            patterns: Specific patterns to analyze, or None to use all detected patterns

        Returns:
            List of spec suggestions
        """
        if patterns is None:
            patterns = self.detected_patterns
        
        suggestions = []
        
        # Group patterns by similarity
        pattern_groups = self._group_similar_patterns(patterns)
        
        for group in pattern_groups:
            try:
                suggestion = self._create_spec_suggestion(group)
                if suggestion:
                    suggestions.append(suggestion)
            except Exception as e:
                self.logger.error(f"Failed to create spec suggestion: {e}")
        
        self.spec_suggestions.extend(suggestions)
        return suggestions

    def _update_event_buffer(self, new_events: List[RealityEvent]) -> None:
        """Update the event buffer with new events."""
        self.event_buffer.extend(new_events)
        
        # Remove old events outside detection window
        cutoff_time = datetime.utcnow() - self.detection_window
        self.event_buffer = [
            e for e in self.event_buffer
            if e.timestamp > cutoff_time
        ]
        
        # Limit buffer size
        if len(self.event_buffer) > self.max_events_buffer:
            self.event_buffer = self.event_buffer[-self.max_events_buffer:]

    def _detect_frequency_spikes(self, events: List[RealityEvent]) -> List[DetectionPattern]:
        """Detect unusual frequency spikes in events."""
        patterns = []
        
        # Group events by type and hour
        hourly_counts = defaultdict(lambda: defaultdict(int))
        
        for event in events:
            hour = event.timestamp.replace(minute=0, second=0, microsecond=0)
            hourly_counts[event.event_type][hour] += 1
        
        # Check for spikes
        for event_type, counts in hourly_counts.items():
            if not counts:
                continue
                
            values = list(counts.values())
            avg_count = sum(values) / len(values)
            
            for hour, count in counts.items():
                if count > avg_count * 2 and count > 20:  # Spike detection
                    spike_events = [
                        e for e in events
                        if e.event_type == event_type and
                        e.timestamp.replace(minute=0, second=0, microsecond=0) == hour
                    ]
                    
                    confidence = min(0.9, count / (avg_count * 2))
                    
                    patterns.append(DetectionPattern(
                        pattern_type=PatternType.FREQUENCY_SPIKE,
                        confidence=confidence,
                        events=spike_events,
                        suggested_priority="high" if confidence > 0.8 else "medium",
                        description=f"Frequency spike in {event_type}: {count} events in 1 hour",
                        metadata={"spike_ratio": count / avg_count, "hour": hour}
                    ))
        
        return patterns

    def _detect_error_clusters(self, events: List[RealityEvent]) -> List[DetectionPattern]:
        """Detect clusters of error events."""
        patterns = []
        
        error_events = [e for e in events if e.severity == "error"]
        
        if len(error_events) < 5:
            return patterns
        
        # Group by error type/message
        error_groups = defaultdict(list)
        for event in error_events:
            error_key = f"{event.component}:{event.data.get('error_type', 'unknown')}"
            error_groups[error_key].append(event)
        
        # Detect clusters
        for error_type, error_list in error_groups.items():
            if len(error_list) >= 5:  # Minimum cluster size
                # Check if errors are clustered in time
                timestamps = sorted([e.timestamp for e in error_list])
                time_span = timestamps[-1] - timestamps[0]
                
                if time_span <= timedelta(hours=2):  # Clustered in time
                    confidence = min(0.95, len(error_list) / 20)
                    
                    patterns.append(DetectionPattern(
                        pattern_type=PatternType.ERROR_CLUSTER,
                        confidence=confidence,
                        events=error_list,
                        suggested_priority="high",
                        description=f"Error cluster detected: {len(error_list)} {error_type} errors",
                        metadata={"error_type": error_type, "time_span": time_span.total_seconds()}
                    ))
        
        return patterns

    def _detect_feature_gaps(self, events: List[RealityEvent]) -> List[DetectionPattern]:
        """Detect gaps in functionality based on event patterns."""
        patterns = []
        
        # Look for events indicating missing functionality
        gap_indicators = [
            "feature_not_found",
            "method_not_implemented",
            "functionality_missing",
            "workaround_used"
        ]
        
        gap_events = [
            e for e in events
            if any(indicator in str(e.data).lower() for indicator in gap_indicators)
        ]
        
        if len(gap_events) >= 3:
            # Group by component
            component_gaps = defaultdict(list)
            for event in gap_events:
                component_gaps[event.component].append(event)
            
            for component, comp_events in component_gaps.items():
                if len(comp_events) >= 2:
                    confidence = min(0.8, len(comp_events) / 5)
                    
                    patterns.append(DetectionPattern(
                        pattern_type=PatternType.FEATURE_GAP,
                        confidence=confidence,
                        events=comp_events,
                        suggested_priority="medium",
                        description=f"Feature gap detected in {component}",
                        metadata={"component": component, "gap_count": len(comp_events)}
                    ))
        
        return patterns

    def _detect_user_requests(self, events: List[RealityEvent]) -> List[DetectionPattern]:
        """Detect user feature requests."""
        patterns = []
        
        request_keywords = ["request", "feature", "enhancement", "suggestion", "need"]
        
        request_events = [
            e for e in events
            if e.event_type == "user_feedback" and
            any(keyword in str(e.data).lower() for keyword in request_keywords)
        ]
        
        if len(request_events) >= 2:
            # Group similar requests
            request_groups = self._group_similar_requests(request_events)
            
            for group in request_groups:
                if len(group) >= 2:
                    confidence = min(0.9, len(group) / 3)
                    
                    patterns.append(DetectionPattern(
                        pattern_type=PatternType.USER_REQUEST,
                        confidence=confidence,
                        events=group,
                        suggested_priority="medium",
                        description=f"User feature request pattern: {len(group)} similar requests",
                        metadata={"request_count": len(group)}
                    ))
        
        return patterns

    def _detect_performance_issues(self, events: List[RealityEvent]) -> List[DetectionPattern]:
        """Detect performance degradation patterns."""
        patterns = []
        
        perf_events = [
            e for e in events
            if "performance" in str(e.data).lower() or
            "slow" in str(e.data).lower() or
            "timeout" in str(e.data).lower()
        ]
        
        if len(perf_events) >= 5:
            confidence = min(0.85, len(perf_events) / 10)
            
            patterns.append(DetectionPattern(
                pattern_type=PatternType.PERFORMANCE_DEGRADATION,
                confidence=confidence,
                events=perf_events,
                suggested_priority="high",
                description=f"Performance issues detected: {len(perf_events)} events",
                metadata={"issue_count": len(perf_events)}
            ))
        
        return patterns

    def _detect_integration_failures(self, events: List[RealityEvent]) -> List[DetectionPattern]:
        """Detect integration failure patterns."""
        patterns = []
        
        integration_events = [
            e for e in events
            if "integration" in str(e.data).lower() or
            "api" in str(e.data).lower() or
            "connection" in str(e.data).lower()
        ]
        
        failure_events = [
            e for e in integration_events
            if e.severity in ["error", "critical"] or
            "failed" in str(e.data).lower()
        ]
        
        if len(failure_events) >= 3:
            confidence = min(0.9, len(failure_events) / 5)
            
            patterns.append(DetectionPattern(
                pattern_type=PatternType.INTEGRATION_FAILURE,
                confidence=confidence,
                events=failure_events,
                suggested_priority="high",
                description=f"Integration failures detected: {len(failure_events)} events",
                metadata={"failure_count": len(failure_events)}
            ))
        
        return patterns

    def _group_similar_patterns(self, patterns: List[DetectionPattern]) -> List[List[DetectionPattern]]:
        """Group similar patterns together."""
        groups = []
        used = set()
        
        for i, pattern in enumerate(patterns):
            if i in used:
                continue
                
            group = [pattern]
            used.add(i)
            
            for j, other_pattern in enumerate(patterns[i+1:], i+1):
                if j in used:
                    continue
                    
                if self._are_patterns_similar(pattern, other_pattern):
                    group.append(other_pattern)
                    used.add(j)
            
            groups.append(group)
        
        return groups

    def _are_patterns_similar(self, pattern1: DetectionPattern, pattern2: DetectionPattern) -> bool:
        """Check if two patterns are similar."""
        if pattern1.pattern_type != pattern2.pattern_type:
            return False
        
        # Check component similarity
        components1 = {e.component for e in pattern1.events}
        components2 = {e.component for e in pattern2.events}
        
        if components1 & components2:  # Have common components
            return True
        
        # Check description similarity
        desc1_words = set(pattern1.description.lower().split())
        desc2_words = set(pattern2.description.lower().split())
        
        common_words = desc1_words & desc2_words
        total_words = desc1_words | desc2_words
        
        similarity = len(common_words) / len(total_words) if total_words else 0
        
        return similarity > 0.3

    def _group_similar_requests(self, request_events: List[RealityEvent]) -> List[List[RealityEvent]]:
        """Group similar user requests."""
        groups = []
        used = set()
        
        for i, event in enumerate(request_events):
            if i in used:
                continue
                
            group = [event]
            used.add(i)
            
            for j, other_event in enumerate(request_events[i+1:], i+1):
                if j in used:
                    continue
                    
                if self._are_requests_similar(event, other_event):
                    group.append(other_event)
                    used.add(j)
            
            groups.append(group)
        
        return groups

    def _are_requests_similar(self, event1: RealityEvent, event2: RealityEvent) -> bool:
        """Check if two user requests are similar."""
        text1 = str(event1.data).lower()
        text2 = str(event2.data).lower()
        
        words1 = set(text1.split())
        words2 = set(text2.split())
        
        common_words = words1 & words2
        total_words = words1 | words2
        
        similarity = len(common_words) / len(total_words) if total_words else 0
        
        return similarity > 0.4

    def _create_spec_suggestion(self, patterns: List[DetectionPattern]) -> Optional[SpecSuggestion]:
        """Create a spec suggestion from a group of patterns."""
        if not patterns:
            return None
        
        primary_pattern = max(patterns, key=lambda p: p.confidence)
        
        # Determine priority
        priorities = [p.suggested_priority for p in patterns]
        priority = "high" if "high" in priorities else "medium" if "medium" in priorities else "low"
        
        # Generate title and description
        if primary_pattern.pattern_type == PatternType.ERROR_CLUSTER:
            title = f"Fix Error Cluster in {self._get_primary_component(patterns)}"
            description = f"Address recurring errors detected in {primary_pattern.description}"
            
        elif primary_pattern.pattern_type == PatternType.FEATURE_GAP:
            title = f"Implement Missing Feature in {self._get_primary_component(patterns)}"
            description = f"Fill functionality gap: {primary_pattern.description}"
            
        elif primary_pattern.pattern_type == PatternType.USER_REQUEST:
            title = f"User-Requested Feature Enhancement"
            description = f"Implement user-requested functionality: {primary_pattern.description}"
            
        elif primary_pattern.pattern_type == PatternType.PERFORMANCE_DEGRADATION:
            title = f"Performance Optimization for {self._get_primary_component(patterns)}"
            description = f"Address performance issues: {primary_pattern.description}"
            
        else:
            title = f"Auto-Generated Spec: {primary_pattern.pattern_type.value}"
            description = primary_pattern.description
        
        # Generate tags
        tags = set()
        for pattern in patterns:
            tags.add(pattern.pattern_type.value)
            tags.update(e.component for e in pattern.events)
        
        return SpecSuggestion(
            title=title,
            description=description,
            priority=priority,
            patterns=patterns,
            tags=tags
        )

    def _get_primary_component(self, patterns: List[DetectionPattern]) -> str:
        """Get the primary component from a group of patterns."""
        component_counts = Counter()
        
        for pattern in patterns:
            for event in pattern.events:
                component_counts[event.component] += 1
        
        return component_counts.most_common(1)[0][0] if component_counts else "Unknown"

    def _cleanup_old_patterns(self) -> None:
        """Remove old patterns outside the detection window."""
        cutoff_time = datetime.utcnow() - self.detection_window
        self.detected_patterns = [
            p for p in self.detected_patterns
            if p.timestamp > cutoff_time
        ]

    def get_detection_stats(self) -> Dict[str, Any]:
        """Get statistics about pattern detection."""
        pattern_type_counts = Counter(p.pattern_type for p in self.detected_patterns)
        
        return {
            "total_patterns": len(self.detected_patterns),
            "pattern_types": dict(pattern_type_counts),
            "suggestions_generated": len(self.spec_suggestions),
            "events_buffered": len(self.event_buffer),
            "detection_window_hours": self.detection_window.total_seconds() / 3600,
            "confidence_threshold": self.confidence_threshold
        }
