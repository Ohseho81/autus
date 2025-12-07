"""
AUTUS Device Management API
IoT device registration and data collection with batch processing
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from api.cache import cached_response, cache_invalidate
from api.batch_processor import process_items_in_batches, BatchResult
from api.error_validator import ErrorResponseFactory
from api.errors import AutousException

router = APIRouter(prefix="/devices", tags=["devices"])


class Device(BaseModel):
    """Device model for IoT devices."""
    id: str
    name: str
    type: str  # sensor, actuator, gateway
    status: str = "offline"
    last_seen: Optional[str] = None
    data: Optional[dict] = None
    metadata: Optional[dict] = None


class DeviceData(BaseModel):
    """Data payload from device."""
    value: Optional[float] = None
    unit: Optional[str] = None
    raw: Optional[dict] = None


# In-memory device storage
devices_db: dict[str, Device] = {}


@router.get("/", response_model=List[Device])
@cached_response(endpoint="/devices/list", ttl=120)
async def list_devices():
    """
    List all registered IoT devices.
    
    Returns:
        List[Device]: All devices with their current status and metadata
    """
    return list(devices_db.values())


@router.get("/online")
@cached_response(endpoint="/devices/online", ttl=60)
async def list_online_devices():
    """
    List only online IoT devices.
    
    Returns:
        List[Device]: Devices currently online and responsive
    """
    return [d for d in devices_db.values() if d.status == "online"]


@router.post("/register", response_model=dict)
async def register_device(device: Device):
    """
    Register a new IoT device.
    
    Args:
        device: Device information (id, name, type, etc.)
    
    Returns:
        dict: Registration status and device details
        
    Raises:
        ValidationError: If device data invalid
        ConflictError: If device already registered
    """
    try:
        # Validate device
        if not device.id:
            raise ErrorResponseFactory.validation_error(
                field="id",
                message="Device ID is required"
            )
        
        if not device.name:
            raise ErrorResponseFactory.validation_error(
                field="name",
                message="Device name is required"
            )
        
        if not device.type:
            raise ErrorResponseFactory.validation_error(
                field="type",
                message="Device type is required"
            )
        
        # Check for duplicate
        if device.id in devices_db:
            raise ErrorResponseFactory.conflict(
                resource="device",
                reason=f"Device {device.id} already registered"
            )
        
        # Register device
        device.last_seen = datetime.utcnow().isoformat()
        devices_db[device.id] = device
        
        # Invalidate cache on write
        cache_invalidate("autus:devices:*")
        cache_invalidate("autus:god:*")
        
        return {
            "status": "registered",
            "device_id": device.id,
            "message": f"Device {device.name} registered successfully"
        }
    
    except AutousException:
        raise  # Let exception handler deal with it
    except Exception as e:
        raise ErrorResponseFactory.internal_error(str(e))


@router.get("/{device_id}", response_model=Device)
@cached_response(endpoint="/devices/get", ttl=120)
async def get_device(device_id: str):
    """
    Get device by ID.
    
    Args:
        device_id: Device identifier
        
    Returns:
        Device: Device information
        
    Raises:
        NotFoundError: If device not found
    """
    if device_id not in devices_db:
        raise ErrorResponseFactory.not_found("Device", device_id)
    return devices_db[device_id]


@router.post("/{device_id}/data")
async def receive_data(device_id: str, data: DeviceData):
    """
    Receive data from a device.
    
    Args:
        device_id: Device identifier
        data: Device data payload
        
    Returns:
        dict: Acknowledgment with timestamp
    """
    try:
        if device_id not in devices_db:
            # Auto-register unknown device
            devices_db[device_id] = Device(
                id=device_id,
                name=f"Auto-{device_id}",
                type="sensor"
            )
        
        device = devices_db[device_id]
        device.data = data.model_dump()
        device.status = "online"
        device.last_seen = datetime.utcnow().isoformat()
        
        # Invalidate cache on write
        cache_invalidate("autus:devices:*")
        
        return {
            "status": "received",
            "device_id": device_id,
            "timestamp": device.last_seen
        }
    
    except Exception as e:
        raise ErrorResponseFactory.internal_error(f"Failed to receive data: {str(e)}")


@router.delete("/{device_id}")
async def unregister_device(device_id: str):
    """
    Unregister a device.
    
    Args:
        device_id: Device identifier
        
    Returns:
        dict: Unregistration confirmation
        
    Raises:
        NotFoundError: If device not found
    """
    try:
        if device_id not in devices_db:
            raise ErrorResponseFactory.not_found("Device", device_id)
        
        del devices_db[device_id]
        # Invalidate cache on delete
        cache_invalidate("autus:devices:*")
        return {"status": "unregistered", "device_id": device_id}
    
    except AutousException:
        raise
    except Exception as e:
        raise ErrorResponseFactory.internal_error(str(e))


@router.post("/{device_id}/command")
async def send_command(device_id: str, command: dict):
    """
    Send command to a device (for actuators).
    
    Args:
        device_id: Device identifier
        command: Command to execute
        
    Returns:
        dict: Command confirmation
        
    Raises:
        NotFoundError: If device not found
        ValidationError: If device is not an actuator
    """
    try:
        if device_id not in devices_db:
            raise ErrorResponseFactory.not_found("Device", device_id)
        
        device = devices_db[device_id]
        if device.type != "actuator":
            raise ErrorResponseFactory.validation_error(
                field="device_type",
                message="Device must be an actuator to receive commands",
                value=device.type
            )
        
        # In real implementation, this would send via MQTT
        return {
            "status": "command_sent",
            "device_id": device_id,
            "command": command
        }
    
    except AutousException:
        raise
    except Exception as e:
        raise ErrorResponseFactory.internal_error(str(e))


@router.get("/stats/summary")
@cached_response(endpoint="/devices/stats", ttl=120)
async def device_stats():
    """Get device statistics summary."""
    total = len(devices_db)
    online = sum(1 for d in devices_db.values() if d.status == "online")
    by_type = {}
    for d in devices_db.values():
        by_type[d.type] = by_type.get(d.type, 0) + 1
    
    return {
        "total_devices": total,
        "online": online,
        "offline": total - online,
        "by_type": by_type
    }


# ===== Batch Operations =====

class BulkDeviceRegistration(BaseModel):
    """Request model for bulk device registration"""
    devices: List[Device]


class BulkDeviceUpdate(BaseModel):
    """Request model for bulk device data update"""
    device_id: str
    data: dict


@router.post("/batch/register")
async def bulk_register_devices(request: BulkDeviceRegistration) -> dict:
    """
    Register multiple devices in batch for better performance
    
    Args:
        request: List of devices to register
    
    Returns:
        BatchResult with registration statistics
    """
    async def register_batch(devices: List[Device]):
        """Register batch of devices"""
        for device in devices:
            device.last_seen = datetime.utcnow().isoformat()
            devices_db[device.id] = device
        # Invalidate cache after batch
        cache_invalidate("autus:devices:*")
        cache_invalidate("autus:god:*")
    
    result = await process_items_in_batches(
        items=request.devices,
        process_func=register_batch,
        batch_size=50,  # 50 devices per batch
        max_workers=3,
        name="bulk_device_registration"
    )
    
    return {
        "status": result.status,
        "total_devices": result.total_items,
        "registered": result.successful,
        "failed": result.failed,
        "duration_ms": result.duration_ms,
        "items_per_second": result.items_per_second
    }


@router.post("/batch/update")
async def bulk_update_device_status(updates: List[BulkDeviceUpdate]) -> dict:
    """
    Update multiple device statuses efficiently in batch
    
    Args:
        updates: List of device updates
    
    Returns:
        BatchResult with update statistics
    """
    async def update_batch(batch: List[BulkDeviceUpdate]):
        """Update batch of devices"""
        for update in batch:
            if update.device_id in devices_db:
                device = devices_db[update.device_id]
                device.data = update.data
                device.status = update.data.get("status", "online")
                device.last_seen = datetime.utcnow().isoformat()
        # Invalidate cache after batch
        cache_invalidate("autus:devices:*")
    
    result = await process_items_in_batches(
        items=updates,
        process_func=update_batch,
        batch_size=100,  # 100 updates per batch
        max_workers=4,
        name="bulk_device_update"
    )
    
    return {
        "status": result.status,
        "total_updates": result.total_items,
        "successful": result.successful,
        "failed": result.failed,
        "duration_ms": result.duration_ms,
        "items_per_second": result.items_per_second
    }


