"""
MQTT client for IoT sensor integration in Reality Events system.
Handles real-time communication with IoT devices and sensors.
"""

import json
import logging
import ssl
import threading
import time
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Union

import paho.mqtt.client as mqtt
from pydantic import BaseModel, Field


class MQTTConfig(BaseModel):
    """Configuration for MQTT client."""
    
    host: str = Field(..., description="MQTT broker host")
    port: int = Field(1883, description="MQTT broker port")
    username: Optional[str] = Field(None, description="MQTT username")
    password: Optional[str] = Field(None, description="MQTT password")
    client_id: Optional[str] = Field(None, description="MQTT client ID")
    use_tls: bool = Field(False, description="Use TLS encryption")
    ca_cert_path: Optional[str] = Field(None, description="Path to CA certificate")
    cert_path: Optional[str] = Field(None, description="Path to client certificate")
    key_path: Optional[str] = Field(None, description="Path to client private key")
    keep_alive: int = Field(60, description="Keep alive interval in seconds")
    clean_session: bool = Field(True, description="Clean session flag")
    qos: int = Field(1, description="Default QoS level")


class SensorData(BaseModel):
    """Model for sensor data."""
    
    sensor_id: str
    sensor_type: str
    value: Union[float, int, str, bool]
    unit: Optional[str] = None
    timestamp: datetime
    location: Optional[Dict[str, float]] = None
    metadata: Optional[Dict[str, Any]] = None


class MQTTMessage(BaseModel):
    """Model for MQTT message."""
    
    topic: str
    payload: Union[str, bytes, Dict[str, Any]]
    qos: int = 1
    retain: bool = False
    timestamp: datetime = Field(default_factory=datetime.utcnow)


MessageHandler = Callable[[str, Union[str, Dict[str, Any]]], None]


class MQTTClient:
    """
    MQTT client for IoT sensor integration.
    
    Provides functionality for connecting to MQTT brokers, subscribing to topics,
    publishing messages, and handling sensor data in real-time.
    """
    
    def __init__(self, config: MQTTConfig) -> None:
        """
        Initialize MQTT client.
        
        Args:
            config: MQTT configuration
        """
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # MQTT client setup
        client_id = config.client_id or f"reality_events_{int(time.time())}"
        self.client = mqtt.Client(client_id=client_id, clean_session=config.clean_session)
        
        # Connection state
        self.is_connected = False
        self.connection_lock = threading.Lock()
        
        # Message handlers
        self.message_handlers: Dict[str, List[MessageHandler]] = {}
        self.global_handlers: List[MessageHandler] = []
        
        # Statistics
        self.stats = {
            'messages_received': 0,
            'messages_sent': 0,
            'connection_attempts': 0,
            'connection_failures': 0,
            'last_connected': None,
            'last_disconnected': None
        }
        
        self._setup_callbacks()
        self._setup_authentication()
        self._setup_tls()
    
    def _setup_callbacks(self) -> None:
        """Setup MQTT client callbacks."""
        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.on_message = self._on_message
        self.client.on_publish = self._on_publish
        self.client.on_subscribe = self._on_subscribe
        self.client.on_unsubscribe = self._on_unsubscribe
        self.client.on_log = self._on_log
    
    def _setup_authentication(self) -> None:
        """Setup MQTT authentication."""
        if self.config.username and self.config.password:
            self.client.username_pw_set(
                username=self.config.username,
                password=self.config.password
            )
    
    def _setup_tls(self) -> None:
        """Setup TLS encryption."""
        if self.config.use_tls:
            context = ssl.create_default_context()
            
            if self.config.ca_cert_path:
                context.load_verify_locations(self.config.ca_cert_path)
            
            if self.config.cert_path and self.config.key_path:
                context.load_cert_chain(
                    certfile=self.config.cert_path,
                    keyfile=self.config.key_path
                )
            
            self.client.tls_set_context(context)
    
    def _on_connect(self, client: mqtt.Client, userdata: Any, flags: Dict, rc: int) -> None:
        """Handle connection event."""
        try:
            if rc == 0:
                with self.connection_lock:
                    self.is_connected = True
                    self.stats['last_connected'] = datetime.utcnow()
                
                self.logger.info(f"Connected to MQTT broker: {self.config.host}:{self.config.port}")
                
                # Resubscribe to topics
                for topic in self.message_handlers.keys():
                    self.client.subscribe(topic, qos=self.config.qos)
            else:
                self.stats['connection_failures'] += 1
                self.logger.error(f"Failed to connect to MQTT broker. Return code: {rc}")
        except Exception as e:
            self.logger.error(f"Error in connection callback: {e}")
    
    def _on_disconnect(self, client: mqtt.Client, userdata: Any, rc: int) -> None:
        """Handle disconnection event."""
        try:
            with self.connection_lock:
                self.is_connected = False
                self.stats['last_disconnected'] = datetime.utcnow()
            
            if rc != 0:
                self.logger.warning(f"Unexpected disconnection from MQTT broker. Code: {rc}")
            else:
                self.logger.info("Disconnected from MQTT broker")
        except Exception as e:
            self.logger.error(f"Error in disconnection callback: {e}")
    
    def _on_message(self, client: mqtt.Client, userdata: Any, msg: mqtt.MQTTMessage) -> None:
        """Handle incoming message."""
        try:
            self.stats['messages_received'] += 1
            
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            # Try to parse JSON payload
            try:
                parsed_payload = json.loads(payload)
            except json.JSONDecodeError:
                parsed_payload = payload
            
            self.logger.debug(f"Received message on topic '{topic}': {parsed_payload}")
            
            # Call topic-specific handlers
            for pattern, handlers in self.message_handlers.items():
                if self._topic_matches(topic, pattern):
                    for handler in handlers:
                        try:
                            handler(topic, parsed_payload)
                        except Exception as e:
                            self.logger.error(f"Error in message handler: {e}")
            
            # Call global handlers
            for handler in self.global_handlers:
                try:
                    handler(topic, parsed_payload)
                except Exception as e:
                    self.logger.error(f"Error in global message handler: {e}")
        
        except Exception as e:
            self.logger.error(f"Error processing message: {e}")
    
    def _on_publish(self, client: mqtt.Client, userdata: Any, mid: int) -> None:
        """Handle publish event."""
        self.stats['messages_sent'] += 1
        self.logger.debug(f"Message published with mid: {mid}")
    
    def _on_subscribe(self, client: mqtt.Client, userdata: Any, mid: int, granted_qos: List[int]) -> None:
        """Handle subscribe event."""
        self.logger.debug(f"Subscribed with mid: {mid}, QoS: {granted_qos}")
    
    def _on_unsubscribe(self, client: mqtt.Client, userdata: Any, mid: int) -> None:
        """Handle unsubscribe event."""
        self.logger.debug(f"Unsubscribed with mid: {mid}")
    
    def _on_log(self, client: mqtt.Client, userdata: Any, level: int, buf: str) -> None:
        """Handle MQTT client logs."""
        if level <= logging.DEBUG:
            self.logger.debug(f"MQTT: {buf}")
    
    def _topic_matches(self, topic: str, pattern: str) -> bool:
        """
        Check if topic matches pattern with MQTT wildcards.
        
        Args:
            topic: Topic to match
            pattern: Pattern with possible wildcards (+ and #)
        
        Returns:
            True if topic matches pattern
        """
        if pattern == topic:
            return True
        
        topic_parts = topic.split('/')
        pattern_parts = pattern.split('/')
        
        i, j = 0, 0
        
        while i < len(topic_parts) and j < len(pattern_parts):
            if pattern_parts[j] == '#':
                return True
            elif pattern_parts[j] == '+':
                i += 1
                j += 1
            elif pattern_parts[j] == topic_parts[i]:
                i += 1
                j += 1
            else:
                return False
        
        return i == len(topic_parts) and j == len(pattern_parts)
    
    def connect(self, timeout: int = 30) -> bool:
        """
        Connect to MQTT broker.
        
        Args:
            timeout: Connection timeout in seconds
        
        Returns:
            True if connected successfully
        """
        try:
            self.stats['connection_attempts'] += 1
            
            result = self.client.connect(
                host=self.config.host,
                port=self.config.port,
                keepalive=self.config.keep_alive
            )
            
            if result == mqtt.MQTT_ERR_SUCCESS:
                self.client.loop_start()
                
                # Wait for connection
                start_time = time.time()
                while not self.is_connected and time.time() - start_time < timeout:
                    time.sleep(0.1)
                
                return self.is_connected
            else:
                self.logger.error(f"Failed to connect to MQTT broker. Error: {result}")
                return False
        
        except Exception as e:
            self.logger.error(f"Error connecting to MQTT broker: {e}")
            return False
    
    def disconnect(self) -> None:
        """Disconnect from MQTT broker."""
        try:
            if self.is_connected:
                self.client.disconnect()
                self.client.loop_stop()
                
                with self.connection_lock:
                    self.is_connected = False
        
        except Exception as e:
            self.logger.error(f"Error disconnecting from MQTT broker: {e}")
    
    def subscribe(self, topic: str, handler: MessageHandler, qos: Optional[int] = None) -> bool:
        """
        Subscribe to topic with message handler.
        
        Args:
            topic: Topic to subscribe to
            handler: Message handler function
            qos: Quality of Service level
        
        Returns:
            True if subscription successful
        """
        try:
            qos = qos or self.config.qos
            
            if topic not in self.message_handlers:
                self.message_handlers[topic] = []
            
            self.message_handlers[topic].append(handler)
            
            if self.is_connected:
                result, _ = self.client.subscribe(topic, qos=qos)
                return result == mqtt.MQTT_ERR_SUCCESS
            
            return True  # Will subscribe when connected
        
        except Exception as e:
            self.logger.error(f"Error subscribing to topic '{topic}': {e}")
            return False
    
    def unsubscribe(self, topic: str, handler: Optional[MessageHandler] = None) -> bool:
        """
        Unsubscribe from topic.
        
        Args:
            topic: Topic to unsubscribe from
            handler: Specific handler to remove (if None, removes all handlers)
        
        Returns:
            True if unsubscription successful
        """
        try:
            if topic in self.message_handlers:
                if handler:
                    if handler in self.message_handlers[topic]:
                        self.message_handlers[topic].remove(handler)
                else:
                    self.message_handlers[topic].clear()
                
                # If no handlers left, unsubscribe from topic
                if not self.message_handlers[topic]:
                    del self.message_handlers[topic]
                    
                    if self.is_connected:
                        result, _ = self.client.unsubscribe(topic)
                        return result == mqtt.MQTT_ERR_SUCCESS
            
            return True
        
        except Exception as e:
            self.logger.error(f"Error unsubscribing from topic '{topic}': {e}")
            return False
    
    def publish(self, topic: str, payload: Union[str, bytes, Dict[str, Any]], 
                qos: Optional[int] = None, retain: bool = False) -> bool:
        """
        Publish message to topic.
        
        Args:
            topic: Topic to publish to
            payload: Message payload
            qos: Quality of Service level
            retain: Retain message flag
        
        Returns:
            True if publish successful
        """
        try:
            if not self.is_connected:
                self.logger.error("Cannot publish: not connected to MQTT broker")
                return False
            
            qos = qos or self.config.qos
            
            # Convert payload to string if it's a dict
            if isinstance(payload, dict):
                payload = json.dumps(payload)
            
            result = self.client.publish(
                topic=topic,
                payload=payload,
                qos=qos,
                retain=retain
            )
            
            return result.rc == mqtt.MQTT_ERR_SUCCESS
        
        except Exception as e:
            self.logger.error(f"Error publishing to topic '{topic}': {e}")
            return False
    
    def publish_sensor_data(self, sensor_data: SensorData, topic_prefix: str = "sensors") -> bool:
        """
        Publish sensor data to appropriate topic.
        
        Args:
            sensor_data: Sensor data to publish
            topic_prefix: Topic prefix for sensor data
        
        Returns:
            True if publish successful
        """
        try:
            topic = f"{topic_prefix}/{sensor_data.sensor_type}/{sensor_data.sensor_id}"
            payload = {
                'sensor_id': sensor_data.sensor_id,
                'sensor_type': sensor_data.sensor_type,
                'value': sensor_data.value,
                'unit': sensor_data.unit,
                'timestamp': sensor_data.timestamp.isoformat(),
                'location': sensor_data.location,
                'metadata': sensor_data.metadata
            }
            
            return self.publish(topic, payload)
        
        except Exception as e:
            self.logger.error(f"Error publishing sensor data: {e}")
            return False
    
    def add_global_handler(self, handler: MessageHandler) -> None:
        """
        Add global message handler.
        
        Args:
            handler: Message handler function
        """
        self.global_handlers.append(handler)
    
    def remove_global_handler(self, handler: MessageHandler) -> None:
        """
        Remove global message handler.
        
        Args:
            handler: Message handler function to remove
        """
        if handler in self.global_handlers:
            self.global_handlers.remove(handler)
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get client statistics.
        
        Returns:
            Dictionary with client statistics
        """
        return {
            **self.stats,
            'is_connected': self.is_connected,
            'subscribed_topics': list(self.message_handlers.keys()),
            'global_handlers_count': len(self.global_handlers)
        }
    
    def health_check(self) -> Dict[str, Any]:
        """
        Perform health check.
        
        Returns:
            Health check results
        """
        return {
            'status': 'healthy' if self.is_connected else 'unhealthy',
            'connected': self.is_connected,
            'broker_host': self.config.host,
            'broker_port': self.config.port,
            'last_connected': self.stats['last_connected'].isoformat() if self.stats['last_connected'] else None,
            'messages_received': self.stats['messages_received'],
            'messages_sent': self.stats['messages_sent'],
            'subscriptions': len(self.message_handlers)
        }
    
    def __enter__(self):
        """Context manager entry."""
        self.connect()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.disconnect()
