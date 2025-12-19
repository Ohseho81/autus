from typing import List, Optional
import uuid
from .models import HumProfile, HumEvent
from .database import init_db, get_session, is_db_ready, HumProfileDB, HumEventDB

_profiles = {}
_events = {}
_initialized = False

def _ensure_init():
    global _initialized
    if not _initialized:
        init_db()
        _initialized = True

def get_hum_profile(hum_id: str) -> Optional[HumProfile]:
    _ensure_init()
    if is_db_ready():
        db = get_session()
        try:
            row = db.query(HumProfileDB).filter(HumProfileDB.hum_id == hum_id).first()
            if row:
                return HumProfile(hum_id=row.hum_id, name=row.name, route_code=row.route_code,
                    phase=row.phase, stage=row.stage, vector=row.vector or {}, risk=row.risk, success=row.success)
        finally:
            db.close()
    return _profiles.get(hum_id)

def save_hum_profile(profile: HumProfile) -> HumProfile:
    _ensure_init()
    _profiles[profile.hum_id] = profile
    if is_db_ready():
        db = get_session()
        try:
            row = db.query(HumProfileDB).filter(HumProfileDB.hum_id == profile.hum_id).first()
            if row:
                row.name, row.route_code, row.phase = profile.name, profile.route_code, profile.phase
                row.stage, row.vector, row.risk, row.success = profile.stage, profile.vector, profile.risk, profile.success
            else:
                db.add(HumProfileDB(hum_id=profile.hum_id, name=profile.name, route_code=profile.route_code,
                    phase=profile.phase, stage=profile.stage, vector=profile.vector, risk=profile.risk, success=profile.success))
            db.commit()
        finally:
            db.close()
    return profile

def create_hum_profile(hum_id: str, name: str, route_code: str = "PH-KR") -> HumProfile:
    return save_hum_profile(HumProfile(hum_id=hum_id, name=name, route_code=route_code))

def get_hum_events(hum_id: str) -> List[HumEvent]:
    _ensure_init()
    if is_db_ready():
        db = get_session()
        try:
            rows = db.query(HumEventDB).filter(HumEventDB.hum_id == hum_id).order_by(HumEventDB.timestamp).all()
            return [HumEvent(hum_id=r.hum_id, event_code=r.event_code, vector_before=r.vector_before or {},
                vector_after=r.vector_after or {}, risk=r.risk, success=r.success, phase=r.phase) for r in rows]
        finally:
            db.close()
    return _events.get(hum_id, [])

def append_hum_event(event: HumEvent) -> HumEvent:
    _ensure_init()
    if event.hum_id not in _events:
        _events[event.hum_id] = []
    _events[event.hum_id].append(event)
    if is_db_ready():
        db = get_session()
        try:
            db.add(HumEventDB(id=str(uuid.uuid4()), hum_id=event.hum_id, event_code=event.event_code,
                vector_before=event.vector_before, vector_after=event.vector_after,
                risk=event.risk, success=event.success, phase=event.phase))
            db.commit()
        finally:
            db.close()
    return event

def list_all_hums() -> List[HumProfile]:
    _ensure_init()
    if is_db_ready():
        db = get_session()
        try:
            rows = db.query(HumProfileDB).all()
            return [HumProfile(hum_id=r.hum_id, name=r.name, route_code=r.route_code,
                phase=r.phase, stage=r.stage, vector=r.vector or {}, risk=r.risk, success=r.success) for r in rows]
        finally:
            db.close()
    return list(_profiles.values())
