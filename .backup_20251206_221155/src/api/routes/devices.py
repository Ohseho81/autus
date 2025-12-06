"""
AUTUS Device Management API
IoT device registration and data collection
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

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
async def list_devices():
    """
    List all registered IoT devices.
    
    Returns:
        List[Device]: All devices with their current status and metadata
    """
    return list(devices_db.values())


@router.get("/online")
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
    """
    device.last_seen = datetime.utcnow().isoformat()
    devices_db[device.id] = device
    return {
        "status": "registered",
        "device_id": device.id,
        "message": f"Device {device.name} registered successfully"
    }


@router.get("/{device_id}", response_model=Device)
async def get_device(device_id: str):
    """Get device by ID."""
    if device_id not in devices_db:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    return devices_db[device_id]


@router.post("/{device_id}/data")
async def receive_data(device_id: str, data: DeviceData):
    """Receive data from a device."""
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
    
    return {
        "status": "received",
        "device_id": device_id,
        "timestamp": device.last_seen
    }


@router.delete("/{device_id}")
async def unregister_device(device_id: str):
    """Unregister a device."""
    if device_id not in devices_db:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    
    del devices_db[device_id]
    return {"status": "unregistered", "device_id": device_id}


@router.post("/{device_id}/command")
async def send_command(device_id: str, command: dict):
    """Send command to a device (for actuators)."""
    if device_id not in devices_db:
        raise HTTPException(status_code=404, detail=f"Device {device_id} not found")
    
    device = devices_db[device_id]
    if device.type != "actuator":
        raise HTTPException(status_code=400, detail="Device is not an actuator")
    
    # In real implementation, this would send via MQTT
    return {
        "status": "command_sent",
        "device_id": device_id,
        "command": command
    }


@router.get("/stats/summary")
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

