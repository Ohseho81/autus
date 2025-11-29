"""
Auto-generated FastAPI routes for emo_hub
Generated: 2025-11-29T12:12:41.985779
"""


from fastapi import APIRouter, HTTPException
from typing import List, Optional
from .models import *
from .events import *
from threading import Lock

# In-memory stores and locks for thread safety
_buildings = {}
_assets = {}
_tickets = {}
_technicians = {}
_schedules = {}
_events = []
_lock = Lock()

router = APIRouter(prefix="/emo_hub", tags=["emo_hub"])

# === Building CRUD ===

@router.get("/buildings", response_model=List[Building])
async def list_buildings():
    """List all Buildings"""
    with _lock:
        return list(_buildings.values())

@router.get("/buildings/{building_id}", response_model=Building)
async def get_building(building_id: str):
    """Get Building by building_id"""
    with _lock:
        if building_id not in _buildings:
            raise HTTPException(404, "Building not found")
        return _buildings[building_id]

@router.post("/buildings", response_model=Building)
async def create_building(item: Building):
    """Create new Building"""
    with _lock:
        _buildings[item.building_id] = item
        return item

@router.put("/buildings/{building_id}", response_model=Building)
async def update_building(building_id: str, item: Building):
    """Update Building"""
    with _lock:
        if building_id not in _buildings:
            raise HTTPException(404, "Building not found")
        _buildings[building_id] = item
        return item

@router.delete("/buildings/{building_id}")
async def delete_building(building_id: str):
    """Delete Building"""
    with _lock:
        if building_id not in _buildings:
            raise HTTPException(404, "Building not found")
        del _buildings[building_id]
        return {"deleted": building_id}

# === Asset CRUD ===

@router.get("/assets", response_model=List[Asset])
async def list_assets():
    """List all Assets"""
    with _lock:
        return list(_assets.values())

@router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str):
    """Get Asset by asset_id"""
    with _lock:
        if asset_id not in _assets:
            raise HTTPException(404, "Asset not found")
        return _assets[asset_id]

@router.post("/assets", response_model=Asset)
async def create_asset(item: Asset):
    """Create new Asset"""
    with _lock:
        _assets[item.asset_id] = item
        return item

@router.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(asset_id: str, item: Asset):
    """Update Asset"""
    with _lock:
        if asset_id not in _assets:
            raise HTTPException(404, "Asset not found")
        _assets[asset_id] = item
        return item

@router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str):
    """Delete Asset"""
    with _lock:
        if asset_id not in _assets:
            raise HTTPException(404, "Asset not found")
        del _assets[asset_id]
        return {"deleted": asset_id}

# === Ticket CRUD ===

@router.get("/tickets", response_model=List[Ticket])
async def list_tickets():
    """List all Tickets"""
    with _lock:
        return list(_tickets.values())

@router.get("/tickets/{ticket_id}", response_model=Ticket)
async def get_ticket(ticket_id: str):
    """Get Ticket by ticket_id"""
    with _lock:
        if ticket_id not in _tickets:
            raise HTTPException(404, "Ticket not found")
        return _tickets[ticket_id]

@router.post("/tickets", response_model=Ticket)
async def create_ticket(item: Ticket):
    """Create new Ticket"""
    with _lock:
        _tickets[item.ticket_id] = item
        return item

@router.put("/tickets/{ticket_id}", response_model=Ticket)
async def update_ticket(ticket_id: str, item: Ticket):
    """Update Ticket"""
    with _lock:
        if ticket_id not in _tickets:
            raise HTTPException(404, "Ticket not found")
        _tickets[ticket_id] = item
        return item

@router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str):
    """Delete Ticket"""
    with _lock:
        if ticket_id not in _tickets:
            raise HTTPException(404, "Ticket not found")
        del _tickets[ticket_id]
        return {"deleted": ticket_id}

# === Technician CRUD ===

@router.get("/technicians", response_model=List[Technician])
async def list_technicians():
    """List all Technicians"""
    with _lock:
        return list(_technicians.values())

@router.get("/technicians/{technician_id}", response_model=Technician)
async def get_technician(technician_id: str):
    """Get Technician by technician_id"""
    with _lock:
        if technician_id not in _technicians:
            raise HTTPException(404, "Technician not found")
        return _technicians[technician_id]

@router.post("/technicians", response_model=Technician)
async def create_technician(item: Technician):
    """Create new Technician"""
    with _lock:
        _technicians[item.technician_id] = item
        return item

@router.put("/technicians/{technician_id}", response_model=Technician)
async def update_technician(technician_id: str, item: Technician):
    """Update Technician"""
    with _lock:
        if technician_id not in _technicians:
            raise HTTPException(404, "Technician not found")
        _technicians[technician_id] = item
        return item

@router.delete("/technicians/{technician_id}")
async def delete_technician(technician_id: str):
    """Delete Technician"""
    with _lock:
        if technician_id not in _technicians:
            raise HTTPException(404, "Technician not found")
        del _technicians[technician_id]
        return {"deleted": technician_id}

# === Schedule CRUD ===

@router.get("/schedules", response_model=List[Schedule])
async def list_schedules():
    """List all Schedules"""
    with _lock:
        return list(_schedules.values())

@router.get("/schedules/{schedule_id}", response_model=Schedule)
async def get_schedule(schedule_id: str):
    """Get Schedule by schedule_id"""
    with _lock:
        if schedule_id not in _schedules:
            raise HTTPException(404, "Schedule not found")
        return _schedules[schedule_id]

@router.post("/schedules", response_model=Schedule)
async def create_schedule(item: Schedule):
    """Create new Schedule"""
    with _lock:
        _schedules[item.schedule_id] = item
        return item

@router.put("/schedules/{schedule_id}", response_model=Schedule)
async def update_schedule(schedule_id: str, item: Schedule):
    """Update Schedule"""
    with _lock:
        if schedule_id not in _schedules:
            raise HTTPException(404, "Schedule not found")
        _schedules[schedule_id] = item
        return item

@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str):
    """Delete Schedule"""
    with _lock:
        if schedule_id not in _schedules:
            raise HTTPException(404, "Schedule not found")
        del _schedules[schedule_id]
        return {"deleted": schedule_id}

# === Events ===

@router.post("/events/asset_status_changed")
async def emit_asset_status_changed(event: AssetStatusChangedEvent):
    """Emit asset_status_changed event"""
    with _lock:
        _events.append(event)
    return {"emitted": "asset_status_changed"}

@router.post("/events/ticket_created")
async def emit_ticket_created(event: TicketCreatedEvent):
    """Emit ticket_created event"""
    with _lock:
        _events.append(event)
    return {"emitted": "ticket_created"}

@router.post("/events/ticket_assigned")
async def emit_ticket_assigned(event: TicketAssignedEvent):
    """Emit ticket_assigned event"""
    with _lock:
        _events.append(event)
    return {"emitted": "ticket_assigned"}

@router.post("/events/ticket_completed")
async def emit_ticket_completed(event: TicketCompletedEvent):
    """Emit ticket_completed event"""
    with _lock:
        _events.append(event)
    return {"emitted": "ticket_completed"}

@router.post("/events/schedule_triggered")
async def emit_schedule_triggered(event: ScheduleTriggeredEvent):
    """Emit schedule_triggered event"""
    with _lock:
        _events.append(event)
    return {"emitted": "schedule_triggered"}
