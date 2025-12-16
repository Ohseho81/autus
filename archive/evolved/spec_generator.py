"""
Auto Spec Generator: Analyze Reality Events and auto-generate feature specs when patterns detected.

This module provides functionality to analyze reality events and automatically generate
feature specifications based on detected patterns and anomalies.
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set, Tuple, Any
from enum import Enum
import json
import re
from collections import Counter, defaultdict

logger = logging.getLogger(__name__)


class PatternType(Enum):
    """Types of patterns that can be detected in reality events."""
    FREQUENCY_ANOMALY = "frequency_anomaly"
    SEQUENCE_PATTERN = "sequence_pattern"
    CORRELATION = "correlation"
    THRESHOLD_BREACH = "threshold_breach"
    BEHAVIORAL_SHIFT = "behavioral_shift"
    ERROR_CLUSTER = "error_cluster"


class SpecPriority(Enum):
    """Priority levels for generated specs."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


@dataclass
class RealityEvent:
    """Represents a reality event for analysis."""
    event_id: str
    timestamp: datetime
    event_type: str
    source: str
    data: Dict[str, Any]
    severity: str = "info"
    tags: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class DetectedPattern:
    """Represents a detected pattern in reality events."""
    pattern_id: str
    pattern_type: PatternType
    confidence: float
    description: str
    events: List[RealityEvent]
    detection_time: datetime
    context: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GeneratedSpec:
    """Represents an auto-generated feature specification."""
    spec_id: str
    title: str
    description: str
    priority: SpecPriority
    pattern: DetectedPattern
    requirements: List[str]
    acceptance_criteria: List[str]
    technical_notes: List[str]
    estimated_effort: str
    tags: Set[str] = field(default_factory=set)
    created_at: datetime = field(default_factory=datetime.now)


class PatternDetector:
    """Detects patterns in reality events."""

    def __init__(self, 
                 frequency_threshold: float = 2.0,
                 correlation_threshold: float = 0.7,
                 window_size: timedelta = timedelta(hours=1)):
        """
        Initialize pattern detector.

        Args:
            frequency_threshold: Multiplier for detecting frequency anomalies
            correlation_threshold: Minimum correlation coefficient for pattern detection
            window_size: Time window for pattern analysis
        """
        self.frequency_threshold = frequency_threshold
        self.correlation_threshold = correlation_threshold
        self.window_size = window_size

    def detect_patterns(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """
        Detect patterns in reality events.

        Args:
            events: List of reality events to analyze

        Returns:
            List of detected patterns

        Raises:
            ValueError: If events list is empty
        """
        if not events:
            raise ValueError("Events list cannot be empty")

        patterns = []
        
        try:
            # Sort events by timestamp
            sorted_events = sorted(events, key=lambda e: e.timestamp)
            
            # Detect different types of patterns
            patterns.extend(self._detect_frequency_anomalies(sorted_events))
            patterns.extend(self._detect_sequence_patterns(sorted_events))
            patterns.extend(self._detect_correlations(sorted_events))
            patterns.extend(self._detect_threshold_breaches(sorted_events))
            patterns.extend(self._detect_behavioral_shifts(sorted_events))
            patterns.extend(self._detect_error_clusters(sorted_events))
            
            logger.info(f"Detected {len(patterns)} patterns from {len(events)} events")
            
        except Exception as e:
            logger.error(f"Error detecting patterns: {e}")
            raise

        return patterns

    def _detect_frequency_anomalies(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect frequency anomalies in events."""
        patterns = []
        
        # Group events by type and time windows
        type_windows = defaultdict(list)
        
        for event in events:
            window_start = event.timestamp.replace(minute=0, second=0, microsecond=0)
            type_windows[(event.event_type, window_start)].append(event)
        
        # Calculate average frequency per event type
        type_frequencies = defaultdict(list)
        for (event_type, window), window_events in type_windows.items():
            type_frequencies[event_type].append(len(window_events))
        
        # Detect anomalies
        for event_type, frequencies in type_frequencies.items():
            if len(frequencies) < 3:  # Need sufficient data
                continue
                
            avg_freq = sum(frequencies) / len(frequencies)
            
            for (event_type_key, window), window_events in type_windows.items():
                if event_type_key != event_type:
                    continue
                    
                if len(window_events) > avg_freq * self.frequency_threshold:
                    pattern = DetectedPattern(
                        pattern_id=f"freq_anomaly_{event_type}_{window.isoformat()}",
                        pattern_type=PatternType.FREQUENCY_ANOMALY,
                        confidence=min(0.9, len(window_events) / (avg_freq * self.frequency_threshold)),
                        description=f"High frequency of {event_type} events detected",
                        events=window_events,
                        detection_time=datetime.now(),
                        context={
                            "average_frequency": avg_freq,
                            "current_frequency": len(window_events),
                            "threshold": self.frequency_threshold
                        }
                    )
                    patterns.append(pattern)
        
        return patterns

    def _detect_sequence_patterns(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect sequence patterns in events."""
        patterns = []
        
        # Look for repeating sequences of event types
        event_types = [e.event_type for e in events]
        
        # Find common subsequences
        for length in range(2, min(6, len(event_types))):
            subsequences = []
            for i in range(len(event_types) - length + 1):
                subsequences.append(tuple(event_types[i:i + length]))
            
            # Count occurrences
            sequence_counts = Counter(subsequences)
            
            for sequence, count in sequence_counts.items():
                if count >= 3:  # Sequence appears at least 3 times
                    # Find events matching this sequence
                    matching_events = []
                    for i in range(len(event_types) - length + 1):
                        if tuple(event_types[i:i + length]) == sequence:
                            matching_events.extend(events[i:i + length])
                    
                    pattern = DetectedPattern(
                        pattern_id=f"sequence_{hash(sequence)}",
                        pattern_type=PatternType.SEQUENCE_PATTERN,
                        confidence=min(0.9, count / 10.0),
                        description=f"Repeating sequence detected: {' -> '.join(sequence)}",
                        events=matching_events,
                        detection_time=datetime.now(),
                        context={
                            "sequence": sequence,
                            "occurrences": count,
                            "sequence_length": length
                        }
                    )
                    patterns.append(pattern)
        
        return patterns

    def _detect_correlations(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect correlations between different event types."""
        patterns = []
        
        # Group events by time windows
        time_windows = defaultdict(lambda: defaultdict(int))
        
        for event in events:
            window = event.timestamp.replace(minute=0, second=0, microsecond=0)
            time_windows[window][event.event_type] += 1
        
        # Find correlations between event types
        event_types = set(e.event_type for e in events)
        
        for type_a in event_types:
            for type_b in event_types:
                if type_a >= type_b:  # Avoid duplicates
                    continue
                
                # Calculate correlation
                values_a = []
                values_b = []
                
                for window_data in time_windows.values():
                    values_a.append(window_data.get(type_a, 0))
                    values_b.append(window_data.get(type_b, 0))
                
                if len(values_a) < 3:
                    continue
                
                correlation = self._calculate_correlation(values_a, values_b)
                
                if abs(correlation) >= self.correlation_threshold:
                    # Find related events
                    related_events = [e for e in events if e.event_type in (type_a, type_b)]
                    
                    pattern = DetectedPattern(
                        pattern_id=f"correlation_{type_a}_{type_b}",
                        pattern_type=PatternType.CORRELATION,
                        confidence=abs(correlation),
                        description=f"Strong correlation between {type_a} and {type_b}",
                        events=related_events,
                        detection_time=datetime.now(),
                        context={
                            "event_types": (type_a, type_b),
                            "correlation_coefficient": correlation,
                            "correlation_type": "positive" if correlation > 0 else "negative"
                        }
                    )
                    patterns.append(pattern)
        
        return patterns

    def _detect_threshold_breaches(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect threshold breaches in numeric event data."""
        patterns = []
        
        # Look for numeric fields in event data
        numeric_fields = set()
        for event in events:
            for key, value in event.data.items():
                if isinstance(value, (int, float)):
                    numeric_fields.add(key)
        
        # Analyze each numeric field
        for field in numeric_fields:
            values = []
            field_events = []
            
            for event in events:
                if field in event.data and isinstance(event.data[field], (int, float)):
                    values.append(event.data[field])
                    field_events.append(event)
            
            if len(values) < 5:
                continue
            
            # Calculate thresholds
            values.sort()
            q1 = values[len(values) // 4]
            q3 = values[3 * len(values) // 4]
            iqr = q3 - q1
            
            lower_threshold = q1 - 1.5 * iqr
            upper_threshold = q3 + 1.5 * iqr
            
            # Find outliers
            outlier_events = []
            for event in field_events:
                value = event.data[field]
                if value < lower_threshold or value > upper_threshold:
                    outlier_events.append(event)
            
            if len(outlier_events) >= 2:
                pattern = DetectedPattern(
                    pattern_id=f"threshold_breach_{field}",
                    pattern_type=PatternType.THRESHOLD_BREACH,
                    confidence=min(0.9, len(outlier_events) / len(field_events)),
                    description=f"Threshold breaches detected in {field}",
                    events=outlier_events,
                    detection_time=datetime.now(),
                    context={
                        "field": field,
                        "lower_threshold": lower_threshold,
                        "upper_threshold": upper_threshold,
                        "outlier_count": len(outlier_events)
                    }
                )
                patterns.append(pattern)
        
        return patterns

    def _detect_behavioral_shifts(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect behavioral shifts in event patterns."""
        patterns = []
        
        if len(events) < 10:
            return patterns
        
        # Split events into two halves
        mid_point = len(events) // 2
        first_half = events[:mid_point]
        second_half = events[mid_point:]
        
        # Compare event type distributions
        first_types = Counter(e.event_type for e in first_half)
        second_types = Counter(e.event_type for e in second_half)
        
        # Calculate distribution changes
        all_types = set(first_types.keys()) | set(second_types.keys())
        
        significant_changes = []
        for event_type in all_types:
            first_count = first_types.get(event_type, 0)
            second_count = second_types.get(event_type, 0)
            
            first_ratio = first_count / len(first_half)
            second_ratio = second_count / len(second_half)
            
            if abs(first_ratio - second_ratio) > 0.3:  # 30% change threshold
                significant_changes.append((event_type, first_ratio, second_ratio))
        
        if significant_changes:
            pattern = DetectedPattern(
                pattern_id="behavioral_shift",
                pattern_type=PatternType.BEHAVIORAL_SHIFT,
                confidence=min(0.9, len(significant_changes) / len(all_types)),
                description="Significant behavioral shift detected",
                events=events,
                detection_time=datetime.now(),
                context={
                    "changes": significant_changes,
                    "analysis_period": (events[0].timestamp, events[-1].timestamp)
                }
            )
            patterns.append(pattern)
        
        return patterns

    def _detect_error_clusters(self, events: List[RealityEvent]) -> List[DetectedPattern]:
        """Detect clusters of error events."""
        patterns = []
        
        error_events = [e for e in events if e.severity in ('error', 'critical', 'fatal')]
        
        if len(error_events) < 3:
            return patterns
        
        # Group errors by time proximity
        clusters = []
        current_cluster = [error_events[0]]
        
        for event in error_events[1:]:
            time_diff = event.timestamp - current_cluster[-1].timestamp
            if time_diff <= timedelta(minutes=5):  # 5-minute cluster window
                current_cluster.append(event)
            else:
                if len(current_cluster) >= 3:
                    clusters.append(current_cluster)
                current_cluster = [event]
        
        # Check final cluster
        if len(current_cluster) >= 3:
            clusters.append(current_cluster)
        
        # Create patterns for each cluster
        for i, cluster in enumerate(clusters):
            pattern = DetectedPattern(
                pattern_id=f"error_cluster_{i}",
                pattern_type=PatternType.ERROR_CLUSTER,
                confidence=min(0.9, len(cluster) / 10.0),
                description=f"Error cluster detected with {len(cluster)} events",
                events=cluster,
                detection_time=datetime.now(),
                context={
                    "cluster_size": len(cluster),
                    "time_span": cluster[-1].timestamp - cluster[0].timestamp,
                    "error_types": list(set(e.event_type for e in cluster))
                }
            )
            patterns.append(pattern)
        
        return patterns

    def _calculate_correlation(self, values_a: List[float], values_b: List[float]) -> float:
        """Calculate Pearson correlation coefficient."""
        n = len(values_a)
        if n != len(values_b) or n == 0:
            return 0.0
        
        mean_a = sum(values_a) / n
        mean_b = sum(values_b) / n
        
        numerator = sum((a - mean_a) * (b - mean_b) for a, b in zip(values_a, values_b))
        
        sum_sq_a = sum((a - mean_a) ** 2 for a in values_a)
        sum_sq_b = sum((b - mean_b) ** 2 for b in values_b)
        
        denominator = (sum_sq_a * sum_sq_b) ** 0.5
        
        if denominator == 0:
            return 0.0
        
        return numerator / denominator


class SpecGenerator:
    """Generates feature specifications from detected patterns."""

    def __init__(self):
        """Initialize spec generator."""
        self.pattern_templates = self._load_pattern_templates()

    def generate_specs(self, patterns: List[DetectedPattern]) -> List[GeneratedSpec]:
        """
        Generate feature specifications from detected patterns.

        Args:
            patterns: List of detected patterns

        Returns:
            List of generated specifications

        Raises:
            ValueError: If patterns list is empty
        """
        if not patterns:
            raise ValueError("Patterns list cannot be empty")

        specs = []
        
        try:
            for pattern in patterns:
                spec = self._generate_spec_from_pattern(pattern)
                if spec:
                    specs.append(spec)
            
            logger.info(f"Generated {len(specs)} specifications from {len(patterns)} patterns")
            
        except Exception as e:
            logger.error(f"Error generating specs: {e}")
            raise

        return specs

    def _generate_spec_from_pattern(self, pattern: DetectedPattern) -> Optional[GeneratedSpec]:
        """Generate a specification from a single pattern."""
        template = self.pattern_templates.get(pattern.pattern_type)
        if not template:
            logger.warning(f"No template found for pattern type: {pattern.pattern_type}")
            return None

        try:
            # Generate spec content based on pattern
            spec_data = self._populate_template(template, pattern)
            
            spec = GeneratedSpec(
                spec_id=f"auto_spec_{pattern.pattern_id}",
                title=spec_data["title"],
                description=spec_data["description"],
                priority=spec_data["priority"],
                pattern=pattern,
                requirements=spec_data["requirements"],
                acceptance_criteria=spec_data["acceptance_criteria"],
                technical_notes=spec_data["technical_notes"],
                estimated_effort=spec_data["estimated_effort"],
                tags=set(spec_data.get("tags", []))
            )
            
            return spec
            
        except Exception as e:
            logger.error(f"Error generating spec from pattern {pattern.pattern_id}: {e}")
            return None

    def _populate_template(self, template: Dict[str, Any], pattern: DetectedPattern) -> Dict[str, Any]:
        """Populate template with pattern-specific data."""
        context = pattern.context.copy()
        context.update({
            "pattern_type": pattern.pattern_type.value,
            "confidence": pattern.confidence,
            "event_count": len(pattern.events),
            "description": pattern.description
        })
        
        populated = {}
        
        for key, value in template.items():
            if isinstance(value, str):
                populated[key] = value.format(**context)
            elif isinstance(value, list):
                populated[key] = [item.format(**context) if isinstance(item, str) else item for item in value]
            else:
                populated[key] = value
        
        # Determine priority based on confidence and impact
        populated["priority"] = self._determine_priority(pattern)
        
        return populated

    def _determine_priority(self, pattern: DetectedPattern) -> SpecPriority:
        """Determine specification priority based on pattern characteristics."""
        confidence = pattern.confidence
        event_count = len(pattern.events)
        pattern_type = pattern.pattern_type
        
        # High priority patterns
        if pattern_type in (PatternType.ERROR_CLUSTER, PatternType.THRESHOLD_BREACH):
            return SpecPriority.CRITICAL if confidence > 0.8 else SpecPriority.HIGH
        
        # Medium-high priority patterns
        if pattern_type == PatternType.FREQUENCY_ANOMALY and confidence > 0.7:
            return SpecPriority.HIGH
        
        # Medium priority patterns
        if confidence > 0.6 or event_count > 10:
            return SpecPriority.MEDIUM
        
        return SpecPriority.LOW

    def _load_pattern_templates(self) -> Dict[PatternType, Dict[str, Any]]:
        """Load specification templates for different pattern types."""
        return {
            PatternType.FREQUENCY_ANOMALY: {
                "title": "Handle {pattern_type} - {description}",
                "description": "Implement monitoring and handling for frequency anomalies detected in {pattern_type} events",
                "requirements": [
                    "Monitor event frequency for {pattern_type} patterns",
                    "Implement alerting when frequency exceeds threshold",
                    "Provide automatic scaling/throttling capabilities",
                    "Add logging and metrics collection"
                ],
                "acceptance_criteria": [
                    "System detects frequency anomalies with >80% accuracy",
                    "Alerts are triggered within 1 minute of detection",
                    "False positive rate is <10%",
                    "System can handle {event_count}+ events per time window"
                ],
                "technical_notes": [
                    "Implement sliding window algorithm for frequency tracking",
                    "Use configurable thresholds based on historical data",
                    "Consider time-of-day and seasonal patterns"
                ],
                "estimated_effort": "Medium",
                "tags": ["monitoring", "alerting", "performance"]
            },
            
            PatternType.SEQUENCE_PATTERN: {
                "title": "Optimize {pattern_type} Workflow",
                "description": "Optimize system workflow based on detected sequence patterns",
                "requirements": [
                    "Implement sequence pattern recognition",
                    "Optimize workflow for common sequences",
                    "Provide sequence prediction capabilities",
                    "Add sequence-based caching"
                ],
                "acceptance_criteria": [
                    "System recognizes common sequences with >90% accuracy",
                    "Workflow optimization reduces processing time by 20%",
                    "Sequence predictions are 70%+ accurate",
                    "Cache hit rate improves by 15%+"
                ],
                "technical_notes": [
                    "Use state machine or pattern matching algorithms",
                    "Implement predictive caching based on sequences",
                    "Consider sequence variations and error handling"
                ],
                "estimated_effort": "Large",
                "tags": ["optimization", "workflow", "prediction"]
            },
            
            PatternType.CORRELATION: {
                "title": "Handle Correlated Events - {description}",
                "description": "Implement handling for correlated events with {confidence:.2f} correlation",
                "requirements": [
                    "Monitor correlated event patterns",
                    "Implement joint processing for correlated events",
                    "Provide correlation-based predictions",
                    "Add correlation strength monitoring"
                ],
                "acceptance_criteria": [
                    "System detects correlations with >75% accuracy",
                    "Joint processing reduces resource usage by 15%",
                    "Correlation predictions are 65%+ accurate",
                    "Monitoring provides real-time correlation metrics"
                ],
                "technical_notes": [
                    "Use statistical correlation analysis",
                    "Implement sliding window for correlation tracking",
                    "Handle correlation changes over time"
                ],
                "estimated_effort": "Medium",
                "tags": ["correlation", "prediction", "optimization"]
            },
            
            PatternType.THRESHOLD_BREACH: {
                "title": "Critical: Handle Threshold Breaches",
                "description": "Implement handling for threshold breaches in system metrics",
                "requirements": [
                    "Implement real-time threshold monitoring",
                    "Add automatic breach response mechanisms",
                    "Provide breach prediction capabilities",
                    "Implement dynamic threshold adjustment"
                ],
                "acceptance_criteria": [
                    "Breaches are detected within 30 seconds",
                    "Automatic responses prevent 80%+ of incidents",
                    "False positive rate is <5%",
                    "Thresholds adapt to system behavior changes"
                ],
                "technical_notes": [
                    "Use statistical process control methods",
                    "Implement circuit breaker patterns",
                    "Consider seasonal and trend adjustments"
                ],
                "estimated_effort": "Large",
                "tags": ["critical", "monitoring", "reliability"]
            },
            
            PatternType.BEHAVIORAL_SHIFT: {
                "title": "Adapt to Behavioral Changes",
                "description": "Implement adaptation mechanisms for detected behavioral shifts",
                "requirements": [
                    "Detect behavioral shifts in real-time",
                    "Implement adaptive system responses",
                    "Provide shift prediction and analysis",
                    "Add behavioral baseline management"
                ],
                "acceptance_criteria": [
                    "Behavioral shifts are detected within 1 hour",
                    "System adapts to changes automatically",
                    "Shift predictions are 60%+ accurate",
                    "Baselines are updated weekly"
                ],
                "technical_notes": [
                    "Use change point detection algorithms",
                    "Implement machine learning for adaptation",
                    "Handle gradual vs sudden shifts differently"
                ],
                "estimated_effort": "Large",
                "tags": ["adaptation", "machine-learning", "monitoring"]
            },
            
            PatternType.ERROR_CLUSTER: {
                "title": "Critical: Handle Error Clusters",
                "description": "Implement error cluster detection and response system",
                "requirements": [
                    "Detect error clusters in real-time",
                    "Implement automatic error cluster response",
                    "Provide root cause analysis capabilities",
                    "Add cluster prevention mechanisms"
                ],
                "acceptance_criteria": [
                    "Error clusters are detected within 1 minute",
                    "Automatic responses reduce impact by 70%+",
                    "Root cause analysis accuracy >80%",
                    "Cluster prevention reduces occurrences by 50%+"
                ],
                "technical_notes": [
                    "Use clustering algorithms for error grouping",
                    "Implement incident response automation",
                    "Consider error correlation and cascading failures"
                ],
                "estimated_effort": "Large",
                "tags": ["critical", "error-handling", "reliability"]
            }
        }


class SpecGeneratorService:
    """Main service for auto-generating specifications from reality events."""

    def __init__(self, 
                 pattern_detector: Optional[PatternDetector] = None,
                 spec_generator: Optional[SpecGenerator] = None):
        """
        Initialize spec generator service.

        Args:
            pattern_detector: Pattern detection component
            spec_generator: Specification generation component
        """
        self.pattern_detector = pattern_detector or PatternDetector()
        self.spec_generator = spec_generator or SpecGenerator()
        self.generated_specs: List[GeneratedSpec] = []

    def analyze_and_generate(self, events: List[RealityEvent]) -> List[GeneratedSpec]:
        """
        Analyze reality events and generate specifications.

        Args:
            events: List of reality events to analyze

        Returns:
            List of generated specifications

        Raises:
            ValueError: If events list is empty
            RuntimeError: If analysis or generation fails
        """
        if not events:
            raise ValueError("Events list cannot be empty")

        try:
            logger.info(f"Starting analysis of {len(events)} events")
            
            # Detect patterns
            patterns = self.pattern_detector.detect_patterns(events)
            
            if not patterns:
                logger.info("No patterns detected, no specifications generated")
                return []
            
            # Generate specifications
            specs = self.spec_generator.generate_specs(patterns)
            
            # Store generated specs
            self.generated_specs.extend(specs)
            
            logger.info(f"Successfully generated {len(specs)} specifications")
            return specs
            
        except Exception as e:
            logger.error(f"Error in analyze_and_generate: {e}")
            raise RuntimeError(f"Failed to analyze events and generate specs: {e}")

    def get_specs_by_priority(self, priority: SpecPriority) -> List[GeneratedSpec]:
        """
        Get specifications filtered by priority.

        Args:
            priority: Priority level to filter by

        Returns:
            List of specifications with specified priority
        """
        return [spec for spec in self.generated_specs if spec.priority == priority]

    def export_specs_to_json(self, specs: List[GeneratedSpec]) -> str:
        """
        Export specifications to JSON format.

        Args:
            specs: List of specifications to export

        Returns:
            JSON string representation of specifications
        """
        def serialize_spec(spec: GeneratedSpec) -> Dict[str, Any]:
            return {
                "spec_id": spec.spec_id,
                "title": spec.title,
                "description": spec.description,
                "priority": spec.priority.value,
                "requirements": spec.requirements,
                "acceptance_criteria": spec.acceptance_criteria,
                "technical_notes": spec.technical_notes,
                "estimated_effort": spec.estimated_effort,
                "tags": list(spec.tags),
                "created_at": spec.created_at.isoformat(),
                "pattern_info": {
                    "pattern_id": spec.pattern.pattern_id,
                    "pattern_type": spec.pattern.pattern_type.value,
                    "confidence": spec.pattern.confidence,
                    "description": spec.pattern.description,
                    "event_count": len(spec.pattern.events)
                }
            }

        serialized_specs = [serialize_spec(spec) for spec in specs]
        return json.dumps(serialized_specs, indent=2)

    def clear_generated_specs(self) -> None:
        """Clear all stored generated specifications."""
        self.generated_specs.clear()
        logger.info("Cleared all generated specifications")
