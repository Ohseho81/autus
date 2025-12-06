"""
Core analytics aggregator for real-time IoT event processing.

This module provides functionality to aggregate and analyze IoT events
in real-time for dashboard visualization and reporting.
"""

import asyncio
import logging
from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass
from enum import Enum
import statistics
import json

logger = logging.getLogger(__name__)


class AggregationType(Enum):
    """Supported aggregation types for event analytics."""
    COUNT = "count"
    SUM = "sum"
    AVERAGE = "average"
    MIN = "min"
    MAX = "max"
    MEDIAN = "median"
    PERCENTILE = "percentile"


class TimeWindow(Enum):
    """Time window intervals for aggregation."""
    MINUTE = 60
    FIVE_MINUTES = 300
    FIFTEEN_MINUTES = 900
    HOUR = 3600
    DAY = 86400


@dataclass
class EventData:
    """Represents an IoT event data point."""
    device_id: str
    event_type: str
    timestamp: datetime
    value: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None


@dataclass
class AggregationRule:
    """Defines how events should be aggregated."""
    name: str
    event_filter: Callable[[EventData], bool]
    aggregation_type: AggregationType
    time_window: TimeWindow
    field_path: Optional[str] = None
    percentile: Optional[float] = None


@dataclass
class AggregationResult:
    """Contains the result of an aggregation operation."""
    rule_name: str
    window_start: datetime
    window_end: datetime
    value: float
    count: int
    metadata: Optional[Dict[str, Any]] = None


class TimeWindowBuffer:
    """Manages time-windowed event data for aggregation."""
    
    def __init__(self, window_size: int, max_windows: int = 100):
        """
        Initialize time window buffer.
        
        Args:
            window_size: Size of each time window in seconds
            max_windows: Maximum number of windows to keep in memory
        """
        self.window_size = window_size
        self.max_windows = max_windows
        self.windows: Dict[datetime, List[EventData]] = {}
        self._lock = asyncio.Lock()
    
    async def add_event(self, event: EventData) -> None:
        """
        Add an event to the appropriate time window.
        
        Args:
            event: The event data to add
        """
        try:
            async with self._lock:
                window_start = self._get_window_start(event.timestamp)
                
                if window_start not in self.windows:
                    self.windows[window_start] = []
                
                self.windows[window_start].append(event)
                await self._cleanup_old_windows()
                
        except Exception as e:
            logger.error(f"Error adding event to time window: {e}")
            raise
    
    async def get_window_events(self, window_start: datetime) -> List[EventData]:
        """
        Get all events for a specific time window.
        
        Args:
            window_start: Start time of the window
            
        Returns:
            List of events in the specified window
        """
        try:
            async with self._lock:
                return self.windows.get(window_start, [])
        except Exception as e:
            logger.error(f"Error retrieving window events: {e}")
            return []
    
    async def get_recent_windows(self, count: int = 10) -> List[Tuple[datetime, List[EventData]]]:
        """
        Get the most recent time windows.
        
        Args:
            count: Number of recent windows to retrieve
            
        Returns:
            List of (window_start, events) tuples
        """
        try:
            async with self._lock:
                sorted_windows = sorted(self.windows.items(), reverse=True)
                return sorted_windows[:count]
        except Exception as e:
            logger.error(f"Error retrieving recent windows: {e}")
            return []
    
    def _get_window_start(self, timestamp: datetime) -> datetime:
        """Calculate the start time of the window containing the timestamp."""
        epoch = timestamp.timestamp()
        window_epoch = (epoch // self.window_size) * self.window_size
        return datetime.fromtimestamp(window_epoch)
    
    async def _cleanup_old_windows(self) -> None:
        """Remove old windows to prevent memory bloat."""
        if len(self.windows) > self.max_windows:
            sorted_windows = sorted(self.windows.keys())
            windows_to_remove = sorted_windows[:-self.max_windows]
            
            for window_start in windows_to_remove:
                del self.windows[window_start]


class EventAggregator:
    """Main aggregator class for real-time IoT event analytics."""
    
    def __init__(self, max_buffer_size: int = 10000):
        """
        Initialize the event aggregator.
        
        Args:
            max_buffer_size: Maximum number of events to buffer
        """
        self.max_buffer_size = max_buffer_size
        self.rules: Dict[str, AggregationRule] = {}
        self.buffers: Dict[str, TimeWindowBuffer] = {}
        self.results_cache: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        self._running = False
        self._tasks: List[asyncio.Task] = []
        self._lock = asyncio.Lock()
    
    async def add_rule(self, rule: AggregationRule) -> None:
        """
        Add an aggregation rule.
        
        Args:
            rule: The aggregation rule to add
        """
        try:
            async with self._lock:
                self.rules[rule.name] = rule
                
                # Create buffer for this rule's time window
                buffer_key = f"{rule.name}_{rule.time_window.value}"
                if buffer_key not in self.buffers:
                    self.buffers[buffer_key] = TimeWindowBuffer(rule.time_window.value)
                    
            logger.info(f"Added aggregation rule: {rule.name}")
            
        except Exception as e:
            logger.error(f"Error adding aggregation rule: {e}")
            raise
    
    async def remove_rule(self, rule_name: str) -> None:
        """
        Remove an aggregation rule.
        
        Args:
            rule_name: Name of the rule to remove
        """
        try:
            async with self._lock:
                if rule_name in self.rules:
                    rule = self.rules[rule_name]
                    buffer_key = f"{rule_name}_{rule.time_window.value}"
                    
                    del self.rules[rule_name]
                    if buffer_key in self.buffers:
                        del self.buffers[buffer_key]
                    
                    if rule_name in self.results_cache:
                        del self.results_cache[rule_name]
                        
            logger.info(f"Removed aggregation rule: {rule_name}")
            
        except Exception as e:
            logger.error(f"Error removing aggregation rule: {e}")
            raise
    
    async def process_event(self, event: EventData) -> None:
        """
        Process a single IoT event through all applicable rules.
        
        Args:
            event: The event data to process
        """
        try:
            async with self._lock:
                applicable_rules = [
                    rule for rule in self.rules.values()
                    if rule.event_filter(event)
                ]
            
            # Add event to appropriate buffers
            for rule in applicable_rules:
                buffer_key = f"{rule.name}_{rule.time_window.value}"
                if buffer_key in self.buffers:
                    await self.buffers[buffer_key].add_event(event)
                    
        except Exception as e:
            logger.error(f"Error processing event: {e}")
            raise
    
    async def process_events_batch(self, events: List[EventData]) -> None:
        """
        Process multiple events in batch for better performance.
        
        Args:
            events: List of events to process
        """
        try:
            tasks = [self.process_event(event) for event in events]
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            logger.error(f"Error processing event batch: {e}")
            raise
    
    async def compute_aggregations(self) -> List[AggregationResult]:
        """
        Compute aggregations for all rules and current time windows.
        
        Returns:
            List of aggregation results
        """
        results = []
        
        try:
            async with self._lock:
                rules_copy = dict(self.rules)
            
            for rule in rules_copy.values():
                try:
                    rule_results = await self._compute_rule_aggregation(rule)
                    results.extend(rule_results)
                except Exception as e:
                    logger.error(f"Error computing aggregation for rule {rule.name}: {e}")
                    continue
            
            # Cache results
            for result in results:
                self.results_cache[result.rule_name].append(result)
                
            return results
            
        except Exception as e:
            logger.error(f"Error computing aggregations: {e}")
            return []
    
    async def _compute_rule_aggregation(self, rule: AggregationRule) -> List[AggregationResult]:
        """
        Compute aggregation for a specific rule.
        
        Args:
            rule: The aggregation rule to compute
            
        Returns:
            List of aggregation results for the rule
        """
        results = []
        buffer_key = f"{rule.name}_{rule.time_window.value}"
        
        if buffer_key not in self.buffers:
            return results
        
        buffer = self.buffers[buffer_key]
        recent_windows = await buffer.get_recent_windows(5)
        
        for window_start, events in recent_windows:
            if not events:
                continue
                
            try:
                window_end = window_start + timedelta(seconds=rule.time_window.value)
                
                # Extract values for aggregation
                values = []
                for event in events:
                    if rule.field_path:
                        value = self._extract_field_value(event, rule.field_path)
                    else:
                        value = event.value
                    
                    if value is not None:
                        values.append(float(value))
                
                if not values:
                    continue
                
                # Compute aggregation
                aggregated_value = self._compute_aggregation_value(
                    values, rule.aggregation_type, rule.percentile
                )
                
                result = AggregationResult(
                    rule_name=rule.name,
                    window_start=window_start,
                    window_end=window_end,
                    value=aggregated_value,
                    count=len(values),
                    metadata={
                        'event_types': list(set(e.event_type for e in events)),
                        'device_count': len(set(e.device_id for e in events))
                    }
                )
                
                results.append(result)
                
            except Exception as e:
                logger.error(f"Error computing aggregation for window {window_start}: {e}")
                continue
        
        return results
    
    def _extract_field_value(self, event: EventData, field_path: str) -> Optional[float]:
        """
        Extract a value from an event using a field path.
        
        Args:
            event: The event data
            field_path: Dot-separated path to the field
            
        Returns:
            The extracted value or None
        """
        try:
            if field_path == "value":
                return event.value
            
            if field_path.startswith("metadata.") and event.metadata:
                field_name = field_path.split(".", 1)[1]
                return event.metadata.get(field_name)
            
            return None
            
        except Exception:
            return None
    
    def _compute_aggregation_value(
        self, 
        values: List[float], 
        agg_type: AggregationType,
        percentile: Optional[float] = None
    ) -> float:
        """
        Compute the aggregated value based on the aggregation type.
        
        Args:
            values: List of values to aggregate
            agg_type: Type of aggregation to perform
            percentile: Percentile value (0-100) for percentile aggregation
            
        Returns:
            The aggregated value
        """
        if not values:
            return 0.0
        
        if agg_type == AggregationType.COUNT:
            return float(len(values))
        elif agg_type == AggregationType.SUM:
            return sum(values)
        elif agg_type == AggregationType.AVERAGE:
            return statistics.mean(values)
        elif agg_type == AggregationType.MIN:
            return min(values)
        elif agg_type == AggregationType.MAX:
            return max(values)
        elif agg_type == AggregationType.MEDIAN:
            return statistics.median(values)
        elif agg_type == AggregationType.PERCENTILE:
            if percentile is None:
                raise ValueError("Percentile value required for percentile aggregation")
            return statistics.quantiles(values, n=100)[int(percentile) - 1]
        else:
            raise ValueError(f"Unsupported aggregation type: {agg_type}")
    
    async def get_recent_results(
        self, 
        rule_name: str, 
        count: int = 10
    ) -> List[AggregationResult]:
        """
        Get recent aggregation results for a specific rule.
        
        Args:
            rule_name: Name of the rule
            count: Number of recent results to retrieve
            
        Returns:
            List of recent aggregation results
        """
        try:
            if rule_name not in self.results_cache:
                return []
            
            results = list(self.results_cache[rule_name])
            return sorted(results, key=lambda x: x.window_start, reverse=True)[:count]
            
        except Exception as e:
            logger.error(f"Error retrieving recent results: {e}")
            return []
    
    async def get_all_recent_results(self, count: int = 10) -> Dict[str, List[AggregationResult]]:
        """
        Get recent aggregation results for all rules.
        
        Args:
            count: Number of recent results per rule
            
        Returns:
            Dictionary mapping rule names to their recent results
        """
        try:
            all_results = {}
            
            for rule_name in self.rules.keys():
                all_results[rule_name] = await self.get_recent_results(rule_name, count)
            
            return all_results
            
        except Exception as e:
            logger.error(f"Error retrieving all recent results: {e}")
            return {}
    
    async def start(self) -> None:
        """Start the aggregator background tasks."""
        if self._running:
            return
        
        self._running = True
        
        # Start background aggregation task
        self._tasks.append(
            asyncio.create_task(self._background_aggregation_loop())
        )
        
        logger.info("Event aggregator started")
    
    async def stop(self) -> None:
        """Stop the aggregator and clean up resources."""
        self._running = False
        
        # Cancel all tasks
        for task in self._tasks:
            task.cancel()
        
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
        
        self._tasks.clear()
        logger.info("Event aggregator stopped")
    
    async def _background_aggregation_loop(self) -> None:
        """Background task that periodically computes aggregations."""
        while self._running:
            try:
                await self.compute_aggregations()
                await asyncio.sleep(10)  # Compute every 10 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in background aggregation loop: {e}")
                await asyncio.sleep(5)
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self.start()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.stop()
