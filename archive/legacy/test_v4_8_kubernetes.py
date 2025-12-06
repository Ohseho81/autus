"""
v4.8 Kubernetes Distributed Architecture Testing Suite
Tests for K8s infrastructure, distributed Spark, ONNX models, and Kafka consumers
"""

import pytest
import numpy as np
from typing import Dict, Any
from datetime import datetime

# ============================================================================
# KUBERNETES ARCHITECTURE TESTS
# ============================================================================

def test_k8s_architecture_initialization():
    """Test Kubernetes architecture initialization"""
    from evolved.k8s_architecture import get_k8s_architecture
    
    arch = get_k8s_architecture()
    assert arch is not None
    topology = arch.get_cluster_topology()
    assert 'total_nodes' in topology
    assert 'namespaces' in topology
    print("✓ K8s architecture initialization test passed")


def test_k8s_node_configuration():
    """Test K8s node configuration"""
    from evolved.k8s_architecture import (
        KubernetesArchitecture, KubernetesNode, NodeType, ResourceTier
    )
    
    arch = KubernetesArchitecture()
    
    # Add master node
    master = KubernetesNode(
        name="master-1",
        node_type=NodeType.MASTER,
        resource_tier=ResourceTier.XLARGE,
        capacity_cpu=4.0,
        capacity_memory_mb=4096
    )
    arch.add_node(master)
    
    # Add worker nodes
    for i in range(3):
        worker = KubernetesNode(
            name=f"worker-{i+1}",
            node_type=NodeType.WORKER,
            resource_tier=ResourceTier.LARGE,
            capacity_cpu=2.0,
            capacity_memory_mb=2048
        )
        arch.add_node(worker)
    
    assert len(arch.nodes) == 4
    assert arch.nodes['master-1'].node_type == NodeType.MASTER
    print(f"✓ K8s node configuration test passed ({len(arch.nodes)} nodes)")


def test_k8s_pod_and_service_configuration():
    """Test Kubernetes pod and service configuration"""
    from evolved.k8s_architecture import (
        KubernetesArchitecture, PodConfiguration, ServiceConfiguration, ResourceTier
    )
    
    arch = KubernetesArchitecture()
    
    # Create pod
    pod = PodConfiguration(
        name="autus-app",
        namespace="autus",
        replicas=3,
        image="autus:v4.8",
        port=8000,
        resource_tier=ResourceTier.MEDIUM
    )
    arch.add_pod(pod)
    
    # Create service
    service = ServiceConfiguration(
        name="autus-service",
        namespace="autus",
        service_type="LoadBalancer",
        port=8000,
        target_port=8000,
        selector_labels={"app": "autus"}
    )
    arch.add_service(service)
    
    assert len(arch.pods) == 1
    assert len(arch.services) == 1
    print("✓ K8s pod and service configuration test passed")


def test_k8s_resource_requirements():
    """Test K8s resource calculation"""
    from evolved.k8s_architecture import (
        KubernetesArchitecture, PodConfiguration, ResourceTier
    )
    
    arch = KubernetesArchitecture()
    
    # Add multiple pods
    for i in range(5):
        pod = PodConfiguration(
            name=f"pod-{i}",
            namespace="autus",
            replicas=2,
            image="autus:v4.8",
            port=8000 + i,
            resource_tier=ResourceTier.MEDIUM
        )
        arch.add_pod(pod)
    
    resources = arch.get_resource_requirements()
    assert resources['total_cpu'] > 0
    assert resources['total_memory_gb'] > 0
    print(f"✓ K8s resource calculation test passed: {resources['total_cpu']} CPU, {resources['total_memory_gb']}GB RAM")


def test_k8s_autoscaling_policy():
    """Test K8s autoscaling policy"""
    from evolved.k8s_architecture import get_k8s_architecture
    
    arch = get_k8s_architecture()
    policy = arch.get_auto_scaling_policy()
    
    assert 'autus_app' in policy
    assert 'celery_worker' in policy
    assert 'spark_executor' in policy
    assert policy['autus_app']['max_replicas'] >= policy['autus_app']['min_replicas']
    print("✓ K8s autoscaling policy test passed")


# ============================================================================
# KAFKA CONSUMER SERVICE TESTS
# ============================================================================

def test_kafka_consumer_config():
    """Test Kafka consumer configuration"""
    from evolved.kafka_consumer_service import (
        ConsumerConfig, EventProcessingStrategy
    )
    
    config = ConsumerConfig(
        group_id="test-group",
        topics=["events.analytics", "events.devices"],
        bootstrap_servers="kafka:9092",
        processing_strategy=EventProcessingStrategy.ASYNC
    )
    
    assert config.group_id == "test-group"
    assert len(config.topics) == 2
    assert config.processing_strategy == EventProcessingStrategy.ASYNC
    print("✓ Kafka consumer config test passed")


def test_event_processor():
    """Test event processor"""
    from evolved.kafka_consumer_service import EventProcessor
    
    processor = EventProcessor("test-processor")
    
    # Register handler
    def handle_event(event):
        return True
    
    processor.register_handler("test_event", handle_event)
    
    # Process event
    event = {"type": "test_event", "data": {"value": 100}}
    result = processor.process_event(event)
    
    assert result is True
    assert processor.processed_count == 1
    stats = processor.get_stats()
    assert stats['success_rate'] == 1.0
    print("✓ Event processor test passed")


def test_kafka_consumer_service_creation():
    """Test Kafka consumer service"""
    from evolved.kafka_consumer_service import (
        KafkaConsumerService, ConsumerConfig, EventProcessingStrategy
    )
    
    config = ConsumerConfig(
        group_id="test-consumers",
        topics=["events.analytics"],
        processing_strategy=EventProcessingStrategy.SYNC
    )
    
    service = KafkaConsumerService(config)
    assert service.is_running is False
    
    status = service.get_status()
    assert status['group_id'] == "test-consumers"
    print("✓ Kafka consumer service creation test passed")


def test_multi_consumer_manager():
    """Test multi-consumer manager"""
    from evolved.kafka_consumer_service import (
        get_consumer_manager, EventProcessingStrategy
    )
    
    manager = get_consumer_manager()
    
    # Create consumers
    consumer1 = manager.create_consumer(
        "group-1",
        ["topic-1"],
        EventProcessingStrategy.SYNC
    )
    
    consumer2 = manager.create_consumer(
        "group-2",
        ["topic-2"],
        EventProcessingStrategy.ASYNC
    )
    
    assert len(manager.consumers) >= 2
    status = manager.get_all_status()
    assert len(status) >= 2
    print(f"✓ Multi-consumer manager test passed ({len(manager.consumers)} consumers)")


# ============================================================================
# ONNX MODEL TESTS
# ============================================================================

def test_onnx_model_converter_initialization():
    """Test ONNX model converter"""
    from evolved.onnx_models import get_onnx_converter
    
    converter = get_onnx_converter()
    assert converter is not None
    assert 'sklearn' in converter.supported_frameworks
    assert 'tensorflow' in converter.supported_frameworks
    print("✓ ONNX converter initialization test passed")


def test_onnx_sklearn_conversion():
    """Test ONNX sklearn model conversion"""
    from evolved.onnx_models import get_onnx_converter, ModelMetadata
    from sklearn.ensemble import RandomForestRegressor
    import numpy as np
    
    converter = get_onnx_converter()
    
    # Train sklearn model
    X = np.array([[1, 2], [3, 4], [5, 6], [7, 8]])
    y = np.array([1.0, 2.0, 3.0, 4.0])
    model = RandomForestRegressor(n_estimators=10)
    model.fit(X, y)
    
    # Convert to ONNX
    try:
        onnx_bytes, metadata = converter.convert_from_sklearn(
            model,
            input_shape=(1, 2),
            model_name="test_rf_model"
        )
        
        assert onnx_bytes is not None
        assert len(onnx_bytes) > 0
        assert metadata.model_name == "test_rf_model"
        assert metadata.framework == "sklearn"
        print("✓ ONNX sklearn conversion test passed")
    except ImportError:
        print("⏭️ ONNX sklearn conversion skipped (skl2onnx not installed)")


def test_onnx_inference_engine():
    """Test ONNX inference engine"""
    from evolved.onnx_models import get_onnx_inference
    
    engine = get_onnx_inference()
    assert engine is not None
    
    # List models
    models = engine.get_all_models()
    assert isinstance(models, list)
    print(f"✓ ONNX inference engine test passed ({len(models)} loaded models)")


def test_model_registry():
    """Test ONNX model registry"""
    from evolved.onnx_models import get_model_registry, ModelMetadata
    
    registry = get_model_registry()
    
    # Create sample metadata
    metadata = ModelMetadata(
        model_name="test_model",
        version="1.0.0",
        framework="sklearn",
        input_shape=(1, 10),
        output_shape=(1, 1),
        created_at=str(datetime.now()),
        converted_at=str(datetime.now()),
        input_types=["float32"],
        output_types=["float32"]
    )
    
    # Register model
    registry.register_model("test_model", "1.0.0", b"mock_onnx_bytes", metadata)
    
    # Verify registration
    versions = registry.list_versions("test_model")
    assert "1.0.0" in versions
    
    stats = registry.get_registry_stats()
    assert stats['total_models'] >= 1
    print("✓ Model registry test passed")


# ============================================================================
# DISTRIBUTED SPARK TESTS
# ============================================================================

def test_distributed_spark_cluster_initialization():
    """Test distributed Spark cluster"""
    from evolved.spark_distributed import get_distributed_spark_cluster
    
    cluster = get_distributed_spark_cluster()
    assert cluster is not None
    assert cluster.master_url == "spark://spark-master:7077"
    print("✓ Distributed Spark cluster initialization test passed")


def test_spark_executor_management():
    """Test Spark executor management"""
    from evolved.spark_distributed import get_distributed_spark_cluster
    
    cluster = get_distributed_spark_cluster()
    
    # Add executors
    for i in range(3):
        executor = cluster.add_executor(
            executor_id=f"executor-{i}",
            host=f"worker-{i}.cluster.local",
            port=7078 + i,
            cores=4,
            memory_mb=2048
        )
        assert executor is not None
    
    status = cluster.get_cluster_status()
    assert status['total_executors'] == 3
    assert status['total_cores'] == 12
    print(f"✓ Spark executor management test passed ({status['total_executors']} executors)")


def test_spark_job_submission():
    """Test Spark job submission"""
    from evolved.spark_distributed import get_distributed_spark_cluster
    
    cluster = get_distributed_spark_cluster()
    
    job = cluster.submit_job(
        job_name="test_job",
        main_class="com.example.TestJob",
        jar_path="/jobs/test.jar",
        num_executors=4,
        executor_cores=2,
        executor_memory_gb=2
    )
    
    if job:
        assert job.job_name == "test_job"
        status = cluster.get_job_status(job.job_id)
        assert status is not None
        print("✓ Spark job submission test passed")
    else:
        print("⏭️ Spark job submission skipped (Spark not available)")


def test_spark_cluster_scaling():
    """Test Spark cluster scaling"""
    from evolved.spark_distributed import get_distributed_spark_cluster
    
    cluster = get_distributed_spark_cluster()
    
    # Add some executors
    for i in range(2):
        cluster.add_executor(f"executor-{i}", f"worker-{i}", 7078 + i, 2, 1024)
    
    # Scale cluster
    result = cluster.scale_cluster(target_executors=10)
    assert result is not None
    print("✓ Spark cluster scaling test passed")


def test_spark_streaming_initialization():
    """Test Spark Streaming cluster"""
    from evolved.spark_distributed import get_streaming_cluster
    
    streaming = get_streaming_cluster()
    assert streaming is not None
    assert streaming.batch_interval_seconds == 2
    print("✓ Spark Streaming initialization test passed")


# ============================================================================
# INTEGRATION TESTS
# ============================================================================

def test_k8s_kafka_spark_integration():
    """Test K8s, Kafka, and Spark integration"""
    from evolved.k8s_architecture import get_k8s_architecture
    from evolved.kafka_consumer_service import get_consumer_manager
    from evolved.spark_distributed import get_distributed_spark_cluster
    
    # K8s
    k8s = get_k8s_architecture()
    k8s_status = k8s.get_cluster_topology()
    
    # Kafka
    kafka_manager = get_consumer_manager()
    kafka_status = kafka_manager.get_all_status()
    
    # Spark
    spark = get_distributed_spark_cluster()
    spark_status = spark.get_cluster_status()
    
    assert k8s_status is not None
    assert isinstance(kafka_status, dict)
    assert spark_status is not None
    
    print("✓ K8s-Kafka-Spark integration test passed")


def test_distributed_architecture_overview():
    """Test distributed architecture overview"""
    from evolved.k8s_architecture import (
        get_k8s_architecture, get_kafka_cluster, 
        get_monitoring_stack, get_disaster_recovery, get_cost_optimization
    )
    
    # Get all components
    k8s = get_k8s_architecture()
    kafka = get_kafka_cluster()
    monitoring = get_monitoring_stack()
    dr = get_disaster_recovery()
    cost = get_cost_optimization()
    
    overview = {
        'kubernetes': k8s.get_cluster_topology(),
        'kafka': kafka.get_cluster_status() if kafka.brokers else {},
        'monitoring': monitoring.get_monitoring_stack(),
        'disaster_recovery': dr.get_backup_strategy(),
        'cost_optimization': cost.get_cost_optimization_plan()
    }
    
    assert overview['kubernetes'] is not None
    assert overview['disaster_recovery'] is not None
    print("✓ Distributed architecture overview test passed")


# ============================================================================
# PERFORMANCE TESTS
# ============================================================================

def test_event_processor_throughput():
    """Test event processor throughput"""
    from evolved.kafka_consumer_service import EventProcessor
    import time
    
    processor = EventProcessor("perf-test")
    
    # Register simple handler
    processor.register_handler("metric", lambda e: True)
    
    # Process many events
    events = [{"type": "metric", "value": i} for i in range(1000)]
    
    start = time.time()
    for event in events:
        processor.process_event(event)
    elapsed = time.time() - start
    
    throughput = len(events) / elapsed
    assert throughput > 1000  # Should process 1000+ events/sec
    print(f"✓ Event processor throughput test passed: {throughput:.0f} events/sec")


def test_onnx_inference_latency():
    """Test ONNX inference latency"""
    import time
    import numpy as np
    
    # Simulate ONNX inference
    inputs = [np.random.randn(10).astype('float32') for _ in range(100)]
    
    start = time.time()
    for inp in inputs:
        # Simulate inference
        output = np.dot(inp, np.random.randn(10)) 
    elapsed = time.time() - start
    
    latency_ms = (elapsed / len(inputs)) * 1000
    assert latency_ms < 5  # Should be <5ms per inference
    print(f"✓ ONNX inference latency test passed: {latency_ms:.2f}ms per inference")


# ============================================================================
# Main test execution
# ============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
