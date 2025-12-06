"""
IoT Event Handler for Reality Stream - Minimal Implementation

Receives IoT events and updates Twin graph with real-time sensor data.
"""

import json
import asyncio
import logging
from typing import Dict, Any, Optional, List, Callable
from datetime import datetime, timezone
from dataclasses import dataclass
from enum import Enum
import aiohttp
from azure.iot.hub import IoTHubRegistryManager
from azure.iot.device.aio import IoTHubDeviceClient
from azure.eventhub.aio import EventHubConsumerClient
from azure.eventhub import EventData


class EventType(Enum):
    """IoT event types."""
    TELEMETRY = "telemetry"
    STATE_CHANGE = "state_change"
    ALERT = "alert"
    DEVICE_CONNECTED = "device_connected"
    DEVICE_DISCONNECTED = "device_disconnected"


@dataclass
class IoTEvent:
    """IoT event data structure."""
    device_id: str
    event_type: EventType
    timestamp: datetime
    payload: Dict[str, Any]
    twin_id: Optional[str] = None
    correlation_id: Optional[str] = None


@dataclass
class TwinUpdate:
    """Twin graph update structure."""
    twin_id: str
    properties: Dict[str, Any]
    relationships: Optional[List[Dict[str, Any]]] = None
    metadata: Optional[Dict[str, Any]] = None


class IoTEventHandler:
    """
    Handles IoT events and updates Twin graph.
    
    Receives events from IoT Hub/Event Hub and processes them
    to update the digital twin graph representation.
    """
    
    def __init__(
        self,
        iot_hub_connection_string: str,
        event_hub_connection_string: str,
        twin_service_url: str,
        consumer_group: str = "$Default"
    ):
        """
        Initialize IoT Event Handler.
        
        Args:
            iot_hub_connection_string: Azure IoT Hub connection string
            event_hub_connection_string: Event Hub connection string
            twin_service_url: Twin service API endpoint
            consumer_group: Event Hub consumer group
        """
        self.iot_hub_connection_string = iot_hub_connection_string
        self.event_hub_connection_string = event_hub_connection_string
        self.twin_service_url = twin_service_url.rstrip('/')
        self.consumer_group = consumer_group
        
        self.logger = logging.getLogger(__name__)
        self.event_processors: Dict[EventType, Callable] = {
            EventType.TELEMETRY: self._process_telemetry,
            EventType.STATE_CHANGE: self._process_state_change,
            EventType.ALERT: self._process_alert,
            EventType.DEVICE_CONNECTED: self._process_device_connection,
            EventType.DEVICE_DISCONNECTED: self._process_device_disconnection,
        }
        
        self._running = False
        self._tasks: List[asyncio.Task] = []
    
    async def start(self) -> None:
        """Start the IoT event handler."""
        try:
            self.logger.info("Starting IoT Event Handler")
            self._running = True
            
            # Start event consumer
            consumer_task = asyncio.create_task(self._consume_events())
            self._tasks.append(consumer_task)
            
            self.logger.info("IoT Event Handler started successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to start IoT Event Handler: {e}")
            await self.stop()
            raise
    
    async def stop(self) -> None:
        """Stop the IoT event handler."""
        try:
            self.logger.info("Stopping IoT Event Handler")
            self._running = False
            
            # Cancel all tasks
            for task in self._tasks:
                if not task.done():
                    task.cancel()
            
            # Wait for tasks to complete
            if self._tasks:
                await asyncio.gather(*self._tasks, return_exceptions=True)
            
            self._tasks.clear()
            self.logger.info("IoT Event Handler stopped")
            
        except Exception as e:
            self.logger.error(f"Error stopping IoT Event Handler: {e}")
    
    async def _consume_events(self) -> None:
        """Consume events from Event Hub."""
        try:
            client = EventHubConsumerClient.from_connection_string(
                self.event_hub_connection_string,
                consumer_group=self.consumer_group
            )
            
            async with client:
                await client.receive_batch(
                    on_event_batch=self._process_event_batch,
                    max_batch_size=100,
                    max_wait_time=30
                )
                
        except Exception as e:
            self.logger.error(f"Error consuming events: {e}")
            if self._running:
                # Retry after delay
                await asyncio.sleep(5)
                if self._running:
                    await self._consume_events()
    
    async def _process_event_batch(self, partition_context, events: List[EventData]) -> None:
        """
        Process a batch of events.
        
        Args:
            partition_context: Event Hub partition context
            events: List of events to process
        """
        try:
            for event_data in events:
                if not self._running:
                    break
                
                iot_event = await self._parse_event(event_data)
                if iot_event:
                    await self._process_event(iot_event)
            
            await partition_context.update_checkpoint()
            
        except Exception as e:
            self.logger.error(f"Error processing event batch: {e}")
    
    async def _parse_event(self, event_data: EventData) -> Optional[IoTEvent]:
        """
        Parse raw event data into IoTEvent.
        
        Args:
            event_data: Raw event data
            
        Returns:
            Parsed IoT event or None if parsing failed
        """
        try:
            # Get message body
            message_body = event_data.body_as_str()
            if not message_body:
                return None
            
            # Parse JSON payload
            payload = json.loads(message_body)
            
            # Extract device ID
            device_id = (
                event_data.properties.get('iothub-connection-device-id') or
                payload.get('deviceId') or
                payload.get('device_id')
            )
            
            if not device_id:
                self.logger.warning("Event missing device ID")
                return None
            
            # Determine event type
            event_type_str = payload.get('eventType', 'telemetry')
            try:
                event_type = EventType(event_type_str)
            except ValueError:
                event_type = EventType.TELEMETRY
            
            # Parse timestamp
            timestamp_str = (
                payload.get('timestamp') or
                event_data.properties.get('iothub-enqueuedtime')
            )
            
            if timestamp_str:
                try:
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except ValueError:
                    timestamp = datetime.now(timezone.utc)
            else:
                timestamp = datetime.now(timezone.utc)
            
            return IoTEvent(
                device_id=device_id,
                event_type=event_type,
                timestamp=timestamp,
                payload=payload,
                twin_id=payload.get('twinId'),
                correlation_id=payload.get('correlationId')
            )
            
        except Exception as e:
            self.logger.error(f"Error parsing event: {e}")
            return None
    
    async def _process_event(self, event: IoTEvent) -> None:
        """
        Process an IoT event.
        
        Args:
            event: IoT event to process
        """
        try:
            processor = self.event_processors.get(event.event_type)
            if processor:
                twin_update = await processor(event)
                if twin_update:
                    await self._update_twin(twin_update)
            else:
                self.logger.warning(f"No processor for event type: {event.event_type}")
                
        except Exception as e:
            self.logger.error(f"Error processing event {event.device_id}: {e}")
    
    async def _process_telemetry(self, event: IoTEvent) -> Optional[TwinUpdate]:
        """
        Process telemetry event.
        
        Args:
            event: Telemetry event
            
        Returns:
            Twin update or None
        """
        try:
            twin_id = event.twin_id or f"device-{event.device_id}"
            
            # Extract telemetry data
            telemetry_data = event.payload.get('data', {})
            if not telemetry_data:
                return None
            
            # Prepare twin properties update
            properties = {
                'lastTelemetryTime': event.timestamp.isoformat(),
                'deviceId': event.device_id,
                **telemetry_data
            }
            
            metadata = {
                'source': 'iot-telemetry',
                'timestamp': event.timestamp.isoformat(),
                'correlationId': event.correlation_id
            }
            
            return TwinUpdate(
                twin_id=twin_id,
                properties=properties,
                metadata=metadata
            )
            
        except Exception as e:
            self.logger.error(f"Error processing telemetry: {e}")
            return None
    
    async def _process_state_change(self, event: IoTEvent) -> Optional[TwinUpdate]:
        """
        Process state change event.
        
        Args:
            event: State change event
            
        Returns:
            Twin update or None
        """
        try:
            twin_id = event.twin_id or f"device-{event.device_id}"
            
            state_data = event.payload.get('state', {})
            if not state_data:
                return None
            
            properties = {
                'lastStateChange': event.timestamp.isoformat(),
                'deviceId': event.device_id,
                'state': state_data
            }
            
            metadata = {
                'source': 'iot-state-change',
                'timestamp': event.timestamp.isoformat(),
                'correlationId': event.correlation_id
            }
            
            return TwinUpdate(
                twin_id=twin_id,
                properties=properties,
                metadata=metadata
            )
            
        except Exception as e:
            self.logger.error(f"Error processing state change: {e}")
            return None
    
    async def _process_alert(self, event: IoTEvent) -> Optional[TwinUpdate]:
        """
        Process alert event.
        
        Args:
            event: Alert event
            
        Returns:
            Twin update or None
        """
        try:
            twin_id = event.twin_id or f"device-{event.device_id}"
            
            alert_data = event.payload.get('alert', {})
            if not alert_data:
                return None
            
            properties = {
                'lastAlert': event.timestamp.isoformat(),
                'deviceId': event.device_id,
                'alertSeverity': alert_data.get('severity', 'info'),
                'alertMessage': alert_data.get('message', ''),
                'alertActive': True
            }
            
            metadata = {
                'source': 'iot-alert',
                'timestamp': event.timestamp.isoformat(),
                'correlationId': event.correlation_id
            }
            
            return TwinUpdate(
                twin_id=twin_id,
                properties=properties,
                metadata=metadata
            )
            
        except Exception as e:
            self.logger.error(f"Error processing alert: {e}")
            return None
    
    async def _process_device_connection(self, event: IoTEvent) -> Optional[TwinUpdate]:
        """
        Process device connection event.
        
        Args:
            event: Device connection event
            
        Returns:
            Twin update or None
        """
        try:
            twin_id = event.twin_id or f"device-{event.device_id}"
            
            properties = {
                'lastConnected': event.timestamp.isoformat(),
                'deviceId': event.device_id,
                'connectionStatus': 'connected',
                'isOnline': True
            }
            
            metadata = {
                'source': 'iot-connection',
                'timestamp': event.timestamp.isoformat(),
                'correlationId': event.correlation_id
            }
            
            return TwinUpdate(
                twin_id=twin_id,
                properties=properties,
                metadata=metadata
            )
            
        except Exception as e:
            self.logger.error(f"Error processing device connection: {e}")
            return None
    
    async def _process_device_disconnection(self, event: IoTEvent) -> Optional[TwinUpdate]:
        """
        Process device disconnection event.
        
        Args:
            event: Device disconnection event
            
        Returns:
            Twin update or None
        """
        try:
            twin_id = event.twin_id or f"device-{event.device_id}"
            
            properties = {
                'lastDisconnected': event.timestamp.isoformat(),
                'deviceId': event.device_id,
                'connectionStatus': 'disconnected',
                'isOnline': False
            }
            
            metadata = {
                'source': 'iot-disconnection',
                'timestamp': event.timestamp.isoformat(),
                'correlationId': event.correlation_id
            }
            
            return TwinUpdate(
                twin_id=twin_id,
                properties=properties,
                metadata=metadata
            )
            
        except Exception as e:
            self.logger.error(f"Error processing device disconnection: {e}")
            return None
    
    async def _update_twin(self, update: TwinUpdate) -> None:
        """
        Update digital twin via Twin Service API.
        
        Args:
            update: Twin update data
        """
        try:
            async with aiohttp.ClientSession() as session:
                # Update twin properties
                url = f"{self.twin_service_url}/twins/{update.twin_id}"
                
                patch_data = []
                for key, value in update.properties.items():
                    patch_data.append({
                        "op": "replace",
                        "path": f"/{key}",
                        "value": value
                    })
                
                if update.metadata:
                    for key, value in update.metadata.items():
                        patch_data.append({
                            "op": "replace",
                            "path": f"/$metadata/{key}",
                            "value": value
                        })
                
                async with session.patch(
                    url,
                    json=patch_data,
                    headers={'Content-Type': 'application/json-patch+json'}
                ) as response:
                    if response.status == 404:
                        # Twin doesn't exist, create it
                        await self._create_twin(update, session)
                    elif response.status >= 400:
                        error_text = await response.text()
                        self.logger.error(f"Twin update failed: {response.status} - {error_text}")
                    else:
                        self.logger.debug(f"Twin {update.twin_id} updated successfully")
                
                # Update relationships if provided
                if update.relationships:
                    await self._update_relationships(update.twin_id, update.relationships, session)
                    
        except Exception as e:
            self.logger.error(f"Error updating twin {update.twin_id}: {e}")
    
    async def _create_twin(self, update: TwinUpdate, session: aiohttp.ClientSession) -> None:
        """
        Create a new digital twin.
        
        Args:
            update: Twin update data
            session: HTTP session
        """
        try:
            url = f"{self.twin_service_url}/twins/{update.twin_id}"
            
            twin_data = {
                "$dtId": update.twin_id,
                "$metadata": {
                    "$model": "dtmi:realitystream:IoTDevice;1",
                    **(update.metadata or {})
                },
                **update.properties
            }
            
            async with session.put(url, json=twin_data) as response:
                if response.status >= 400:
                    error_text = await response.text()
                    self.logger.error(f"Twin creation failed: {response.status} - {error_text}")
                else:
                    self.logger.info(f"Twin {update.twin_id} created successfully")
                    
        except Exception as e:
            self.logger.error(f"Error creating twin {update.twin_id}: {e}")
    
    async def _update_relationships(
        self,
        twin_id: str,
        relationships: List[Dict[str, Any]],
        session: aiohttp.ClientSession
    ) -> None:
        """
        Update twin relationships.
        
        Args:
            twin_id: Twin ID
            relationships: List of relationships to update
            session: HTTP session
        """
        try:
            for relationship in relationships:
                relationship_id = relationship.get('$relationshipId')
                if not relationship_id:
                    continue
                
                url = f"{self.twin_service_url}/twins/{twin_id}/relationships/{relationship_id}"
                
                async with session.put(url, json=relationship) as response:
                    if response.status >= 400:
                        error_text = await response.text()
                        self.logger.error(f"Relationship update failed: {response.status} - {error_text}")
                    else:
                        self.logger.debug(f"Relationship {relationship_id} updated successfully")
                        
        except Exception as e:
            self.logger.error(f"Error updating relationships for twin {twin_id}: {e}")


async def main():
    """Main function for testing."""
    logging.basicConfig(level=logging.INFO)
    
    # Configuration
    config = {
        'iot_hub_connection_string': 'HostName=your-hub.azure-devices.net;SharedAccessKeyName=service;SharedAccessKey=your-key',
        'event_hub_connection_string': 'Endpoint=sb://your-namespace.servicebus.windows.net/;SharedAccessKeyName=RootManageSharedAccessKey;SharedAccessKey=your-key;EntityPath=your-event-hub',
        'twin_service_url': 'https://your-twin-service.azurewebsites.net/api',
        'consumer_group': '$Default'
    }
    
    handler = IoTEventHandler(**config)
    
    try:
        await handler.start()
        # Keep running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        pass
    finally:
        await handler.stop()


if __name__ == "__main__":
    asyncio.run(main())
