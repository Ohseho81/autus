"""
Kafka Consumer Service for v4.8
Real-time Kafka integration with Celery for event processing
"""

import logging
import asyncio
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from enum import Enum
from dataclasses import dataclass

logger = logging.getLogger(__name__)


class ConsumerGroupId(str, Enum):
    """Kafka consumer group IDs"""
    ANALYTICS = "autus-analytics-consumers"
    DEVICES = "autus-device-consumers"
    REALITY = "autus-reality-consumers"
    ERRORS = "autus-error-consumers"
    METRICS = "autus-metrics-consumers"
    USER_EVENTS = "autus-user-event-consumers"


class EventProcessingStrategy(str, Enum):
    """Event processing strategies"""
    SYNC = "sync"          # Process immediately
    ASYNC = "async"        # Queue for async processing
    BATCH = "batch"        # Batch and process
    STREAM = "stream"      # Stream processing


@dataclass
class ConsumerConfig:
    """Kafka consumer configuration"""
    group_id: str
    topics: List[str]
    bootstrap_servers: str = "kafka:9092"
    auto_offset_reset: str = "earliest"
    enable_auto_commit: bool = False
    session_timeout_ms: int = 30000
    heartbeat_interval_ms: int = 10000
    max_poll_records: int = 500
    processing_strategy: EventProcessingStrategy = EventProcessingStrategy.ASYNC


class EventProcessor:
    """Process events from Kafka"""
    
    def __init__(self, processor_id: str):
        self.processor_id = processor_id
        self.processed_count = 0
        self.error_count = 0
        self.handlers: Dict[str, Callable] = {}
        
    def register_handler(self, event_type: str, handler: Callable) -> None:
        """Register event handler"""
        self.handlers[event_type] = handler
        logger.info(f"Registered handler for {event_type}")
    
    def process_event(self, event: Dict[str, Any]) -> bool:
        """Process single event"""
        try:
            event_type = event.get('type', 'unknown')
            handler = self.handlers.get(event_type)
            
            if handler:
                result = handler(event)
                self.processed_count += 1
                logger.debug(f"Processed {event_type}: {result}")
                return True
            else:
                logger.warning(f"No handler for event type: {event_type}")
                return False
                
        except Exception as e:
            self.error_count += 1
            logger.error(f"Error processing event: {e}")
            return False
    
    def process_batch(self, events: List[Dict[str, Any]]) -> Dict[str, int]:
        """Process batch of events"""
        results = {'success': 0, 'failed': 0}
        
        for event in events:
            if self.process_event(event):
                results['success'] += 1
            else:
                results['failed'] += 1
        
        return results
    
    def get_stats(self) -> Dict[str, Any]:
        """Get processor statistics"""
        return {
            'processor_id': self.processor_id,
            'processed_count': self.processed_count,
            'error_count': self.error_count,
            'success_rate': (self.processed_count / (self.processed_count + self.error_count) 
                           if self.processed_count + self.error_count > 0 else 0)
        }


class KafkaConsumerService:
    """Kafka consumer service for real-time event processing"""
    
    def __init__(self, config: ConsumerConfig):
        self.config = config
        self.consumer = None
        self.processor: Optional[EventProcessor] = None
        self.is_running = False
        self.batch_buffer: List[Dict[str, Any]] = []
        self.batch_size = 100
        self.batch_timeout_ms = 5000
        
    def initialize(self) -> bool:
        """Initialize Kafka consumer"""
        try:
            from kafka import KafkaConsumer
            import json
            
            self.consumer = KafkaConsumer(
                *self.config.topics,
                bootstrap_servers=self.config.bootstrap_servers.split(','),
                group_id=self.config.group_id,
                auto_offset_reset=self.config.auto_offset_reset,
                enable_auto_commit=self.config.enable_auto_commit,
                session_timeout_ms=self.config.session_timeout_ms,
                heartbeat_interval_ms=self.config.heartbeat_interval_ms,
                max_poll_records=self.config.max_poll_records,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                consumer_timeout_ms=self.config.batch_timeout_ms if hasattr(self.config, 'batch_timeout_ms') else 1000
            )
            
            logger.info(f"Kafka consumer initialized: {self.config.group_id} -> {self.config.topics}")
            return True
            
        except ImportError:
            logger.warning("kafka-python not installed. Using mock consumer.")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize consumer: {e}")
            return False
    
    def set_processor(self, processor: EventProcessor) -> None:
        """Set event processor"""
        self.processor = processor
    
    def process_events_sync(self, events: List[Dict[str, Any]]) -> Dict[str, int]:
        """Process events synchronously"""
        if not self.processor:
            logger.warning("No processor configured")
            return {'success': 0, 'failed': len(events)}
        
        return self.processor.process_batch(events)
    
    def process_events_async(self, events: List[Dict[str, Any]]) -> List[str]:
        """Queue events for async processing via Celery"""
        try:
            from evolved.celery_app import process_kafka_event
            
            task_ids = []
            for event in events:
                task = process_kafka_event.delay(event)
                task_ids.append(task.id)
            
            logger.info(f"Queued {len(task_ids)} events for async processing")
            return task_ids
            
        except Exception as e:
            logger.error(f"Error queueing events: {e}")
            return []
    
    def process_events_batch(self, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Process events in batch mode"""
        if not self.processor:
            logger.warning("No processor configured")
            return {'status': 'failed', 'reason': 'no_processor'}
        
        # Accumulate batch
        self.batch_buffer.extend(events)
        
        result = {'buffered': len(self.batch_buffer), 'processed': 0, 'failed': 0}
        
        # Process when batch full
        if len(self.batch_buffer) >= self.batch_size:
            batch_to_process = self.batch_buffer[:self.batch_size]
            self.batch_buffer = self.batch_buffer[self.batch_size:]
            
            process_result = self.processor.process_batch(batch_to_process)
            result['processed'] = process_result['success']
            result['failed'] = process_result['failed']
        
        return result
    
    async def consume_and_process(self) -> None:
        """Main consumer loop - async version"""
        if not self.consumer:
            logger.error("Consumer not initialized")
            return
        
        self.is_running = True
        logger.info(f"Starting consumer loop for {self.config.group_id}")
        
        try:
            while self.is_running:
                # Fetch messages
                messages = self.consumer.poll(timeout_ms=1000, max_records=self.config.max_poll_records)
                
                if not messages:
                    await asyncio.sleep(0.1)
                    continue
                
                # Process based on strategy
                events = []
                for topic_partition, records in messages.items():
                    for record in records:
                        event = record.value
                        event['_topic'] = topic_partition.topic
                        event['_partition'] = topic_partition.partition
                        event['_offset'] = record.offset
                        event['_timestamp'] = datetime.now().isoformat()
                        events.append(event)
                
                if events:
                    await self._process_events_by_strategy(events)
                
                # Commit offsets
                if self.config.enable_auto_commit is False:
                    self.consumer.commit()
                
                await asyncio.sleep(0.01)
                
        except Exception as e:
            logger.error(f"Error in consumer loop: {e}")
        finally:
            self.is_running = False
            if self.consumer:
                self.consumer.close()
            logger.info(f"Consumer loop stopped for {self.config.group_id}")
    
    async def _process_events_by_strategy(self, events: List[Dict[str, Any]]) -> None:
        """Process events according to configured strategy"""
        strategy = self.config.processing_strategy
        
        if strategy == EventProcessingStrategy.SYNC:
            result = self.process_events_sync(events)
            logger.debug(f"Sync processing: {result}")
            
        elif strategy == EventProcessingStrategy.ASYNC:
            task_ids = self.process_events_async(events)
            logger.debug(f"Async queued {len(task_ids)} tasks")
            
        elif strategy == EventProcessingStrategy.BATCH:
            result = self.process_events_batch(events)
            logger.debug(f"Batch processing: {result}")
            
        elif strategy == EventProcessingStrategy.STREAM:
            # Stream processing - immediate async each
            for event in events:
                try:
                    if self.processor:
                        await asyncio.to_thread(self.processor.process_event, event)
                except Exception as e:
                    logger.error(f"Stream processing error: {e}")
    
    def start(self) -> bool:
        """Start consumer service"""
        if not self.initialize():
            logger.error("Failed to initialize consumer")
            return False
        
        if not self.processor:
            logger.warning("Starting without event processor")
        
        self.is_running = True
        logger.info(f"Consumer service started: {self.config.group_id}")
        return True
    
    def stop(self) -> None:
        """Stop consumer service"""
        self.is_running = False
        if self.consumer:
            self.consumer.close()
        logger.info(f"Consumer service stopped: {self.config.group_id}")
    
    def get_status(self) -> Dict[str, Any]:
        """Get consumer status"""
        status = {
            'group_id': self.config.group_id,
            'topics': self.config.topics,
            'is_running': self.is_running,
            'batch_buffer_size': len(self.batch_buffer),
            'strategy': self.config.processing_strategy.value
        }
        
        if self.processor:
            status['processor'] = self.processor.get_stats()
        
        return status


class MultiConsumerManager:
    """Manage multiple Kafka consumers"""
    
    def __init__(self):
        self.consumers: Dict[str, KafkaConsumerService] = {}
        self.processors: Dict[str, EventProcessor] = {}
        
    def create_consumer(
        self,
        group_id: str,
        topics: List[str],
        strategy: EventProcessingStrategy = EventProcessingStrategy.ASYNC
    ) -> KafkaConsumerService:
        """Create and register consumer"""
        config = ConsumerConfig(
            group_id=group_id,
            topics=topics,
            processing_strategy=strategy
        )
        
        consumer = KafkaConsumerService(config)
        
        # Create processor
        processor = EventProcessor(f"{group_id}-processor")
        self.processors[group_id] = processor
        consumer.set_processor(processor)
        
        self.consumers[group_id] = consumer
        logger.info(f"Created consumer: {group_id}")
        
        return consumer
    
    def register_handler(
        self,
        group_id: str,
        event_type: str,
        handler: Callable
    ) -> None:
        """Register event handler for consumer group"""
        if group_id in self.processors:
            self.processors[group_id].register_handler(event_type, handler)
    
    def start_all(self) -> Dict[str, bool]:
        """Start all consumers"""
        results = {}
        for group_id, consumer in self.consumers.items():
            results[group_id] = consumer.start()
        
        logger.info(f"Started {sum(results.values())}/{len(results)} consumers")
        return results
    
    def stop_all(self) -> None:
        """Stop all consumers"""
        for consumer in self.consumers.values():
            consumer.stop()
        logger.info(f"Stopped all {len(self.consumers)} consumers")
    
    def get_all_status(self) -> Dict[str, Any]:
        """Get status of all consumers"""
        return {
            group_id: consumer.get_status()
            for group_id, consumer in self.consumers.items()
        }


# Global instances
_consumer_manager = None


def get_consumer_manager() -> MultiConsumerManager:
    """Get or create global consumer manager"""
    global _consumer_manager
    if _consumer_manager is None:
        _consumer_manager = MultiConsumerManager()
    return _consumer_manager


# Example handlers
def handle_analytics_event(event: Dict[str, Any]) -> bool:
    """Handle analytics events"""
    logger.debug(f"Analytics event: {event.get('action', 'unknown')}")
    return True


def handle_device_event(event: Dict[str, Any]) -> bool:
    """Handle device events"""
    logger.debug(f"Device event: {event.get('device_id', 'unknown')}")
    return True


def handle_error_event(event: Dict[str, Any]) -> bool:
    """Handle error events"""
    logger.warning(f"Error event: {event.get('message', 'unknown')}")
    return True


def setup_default_consumers() -> MultiConsumerManager:
    """Setup default Kafka consumers for all event types"""
    manager = get_consumer_manager()
    
    # Analytics consumer
    analytics_consumer = manager.create_consumer(
        group_id=ConsumerGroupId.ANALYTICS.value,
        topics=['events.analytics'],
        strategy=EventProcessingStrategy.ASYNC
    )
    manager.register_handler(ConsumerGroupId.ANALYTICS.value, 'analytics', handle_analytics_event)
    
    # Device consumer
    device_consumer = manager.create_consumer(
        group_id=ConsumerGroupId.DEVICES.value,
        topics=['events.devices'],
        strategy=EventProcessingStrategy.BATCH
    )
    manager.register_handler(ConsumerGroupId.DEVICES.value, 'device', handle_device_event)
    
    # Error consumer
    error_consumer = manager.create_consumer(
        group_id=ConsumerGroupId.ERRORS.value,
        topics=['events.errors'],
        strategy=EventProcessingStrategy.SYNC
    )
    manager.register_handler(ConsumerGroupId.ERRORS.value, 'error', handle_error_event)
    
    # Metrics consumer (stream mode)
    metrics_consumer = manager.create_consumer(
        group_id=ConsumerGroupId.METRICS.value,
        topics=['events.metrics'],
        strategy=EventProcessingStrategy.STREAM
    )
    
    # User events consumer
    user_consumer = manager.create_consumer(
        group_id=ConsumerGroupId.USER_EVENTS.value,
        topics=['events.user'],
        strategy=EventProcessingStrategy.ASYNC
    )
    
    logger.info("Default Kafka consumers configured")
    return manager
