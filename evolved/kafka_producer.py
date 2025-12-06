"""
Kafka Event Streaming for AUTUS
Real-time event publishing and consumption for data pipeline
"""

from kafka import KafkaProducer, KafkaConsumer
from kafka.errors import KafkaError
import json
import logging
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from enum import Enum
import threading
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)


class EventTopic(str, Enum):
    """Kafka topic names"""
    ANALYTICS_EVENTS = "analytics.events"
    DEVICE_EVENTS = "device.events"
    REALITY_EVENTS = "reality.events"
    ERROR_EVENTS = "error.events"
    METRIC_EVENTS = "metric.events"
    USER_EVENTS = "user.events"


class KafkaEventProducer:
    """Kafka producer for publishing events"""
    
    def __init__(
        self,
        bootstrap_servers: str = "localhost:9092",
        topic_configs: Optional[Dict[str, Any]] = None
    ):
        self.bootstrap_servers = bootstrap_servers
        self.topic_configs = topic_configs or {}
        self.producer = None
        self._initialize_producer()
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    def _initialize_producer(self):
        """Initialize Kafka producer"""
        try:
            self.producer = KafkaProducer(
                bootstrap_servers=self.bootstrap_servers,
                value_serializer=lambda v: json.dumps(v).encode('utf-8'),
                acks='all',  # Wait for all replicas
                retries=3,
                compression_type='snappy'
            )
            logger.info(f"Kafka producer initialized: {self.bootstrap_servers}")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka producer: {e}")
            self.producer = None
    
    def publish_event(
        self,
        topic: str,
        event_data: Dict[str, Any],
        key: Optional[str] = None,
        callback: Optional[Callable] = None
    ) -> bool:
        """
        Publish event to Kafka topic
        
        Args:
            topic: Topic name
            event_data: Event payload
            key: Partition key
            callback: Callback function on completion
        
        Returns:
            Success status
        """
        if not self.producer:
            logger.error("Producer not initialized")
            return False
        
        try:
            # Add timestamp
            event_data['published_at'] = datetime.utcnow().isoformat()
            
            future = self.producer.send(
                topic,
                value=event_data,
                key=key.encode('utf-8') if key else None
            )
            
            # Add callback
            if callback:
                future.add_callback(callback)
                future.add_errback(lambda exc: logger.error(f"Publish failed: {exc}"))
            
            logger.debug(f"Event published to {topic}: {event_data.get('type')}")
            return True
        
        except Exception as e:
            logger.error(f"Error publishing event: {e}")
            return False
    
    def publish_analytics_event(self, event_data: Dict[str, Any]) -> bool:
        """Publish analytics event"""
        return self.publish_event(EventTopic.ANALYTICS_EVENTS.value, event_data)
    
    def publish_device_event(self, device_id: str, event_data: Dict[str, Any]) -> bool:
        """Publish device event"""
        return self.publish_event(
            EventTopic.DEVICE_EVENTS.value,
            event_data,
            key=device_id
        )
    
    def publish_reality_event(self, event_data: Dict[str, Any]) -> bool:
        """Publish reality event"""
        return self.publish_event(EventTopic.REALITY_EVENTS.value, event_data)
    
    def publish_error_event(self, error_data: Dict[str, Any]) -> bool:
        """Publish error event"""
        return self.publish_event(EventTopic.ERROR_EVENTS.value, error_data)
    
    def publish_metric(self, metric_data: Dict[str, Any]) -> bool:
        """Publish metric event"""
        return self.publish_event(EventTopic.METRIC_EVENTS.value, metric_data)
    
    def close(self):
        """Close producer"""
        if self.producer:
            self.producer.flush()
            self.producer.close()
            logger.info("Kafka producer closed")


class KafkaEventConsumer:
    """Kafka consumer for consuming events"""
    
    def __init__(
        self,
        topic: str,
        bootstrap_servers: str = "localhost:9092",
        group_id: str = "autus-default",
        auto_offset_reset: str = "latest"
    ):
        self.topic = topic
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.auto_offset_reset = auto_offset_reset
        self.consumer = None
        self.is_running = False
        self._initialize_consumer()
    
    def _initialize_consumer(self):
        """Initialize Kafka consumer"""
        try:
            self.consumer = KafkaConsumer(
                self.topic,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                auto_offset_reset=self.auto_offset_reset,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                max_poll_records=100
            )
            logger.info(f"Kafka consumer initialized for topic: {self.topic}")
        except Exception as e:
            logger.error(f"Failed to initialize Kafka consumer: {e}")
            self.consumer = None
    
    def start_consuming(self, handler: Callable[[Dict[str, Any]], None]):
        """
        Start consuming events
        
        Args:
            handler: Callback function to process each event
        """
        if not self.consumer:
            logger.error("Consumer not initialized")
            return
        
        self.is_running = True
        logger.info(f"Starting to consume from {self.topic}")
        
        try:
            for message in self.consumer:
                if not self.is_running:
                    break
                
                try:
                    event = message.value
                    handler(event)
                except Exception as e:
                    logger.error(f"Error processing event: {e}")
        
        except Exception as e:
            logger.error(f"Consumer error: {e}")
        finally:
            self.is_running = False
    
    def start_consuming_async(self, handler: Callable[[Dict[str, Any]], None]):
        """Start consuming in background thread"""
        thread = threading.Thread(
            target=self.start_consuming,
            args=(handler,),
            daemon=True
        )
        thread.start()
        return thread
    
    def stop_consuming(self):
        """Stop consuming"""
        self.is_running = False
        if self.consumer:
            self.consumer.close()
            logger.info("Kafka consumer stopped")


class MultiTopicConsumer:
    """Consumer for multiple topics"""
    
    def __init__(
        self,
        topics: List[str],
        bootstrap_servers: str = "localhost:9092",
        group_id: str = "autus-multi"
    ):
        self.topics = topics
        self.bootstrap_servers = bootstrap_servers
        self.group_id = group_id
        self.consumer = None
        self.is_running = False
        self._initialize_consumer()
    
    def _initialize_consumer(self):
        """Initialize multi-topic consumer"""
        try:
            self.consumer = KafkaConsumer(
                *self.topics,
                bootstrap_servers=self.bootstrap_servers,
                group_id=self.group_id,
                auto_offset_reset='latest',
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                max_poll_records=100
            )
            logger.info(f"Multi-topic consumer initialized for: {self.topics}")
        except Exception as e:
            logger.error(f"Failed to initialize multi-topic consumer: {e}")
            self.consumer = None
    
    def start_consuming(self, handlers: Dict[str, Callable[[Dict[str, Any]], None]]):
        """
        Start consuming from multiple topics
        
        Args:
            handlers: Dict mapping topic to handler function
        """
        if not self.consumer:
            logger.error("Consumer not initialized")
            return
        
        self.is_running = True
        logger.info(f"Starting multi-topic consumption")
        
        try:
            for message in self.consumer:
                if not self.is_running:
                    break
                
                topic = message.topic
                if topic in handlers:
                    try:
                        handler = handlers[topic]
                        handler(message.value)
                    except Exception as e:
                        logger.error(f"Error processing {topic} event: {e}")
        
        except Exception as e:
            logger.error(f"Multi-topic consumer error: {e}")
        finally:
            self.is_running = False
    
    def stop_consuming(self):
        """Stop consuming"""
        self.is_running = False
        if self.consumer:
            self.consumer.close()
            logger.info("Multi-topic consumer stopped")


# Global producer instance
_producer_instance = None


def get_kafka_producer() -> KafkaEventProducer:
    """Get or create global Kafka producer"""
    global _producer_instance
    if _producer_instance is None:
        _producer_instance = KafkaEventProducer()
    return _producer_instance


# Helper functions
def publish_analytics(event_data: Dict[str, Any]) -> bool:
    """Publish analytics event"""
    producer = get_kafka_producer()
    return producer.publish_analytics_event(event_data)


def publish_device(device_id: str, event_data: Dict[str, Any]) -> bool:
    """Publish device event"""
    producer = get_kafka_producer()
    return producer.publish_device_event(device_id, event_data)


def publish_reality(event_data: Dict[str, Any]) -> bool:
    """Publish reality event"""
    producer = get_kafka_producer()
    return producer.publish_reality_event(event_data)


def publish_error(error_data: Dict[str, Any]) -> bool:
    """Publish error event"""
    producer = get_kafka_producer()
    return producer.publish_error_event(error_data)


def publish_metric(metric_data: Dict[str, Any]) -> bool:
    """Publish metric event"""
    producer = get_kafka_producer()
    return producer.publish_metric(metric_data)
