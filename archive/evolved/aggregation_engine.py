"""
Real-time Data Aggregation Engine for AUTUS
Streaming aggregation, windowing, and statistical analysis
"""

import logging
from typing import Dict, Any, List, Optional, Callable, Tuple
from datetime import datetime, timedelta
from collections import deque, defaultdict
import heapq

logger = logging.getLogger(__name__)


class SlidingWindow:
    """Sliding time window for aggregation"""
    
    def __init__(self, window_size_seconds: int = 300):
        self.window_size = timedelta(seconds=window_size_seconds)
        self.data = deque()  # (timestamp, value) tuples
    
    def add(self, value: float, timestamp: Optional[datetime] = None):
        """Add value to window"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        self.data.append((timestamp, value))
        self._remove_expired()
    
    def _remove_expired(self):
        """Remove data outside window"""
        cutoff = datetime.utcnow() - self.window_size
        
        while self.data and self.data[0][0] < cutoff:
            self.data.popleft()
    
    def get_stats(self) -> Dict[str, float]:
        """Get statistics for current window"""
        if not self.data:
            return {}
        
        values = [v for _, v in self.data]
        
        return {
            'count': len(values),
            'sum': sum(values),
            'mean': sum(values) / len(values),
            'min': min(values),
            'max': max(values),
            'variance': self._variance(values),
            'stddev': self._stddev(values),
        }
    
    @staticmethod
    def _variance(values: List[float]) -> float:
        """Calculate variance"""
        if len(values) < 2:
            return 0.0
        mean = sum(values) / len(values)
        return sum((x - mean) ** 2 for x in values) / len(values)
    
    @staticmethod
    def _stddev(values: List[float]) -> float:
        """Calculate standard deviation"""
        variance = SlidingWindow._variance(values)
        return variance ** 0.5


class StreamingAggregator:
    """
    Real-time data aggregation engine
    Groups data and maintains rolling statistics
    """
    
    def __init__(self, default_window_seconds: int = 300):
        self.default_window = default_window_seconds
        self.windows = defaultdict(lambda: SlidingWindow(default_window_seconds))
        self.group_windows = defaultdict(dict)  # group_key -> {subkey -> SlidingWindow}
        self.event_count = 0
    
    def aggregate_event(
        self,
        metric_name: str,
        value: float,
        timestamp: Optional[datetime] = None,
        group_by: Optional[str] = None
    ):
        """
        Aggregate a single event
        
        Args:
            metric_name: Name of metric
            value: Metric value
            timestamp: Event timestamp
            group_by: Optional grouping key
        """
        self.event_count += 1
        
        if group_by is None:
            self.windows[metric_name].add(value, timestamp)
        else:
            if group_by not in self.group_windows[metric_name]:
                self.group_windows[metric_name][group_by] = SlidingWindow(self.default_window)
            
            self.group_windows[metric_name][group_by].add(value, timestamp)
    
    def get_aggregated_stats(self, metric_name: str) -> Dict[str, Any]:
        """Get aggregated statistics for metric"""
        if metric_name not in self.windows:
            return {}
        
        return {
            'metric': metric_name,
            'stats': self.windows[metric_name].get_stats(),
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def get_grouped_stats(
        self,
        metric_name: str,
        group_by: str
    ) -> Dict[str, Dict[str, float]]:
        """Get statistics per group"""
        if metric_name not in self.group_windows:
            return {}
        
        results = {}
        for key, window in self.group_windows[metric_name].items():
            results[key] = window.get_stats()
        
        return results
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get all aggregated statistics"""
        stats = {}
        
        for metric_name, window in self.windows.items():
            stats[metric_name] = window.get_stats()
        
        return {
            'metrics': stats,
            'total_events': self.event_count,
            'timestamp': datetime.utcnow().isoformat()
        }
    
    def reset(self, metric_name: Optional[str] = None):
        """Reset statistics"""
        if metric_name is None:
            self.windows.clear()
            self.group_windows.clear()
            self.event_count = 0
        else:
            if metric_name in self.windows:
                self.windows[metric_name] = SlidingWindow(self.default_window)
            if metric_name in self.group_windows:
                del self.group_windows[metric_name]


class TopKTracker:
    """Track top-K items by frequency or value"""
    
    def __init__(self, k: int = 10):
        self.k = k
        self.heap = []  # min-heap of (count/value, item)
        self.item_counts = defaultdict(int)
    
    def add(self, item: Any, weight: float = 1.0):
        """Add item with weight"""
        self.item_counts[item] += weight
        
        # Maintain top-K
        if len(self.heap) < self.k:
            heapq.heappush(self.heap, (self.item_counts[item], item))
        elif self.item_counts[item] > self.heap[0][0]:
            heapq.heapreplace(self.heap, (self.item_counts[item], item))
    
    def get_top_k(self) -> List[Tuple[Any, float]]:
        """Get top-K items"""
        return sorted([(item, count) for count, item in self.heap], reverse=True)


class PercentileTracker:
    """Track approximate percentiles"""
    
    def __init__(self, percentiles: List[int] = [50, 90, 95, 99]):
        self.percentiles = percentiles
        self.values = []
    
    def add(self, value: float):
        """Add value"""
        self.values.append(value)
    
    def get_percentiles(self) -> Dict[int, float]:
        """Calculate percentiles"""
        if not self.values:
            return {}
        
        sorted_values = sorted(self.values)
        n = len(sorted_values)
        
        results = {}
        for p in self.percentiles:
            idx = int(n * p / 100)
            results[p] = sorted_values[min(idx, n - 1)]
        
        return results


class RateCalculator:
    """Calculate rates (events per second, etc.)"""
    
    def __init__(self, window_seconds: int = 60):
        self.window = timedelta(seconds=window_seconds)
        self.timestamps = deque()
    
    def record_event(self, timestamp: Optional[datetime] = None):
        """Record event occurrence"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        self.timestamps.append(timestamp)
        self._cleanup()
    
    def _cleanup(self):
        """Remove old timestamps outside window"""
        cutoff = datetime.utcnow() - self.window
        
        while self.timestamps and self.timestamps[0] < cutoff:
            self.timestamps.popleft()
    
    def get_rate(self) -> float:
        """Get rate (events/second)"""
        if len(self.timestamps) < 2:
            return 0.0
        
        time_span = (self.timestamps[-1] - self.timestamps[0]).total_seconds()
        if time_span == 0:
            return 0.0
        
        return len(self.timestamps) / time_span


# Global aggregator instance
_aggregator_instance = None


def get_aggregator() -> StreamingAggregator:
    """Get or create global aggregator"""
    global _aggregator_instance
    if _aggregator_instance is None:
        _aggregator_instance = StreamingAggregator()
    return _aggregator_instance


# Helper functions
def aggregate(
    metric_name: str,
    value: float,
    group_by: Optional[str] = None
):
    """Aggregate metric value"""
    aggregator = get_aggregator()
    aggregator.aggregate_event(metric_name, value, group_by=group_by)


def get_stats(metric_name: str) -> Dict[str, float]:
    """Get statistics for metric"""
    aggregator = get_aggregator()
    return aggregator.get_aggregated_stats(metric_name).get('stats', {})


def get_all_aggregated_stats() -> Dict[str, Any]:
    """Get all stats"""
    aggregator = get_aggregator()
    return aggregator.get_all_stats()
