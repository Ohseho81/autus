"""
Device Registry for IoT sensor integration in Reality Events system.

This module manages the registration, discovery, and lifecycle of IoT devices
that generate reality events.
"""

from typing import Dict, List, Optional, Set, Callable, Any
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import asyncio
import logging
from enum import Enum
import uuid
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class DeviceStatus(Enum):
    """Device status enumeration."""
    OFFLINE = "offline"
    ONLINE = "online"
    ERROR = "error"
    MAINTENANCE = "maintenance"
    DISCOVERING = "discovering"


class DeviceType(Enum):
    """Supported IoT device types."""
    SENSOR = "sensor"
    ACTUATOR = "actuator"
    GATEWAY = "gateway"
    CAMERA = "camera"
    MICROPHONE = "microphone"
    ENVIRONMENTAL = "environmental"
    MOTION = "motion"
    PROXIMITY = "proximity"


@dataclass
class DeviceCapability:
    """Represents a device capability."""
    name: str
    data_type: str
    unit: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    precision: Optional[int] = None


@dataclass
class DeviceInfo:
    """Device information and metadata."""
    device_id: str
    name: str
    device_type: DeviceType
    manufacturer: str
    model: str
    version: str
    capabilities: List[DeviceCapability] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    location: Optional[str] = None
    zone: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert device info to dictionary."""
        return {
            "device_id": self.device_id,
            "name": self.name,
            "device_type": self.device_type.value,
            "manufacturer": self.manufacturer,
            "model": self.model,
            "version": self.version,
            "capabilities": [
                {
                    "name": cap.name,
                    "data_type": cap.data_type,
                    "unit": cap.unit,
                    "min_value": cap.min_value,
                    "max_value": cap.max_value,
                    "precision": cap.precision
                }
                for cap in self.capabilities
            ],
            "metadata": self.metadata,
            "location": self.location,
            "zone": self.zone
        }


@dataclass
class DeviceRegistration:
    """Device registration record."""
    device_info: DeviceInfo
    status: DeviceStatus
    registered_at: datetime
    last_seen: datetime
    heartbeat_interval: timedelta = field(default_factory=lambda: timedelta(seconds=30))
    tags: Set[str] = field(default_factory=set)
    
    @property
    def is_online(self) -> bool:
        """Check if device is considered online based on last heartbeat."""
        if self.status != DeviceStatus.ONLINE:
            return False
        
        timeout = datetime.utcnow() - (self.heartbeat_interval * 3)
        return self.last_seen > timeout


class DeviceDiscoveryProtocol(ABC):
    """Abstract base class for device discovery protocols."""
    
    @abstractmethod
    async def discover_devices(self, timeout: float = 30.0) -> List[DeviceInfo]:
        """Discover devices using this protocol."""
        pass
    
    @abstractmethod
    async def validate_device(self, device_info: DeviceInfo) -> bool:
        """Validate if a device can be connected to."""
        pass


class DeviceRegistryError(Exception):
    """Base exception for device registry operations."""
    pass


class DeviceNotFoundError(DeviceRegistryError):
    """Raised when a device is not found in the registry."""
    pass


class DeviceAlreadyRegisteredError(DeviceRegistryError):
    """Raised when attempting to register an already registered device."""
    pass


class DeviceRegistry:
    """
    Central registry for managing IoT devices in the Reality Events system.
    
    Handles device registration, discovery, health monitoring, and lifecycle management.
    """
    
    def __init__(self):
        """Initialize the device registry."""
        self._devices: Dict[str, DeviceRegistration] = {}
        self._discovery_protocols: List[DeviceDiscoveryProtocol] = []
        self._event_callbacks: Dict[str, List[Callable]] = {}
        self._health_check_task: Optional[asyncio.Task] = None
        self._discovery_task: Optional[asyncio.Task] = None
        self._health_check_interval = timedelta(seconds=30)
        self._auto_discovery_enabled = True
        self._lock = asyncio.Lock()
    
    async def start(self) -> None:
        """Start the device registry services."""
        logger.info("Starting device registry")
        
        # Start health monitoring
        if self._health_check_task is None:
            self._health_check_task = asyncio.create_task(self._health_check_loop())
        
        # Start auto-discovery if enabled
        if self._auto_discovery_enabled and self._discovery_task is None:
            self._discovery_task = asyncio.create_task(self._discovery_loop())
    
    async def stop(self) -> None:
        """Stop the device registry services."""
        logger.info("Stopping device registry")
        
        # Cancel health check task
        if self._health_check_task:
            self._health_check_task.cancel()
            try:
                await self._health_check_task
            except asyncio.CancelledError:
                pass
            self._health_check_task = None
        
        # Cancel discovery task
        if self._discovery_task:
            self._discovery_task.cancel()
            try:
                await self._discovery_task
            except asyncio.CancelledError:
                pass
            self._discovery_task = None
    
    async def register_device(
        self, 
        device_info: DeviceInfo, 
        tags: Optional[Set[str]] = None
    ) -> DeviceRegistration:
        """
        Register a new device.
        
        Args:
            device_info: Device information
            tags: Optional set of tags for the device
            
        Returns:
            Device registration record
            
        Raises:
            DeviceAlreadyRegisteredError: If device is already registered
        """
        async with self._lock:
            if device_info.device_id in self._devices:
                raise DeviceAlreadyRegisteredError(
                    f"Device {device_info.device_id} already registered"
                )
            
            registration = DeviceRegistration(
                device_info=device_info,
                status=DeviceStatus.OFFLINE,
                registered_at=datetime.utcnow(),
                last_seen=datetime.utcnow(),
                tags=tags or set()
            )
            
            self._devices[device_info.device_id] = registration
            
            logger.info(f"Registered device: {device_info.device_id} ({device_info.name})")
            
            # Trigger registration event
            await self._trigger_event("device_registered", registration)
            
            return registration
    
    async def unregister_device(self, device_id: str) -> None:
        """
        Unregister a device.
        
        Args:
            device_id: Device identifier
            
        Raises:
            DeviceNotFoundError: If device is not found
        """
        async with self._lock:
            if device_id not in self._devices:
                raise DeviceNotFoundError(f"Device {device_id} not found")
            
            registration = self._devices.pop(device_id)
            
            logger.info(f"Unregistered device: {device_id}")
            
            # Trigger unregistration event
            await self._trigger_event("device_unregistered", registration)
    
    async def update_device_status(
        self, 
        device_id: str, 
        status: DeviceStatus
    ) -> None:
        """
        Update device status.
        
        Args:
            device_id: Device identifier
            status: New device status
            
        Raises:
            DeviceNotFoundError: If device is not found
        """
        async with self._lock:
            if device_id not in self._devices:
                raise DeviceNotFoundError(f"Device {device_id} not found")
            
            registration = self._devices[device_id]
            old_status = registration.status
            registration.status = status
            registration.last_seen = datetime.utcnow()
            
            logger.debug(f"Device {device_id} status: {old_status.value} -> {status.value}")
            
            # Trigger status change event
            await self._trigger_event("device_status_changed", registration, old_status)
    
    async def heartbeat(self, device_id: str) -> None:
        """
        Record device heartbeat.
        
        Args:
            device_id: Device identifier
            
        Raises:
            DeviceNotFoundError: If device is not found
        """
        async with self._lock:
            if device_id not in self._devices:
                raise DeviceNotFoundError(f"Device {device_id} not found")
            
            registration = self._devices[device_id]
            registration.last_seen = datetime.utcnow()
            
            # Auto-update status to online if device was offline
            if registration.status == DeviceStatus.OFFLINE:
                registration.status = DeviceStatus.ONLINE
                await self._trigger_event("device_online", registration)
    
    def get_device(self, device_id: str) -> Optional[DeviceRegistration]:
        """
        Get device registration by ID.
        
        Args:
            device_id: Device identifier
            
        Returns:
            Device registration or None if not found
        """
        return self._devices.get(device_id)
    
    def list_devices(
        self, 
        status_filter: Optional[DeviceStatus] = None,
        device_type_filter: Optional[DeviceType] = None,
        tags_filter: Optional[Set[str]] = None
    ) -> List[DeviceRegistration]:
        """
        List registered devices with optional filters.
        
        Args:
            status_filter: Filter by device status
            device_type_filter: Filter by device type
            tags_filter: Filter by tags (device must have all specified tags)
            
        Returns:
            List of device registrations matching filters
        """
        devices = list(self._devices.values())
        
        if status_filter:
            devices = [d for d in devices if d.status == status_filter]
        
        if device_type_filter:
            devices = [d for d in devices if d.device_info.device_type == device_type_filter]
        
        if tags_filter:
            devices = [d for d in devices if tags_filter.issubset(d.tags)]
        
        return devices
    
    def get_device_count(self) -> int:
        """Get total number of registered devices."""
        return len(self._devices)
    
    def get_online_device_count(self) -> int:
        """Get number of online devices."""
        return sum(1 for reg in self._devices.values() if reg.is_online)
    
    async def add_discovery_protocol(self, protocol: DeviceDiscoveryProtocol) -> None:
        """Add a device discovery protocol."""
        self._discovery_protocols.append(protocol)
        logger.info(f"Added discovery protocol: {protocol.__class__.__name__}")
    
    async def discover_devices(self, timeout: float = 30.0) -> List[DeviceInfo]:
        """
        Discover devices using all registered protocols.
        
        Args:
            timeout: Discovery timeout in seconds
            
        Returns:
            List of discovered devices
        """
        all_devices = []
        
        for protocol in self._discovery_protocols:
            try:
                logger.debug(f"Running discovery with {protocol.__class__.__name__}")
                devices = await protocol.discover_devices(timeout)
                all_devices.extend(devices)
            except Exception as e:
                logger.error(f"Discovery failed for {protocol.__class__.__name__}: {e}")
        
        # Remove duplicates based on device_id
        unique_devices = {}
        for device in all_devices:
            unique_devices[device.device_id] = device
        
        discovered = list(unique_devices.values())
        logger.info(f"Discovered {len(discovered)} unique devices")
        
        return discovered
    
    async def auto_register_discovered_devices(self) -> List[DeviceRegistration]:
        """
        Automatically register newly discovered devices.
        
        Returns:
            List of newly registered devices
        """
        try:
            discovered_devices = await self.discover_devices()
            newly_registered = []
            
            for device_info in discovered_devices:
                if device_info.device_id not in self._devices:
                    try:
                        registration = await self.register_device(
                            device_info, 
                            tags={"auto_discovered"}
                        )
                        newly_registered.append(registration)
                    except Exception as e:
                        logger.error(f"Failed to auto-register device {device_info.device_id}: {e}")
            
            if newly_registered:
                logger.info(f"Auto-registered {len(newly_registered)} new devices")
            
            return newly_registered
            
        except Exception as e:
            logger.error(f"Auto-registration failed: {e}")
            return []
    
    def add_event_callback(self, event_type: str, callback: Callable) -> None:
        """
        Add event callback for device registry events.
        
        Args:
            event_type: Type of event to listen for
            callback: Callback function to invoke
        """
        if event_type not in self._event_callbacks:
            self._event_callbacks[event_type] = []
        
        self._event_callbacks[event_type].append(callback)
    
    def remove_event_callback(self, event_type: str, callback: Callable) -> None:
        """
        Remove event callback.
        
        Args:
            event_type: Type of event
            callback: Callback function to remove
        """
        if event_type in self._event_callbacks:
            try:
                self._event_callbacks[event_type].remove(callback)
            except ValueError:
                pass
    
    async def _trigger_event(self, event_type: str, *args, **kwargs) -> None:
        """Trigger event callbacks."""
        callbacks = self._event_callbacks.get(event_type, [])
        
        for callback in callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(*args, **kwargs)
                else:
                    callback(*args, **kwargs)
            except Exception as e:
                logger.error(f"Event callback error for {event_type}: {e}")
    
    async def _health_check_loop(self) -> None:
        """Background health check loop."""
        while True:
            try:
                await asyncio.sleep(self._health_check_interval.total_seconds())
                await self._check_device_health()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Health check error: {e}")
    
    async def _check_device_health(self) -> None:
        """Check health of all registered devices."""
        now = datetime.utcnow()
        
        async with self._lock:
            for device_id, registration in self._devices.items():
                if registration.status == DeviceStatus.ONLINE:
                    timeout_threshold = now - (registration.heartbeat_interval * 3)
                    
                    if registration.last_seen < timeout_threshold:
                        old_status = registration.status
                        registration.status = DeviceStatus.OFFLINE
                        
                        logger.warning(f"Device {device_id} went offline (no heartbeat)")
                        
                        # Trigger offline event
                        await self._trigger_event("device_offline", registration)
    
    async def _discovery_loop(self) -> None:
        """Background device discovery loop."""
        discovery_interval = 300  # 5 minutes
        
        while True:
            try:
                await asyncio.sleep(discovery_interval)
                await self.auto_register_discovered_devices()
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Auto-discovery error: {e}")


# Global registry instance
_registry: Optional[DeviceRegistry] = None


def get_device_registry() -> DeviceRegistry:
    """Get the global device registry instance."""
    global _registry
    if _registry is None:
        _registry = DeviceRegistry()
    return _registry


async def initialize_device_registry() -> DeviceRegistry:
    """Initialize and start the global device registry."""
    registry = get_device_registry()
    await registry.start()
    return registry


async def shutdown_device_registry() -> None:
    """Shutdown the global device registry."""
    global _registry
    if _registry:
        await _registry.stop()
        _registry = None
