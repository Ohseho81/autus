"""
Apache Spark Data Processing for AUTUS
Real-time and batch data processing pipeline
"""

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class SparkDataProcessor:
    """
    Spark-based data processor for batch and stream processing
    Uses local mode for development, can scale to cluster
    """
    
    def __init__(self, app_name: str = "autus-spark"):
        self.app_name = app_name
        self.session = None
        self._initialize_spark()
    
    def _initialize_spark(self):
        """Initialize Spark session"""
        try:
            from pyspark.sql import SparkSession
            
            self.session = SparkSession.builder \
                .appName(self.app_name) \
                .master("local[4]") \
                .config("spark.driver.memory", "2g") \
                .config("spark.executor.memory", "2g") \
                .config("spark.sql.shuffle.partitions", "10") \
                .getOrCreate()
            
            self.session.sparkContext.setLogLevel("WARN")
            logger.info("Spark session initialized")
        
        except ImportError:
            logger.warning("PySpark not available. Use local processing.")
            self.session = None
        except Exception as e:
            logger.error(f"Failed to initialize Spark: {e}")
            self.session = None
    
    def process_events_batch(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Process events in batch
        
        Args:
            events: List of events to process
        
        Returns:
            Processing results
        """
        if not self.session:
            return self._process_local(events)
        
        try:
            from pyspark.sql import functions as F
            
            # Convert to DataFrame
            df = self.session.createDataFrame(events)
            
            # Process aggregations
            results = {
                'total_events': df.count(),
                'event_types': df.groupBy('type').count().collect(),
                'by_source': df.groupBy('source').count().collect(),
            }
            
            logger.info(f"Batch processed: {results['total_events']} events")
            return results
        
        except Exception as e:
            logger.error(f"Spark batch processing error: {e}")
            return self._process_local(events)
    
    def _process_local(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Fallback local processing"""
        type_counts = {}
        source_counts = {}
        
        for event in events:
            event_type = event.get('type', 'unknown')
            source = event.get('source', 'unknown')
            
            type_counts[event_type] = type_counts.get(event_type, 0) + 1
            source_counts[source] = source_counts.get(source, 0) + 1
        
        return {
            'total_events': len(events),
            'event_types': type_counts,
            'by_source': source_counts,
        }
    
    def calculate_time_window_metrics(
        self,
        events: List[Dict[str, Any]],
        window_minutes: int = 60
    ) -> Dict[str, Any]:
        """
        Calculate metrics for time windows
        
        Args:
            events: Events to analyze
            window_minutes: Window size in minutes
        
        Returns:
            Time-windowed metrics
        """
        if not events:
            return {}
        
        try:
            from pyspark.sql import functions as F, Window
            
            df = self.session.createDataFrame(events)
            
            # Convert timestamp
            df = df.withColumn(
                "ts",
                F.from_unixtime(F.unix_timestamp(F.col("timestamp"), "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"))
            )
            
            # Time window aggregation
            windowed = df.groupBy(
                F.window(F.col("ts"), f"{window_minutes} minutes")
            ).agg(
                F.count("*").alias("event_count"),
                F.avg("value").alias("avg_value"),
                F.max("value").alias("max_value"),
                F.min("value").alias("min_value")
            )
            
            results = [row.asDict() for row in windowed.collect()]
            logger.info(f"Time window metrics calculated: {len(results)} windows")
            return {'windows': results}
        
        except Exception as e:
            logger.error(f"Time window calculation error: {e}")
            return {}
    
    def join_event_streams(
        self,
        primary_events: List[Dict[str, Any]],
        secondary_events: List[Dict[str, Any]],
        join_key: str = "entity_id"
    ) -> List[Dict[str, Any]]:
        """
        Join two event streams
        
        Args:
            primary_events: Primary event stream
            secondary_events: Secondary event stream
            join_key: Key to join on
        
        Returns:
            Joined events
        """
        if not self.session:
            return self._join_local(primary_events, secondary_events, join_key)
        
        try:
            from pyspark.sql.functions import col
            
            df1 = self.session.createDataFrame(primary_events)
            df2 = self.session.createDataFrame(secondary_events)
            
            joined = df1.join(df2, on=join_key, how="inner")
            results = [row.asDict() for row in joined.collect()]
            
            logger.info(f"Joined {len(results)} records")
            return results
        
        except Exception as e:
            logger.error(f"Join error: {e}")
            return self._join_local(primary_events, secondary_events, join_key)
    
    def _join_local(
        self,
        primary: List[Dict[str, Any]],
        secondary: List[Dict[str, Any]],
        key: str
    ) -> List[Dict[str, Any]]:
        """Fallback local join"""
        secondary_map = {item[key]: item for item in secondary if key in item}
        
        results = []
        for item in primary:
            if key in item and item[key] in secondary_map:
                merged = {**item, **secondary_map[item[key]]}
                results.append(merged)
        
        return results
    
    def detect_anomalies(
        self,
        events: List[Dict[str, Any]],
        metric_field: str = "value",
        threshold_std: float = 2.0
    ) -> List[Dict[str, Any]]:
        """
        Detect anomalies using statistical methods
        
        Args:
            events: Events to analyze
            metric_field: Field to check for anomalies
            threshold_std: Number of standard deviations for threshold
        
        Returns:
            Anomalous events
        """
        if not events or metric_field not in events[0]:
            return []
        
        try:
            values = [e.get(metric_field, 0) for e in events]
            avg = sum(values) / len(values)
            variance = sum((x - avg) ** 2 for x in values) / len(values)
            std = variance ** 0.5
            
            threshold = threshold_std * std
            anomalies = []
            
            for event in events:
                value = event.get(metric_field, 0)
                if abs(value - avg) > threshold:
                    event['anomaly_score'] = abs(value - avg) / std if std > 0 else 0
                    anomalies.append(event)
            
            logger.info(f"Detected {len(anomalies)} anomalies")
            return anomalies
        
        except Exception as e:
            logger.error(f"Anomaly detection error: {e}")
            return []
    
    def aggregate_metrics(
        self,
        events: List[Dict[str, Any]],
        group_by: str = "type"
    ) -> Dict[str, Any]:
        """
        Aggregate metrics by group
        
        Args:
            events: Events to aggregate
            group_by: Field to group by
        
        Returns:
            Aggregated metrics
        """
        if not self.session:
            return self._aggregate_local(events, group_by)
        
        try:
            from pyspark.sql import functions as F
            
            df = self.session.createDataFrame(events)
            
            aggregated = df.groupBy(group_by).agg(
                F.count("*").alias("count"),
                F.avg("value").alias("avg_value") if "value" in df.columns else F.lit(None),
                F.sum("value").alias("total_value") if "value" in df.columns else F.lit(None),
            )
            
            results = {}
            for row in aggregated.collect():
                key = row[group_by]
                results[key] = row.asDict()
            
            logger.info(f"Aggregated {len(results)} groups")
            return results
        
        except Exception as e:
            logger.error(f"Aggregation error: {e}")
            return self._aggregate_local(events, group_by)
    
    def _aggregate_local(
        self,
        events: List[Dict[str, Any]],
        group_by: str
    ) -> Dict[str, Any]:
        """Fallback local aggregation"""
        results = {}
        
        for event in events:
            key = event.get(group_by, 'unknown')
            if key not in results:
                results[key] = {
                    'count': 0,
                    'total_value': 0,
                    'values': []
                }
            
            results[key]['count'] += 1
            if 'value' in event:
                results[key]['total_value'] += event['value']
                results[key]['values'].append(event['value'])
        
        # Calculate averages
        for key in results:
            if results[key]['count'] > 0 and results[key]['values']:
                results[key]['avg_value'] = results[key]['total_value'] / results[key]['count']
        
        return results
    
    def close(self):
        """Close Spark session"""
        if self.session:
            self.session.stop()
            logger.info("Spark session closed")


# Global processor instance
_processor_instance = None


def get_spark_processor() -> SparkDataProcessor:
    """Get or create global Spark processor"""
    global _processor_instance
    if _processor_instance is None:
        _processor_instance = SparkDataProcessor()
    return _processor_instance
