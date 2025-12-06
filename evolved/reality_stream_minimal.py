"""
File: reality_stream_minimal.py
Purpose: Minimal Reality Stream - receive IoT events and update Twin graph
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
from dataclasses import dataclass, asdict
from enum import Enum
import websockets
from websockets.server import WebSocketServerProtocol


class EventType(Enum):
    """Types of IoT events that can be processed."""
    SENSOR_UPDATE = "sensor_update"
    DEVICE_STATUS = "device_status"
    TELEMETRY = "telemetry"
    ALERT = "alert"


@dataclass
class IoTEvent:
    """Represents an IoT event."""
    device_id: str
    event_type: EventType
    timestamp: datetime
    data: Dict[str, Any]
    location: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary representation."""
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        result['event_type'] = self.event_type.value
        return result


@dataclass
class TwinNode:
    """Represents a node in the digital twin graph."""
    node_id: str
    node_type: str
    properties: Dict[str, Any]
    last_updated: datetime
    
    def update_properties(self, new_properties: Dict[str, Any]) -> None:
        """Update node properties with new data."""
        self.properties.update(new_properties)
        self.last_updated = datetime.now()


@dataclass
class TwinRelationship:
    """Represents a relationship between twin nodes."""
    source_id: str
    target_id: str
    relationship_type: str
    properties: Dict[str, Any]


class TwinGraph:
    """Simple in-memory digital twin graph."""
    
    def __init__(self):
        """Initialize empty twin graph."""
        self._nodes: Dict[str, TwinNode] = {}
        self._relationships: List[TwinRelationship] = []
        self._logger = logging.getLogger(__name__)
    
    def add_node(self, node: TwinNode) -> None:
        """Add a node to the twin graph."""
        try:
            self._nodes[node.node_id] = node
            self._logger.info(f"Added node {node.node_id} to twin graph")
        except Exception as e:
            self._logger.error(f"Failed to add node {node.node_id}: {e}")
            raise
    
    def update_node(self, node_id: str, properties: Dict[str, Any]) -> bool:
        """Update properties of an existing node."""
        try:
            if node_id in self._nodes:
                self._nodes[node_id].update_properties(properties)
                self._logger.info(f"Updated node {node_id} with properties: {properties}")
                return True
            else:
                self._logger.warning(f"Node {node_id} not found in twin graph")
                return False
        except Exception as e:
            self._logger.error(f"Failed to update node {node_id}: {e}")
            return False
    
    def get_node(self, node_id: str) -> Optional[TwinNode]:
        """Retrieve a node from the twin graph."""
        return self._nodes.get(node_id)
    
    def add_relationship(self, relationship: TwinRelationship) -> None:
        """Add a relationship to the twin graph."""
        try:
            self._relationships.append(relationship)
            self._logger.info(f"Added relationship from {relationship.source_id} to {relationship.target_id}")
        except Exception as e:
            self._logger.error(f"Failed to add relationship: {e}")
            raise
    
    def get_nodes_count(self) -> int:
        """Get total number of nodes in the graph."""
        return len(self._nodes)
    
    def get_relationships_count(self) -> int:
        """Get total number of relationships in the graph."""
        return len(self._relationships)


class RealityStreamProcessor:
    """Main processor for IoT events and twin graph updates."""
    
    def __init__(self):
        """Initialize the reality stream processor."""
        self.twin_graph = TwinGraph()
        self._event_handlers: Dict[EventType, List[Callable]] = {
            event_type: [] for event_type in EventType
        }
        self._connected_clients: set = set()
        self._logger = logging.getLogger(__name__)
        
    def register_event_handler(self, event_type: EventType, handler: Callable) -> None:
        """Register a handler for specific event type."""
        self._event_handlers[event_type].append(handler)
        self._logger.info(f"Registered handler for {event_type.value}")
    
    async def process_event(self, event: IoTEvent) -> bool:
        """Process an IoT event and update the twin graph."""
        try:
            # Update or create twin node based on device
            await self._update_twin_from_event(event)
            
            # Execute registered handlers
            for handler in self._event_handlers[event.event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    self._logger.error(f"Handler failed for event {event.device_id}: {e}")
            
            # Broadcast to connected clients
            await self._broadcast_event(event)
            
            return True
            
        except Exception as e:
            self._logger.error(f"Failed to process event from {event.device_id}: {e}")
            return False
    
    async def _update_twin_from_event(self, event: IoTEvent) -> None:
        """Update digital twin graph based on IoT event."""
        node_id = event.device_id
        existing_node = self.twin_graph.get_node(node_id)
        
        if existing_node:
            # Update existing node
            update_data = {
                'last_event_type': event.event_type.value,
                'last_event_time': event.timestamp.isoformat(),
                **event.data
            }
            self.twin_graph.update_node(node_id, update_data)
        else:
            # Create new node
            new_node = TwinNode(
                node_id=node_id,
                node_type="iot_device",
                properties={
                    'device_id': event.device_id,
                    'location': event.location,
                    'created_time': event.timestamp.isoformat(),
                    'last_event_type': event.event_type.value,
                    **event.data
                },
                last_updated=event.timestamp
            )
            self.twin_graph.add_node(new_node)
    
    async def _broadcast_event(self, event: IoTEvent) -> None:
        """Broadcast event to all connected WebSocket clients."""
        if not self._connected_clients:
            return
        
        message = json.dumps({
            'type': 'iot_event',
            'event': event.to_dict(),
            'twin_stats': {
                'nodes': self.twin_graph.get_nodes_count(),
                'relationships': self.twin_graph.get_relationships_count()
            }
        })
        
        # Send to all connected clients
        disconnected_clients = set()
        for client in self._connected_clients:
            try:
                await client.send(message)
            except websockets.exceptions.ConnectionClosed:
                disconnected_clients.add(client)
            except Exception as e:
                self._logger.warning(f"Failed to send message to client: {e}")
                disconnected_clients.add(client)
        
        # Remove disconnected clients
        self._connected_clients -= disconnected_clients
    
    async def handle_websocket_client(self, websocket: WebSocketServerProtocol, path: str) -> None:
        """Handle WebSocket client connections."""
        self._connected_clients.add(websocket)
        self._logger.info(f"Client connected: {websocket.remote_address}")
        
        try:
            # Send initial twin graph state
            await websocket.send(json.dumps({
                'type': 'twin_state',
                'nodes': self.twin_graph.get_nodes_count(),
                'relationships': self.twin_graph.get_relationships_count()
            }))
            
            # Keep connection alive and handle incoming messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self._handle_client_message(websocket, data)
                except json.JSONDecodeError:
                    await websocket.send(json.dumps({'error': 'Invalid JSON format'}))
                except Exception as e:
                    self._logger.error(f"Error handling client message: {e}")
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self._connected_clients.discard(websocket)
            self._logger.info(f"Client disconnected: {websocket.remote_address}")
    
    async def _handle_client_message(self, websocket: WebSocketServerProtocol, data: Dict[str, Any]) -> None:
        """Handle messages from WebSocket clients."""
        message_type = data.get('type')
        
        if message_type == 'get_node':
            node_id = data.get('node_id')
            if node_id:
                node = self.twin_graph.get_node(node_id)
                if node:
                    response = {
                        'type': 'node_data',
                        'node_id': node_id,
                        'data': asdict(node)
                    }
                    response['data']['last_updated'] = node.last_updated.isoformat()
                else:
                    response = {'type': 'error', 'message': f'Node {node_id} not found'}
                
                await websocket.send(json.dumps(response))
        
        elif message_type == 'simulate_event':
            # Allow clients to simulate IoT events for testing
            try:
                event = IoTEvent(
                    device_id=data['device_id'],
                    event_type=EventType(data['event_type']),
                    timestamp=datetime.now(),
                    data=data.get('data', {}),
                    location=data.get('location')
                )
                await self.process_event(event)
            except (KeyError, ValueError) as e:
                await websocket.send(json.dumps({'error': f'Invalid event data: {e}'}))


class RealityStreamServer:
    """Main server for the Reality Stream application."""
    
    def __init__(self, host: str = "localhost", port: int = 8765):
        """Initialize the Reality Stream server."""
        self.host = host
        self.port = port
        self.processor = RealityStreamProcessor()
        self._logger = logging.getLogger(__name__)
        
        # Setup default event handlers
        self._setup_default_handlers()
    
    def _setup_default_handlers(self) -> None:
        """Setup default event handlers for different event types."""
        
        def log_sensor_update(event: IoTEvent) -> None:
            """Default handler for sensor update events."""
            self._logger.info(f"Sensor {event.device_id} updated: {event.data}")
        
        def log_device_status(event: IoTEvent) -> None:
            """Default handler for device status events."""
            status = event.data.get('status', 'unknown')
            self._logger.info(f"Device {event.device_id} status: {status}")
        
        def log_alert(event: IoTEvent) -> None:
            """Default handler for alert events."""
            severity = event.data.get('severity', 'info')
            message = event.data.get('message', 'No message')
            self._logger.warning(f"ALERT [{severity}] from {event.device_id}: {message}")
        
        # Register default handlers
        self.processor.register_event_handler(EventType.SENSOR_UPDATE, log_sensor_update)
        self.processor.register_event_handler(EventType.DEVICE_STATUS, log_device_status)
        self.processor.register_event_handler(EventType.ALERT, log_alert)
    
    async def simulate_iot_events(self) -> None:
        """Simulate IoT events for demonstration purposes."""
        import random
        
        devices = ['sensor_001', 'sensor_002', 'gateway_001', 'actuator_001']
        
        while True:
            try:
                # Generate random event
                device_id = random.choice(devices)
                event_type = random.choice(list(EventType))
                
                # Generate event-specific data
                if event_type == EventType.SENSOR_UPDATE:
                    data = {
                        'temperature': round(random.uniform(18.0, 35.0), 1),
                        'humidity': round(random.uniform(30.0, 80.0), 1),
                        'battery': random.randint(20, 100)
                    }
                elif event_type == EventType.DEVICE_STATUS:
                    data = {
                        'status': random.choice(['online', 'offline', 'maintenance']),
                        'uptime': random.randint(0, 86400)
                    }
                elif event_type == EventType.ALERT:
                    data = {
                        'severity': random.choice(['low', 'medium', 'high']),
                        'message': 'Simulated alert condition',
                        'code': random.randint(1000, 9999)
                    }
                else:
                    data = {'value': random.randint(0, 100)}
                
                event = IoTEvent(
                    device_id=device_id,
                    event_type=event_type,
                    timestamp=datetime.now(),
                    data=data,
                    location=f"Zone_{random.randint(1, 5)}"
                )
                
                await self.processor.process_event(event)
                await asyncio.sleep(random.uniform(1.0, 5.0))  # Random interval
                
            except Exception as e:
                self._logger.error(f"Error in event simulation: {e}")
                await asyncio.sleep(5.0)
    
    async def start(self) -> None:
        """Start the Reality Stream server."""
        self._logger.info(f"Starting Reality Stream server on {self.host}:{self.port}")
        
        # Start WebSocket server
        server = await websockets.serve(
            self.processor.handle_websocket_client,
            self.host,
            self.port
        )
        
        # Start event simulation
        simulation_task = asyncio.create_task(self.simulate_iot_events())
        
        self._logger.info("Reality Stream server started successfully")
        
        try:
            await asyncio.gather(
                server.wait_closed(),
                simulation_task
            )
        except KeyboardInterrupt:
            self._logger.info("Shutting down Reality Stream server")
            simulation_task.cancel()
            server.close()
            await server.wait_closed()


async def main():
    """Main entry point for the Reality Stream application."""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and start server
    server = RealityStreamServer()
    await server.start()


if __name__ == "__main__":
    asyncio.run(main())
