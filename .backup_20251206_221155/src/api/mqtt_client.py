"""
AUTUS MQTT Client for IoT Device Integration
"""
import paho.mqtt.client as mqtt
import json
from typing import Callable, Optional
from datetime import datetime


class AUTUSMQTTClient:
    """MQTT Client for real device communication."""
    
    def __init__(self, broker: str = "broker.hivemq.com", port: int = 1883):
        self.broker = broker
        self.port = port
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        self.handlers: dict[str, Callable] = {}
        self.connected = False

    def _on_connect(self, client, userdata, flags, rc, properties=None):
        if rc == 0:
            print(f"✅ MQTT Connected: {self.broker}")
            self.connected = True
            for topic in self.handlers:
                client.subscribe(topic)
                print(f"   📡 Subscribed: {topic}")
        else:
            print(f"❌ MQTT Connection failed: {rc}")

    def _on_disconnect(self, client, userdata, rc, properties=None):
        self.connected = False
        print(f"🔌 MQTT Disconnected")

    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        try:
            payload = json.loads(msg.payload.decode())
        except json.JSONDecodeError:
            payload = {"raw": msg.payload.decode()}
        
        print(f"📨 MQTT Message: {topic} -> {payload}")
        
        if topic in self.handlers:
            self.handlers[topic](payload)
        
        # Check wildcard handlers
        for pattern, handler in self.handlers.items():
            if '#' in pattern or '+' in pattern:
                if self._topic_matches(pattern, topic):
                    handler(payload)

    def _topic_matches(self, pattern: str, topic: str) -> bool:
        """Check if topic matches MQTT pattern."""
        pattern_parts = pattern.split('/')
        topic_parts = topic.split('/')
        
        for i, part in enumerate(pattern_parts):
            if part == '#':
                return True
            if i >= len(topic_parts):
                return False
            if part != '+' and part != topic_parts[i]:
                return False
        
        return len(pattern_parts) == len(topic_parts)

    def subscribe(self, topic: str, handler: Callable):
        """Subscribe to a topic with a handler function."""
        self.handlers[topic] = handler
        if self.connected:
            self.client.subscribe(topic)
            print(f"📡 Subscribed: {topic}")

    def publish(self, topic: str, data: dict):
        """Publish data to a topic."""
        payload = json.dumps({
            **data,
            "timestamp": datetime.utcnow().isoformat()
        })
        self.client.publish(topic, payload)
        print(f"📤 Published: {topic}")

    def connect(self):
        """Connect to MQTT broker."""
        try:
            self.client.connect(self.broker, self.port, 60)
            self.client.loop_start()
        except Exception as e:
            print(f"❌ MQTT Connect error: {e}")

    def disconnect(self):
        """Disconnect from MQTT broker."""
        self.client.loop_stop()
        self.client.disconnect()


# Global MQTT client instance
_mqtt_client: Optional[AUTUSMQTTClient] = None


def get_mqtt_client() -> AUTUSMQTTClient:
    """Get or create MQTT client instance."""
    global _mqtt_client
    if _mqtt_client is None:
        _mqtt_client = AUTUSMQTTClient()
    return _mqtt_client

