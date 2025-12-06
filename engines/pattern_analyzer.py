"""
AUTUS Pattern Analyzer
Analyzes Reality Events to detect patterns, anomalies, and trends

Part of the Auto Spec Generator system:
Events → Pattern Analyzer → Need Detector → Spec Generator → Evolution
"""

from typing import Dict, List, Any, Optional, Set
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass, field
from collections import defaultdict, Counter
from enum import Enum
import statistics


class PatternType(str, Enum):
    """Types of patterns that can be detected."""
    ERROR_RATE_HIGH = "error_rate_high"
    NEW_DEVICE_TYPE = "new_device_type"
    TRAFFIC_SPIKE = "traffic_spike"
    MISSING_HANDLER = "missing_handler"
    ANOMALY = "anomaly"
    TREND_UP = "trend_up"
    TREND_DOWN = "trend_down"
    NEW_EVENT_TYPE = "new_event_type"


@dataclass
class DetectedPattern:
    """Represents a detected pattern."""
    pattern_type: PatternType
    confidence: float  # 0.0 - 1.0
    details: Dict[str, Any]
    detected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    severity: str = "medium"  # low, medium, high, critical


@dataclass
class AnalysisResult:
    """Result of pattern analysis."""
    patterns: List[DetectedPattern]
    event_count: int
    window_start: datetime
    window_end: datetime
    statistics: Dict[str, Any]


class PatternAnalyzer:
    """
    Analyzes Reality Events to detect patterns.
    
    Detects:
    - Error rate spikes
    - New device types
    - Traffic spikes
    - Missing handlers
    - Anomalies
    - Trends
    """
    
    def __init__(self):
        self.known_device_types: Set[str] = set()
        self.known_event_types: Set[str] = set()
        self.baseline_metrics: Dict[str, float] = {}
        self.event_history: List[Dict] = []
        
        # Thresholds
        self.error_rate_threshold = 0.05  # 5%
        self.traffic_spike_multiplier = 3.0  # 3x normal
        self.anomaly_std_threshold = 2.0  # 2 standard deviations
    
    def analyze(
        self,
        events: List[Dict[str, Any]],
        window_minutes: int = 5
    ) -> AnalysisResult:
        """
        Analyze events and detect patterns.
        
        Args:
            events: List of reality events
            window_minutes: Analysis window in minutes
            
        Returns:
            AnalysisResult with detected patterns
        """
        if not events:
            return AnalysisResult(
                patterns=[],
                event_count=0,
                window_start=datetime.now(timezone.utc),
                window_end=datetime.now(timezone.utc),
                statistics={}
            )
        
        patterns = []
        now = datetime.now(timezone.utc)
        window_start = now - timedelta(minutes=window_minutes)
        
        # Compute statistics
        stats = self._compute_statistics(events)
        
        # Detect patterns
        patterns.extend(self._detect_error_rate(events, stats))
        patterns.extend(self._detect_new_device_types(events))
        patterns.extend(self._detect_traffic_spike(events, stats))
        patterns.extend(self._detect_missing_handlers(events))
        patterns.extend(self._detect_new_event_types(events))
        patterns.extend(self._detect_anomalies(events, stats))
        
        # Update history
        self.event_history.extend(events)
        # Keep only recent history (last 1000 events)
        self.event_history = self.event_history[-1000:]
        
        return AnalysisResult(
            patterns=patterns,
            event_count=len(events),
            window_start=window_start,
            window_end=now,
            statistics=stats
        )
    
    def _compute_statistics(self, events: List[Dict]) -> Dict[str, Any]:
        """Compute statistics from events."""
        if not events:
            return {}
        
        # Count by type
        type_counts = Counter(e.get("type", "unknown") for e in events)
        source_counts = Counter(e.get("source", "unknown") for e in events)
        
        # Error count
        error_events = [e for e in events if "error" in e.get("type", "").lower()]
        error_rate = len(error_events) / len(events) if events else 0
        
        # Device types
        device_types = set(e.get("device_id", "").split("_")[0] for e in events if e.get("device_id"))
        
        return {
            "total_events": len(events),
            "error_count": len(error_events),
            "error_rate": error_rate,
            "type_distribution": dict(type_counts),
            "source_distribution": dict(source_counts),
            "unique_device_types": list(device_types),
            "unique_devices": len(set(e.get("device_id") for e in events if e.get("device_id"))),
            "events_per_minute": len(events) / 5  # Assume 5 min window
        }
    
    def _detect_error_rate(self, events: List[Dict], stats: Dict) -> List[DetectedPattern]:
        """Detect high error rate."""
        patterns = []
        error_rate = stats.get("error_rate", 0)
        
        if error_rate > self.error_rate_threshold:
            patterns.append(DetectedPattern(
                pattern_type=PatternType.ERROR_RATE_HIGH,
                confidence=min(error_rate / self.error_rate_threshold, 1.0),
                details={
                    "error_rate": error_rate,
                    "threshold": self.error_rate_threshold,
                    "error_count": stats.get("error_count", 0)
                },
                severity="high" if error_rate > 0.1 else "medium"
            ))
        
        return patterns
    
    def _detect_new_device_types(self, events: List[Dict]) -> List[DetectedPattern]:
        """Detect new device types."""
        patterns = []
        
        for event in events:
            device_id = event.get("device_id", "")
            if device_id:
                # Extract device type from ID (e.g., "temp_001" → "temp")
                device_type = device_id.split("_")[0] if "_" in device_id else device_id
                
                if device_type and device_type not in self.known_device_types:
                    patterns.append(DetectedPattern(
                        pattern_type=PatternType.NEW_DEVICE_TYPE,
                        confidence=0.9,
                        details={
                            "device_type": device_type,
                            "device_id": device_id,
                            "first_seen": event.get("created_at", datetime.now(timezone.utc).isoformat())
                        },
                        severity="low"
                    ))
                    self.known_device_types.add(device_type)
        
        return patterns
    
    def _detect_traffic_spike(self, events: List[Dict], stats: Dict) -> List[DetectedPattern]:
        """Detect traffic spikes."""
        patterns = []
        
        current_rate = stats.get("events_per_minute", 0)
        baseline = self.baseline_metrics.get("events_per_minute", current_rate)
        
        if baseline > 0 and current_rate > baseline * self.traffic_spike_multiplier:
            patterns.append(DetectedPattern(
                pattern_type=PatternType.TRAFFIC_SPIKE,
                confidence=min(current_rate / (baseline * self.traffic_spike_multiplier), 1.0),
                details={
                    "current_rate": current_rate,
                    "baseline": baseline,
                    "multiplier": current_rate / baseline if baseline > 0 else 0
                },
                severity="high" if current_rate > baseline * 5 else "medium"
            ))
        
        # Update baseline (moving average)
        self.baseline_metrics["events_per_minute"] = (
            baseline * 0.9 + current_rate * 0.1
        ) if baseline > 0 else current_rate
        
        return patterns
    
    def _detect_missing_handlers(self, events: List[Dict]) -> List[DetectedPattern]:
        """Detect events without proper handlers."""
        patterns = []
        
        # Look for events with "unhandled" or missing status
        unhandled_types = set()
        
        for event in events:
            status = event.get("status", "")
            event_type = event.get("type", "unknown")
            
            if status in ["unhandled", "no_handler", "unknown"] or "error.no_handler" in event_type:
                unhandled_types.add(event_type)
        
        for event_type in unhandled_types:
            patterns.append(DetectedPattern(
                pattern_type=PatternType.MISSING_HANDLER,
                confidence=0.85,
                details={
                    "event_type": event_type,
                    "suggestion": f"Create handler for {event_type}"
                },
                severity="medium"
            ))
        
        return patterns
    
    def _detect_new_event_types(self, events: List[Dict]) -> List[DetectedPattern]:
        """Detect new event types."""
        patterns = []
        
        for event in events:
            event_type = event.get("type", "unknown")
            
            if event_type and event_type not in self.known_event_types:
                patterns.append(DetectedPattern(
                    pattern_type=PatternType.NEW_EVENT_TYPE,
                    confidence=0.95,
                    details={
                        "event_type": event_type,
                        "source": event.get("source", "unknown")
                    },
                    severity="low"
                ))
                self.known_event_types.add(event_type)
        
        return patterns
    
    def _detect_anomalies(self, events: List[Dict], stats: Dict) -> List[DetectedPattern]:
        """Detect statistical anomalies."""
        patterns = []
        
        if len(self.event_history) < 100:
            return patterns  # Need more data
        
        # Check if current event count is anomalous
        historical_counts = [
            len([e for e in self.event_history[i:i+50]])
            for i in range(0, len(self.event_history) - 50, 50)
        ]
        
        if len(historical_counts) >= 2:
            mean = statistics.mean(historical_counts)
            std = statistics.stdev(historical_counts) if len(historical_counts) > 1 else 0
            
            current_count = stats.get("total_events", 0)
            
            if std > 0 and abs(current_count - mean) > self.anomaly_std_threshold * std:
                patterns.append(DetectedPattern(
                    pattern_type=PatternType.ANOMALY,
                    confidence=0.7,
                    details={
                        "current_count": current_count,
                        "historical_mean": mean,
                        "historical_std": std,
                        "z_score": (current_count - mean) / std
                    },
                    severity="medium"
                ))
        
        return patterns
    
    def reset(self):
        """Reset analyzer state."""
        self.known_device_types.clear()
        self.known_event_types.clear()
        self.baseline_metrics.clear()
        self.event_history.clear()


# Singleton instance
_analyzer: Optional[PatternAnalyzer] = None


def get_pattern_analyzer() -> PatternAnalyzer:
    """Get or create the pattern analyzer singleton."""
    global _analyzer
    if _analyzer is None:
        _analyzer = PatternAnalyzer()
    return _analyzer

