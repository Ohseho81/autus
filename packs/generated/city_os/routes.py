"""
Auto-generated FastAPI routes for city_os
Generated: 2025-11-29T12:40:05.055749
"""


from fastapi import APIRouter, HTTPException
from typing import List, Optional
from .models import *
from .events import *
from threading import Lock

# In-memory stores and locks for thread safety
_zones = {}
_sensors = {}
_signals = {}
_incidents = {}
_events = []
_lock = Lock()

router = APIRouter(prefix="/city_os", tags=["city_os"])

# === Zone CRUD ===

@router.get("/zones", response_model=List[Zone])
async def list_zones():
    """List all Zones"""
    with _lock:
        return list(_zones.values())

@router.get("/zones/{zone_id}", response_model=Zone)
async def get_zone(zone_id: str):
    """Get Zone by zone_id"""
    with _lock:
        if zone_id not in _zones:
            raise HTTPException(404, "Zone not found")
        return _zones[zone_id]

@router.post("/zones", response_model=Zone)
async def create_zone(item: Zone):
    """Create new Zone"""
    with _lock:
        _zones[item.zone_id] = item
        return item

@router.put("/zones/{zone_id}", response_model=Zone)
async def update_zone(zone_id: str, item: Zone):
    """Update Zone"""
    with _lock:
        if zone_id not in _zones:
            raise HTTPException(404, "Zone not found")
        _zones[zone_id] = item
        return item

@router.delete("/zones/{zone_id}")
async def delete_zone(zone_id: str):
    """Delete Zone"""
    with _lock:
        if zone_id not in _zones:
            raise HTTPException(404, "Zone not found")
        del _zones[zone_id]
        return {"deleted": zone_id}

# === Sensor CRUD ===

@router.get("/sensors", response_model=List[Sensor])
async def list_sensors():
    """List all Sensors"""
    with _lock:
        return list(_sensors.values())

@router.get("/sensors/{sensor_id}", response_model=Sensor)
async def get_sensor(sensor_id: str):
    """Get Sensor by sensor_id"""
    with _lock:
        if sensor_id not in _sensors:
            raise HTTPException(404, "Sensor not found")
        return _sensors[sensor_id]

@router.post("/sensors", response_model=Sensor)
async def create_sensor(item: Sensor):
    """Create new Sensor"""
    with _lock:
        _sensors[item.sensor_id] = item
        return item

@router.put("/sensors/{sensor_id}", response_model=Sensor)
async def update_sensor(sensor_id: str, item: Sensor):
    """Update Sensor"""
    with _lock:
        if sensor_id not in _sensors:
            raise HTTPException(404, "Sensor not found")
        _sensors[sensor_id] = item
        return item

@router.delete("/sensors/{sensor_id}")
async def delete_sensor(sensor_id: str):
    """Delete Sensor"""
    with _lock:
        if sensor_id not in _sensors:
            raise HTTPException(404, "Sensor not found")
        del _sensors[sensor_id]
        return {"deleted": sensor_id}

# === TrafficSignal CRUD ===

@router.get("/trafficsignals", response_model=List[TrafficSignal])
async def list_trafficsignals():
    """List all TrafficSignals"""
    with _lock:
        return list(_signals.values())

@router.get("/trafficsignals/{signal_id}", response_model=TrafficSignal)
async def get_trafficsignal(signal_id: str):
    """Get TrafficSignal by signal_id"""
    with _lock:
        if signal_id not in _signals:
            raise HTTPException(404, "TrafficSignal not found")
        return _signals[signal_id]

@router.post("/trafficsignals", response_model=TrafficSignal)
async def create_trafficsignal(item: TrafficSignal):
    """Create new TrafficSignal"""
    with _lock:
        _signals[item.signal_id] = item
        return item

@router.put("/trafficsignals/{signal_id}", response_model=TrafficSignal)
async def update_trafficsignal(signal_id: str, item: TrafficSignal):
    """Update TrafficSignal"""
    with _lock:
        if signal_id not in _signals:
            raise HTTPException(404, "TrafficSignal not found")
        _signals[signal_id] = item
        return item

@router.delete("/trafficsignals/{signal_id}")
async def delete_trafficsignal(signal_id: str):
    """Delete TrafficSignal"""
    with _lock:
        if signal_id not in _signals:
            raise HTTPException(404, "TrafficSignal not found")
        del _signals[signal_id]
        return {"deleted": signal_id}

# === Incident CRUD ===

@router.get("/incidents", response_model=List[Incident])
async def list_incidents():
    """List all Incidents"""
    with _lock:
        return list(_incidents.values())

@router.get("/incidents/{incident_id}", response_model=Incident)
async def get_incident(incident_id: str):
    """Get Incident by incident_id"""
    with _lock:
        if incident_id not in _incidents:
            raise HTTPException(404, "Incident not found")
        return _incidents[incident_id]

@router.post("/incidents", response_model=Incident)
async def create_incident(item: Incident):
    """Create new Incident"""
    with _lock:
        _incidents[item.incident_id] = item
        return item

@router.put("/incidents/{incident_id}", response_model=Incident)
async def update_incident(incident_id: str, item: Incident):
    """Update Incident"""
    with _lock:
        if incident_id not in _incidents:
            raise HTTPException(404, "Incident not found")
        _incidents[incident_id] = item
        return item

@router.delete("/incidents/{incident_id}")
async def delete_incident(incident_id: str):
    """Delete Incident"""
    with _lock:
        if incident_id not in _incidents:
            raise HTTPException(404, "Incident not found")
        del _incidents[incident_id]
        return {"deleted": incident_id}

# === Events ===

@router.post("/events/sensor_reading")
async def emit_sensor_reading(event: SensorReadingEvent):
    """Emit sensor_reading event"""
    with _lock:
        _events.append(event)
    return {"emitted": "sensor_reading"}

@router.post("/events/threshold_exceeded")
async def emit_threshold_exceeded(event: ThresholdExceededEvent):
    """Emit threshold_exceeded event"""
    with _lock:
        _events.append(event)
    return {"emitted": "threshold_exceeded"}

@router.post("/events/incident_reported")
async def emit_incident_reported(event: IncidentReportedEvent):
    """Emit incident_reported event"""
    with _lock:
        _events.append(event)
    return {"emitted": "incident_reported"}
