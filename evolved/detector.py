"""
Event Analytics Detector Module

This module provides real-time event detection and analysis capabilities
for IoT events in the analytics system.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import deque, defaultdict
import statistics
import json

logger = logging.getLogger(__name__)


class EventSeverity(Enum):
    """Event severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DetectionType(Enum):
    """Types of event detection."""
    THRESHOLD = "threshold"
    ANOMALY = "anomaly"
    PATTERN = "pattern"
    TREND = "trend"


@dataclass
class DetectionRule:
    """Configuration for event detection rules."""
    rule_id: str
    name: str
    description: str
    detection_type: DetectionType
    severity: EventSeverity
    enabled: bool = True
    parameters: Dict[str, Any] = field(default_factory=dict)
    conditions: Dict[str, Any] = field(default_factory=dict)
    actions: List[str] = field(default_factory=list)


@dataclass
class DetectedEvent:
    """Represents a detected event."""
    event_id: str
    rule_id: str
    device_id: str
    event_type: str
    severity: EventSeverity
    timestamp: datetime
    message: str
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class IoTDataPoint:
    """IoT sensor data point."""
    device_id: str
    sensor_type: str
    value: float
    timestamp: datetime
    unit: str
    metadata: Dict[str, Any] = field(default_factory=dict)


class ThresholdDetector:
    """Detects threshold-based events."""
    
    def __init__(self):
        self._rules: Dict[str, DetectionRule] = {}
        self._device_states: Dict[str, Dict[str, Any]] = defaultdict(dict)
    
    def add_rule(self, rule: DetectionRule) -> None:
        """Add a threshold detection rule."""
        try:
            if rule.detection_type != DetectionType.THRESHOLD:
                raise ValueError("Rule must be of THRESHOLD type")
            
            self._rules[rule.rule_id] = rule
            logger.info(f"Added threshold rule: {rule.rule_id}")
            
        except Exception as e:
            logger.error(f"Error adding threshold rule {rule.rule_id}: {e}")
            raise
    
    def remove_rule(self, rule_id: str) -> bool:
        """Remove a threshold detection rule."""
        try:
            if rule_id in self._rules:
                del self._rules[rule_id]
                logger.info(f"Removed threshold rule: {rule_id}")
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error removing threshold rule {rule_id}: {e}")
            return False
    
    def detect(self, data_point: IoTDataPoint) -> List[DetectedEvent]:
        """Detect threshold violations."""
        detected_events = []
        
        try:
            for rule in self._rules.values():
                if not rule.enabled:
                    continue
                
                # Check if rule applies to this device/sensor
                if not self._rule_applies(rule, data_point):
                    continue
                
                event = self._check_threshold(rule, data_point)
                if event:
                    detected_events.append(event)
            
        except Exception as e:
            logger.error(f"Error in threshold detection: {e}")
        
        return detected_events
    
    def _rule_applies(self, rule: DetectionRule, data_point: IoTDataPoint) -> bool:
        """Check if rule applies to the data point."""
        conditions = rule.conditions
        
        if "device_ids" in conditions:
            if data_point.device_id not in conditions["device_ids"]:
                return False
        
        if "sensor_types" in conditions:
            if data_point.sensor_type not in conditions["sensor_types"]:
                return False
        
        return True
    
    def _check_threshold(self, rule: DetectionRule, data_point: IoTDataPoint) -> Optional[DetectedEvent]:
        """Check threshold conditions."""
        try:
            params = rule.parameters
            value = data_point.value
            
            # Simple threshold check
            if "min_value" in params and value < params["min_value"]:
                return self._create_event(
                    rule, data_point, 
                    f"Value {value} below minimum threshold {params['min_value']}"
                )
            
            if "max_value" in params and value > params["max_value"]:
                return self._create_event(
                    rule, data_point,
                    f"Value {value} above maximum threshold {params['max_value']}"
                )
            
            # Range check
            if "range" in params:
                min_val, max_val = params["range"]
                if not (min_val <= value <= max_val):
                    return self._create_event(
                        rule, data_point,
                        f"Value {value} outside range [{min_val}, {max_val}]"
                    )
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking threshold for rule {rule.rule_id}: {e}")
            return None
    
    def _create_event(self, rule: DetectionRule, data_point: IoTDataPoint, message: str) -> DetectedEvent:
        """Create a detected event."""
        return DetectedEvent(
            event_id=f"{rule.rule_id}_{data_point.device_id}_{int(data_point.timestamp.timestamp())}",
            rule_id=rule.rule_id,
            device_id=data_point.device_id,
            event_type="threshold_violation",
            severity=rule.severity,
            timestamp=data_point.timestamp,
            message=message,
            data={
                "sensor_type": data_point.sensor_type,
                "value": data_point.value,
                "unit": data_point.unit,
                "rule_name": rule.name
            }
        )


class AnomalyDetector:
    """Detects anomalous events using statistical methods."""
    
    def __init__(self, window_size: int = 100):
        self._window_size = window_size
        self._rules: Dict[str, DetectionRule] = {}
        self._data_windows: Dict[str, deque] = defaultdict(lambda: deque(maxlen=window_size))
        self._stats_cache: Dict[str, Dict[str, float]] = defaultdict(dict)
    
    def add_rule(self, rule: DetectionRule) -> None:
        """Add an anomaly detection rule."""
        try:
            if rule.detection_type != DetectionType.ANOMALY:
                raise ValueError("Rule must be of ANOMALY type")
            
            self._rules[rule.rule_id] = rule
            logger.info(f"Added anomaly rule: {rule.rule_id}")
            
        except Exception as e:
            logger.error(f"Error adding anomaly rule {rule.rule_id}: {e}")
            raise
    
    def detect(self, data_point: IoTDataPoint) -> List[DetectedEvent]:
        """Detect anomalous events."""
        detected_events = []
        
        try:
            # Update data window
            key = f"{data_point.device_id}_{data_point.sensor_type}"
            self._data_windows[key].append((data_point.timestamp, data_point.value))
            
            # Update statistics
            self._update_stats(key)
            
            # Check for anomalies
            for rule in self._rules.values():
                if not rule.enabled:
                    continue
                
                if not self._rule_applies(rule, data_point):
                    continue
                
                event = self._check_anomaly(rule, data_point, key)
                if event:
                    detected_events.append(event)
            
        except Exception as e:
            logger.error(f"Error in anomaly detection: {e}")
        
        return detected_events
    
    def _rule_applies(self, rule: DetectionRule, data_point: IoTDataPoint) -> bool:
        """Check if rule applies to the data point."""
        conditions = rule.conditions
        
        if "device_ids" in conditions:
            if data_point.device_id not in conditions["device_ids"]:
                return False
        
        if "sensor_types" in conditions:
            if data_point.sensor_type not in conditions["sensor_types"]:
                return False
        
        return True
    
    def _update_stats(self, key: str) -> None:
        """Update statistical measures for the data window."""
        try:
            if len(self._data_windows[key]) < 10:  # Need minimum data points
                return
            
            values = [point[1] for point in self._data_windows[key]]
            
            self._stats_cache[key] = {
                "mean": statistics.mean(values),
                "stdev": statistics.stdev(values) if len(values) > 1 else 0,
                "median": statistics.median(values),
                "min": min(values),
                "max": max(values)
            }
            
        except Exception as e:
            logger.error(f"Error updating stats for {key}: {e}")
    
    def _check_anomaly(self, rule: DetectionRule, data_point: IoTDataPoint, key: str) -> Optional[DetectedEvent]:
        """Check for anomalous values."""
        try:
            if key not in self._stats_cache:
                return None
            
            stats = self._stats_cache[key]
            params = rule.parameters
            value = data_point.value
            
            # Z-score based detection
            if "z_score_threshold" in params:
                if stats["stdev"] > 0:
                    z_score = abs((value - stats["mean"]) / stats["stdev"])
                    threshold = params["z_score_threshold"]
                    
                    if z_score > threshold:
                        return DetectedEvent(
                            event_id=f"{rule.rule_id}_{data_point.device_id}_{int(data_point.timestamp.timestamp())}",
                            rule_id=rule.rule_id,
                            device_id=data_point.device_id,
                            event_type="anomaly",
                            severity=rule.severity,
                            timestamp=data_point.timestamp,
                            message=f"Anomalous value detected: {value} (z-score: {z_score:.2f})",
                            data={
                                "sensor_type": data_point.sensor_type,
                                "value": value,
                                "z_score": z_score,
                                "mean": stats["mean"],
                                "stdev": stats["stdev"]
                            }
                        )
            
            # IQR based detection
            if "iqr_multiplier" in params:
                values = [point[1] for point in self._data_windows[key]]
                if len(values) >= 20:
                    q1 = statistics.quantiles(values, n=4)[0]
                    q3 = statistics.quantiles(values, n=4)[2]
                    iqr = q3 - q1
                    multiplier = params["iqr_multiplier"]
                    
                    lower_bound = q1 - multiplier * iqr
                    upper_bound = q3 + multiplier * iqr
                    
                    if value < lower_bound or value > upper_bound:
                        return DetectedEvent(
                            event_id=f"{rule.rule_id}_{data_point.device_id}_{int(data_point.timestamp.timestamp())}",
                            rule_id=rule.rule_id,
                            device_id=data_point.device_id,
                            event_type="anomaly",
                            severity=rule.severity,
                            timestamp=data_point.timestamp,
                            message=f"Anomalous value detected: {value} (outside IQR bounds)",
                            data={
                                "sensor_type": data_point.sensor_type,
                                "value": value,
                                "lower_bound": lower_bound,
                                "upper_bound": upper_bound,
                                "q1": q1,
                                "q3": q3
                            }
                        )
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking anomaly for rule {rule.rule_id}: {e}")
            return None


class EventDetector:
    """Main event detector coordinating different detection methods."""
    
    def __init__(self):
        self.threshold_detector = ThresholdDetector()
        self.anomaly_detector = AnomalyDetector()
        self._event_handlers: List[Callable[[DetectedEvent], None]] = []
        self._running = False
        self._event_queue = asyncio.Queue()
    
    def add_threshold_rule(self, rule: DetectionRule) -> None:
        """Add a threshold detection rule."""
        self.threshold_detector.add_rule(rule)
    
    def add_anomaly_rule(self, rule: DetectionRule) -> None:
        """Add an anomaly detection rule."""
        self.anomaly_detector.add_rule(rule)
    
    def add_event_handler(self, handler: Callable[[DetectedEvent], None]) -> None:
        """Add an event handler."""
        self._event_handlers.append(handler)
    
    def remove_event_handler(self, handler: Callable[[DetectedEvent], None]) -> None:
        """Remove an event handler."""
        if handler in self._event_handlers:
            self._event_handlers.remove(handler)
    
    async def process_data_point(self, data_point: IoTDataPoint) -> List[DetectedEvent]:
        """Process a single data point and detect events."""
        all_events = []
        
        try:
            # Threshold detection
            threshold_events = self.threshold_detector.detect(data_point)
            all_events.extend(threshold_events)
            
            # Anomaly detection
            anomaly_events = self.anomaly_detector.detect(data_point)
            all_events.extend(anomaly_events)
            
            # Handle detected events
            for event in all_events:
                await self._handle_event(event)
            
        except Exception as e:
            logger.error(f"Error processing data point: {e}")
        
        return all_events
    
    async def _handle_event(self, event: DetectedEvent) -> None:
        """Handle a detected event."""
        try:
            # Log the event
            logger.warning(f"Event detected: {event.event_type} - {event.message}")
            
            # Call event handlers
            for handler in self._event_handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    logger.error(f"Error in event handler: {e}")
            
            # Add to event queue for further processing
            await self._event_queue.put(event)
            
        except Exception as e:
            logger.error(f"Error handling event: {e}")
    
    async def start(self) -> None:
        """Start the event detector."""
        self._running = True
        logger.info("Event detector started")
    
    async def stop(self) -> None:
        """Stop the event detector."""
        self._running = False
        logger.info("Event detector stopped")
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get detector statistics."""
        try:
            return {
                "threshold_rules": len(self.threshold_detector._rules),
                "anomaly_rules": len(self.anomaly_detector._rules),
                "event_handlers": len(self._event_handlers),
                "queue_size": self._event_queue.qsize(),
                "running": self._running
            }
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            return {}


class EventAnalytics:
    """Event analytics aggregator and reporter."""
    
    def __init__(self, retention_hours: int = 24):
        self._retention_hours = retention_hours
        self._events: List[DetectedEvent] = []
        self._event_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self._last_cleanup = datetime.now()
    
    def add_event(self, event: DetectedEvent) -> None:
        """Add an event for analytics."""
        try:
            self._events.append(event)
            
            # Update counts
            hour_key = event.timestamp.strftime("%Y-%m-%d-%H")
            self._event_counts[hour_key][event.event_type] += 1
            self._event_counts[hour_key][f"severity_{event.severity.value}"] += 1
            self._event_counts[hour_key]["total"] += 1
            
            # Periodic cleanup
            if (datetime.now() - self._last_cleanup).hours >= 1:
                self._cleanup_old_data()
            
        except Exception as e:
            logger.error(f"Error adding event to analytics: {e}")
    
    def _cleanup_old_data(self) -> None:
        """Clean up old event data."""
        try:
            cutoff_time = datetime.now() - timedelta(hours=self._retention_hours)
            
            # Filter events
            self._events = [e for e in self._events if e.timestamp > cutoff_time]
            
            # Filter counts
            cutoff_hour = cutoff_time.strftime("%Y-%m-%d-%H")
            old_keys = [k for k in self._event_counts.keys() if k < cutoff_hour]
            for key in old_keys:
                del self._event_counts[key]
            
            self._last_cleanup = datetime.now()
            logger.info("Analytics data cleanup completed")
            
        except Exception as e:
            logger.error(f"Error during analytics cleanup: {e}")
    
    def get_event_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get event summary for the last N hours."""
        try:
            cutoff_time = datetime.now() - timedelta(hours=hours)
            recent_events = [e for e in self._events if e.timestamp > cutoff_time]
            
            summary = {
                "total_events": len(recent_events),
                "by_type": defaultdict(int),
                "by_severity": defaultdict(int),
                "by_device": defaultdict(int),
                "timeline": []
            }
            
            for event in recent_events:
                summary["by_type"][event.event_type] += 1
                summary["by_severity"][event.severity.value] += 1
                summary["by_device"][event.device_id] += 1
            
            return dict(summary)
            
        except Exception as e:
            logger.error(f"Error getting event summary: {e}")
            return {}
    
    def get_hourly_trends(self, hours: int = 24) -> Dict[str, List[Tuple[str, int]]]:
        """Get hourly event trends."""
        try:
            trends = {
                "total": [],
                "by_type": defaultdict(list),
                "by_severity": defaultdict(list)
            }
            
            for i in range(hours):
                hour_time = datetime.now() - timedelta(hours=i)
                hour_key = hour_time.strftime("%Y-%m-%d-%H")
                
                if hour_key in self._event_counts:
                    counts = self._event_counts[hour_key]
                    trends["total"].append((hour_key, counts.get("total", 0)))
                    
                    for event_type in ["threshold_violation", "anomaly"]:
                        trends["by_type"][event_type].append((hour_key, counts.get(event_type, 0)))
                    
                    for severity in ["low", "medium", "high", "critical"]:
                        trends["by_severity"][severity].append((hour_key, counts.get(f"severity_{severity}", 0)))
                else:
                    trends["total"].append((hour_key, 0))
            
            return dict(trends)
            
        except Exception as e:
            logger.error(f"Error getting hourly trends: {e}")
            return {}
