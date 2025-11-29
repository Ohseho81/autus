"""
Auto-generated FastAPI routes for battery_factory
Generated: 2025-11-29T12:40:05.059948
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from .models import *
from .events import *
from threading import Lock

# In-memory stores and lock for thread safety
_lines = {}
_equipments = {}
_batchs = {}
_qualitychecks = {}
_events = []
_lock = Lock()

router = APIRouter(prefix="/battery_factory", tags=["battery_factory"])

# === Line CRUD ===

@router.get("/lines", response_model=List[Line])
async def list_lines():
    """List all Lines"""
    with _lock:
        return list(_lines.values())

@router.get("/lines/{line_id}", response_model=Line)
async def get_line(line_id: str):
    """Get Line by line_id"""
    with _lock:
        if line_id not in _lines:
            raise HTTPException(404, "Line not found")
        return _lines[line_id]

@router.post("/lines", response_model=Line)
async def create_line(item: Line):
    """Create new Line"""
    with _lock:
        _lines[item.line_id] = item
        return item

@router.put("/lines/{line_id}", response_model=Line)
async def update_line(line_id: str, item: Line):
    """Update Line"""
    with _lock:
        if line_id not in _lines:
            raise HTTPException(404, "Line not found")
        _lines[line_id] = item
        return item

@router.delete("/lines/{line_id}")
async def delete_line(line_id: str):
    """Delete Line"""
    with _lock:
        if line_id not in _lines:
            raise HTTPException(404, "Line not found")
        del _lines[line_id]
        return {"deleted": line_id}

# === Equipment CRUD ===

@router.get("/equipments", response_model=List[Equipment])
async def list_equipments():
    """List all Equipments"""
    with _lock:
        return list(_equipments.values())

@router.get("/equipments/{equipment_id}", response_model=Equipment)
async def get_equipment(equipment_id: str):
    """Get Equipment by equipment_id"""
    with _lock:
        if equipment_id not in _equipments:
            raise HTTPException(404, "Equipment not found")
        return _equipments[equipment_id]

@router.post("/equipments", response_model=Equipment)
async def create_equipment(item: Equipment):
    """Create new Equipment"""
    with _lock:
        _equipments[item.equipment_id] = item
        return item

@router.put("/equipments/{equipment_id}", response_model=Equipment)
async def update_equipment(equipment_id: str, item: Equipment):
    """Update Equipment"""
    with _lock:
        if equipment_id not in _equipments:
            raise HTTPException(404, "Equipment not found")
        _equipments[equipment_id] = item
        return item

@router.delete("/equipments/{equipment_id}")
async def delete_equipment(equipment_id: str):
    """Delete Equipment"""
    with _lock:
        if equipment_id not in _equipments:
            raise HTTPException(404, "Equipment not found")
        del _equipments[equipment_id]
        return {"deleted": equipment_id}

# === Batch CRUD ===

@router.get("/batchs", response_model=List[Batch])
async def list_batchs():
    """List all Batchs"""
    with _lock:
        return list(_batchs.values())

@router.get("/batchs/{batch_id}", response_model=Batch)
async def get_batch(batch_id: str):
    """Get Batch by batch_id"""
    with _lock:
        if batch_id not in _batchs:
            raise HTTPException(404, "Batch not found")
        return _batchs[batch_id]

@router.post("/batchs", response_model=Batch)
async def create_batch(item: Batch):
    """Create new Batch"""
    with _lock:
        _batchs[item.batch_id] = item
        return item

@router.put("/batchs/{batch_id}", response_model=Batch)
async def update_batch(batch_id: str, item: Batch):
    """Update Batch"""
    with _lock:
        if batch_id not in _batchs:
            raise HTTPException(404, "Batch not found")
        _batchs[batch_id] = item
        return item

@router.delete("/batchs/{batch_id}")
async def delete_batch(batch_id: str):
    """Delete Batch"""
    with _lock:
        if batch_id not in _batchs:
            raise HTTPException(404, "Batch not found")
        del _batchs[batch_id]
        return {"deleted": batch_id}

# === QualityCheck CRUD ===

@router.get("/qualitychecks", response_model=List[QualityCheck])
async def list_qualitychecks():
    """List all QualityChecks"""
    with _lock:
        return list(_qualitychecks.values())

@router.get("/qualitychecks/{check_id}", response_model=QualityCheck)
async def get_qualitycheck(check_id: str):
    """Get QualityCheck by check_id"""
    with _lock:
        if check_id not in _qualitychecks:
            raise HTTPException(404, "QualityCheck not found")
        return _qualitychecks[check_id]

@router.post("/qualitychecks", response_model=QualityCheck)
async def create_qualitycheck(item: QualityCheck):
    """Create new QualityCheck"""
    with _lock:
        _qualitychecks[item.check_id] = item
        return item

@router.put("/qualitychecks/{check_id}", response_model=QualityCheck)
async def update_qualitycheck(check_id: str, item: QualityCheck):
    """Update QualityCheck"""
    with _lock:
        if check_id not in _qualitychecks:
            raise HTTPException(404, "QualityCheck not found")
        _qualitychecks[check_id] = item
        return item

@router.delete("/qualitychecks/{check_id}")
async def delete_qualitycheck(check_id: str):
    """Delete QualityCheck"""
    with _lock:
        if check_id not in _qualitychecks:
            raise HTTPException(404, "QualityCheck not found")
        del _qualitychecks[check_id]
        return {"deleted": check_id}

# === Events ===

@router.post("/events/equipment_status_changed")
async def emit_equipment_status_changed(event: EquipmentStatusChangedEvent):
    """Emit equipment_status_changed event"""
    with _lock:
        _events.append(event)
    return {"emitted": "equipment_status_changed"}

@router.post("/events/batch_completed")
async def emit_batch_completed(event: BatchCompletedEvent):
    """Emit batch_completed event"""
    with _lock:
        _events.append(event)
    return {"emitted": "batch_completed"}

@router.post("/events/quality_result")
async def emit_quality_result(event: QualityResultEvent):
    """Emit quality_result event"""
    with _lock:
        _events.append(event)
    return {"emitted": "quality_result"}
