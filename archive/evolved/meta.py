"""
Meta-analysis module for Auto Spec Generator.

Analyzes patterns in reality events and auto-generates feature specifications
when significant patterns are detected.
"""

from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
import json
import logging
from collections import defaultdict, Counter
import statistics

logger = logging.getLogger(__name__)


class PatternType(Enum):
    """Types of patterns that can be detected in reality events."""
    FREQUENCY = "frequency"
    SEQUENCE = "sequence"
    CORRELATION = "correlation"
    ANOMALY = "anomaly"
    TREND = "trend"


class SpecPriority(Enum):
    """Priority levels for auto-generated specs."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class RealityEvent:
    """Represents a reality event for analysis."""
    event_id: str
    event_type: str
    timestamp: datetime
    data: Dict[str, Any]
    source: str
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class Pattern:
    """Represents a detected pattern in reality events."""
    pattern_id: str
    pattern_type: PatternType
    confidence: float
    events: List[RealityEvent]
    attributes: Dict[str, Any]
    detected_at: datetime
    description: str


@dataclass
class GeneratedSpec:
    """Represents an auto-generated feature specification."""
    spec_id: str
    title: str
    description: str
    priority: SpecPriority
    patterns: List[Pattern]
    requirements: List[str]
    acceptance_criteria: List[str]
    generated_at: datetime
    confidence_score: float
    tags: List[str]


class PatternDetector:
    """Detects patterns in collections of reality events."""
    
    def __init__(self, min_confidence: float = 0.7):
        """
        Initialize pattern detector.
        
        Args:
            min_confidence: Minimum confidence threshold for pattern detection
        """
        self.min_confidence = min_confidence
        self.detectors = {
            PatternType.FREQUENCY: self._detect_frequency_patterns,
            PatternType.SEQUENCE: self._detect_sequence_patterns,
            PatternType.CORRELATION: self._detect_correlation_patterns,
            PatternType.ANOMALY: self._detect_anomaly_patterns,
            PatternType.TREND: self._detect_trend_patterns
        }
    
    def detect_patterns(self, events: List[RealityEvent]) -> List[Pattern]:
        """
        Detect all types of patterns in the given events.
        
        Args:
            events: List of reality events to analyze
            
        Returns:
            List of detected patterns
            
        Raises:
            ValueError: If events list is empty
        """
        if not events:
            raise ValueError("Events list cannot be empty")
        
        try:
            all_patterns = []
            
            for pattern_type, detector_func in self.detectors.items():
                try:
                    patterns = detector_func(events)
                    all_patterns.extend(patterns)
                    logger.debug(f"Detected {len(patterns)} {pattern_type.value} patterns")
                except Exception as e:
                    logger.error(f"Error detecting {pattern_type.value} patterns: {e}")
            
            # Filter by confidence threshold
            filtered_patterns = [p for p in all_patterns if p.confidence >= self.min_confidence]
            logger.info(f"Detected {len(filtered_patterns)} patterns above confidence threshold")
            
            return filtered_patterns
            
        except Exception as e:
            logger.error(f"Error in pattern detection: {e}")
            raise
    
    def _detect_frequency_patterns(self, events: List[RealityEvent]) -> List[Pattern]:
        """Detect frequency-based patterns."""
        try:
            patterns = []
            event_type_counts = Counter(event.event_type for event in events)
            
            # Calculate mean and std for frequency analysis
            counts = list(event_type_counts.values())
            if len(counts) < 2:
                return patterns
            
            mean_count = statistics.mean(counts)
            std_count = statistics.stdev(counts) if len(counts) > 1 else 0
            
            for event_type, count in event_type_counts.items():
                if count > mean_count + 2 * std_count:  # High frequency pattern
                    related_events = [e for e in events if e.event_type == event_type]
                    confidence = min(0.99, count / (mean_count + 3 * std_count))
                    
                    pattern = Pattern(
                        pattern_id=f"freq_{event_type}_{datetime.now().timestamp()}",
                        pattern_type=PatternType.FREQUENCY,
                        confidence=confidence,
                        events=related_events,
                        attributes={
                            "event_type": event_type,
                            "frequency": count,
                            "mean_frequency": mean_count,
                            "std_deviation": std_count
                        },
                        detected_at=datetime.now(),
                        description=f"High frequency pattern detected for {event_type} ({count} occurrences)"
                    )
                    patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error in frequency pattern detection: {e}")
            return []
    
    def _detect_sequence_patterns(self, events: List[RealityEvent]) -> List[Pattern]:
        """Detect sequential patterns in events."""
        try:
            patterns = []
            sorted_events = sorted(events, key=lambda e: e.timestamp)
            
            # Look for repeating sequences of event types
            sequence_window = 3
            sequences = []
            
            for i in range(len(sorted_events) - sequence_window + 1):
                sequence = tuple(sorted_events[i + j].event_type for j in range(sequence_window))
                sequences.append((sequence, sorted_events[i:i + sequence_window]))
            
            sequence_counts = Counter(seq[0] for seq in sequences)
            
            for sequence_pattern, count in sequence_counts.items():
                if count >= 2:  # Pattern appears at least twice
                    confidence = min(0.95, count / len(sequences))
                    related_events = []
                    
                    for seq_tuple, seq_events in sequences:
                        if seq_tuple == sequence_pattern:
                            related_events.extend(seq_events)
                    
                    pattern = Pattern(
                        pattern_id=f"seq_{hash(sequence_pattern)}_{datetime.now().timestamp()}",
                        pattern_type=PatternType.SEQUENCE,
                        confidence=confidence,
                        events=related_events,
                        attributes={
                            "sequence": sequence_pattern,
                            "occurrences": count,
                            "window_size": sequence_window
                        },
                        detected_at=datetime.now(),
                        description=f"Sequential pattern: {' -> '.join(sequence_pattern)} (occurs {count} times)"
                    )
                    patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error in sequence pattern detection: {e}")
            return []
    
    def _detect_correlation_patterns(self, events: List[RealityEvent]) -> List[Pattern]:
        """Detect correlation patterns between different event types."""
        try:
            patterns = []
            event_types = list(set(event.event_type for event in events))
            
            # Time window for correlation analysis (minutes)
            correlation_window = 30
            
            for i, type_a in enumerate(event_types):
                for type_b in event_types[i + 1:]:
                    correlations = 0
                    total_type_a = 0
                    
                    events_a = [e for e in events if e.event_type == type_a]
                    events_b = [e for e in events if e.event_type == type_b]
                    
                    for event_a in events_a:
                        total_type_a += 1
                        window_start = event_a.timestamp
                        window_end = window_start + timedelta(minutes=correlation_window)
                        
                        # Check if any type_b events occur within the window
                        if any(window_start <= event_b.timestamp <= window_end for event_b in events_b):
                            correlations += 1
                    
                    if total_type_a > 0:
                        correlation_ratio = correlations / total_type_a
                        
                        if correlation_ratio >= 0.7:  # Strong correlation threshold
                            related_events = events_a + events_b
                            
                            pattern = Pattern(
                                pattern_id=f"corr_{type_a}_{type_b}_{datetime.now().timestamp()}",
                                pattern_type=PatternType.CORRELATION,
                                confidence=correlation_ratio,
                                events=related_events,
                                attributes={
                                    "event_type_a": type_a,
                                    "event_type_b": type_b,
                                    "correlation_ratio": correlation_ratio,
                                    "window_minutes": correlation_window
                                },
                                detected_at=datetime.now(),
                                description=f"Correlation between {type_a} and {type_b} ({correlation_ratio:.2%})"
                            )
                            patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error in correlation pattern detection: {e}")
            return []
    
    def _detect_anomaly_patterns(self, events: List[RealityEvent]) -> List[Pattern]:
        """Detect anomalous patterns in events."""
        try:
            patterns = []
            
            # Group events by hour to detect time-based anomalies
            hourly_counts = defaultdict(int)
            for event in events:
                hour = event.timestamp.hour
                hourly_counts[hour] += 1
            
            if len(hourly_counts) < 3:
                return patterns
            
            counts = list(hourly_counts.values())
            mean_count = statistics.mean(counts)
            std_count = statistics.stdev(counts) if len(counts) > 1 else 0
            
            for hour, count in hourly_counts.items():
                if std_count > 0 and abs(count - mean_count) > 2 * std_count:
                    # Anomalous hour detected
                    related_events = [e for e in events if e.timestamp.hour == hour]
                    confidence = min(0.9, abs(count - mean_count) / (3 * std_count))
                    
                    pattern = Pattern(
                        pattern_id=f"anom_hour_{hour}_{datetime.now().timestamp()}",
                        pattern_type=PatternType.ANOMALY,
                        confidence=confidence,
                        events=related_events,
                        attributes={
                            "anomaly_type": "temporal",
                            "hour": hour,
                            "count": count,
                            "mean_count": mean_count,
                            "deviation": abs(count - mean_count) / std_count if std_count > 0 else 0
                        },
                        detected_at=datetime.now(),
                        description=f"Anomalous activity at hour {hour} ({count} events vs {mean_count:.1f} average)"
                    )
                    patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error in anomaly pattern detection: {e}")
            return []
    
    def _detect_trend_patterns(self, events: List[RealityEvent]) -> List[Pattern]:
        """Detect trending patterns in events."""
        try:
            patterns = []
            sorted_events = sorted(events, key=lambda e: e.timestamp)
            
            if len(sorted_events) < 5:
                return patterns
            
            # Analyze trends in event frequency over time
            time_buckets = defaultdict(int)
            bucket_size = timedelta(hours=1)  # 1-hour buckets
            
            start_time = sorted_events[0].timestamp
            for event in sorted_events:
                bucket_key = int((event.timestamp - start_time) / bucket_size)
                time_buckets[bucket_key] += 1
            
            # Calculate trend slope
            x_values = list(time_buckets.keys())
            y_values = list(time_buckets.values())
            
            if len(x_values) >= 3:
                # Simple linear trend calculation
                n = len(x_values)
                sum_x = sum(x_values)
                sum_y = sum(y_values)
                sum_xy = sum(x * y for x, y in zip(x_values, y_values))
                sum_x2 = sum(x * x for x in x_values)
                
                slope = (n * sum_xy - sum_x * sum_y) / (n * sum_x2 - sum_x * sum_x)
                
                if abs(slope) > 0.5:  # Significant trend threshold
                    trend_type = "increasing" if slope > 0 else "decreasing"
                    confidence = min(0.9, abs(slope) / 2)
                    
                    pattern = Pattern(
                        pattern_id=f"trend_{trend_type}_{datetime.now().timestamp()}",
                        pattern_type=PatternType.TREND,
                        confidence=confidence,
                        events=sorted_events,
                        attributes={
                            "trend_type": trend_type,
                            "slope": slope,
                            "bucket_size_hours": 1,
                            "time_span_hours": len(x_values)
                        },
                        detected_at=datetime.now(),
                        description=f"{trend_type.capitalize()} trend in event frequency (slope: {slope:.2f})"
                    )
                    patterns.append(pattern)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error in trend pattern detection: {e}")
            return []


class SpecGenerator:
    """Generates feature specifications based on detected patterns."""
    
    def __init__(self):
        """Initialize the spec generator."""
        self.spec_templates = {
            PatternType.FREQUENCY: self._generate_frequency_spec,
            PatternType.SEQUENCE: self._generate_sequence_spec,
            PatternType.CORRELATION: self._generate_correlation_spec,
            PatternType.ANOMALY: self._generate_anomaly_spec,
            PatternType.TREND: self._generate_trend_spec
        }
    
    def generate_specs(self, patterns: List[Pattern]) -> List[GeneratedSpec]:
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
        
        try:
            specs = []
            
            for pattern in patterns:
                try:
                    generator_func = self.spec_templates.get(pattern.pattern_type)
                    if generator_func:
                        spec = generator_func(pattern)
                        specs.append(spec)
                        logger.debug(f"Generated spec for {pattern.pattern_type.value} pattern")
                    else:
                        logger.warning(f"No spec generator for pattern type: {pattern.pattern_type}")
                        
                except Exception as e:
                    logger.error(f"Error generating spec for pattern {pattern.pattern_id}: {e}")
            
            # Sort specs by priority and confidence
            specs.sort(key=lambda s: (s.priority.value, -s.confidence_score))
            logger.info(f"Generated {len(specs)} specifications")
            
            return specs
            
        except Exception as e:
            logger.error(f"Error in spec generation: {e}")
            raise
    
    def _determine_priority(self, confidence: float, impact_score: float = 0.5) -> SpecPriority:
        """Determine spec priority based on confidence and impact."""
        combined_score = (confidence + impact_score) / 2
        
        if combined_score >= 0.9:
            return SpecPriority.CRITICAL
        elif combined_score >= 0.7:
            return SpecPriority.HIGH
        elif combined_score >= 0.5:
            return SpecPriority.MEDIUM
        else:
            return SpecPriority.LOW
    
    def _generate_frequency_spec(self, pattern: Pattern) -> GeneratedSpec:
        """Generate specification for frequency patterns."""
        event_type = pattern.attributes.get("event_type", "unknown")
        frequency = pattern.attributes.get("frequency", 0)
        
        return GeneratedSpec(
            spec_id=f"freq_spec_{pattern.pattern_id}",
            title=f"High Frequency Event Handler for {event_type}",
            description=f"Implement optimized handling for high-frequency {event_type} events "
                       f"(detected {frequency} occurrences)",
            priority=self._determine_priority(pattern.confidence),
            patterns=[pattern],
            requirements=[
                f"Handle {event_type} events efficiently at high volume",
                "Implement rate limiting and throttling mechanisms",
                "Add monitoring and alerting for event spikes",
                "Optimize database operations for bulk processing"
            ],
            acceptance_criteria=[
                f"System can process {frequency * 2} {event_type} events per time period",
                "Response time remains under 100ms during peak load",
                "Memory usage stays within acceptable limits",
                "Error rate remains below 1% during high-frequency periods"
            ],
            generated_at=datetime.now(),
            confidence_score=pattern.confidence,
            tags=["performance", "scalability", "event-handling", event_type]
        )
    
    def _generate_sequence_spec(self, pattern: Pattern) -> GeneratedSpec:
        """Generate specification for sequence patterns."""
        sequence = pattern.attributes.get("sequence", [])
        occurrences = pattern.attributes.get("occurrences", 0)
        
        return GeneratedSpec(
            spec_id=f"seq_spec_{pattern.pattern_id}",
            title=f"Sequential Event Workflow",
            description=f"Implement workflow handling for the event sequence: {' -> '.join(sequence)} "
                       f"(detected {occurrences} times)",
            priority=self._determine_priority(pattern.confidence, 0.8),
            patterns=[pattern],
            requirements=[
                "Implement state machine for event sequence tracking",
                "Add sequence validation and error handling",
                "Create workflow orchestration system",
                "Implement sequence completion notifications"
            ],
            acceptance_criteria=[
                "System correctly identifies and tracks event sequences",
                "Invalid sequences are detected and handled appropriately",
                "Workflow state is persisted and recoverable",
                "Sequence completion triggers appropriate actions"
            ],
            generated_at=datetime.now(),
            confidence_score=pattern.confidence,
            tags=["workflow", "state-machine", "orchestration", "sequences"]
        )
    
    def _generate_correlation_spec(self, pattern: Pattern) -> GeneratedSpec:
        """Generate specification for correlation patterns."""
        type_a = pattern.attributes.get("event_type_a", "unknown")
        type_b = pattern.attributes.get("event_type_b", "unknown")
        correlation_ratio = pattern.attributes.get("correlation_ratio", 0)
        
        return GeneratedSpec(
            spec_id=f"corr_spec_{pattern.pattern_id}",
            title=f"Correlated Event Processing: {type_a} ↔ {type_b}",
            description=f"Implement intelligent processing for correlated events {type_a} and {type_b} "
                       f"(correlation: {correlation_ratio:.2%})",
            priority=self._determine_priority(pattern.confidence, 0.7),
            patterns=[pattern],
            requirements=[
                f"Detect correlation between {type_a} and {type_b} events",
                "Implement predictive processing based on correlations",
                "Add correlation monitoring and metrics",
                "Create automated response triggers"
            ],
            acceptance_criteria=[
                "System accurately identifies correlated event pairs",
                "Predictive actions are triggered with high accuracy",
                "Correlation metrics are tracked and reported",
                "False positive rate for correlations is below 5%"
            ],
            generated_at=datetime.now(),
            confidence_score=pattern.confidence,
            tags=["correlation", "prediction", "intelligence", type_a, type_b]
        )
    
    def _generate_anomaly_spec(self, pattern: Pattern) -> GeneratedSpec:
        """Generate specification for anomaly patterns."""
        anomaly_type = pattern.attributes.get("anomaly_type", "unknown")
        deviation = pattern.attributes.get("deviation", 0)
        
        return GeneratedSpec(
            spec_id=f"anom_spec_{pattern.pattern_id}",
            title=f"Anomaly Detection and Response System",
            description=f"Implement {anomaly_type} anomaly detection with automated response "
                       f"(deviation: {deviation:.2f}σ)",
            priority=self._determine_priority(pattern.confidence, 0.9),
            patterns=[pattern],
            requirements=[
                "Implement real-time anomaly detection algorithms",
                "Create automated alerting system",
                "Add anomaly investigation tools",
                "Implement adaptive thresholds"
            ],
            acceptance_criteria=[
                "Anomalies are detected within 1 minute of occurrence",
                "Alert notifications are sent to appropriate personnel",
                "False positive rate is below 2%",
                "Investigation tools provide actionable insights"
            ],
            generated_at=datetime.now(),
            confidence_score=pattern.confidence,
            tags=["anomaly-detection", "monitoring", "alerting", anomaly_type]
        )
    
    def _generate_trend_spec(self, pattern: Pattern) -> GeneratedSpec:
        """Generate specification for trend patterns."""
        trend_type = pattern.attributes.get("trend_type", "unknown")
        slope = pattern.attributes.get("slope", 0)
        
        return GeneratedSpec(
            spec_id=f"trend_spec_{pattern.pattern_id}",
            title=f"Trend-Based Capacity Planning",
            description=f"Implement capacity planning for {trend_type} trend in event volume "
                       f"(slope: {slope:.2f})",
            priority=self._determine_priority(pattern.confidence, 0.6),
            patterns=[pattern],
            requirements=[
                "Implement trend analysis and forecasting",
                "Create automated scaling mechanisms",
                "Add capacity planning dashboard",
                "Implement proactive resource allocation"
            ],
            acceptance_criteria=[
                "Trend forecasts are accurate within 10%",
                "Scaling actions are triggered before resource limits",
                "Dashboard provides clear trend visualizations",
                "Resource utilization remains optimal"
            ],
            generated_at=datetime.now(),
            confidence_score=pattern.confidence,
            tags=["trends", "capacity-planning", "forecasting", "scaling"]
        )


class MetaAnalyzer:
    """Main meta-analysis class that orchestrates pattern detection and spec generation."""
    
    def __init__(self, min_confidence: float = 0.7):
        """
        Initialize meta analyzer.
        
        Args:
            min_confidence: Minimum confidence threshold for patterns
        """
        self.pattern_detector = PatternDetector(min_confidence)
        self.spec_generator = SpecGenerator()
        self.analysis_history: List[Dict[str, Any]] = []
    
    def analyze_and_generate(self, events: List[RealityEvent]) -> Tuple[List[Pattern], List[GeneratedSpec]]:
        """
        Analyze events and generate specifications.
        
        Args:
            events: List of reality events to analyze
            
        Returns:
            Tuple of (detected patterns, generated specifications)
            
        Raises:
            ValueError: If events list is empty
        """
        if not events:
            raise ValueError("Events list cannot be empty")
        
        try:
            start_time = datetime.now()
            
            # Detect patterns
            patterns = self.pattern_detector.detect_patterns(events)
            logger.info(f"Detected {len(patterns)} patterns")
            
            # Generate specifications
            specs = []
            if patterns:
                specs = self.spec_generator.generate_specs(patterns)
                logger.info(f"Generated {len(specs)} specifications")
            
            # Record analysis
            analysis_record = {
                "timestamp": start_time,
                "events_analyzed": len(events),
                "patterns_detected": len(patterns),
                "specs_generated": len(specs),
                "analysis_duration": (datetime.now() - start_time).total_seconds(),
                "pattern_types": [p.pattern_type.value for p in patterns],
                "spec_priorities": [s.priority.value for s in specs]
            }
            self.analysis_history.append(analysis_record)
            
            logger.info(f"Meta-analysis completed in {analysis_record['analysis_duration']:.2f}s")
            
            return patterns, specs
            
        except Exception as e:
            logger.error(f"Error in meta-analysis: {e}")
            raise
    
    def get_analysis_summary(self) -> Dict[str, Any]:
        """
        Get summary of all analyses performed.
        
        Returns:
            Dictionary containing analysis summary statistics
        """
        if not self.analysis_history:
            return {"message": "No analyses performed yet"}
        
        try:
            total_analyses = len(self.analysis_history)
            total_events = sum(record["events_analyzed"] for record in self.analysis_history)
            total_patterns = sum(record["patterns_detected"] for record in self.analysis_history)
            total_specs = sum(record["specs_generated"] for record in self.analysis_history)
            
            avg_duration = statistics.mean(record["analysis_duration"] for record in self.analysis_history)
            
            pattern_type_counts = Counter()
            spec_priority_counts = Counter()
            
            for record in self.analysis_history:
                pattern_type_counts.update(record["pattern_types"])
                spec_priority_counts.update(record["spec_priorities"])
            
            return {
                "total_analyses": total_analyses,
                "total_events_analyzed": total_events,
                "total_patterns_detected": total_patterns,
                "total_specs_generated": total_specs,
                "average_analysis_duration": avg_duration,
                "pattern_type_distribution": dict(pattern_type_counts),
                "spec_priority_distribution": dict(spec_priority_counts),
                "latest_analysis": self.analysis_history[-1]["timestamp"].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error generating analysis summary: {e}")
            return {"error": f"Failed to generate summary: {str(e)}"}
