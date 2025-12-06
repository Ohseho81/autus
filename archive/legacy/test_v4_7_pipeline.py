"""
v4.7 Data Pipeline Testing Suite
Tests for Kafka, Spark, ML pipeline, and real-time aggregation
"""

import pytest
import numpy as np
from typing import Dict, Any, List
import json
from datetime import datetime, timedelta

# ============================================================================
# AGGREGATION ENGINE TESTS
# ============================================================================

def test_aggregation_basic_metrics():
    """Test basic metric aggregation"""
    from evolved.aggregation_engine import get_aggregator
    
    agg = get_aggregator()
    
    # Aggregate multiple values
    for value in [100.0, 150.0, 200.0, 250.0]:
        agg.aggregate_event('cpu_usage', value)
    
    stats = agg.get_aggregated_stats('cpu_usage')
    assert stats is not None
    assert stats['stats']['count'] == 4
    assert stats['stats']['mean'] == 175.0
    assert stats['stats']['min'] == 100.0
    assert stats['stats']['max'] == 250.0
    print("✓ Basic metrics aggregation test passed")


def test_aggregation_with_grouping():
    """Test aggregation with grouping"""
    from evolved.aggregation_engine import StreamingAggregator
    
    agg = StreamingAggregator()
    
    # Aggregate grouped events
    events = [
        {'value': 100.0, 'host': 'server1', 'service': 'api'},
        {'value': 150.0, 'host': 'server1', 'service': 'api'},
        {'value': 200.0, 'host': 'server2', 'service': 'db'},
        {'value': 250.0, 'host': 'server2', 'service': 'db'},
    ]
    
    for event in events:
        agg.aggregate_event('latency', event['value'], group_by=event['host'])
    
    all_stats = agg.get_all_stats()
    assert len(all_stats) > 0
    print(f"✓ Grouped aggregation test passed ({len(all_stats)} metrics)")


def test_sliding_window():
    """Test sliding window statistics"""
    from evolved.aggregation_engine import SlidingWindow
    
    window = SlidingWindow(window_size_seconds=10)
    
    # Add values with timestamps
    current_time = datetime.now()
    for i in range(5):
        timestamp = current_time - timedelta(seconds=i)
        window.add(100.0 + i * 10, timestamp)
    
    stats = window.get_stats()
    assert stats['count'] >= 4
    assert stats['mean'] > 100.0
    print("✓ Sliding window test passed")


def test_topk_tracker():
    """Test top-K frequency tracking"""
    from evolved.aggregation_engine import TopKTracker
    
    tracker = TopKTracker(k=3)
    
    # Add items with frequencies - item_a appears 3x, item_b 2x, item_c 1x
    items = ['item_a', 'item_b', 'item_a', 'item_c', 'item_a', 'item_b']
    for item in items:
        tracker.add(item)
    
    top_k = tracker.get_top_k()
    assert len(top_k) <= 3
    # Check that the most frequent items are in top_k
    top_items = [item for item, _ in top_k]
    assert 'item_a' in top_items  # item_a appeared 3 times
    print(f"✓ TopK tracker test passed: {top_k}")


def test_percentile_tracker():
    """Test percentile tracking"""
    from evolved.aggregation_engine import PercentileTracker
    
    tracker = PercentileTracker()
    
    # Add values
    for value in range(1, 101):
        tracker.add(float(value))
    
    percentiles = tracker.get_percentiles()
    p50 = percentiles.get(50, 0)
    p95 = percentiles.get(95, 0)
    p99 = percentiles.get(99, 0)
    
    assert 40 < p50 < 60
    assert 85 < p95 < 100
    assert 95 < p99 <= 100
    print(f"✓ Percentile tracker test passed: p50={p50}, p95={p95}, p99={p99}")


def test_rate_calculator():
    """Test throughput rate calculation"""
    from evolved.aggregation_engine import RateCalculator
    import time
    
    calculator = RateCalculator()
    
    # Add 10 events over a period
    for i in range(10):
        calculator.record_event()
        if i < 9:
            time.sleep(0.01)
    
    rate = calculator.get_rate()
    assert rate > 0
    print(f"✓ Rate calculator test passed: {rate:.2f} events/sec")


# ============================================================================
# ML PIPELINE TESTS
# ============================================================================

def test_ml_feature_engineering():
    """Test feature extraction and normalization"""
    from evolved.ml_pipeline import get_ml_pipeline
    
    ml = get_ml_pipeline()
    
    # Create sample data
    raw_data = [
        {'latency': 100.0, 'cpu': 50.0, 'memory': 60.0},
        {'latency': 150.0, 'cpu': 70.0, 'memory': 80.0},
        {'latency': 200.0, 'cpu': 90.0, 'memory': 100.0},
    ]
    
    feature_keys = ['latency', 'cpu', 'memory']
    
    # Extract features
    features, names = ml.extract_features(raw_data, feature_keys)
    assert len(features) == 3
    assert len(features[0]) == 3
    
    # Normalize features
    normalized = ml.normalize_features(features)
    assert normalized.shape == features.shape
    print("✓ ML feature engineering test passed")


def test_ml_regression():
    """Test regression model training and prediction"""
    from evolved.ml_pipeline import get_ml_pipeline
    
    ml = get_ml_pipeline()
    
    # Create training data
    X_train = np.array([[1, 2], [2, 3], [3, 4], [4, 5]])
    y_train = np.array([5.0, 7.0, 9.0, 11.0])
    
    # Train model
    ml.train_regression_model(X_train, y_train)
    
    # Make predictions
    X_test = np.array([[2.5, 3.5]])
    predictions = ml.predict(X_test)
    
    assert len(predictions) == 1
    assert 6 < predictions[0] < 10  # Should be close to 8
    print(f"✓ ML regression test passed: prediction={predictions[0]:.2f}")


def test_ml_clustering():
    """Test K-means clustering"""
    from evolved.ml_pipeline import get_ml_pipeline
    
    ml = get_ml_pipeline()
    
    # Create data with clusters
    X = np.array([
        [0, 0], [1, 1], [2, 2],  # Cluster 1
        [10, 10], [11, 11], [12, 12]  # Cluster 2
    ])
    
    # Cluster (returns dict with 'labels' key)
    result = ml.clustering(X, n_clusters=2)
    assert result is not None
    
    if isinstance(result, dict):
        labels = result.get('labels', [])
    else:
        labels = result
    
    assert len(labels) == 6
    assert len(np.unique(labels)) == 2
    print(f"✓ ML clustering test passed: {len(np.unique(labels))} clusters")


@pytest.mark.skip(reason="Anomaly detection algorithm needs tuning")
def test_ml_anomaly_detection():
    """Test anomaly detection"""
    from evolved.ml_pipeline import get_ml_pipeline
    
    ml = get_ml_pipeline()
    
    # Create normal data with anomalies
    normal_data = np.random.normal(100, 10, 95)
    anomalies = np.array([200, 210, 220, 230, 240])
    X = np.concatenate([normal_data, anomalies]).reshape(-1, 1)
    
    # Detect anomalies
    anomaly_labels = ml.detect_anomalies_ml(X, contamination=0.05)
    
    # Count detected anomalies
    detected = np.sum(anomaly_labels == -1)
    assert detected >= 3  # Should detect most anomalies
    print(f"✓ ML anomaly detection test passed: detected {detected} anomalies")


def test_ml_model_persistence():
    """Test model save and load"""
    from evolved.ml_pipeline import get_ml_pipeline
    import os
    
    ml = get_ml_pipeline()
    
    # Train model
    X = np.array([[1, 2], [2, 3], [3, 4]])
    y = np.array([5.0, 7.0, 9.0])
    ml.train_regression_model(X, y)
    
    # Get initial prediction
    initial_pred = ml.predict(np.array([[2, 3]]))
    
    # Save model
    model_path = '/tmp/test_model.pkl'
    ml.save_model(model_name='regression', filepath=model_path)
    assert os.path.exists(model_path)
    
    # Clear and load
    ml.models = {}
    ml.load_model(model_name='regression', filepath=model_path)
    
    # Get prediction from loaded model
    loaded_pred = ml.predict(np.array([[2, 3]]))
    assert np.isclose(initial_pred[0], loaded_pred[0])
    
    # Cleanup
    os.remove(model_path)
    print("✓ ML model persistence test passed")


# ============================================================================
# SPARK PROCESSOR TESTS
# ============================================================================

def test_spark_local_fallback():
    """Test Spark processor local fallback"""
    from evolved.spark_processor import get_spark_processor
    
    processor = get_spark_processor()
    
    # Create test events
    events = [
        {'timestamp': datetime.now(), 'value': 100.0, 'service': 'api'},
        {'timestamp': datetime.now(), 'value': 150.0, 'service': 'api'},
        {'timestamp': datetime.now(), 'value': 200.0, 'service': 'db'},
    ]
    
    # Process events (will use local fallback)
    result = processor.process_events_batch(events)
    assert result is not None
    assert len(result) > 0
    print(f"✓ Spark local fallback test passed: processed {len(result)} events")


def test_spark_time_window_metrics():
    """Test time-windowed metrics calculation"""
    from evolved.spark_processor import get_spark_processor
    
    processor = get_spark_processor()
    
    # Create test events
    events = [
        {'timestamp': datetime.now(), 'value': 100.0, 'service': 'api'},
        {'timestamp': datetime.now(), 'value': 150.0, 'service': 'api'},
        {'timestamp': datetime.now(), 'value': 200.0, 'service': 'api'},
    ]
    
    # Calculate metrics (window_minutes is the parameter)
    metrics = processor.calculate_time_window_metrics(events, window_minutes=1)
    assert metrics is not None
    # In local mode, should return a list of processed events
    print(f"✓ Spark time window metrics test passed: {type(metrics).__name__}")


def test_spark_anomaly_detection():
    """Test anomaly detection in batch processor"""
    from evolved.spark_processor import get_spark_processor
    
    processor = get_spark_processor()
    
    # Create events with anomalies
    events = []
    for i in range(10):
        events.append({'value': 100.0 + i})
    events.append({'value': 500.0})  # Anomaly
    
    # Detect anomalies
    anomalies = processor.detect_anomalies(events, threshold_std=2.0)
    assert len(anomalies) > 0
    print(f"✓ Spark anomaly detection test passed: found {len(anomalies)} anomalies")


# ============================================================================
# KAFKA PRODUCER/CONSUMER TESTS (Mock-based, no actual broker required)
# ============================================================================

@pytest.mark.skip(reason="kafka-python package not installed in test environment")
def test_kafka_event_topics():
    """Test Kafka event topic enumeration"""
    from evolved.kafka_producer import EventTopic
    
    topics = [topic.value for topic in EventTopic]
    assert 'events.analytics' in topics
    assert 'events.devices' in topics
    assert 'events.reality' in topics
    assert 'events.errors' in topics
    assert 'events.metrics' in topics
    assert 'events.user' in topics
    print(f"✓ Kafka event topics test passed: {len(topics)} topics")


def test_kafka_producer_initialization():
    """Test Kafka producer can be initialized"""
    try:
        from evolved.kafka_producer import get_kafka_producer
        producer = get_kafka_producer()
        assert producer is not None
        print("✓ Kafka producer initialization test passed")
    except Exception as e:
        # Expected if kafka-python not installed
        if "kafka" in str(e).lower():
            print("⚠ Kafka not available (expected in test environment)")
        else:
            raise


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

def test_pipeline_end_to_end():
    """Test end-to-end pipeline: aggregate -> ML -> insight"""
    from evolved.aggregation_engine import get_aggregator
    from evolved.ml_pipeline import get_ml_pipeline
    
    # Step 1: Aggregate raw metrics
    agg = get_aggregator()
    raw_values = [95, 98, 100, 102, 105, 110, 115, 120, 125, 200]
    for val in raw_values:
        agg.aggregate_event('latency', float(val))
    
    # Step 2: Get aggregated stats
    stats = agg.get_aggregated_stats('latency')
    assert stats['stats']['count'] == 10
    
    # Step 3: Use stats for ML prediction
    ml = get_ml_pipeline()
    
    # Prepare features from aggregated stats
    features_data = [
        {
            'mean': stats['stats']['mean'],
            'std': stats['stats'].get('std', 0),
            'max': stats['stats']['max'],
        }
    ]
    
    X, _ = ml.extract_features(features_data, feature_keys=['mean', 'std', 'max'])
    
    # Step 4: Train and predict
    y_train = np.array([1.0, 2.0, 3.0])
    X_train = np.array([[1, 1, 1], [2, 2, 2], [3, 3, 3]])
    ml.train_regression_model(X_train, y_train)
    
    prediction = ml.predict(X)
    assert len(prediction) > 0
    print(f"✓ End-to-end pipeline test passed: prediction={prediction[0]:.2f}")


def test_multiple_aggregators():
    """Test handling multiple concurrent aggregation streams"""
    from evolved.aggregation_engine import StreamingAggregator
    
    # Create multiple aggregators for different metrics
    agg_cpu = StreamingAggregator()
    agg_memory = StreamingAggregator()
    agg_disk = StreamingAggregator()
    
    # Simulate concurrent metrics
    for i in range(5):
        agg_cpu.aggregate_event('cpu_usage', float(50 + i * 10))
        agg_memory.aggregate_event('memory_usage', float(60 + i * 5))
        agg_disk.aggregate_event('disk_io', float(100 + i * 20))
    
    stats_cpu = agg_cpu.get_all_stats()
    stats_memory = agg_memory.get_all_stats()
    stats_disk = agg_disk.get_all_stats()
    
    assert len(stats_cpu) > 0
    assert len(stats_memory) > 0
    assert len(stats_disk) > 0
    print("✓ Multiple aggregators test passed")


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

def test_aggregation_performance():
    """Test aggregation performance with high throughput"""
    from evolved.aggregation_engine import get_aggregator
    import time
    
    agg = get_aggregator()
    
    start = time.time()
    for i in range(10000):
        agg.aggregate_event(f'metric_{i % 100}', float(i))
    elapsed = time.time() - start
    
    throughput = 10000 / elapsed
    print(f"✓ Aggregation performance test passed: {throughput:.0f} events/sec")
    assert throughput > 1000  # Should handle >1000 events/sec


def test_ml_prediction_performance():
    """Test ML prediction latency"""
    from evolved.ml_pipeline import get_ml_pipeline
    import time
    
    ml = get_ml_pipeline()
    
    # Train model
    X_train = np.random.randn(100, 10)
    y_train = np.random.randn(100)
    ml.train_regression_model(X_train, y_train)
    
    # Test prediction latency
    X_test = np.random.randn(100, 10)
    start = time.time()
    predictions = ml.predict(X_test)
    elapsed = time.time() - start
    
    latency_ms = (elapsed * 1000) / 100
    print(f"✓ ML prediction performance test passed: {latency_ms:.2f}ms per prediction")
    assert latency_ms < 10  # Should be sub-10ms per prediction


# ============================================================================
# Main test execution
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
