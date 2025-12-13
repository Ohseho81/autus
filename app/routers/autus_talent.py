from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import sys
sys.path.insert(0, '.')

from packs.ph_kr_talent.schema import StudentEvent, EmployerEvent, UniversityEvent
from packs.ph_kr_talent.adapter import TalentPackAdapter
from packs.ph_kr_talent.guardrails import TalentGuardrails
from packs.ph_kr_talent.scenarios import SCENARIOS

router = APIRouter(prefix="/autus/talent", tags=["autus-talent"])

adapter = TalentPackAdapter()
guardrails = TalentGuardrails()

class CreateStudentRequest(BaseModel):
    student_id: str
    university_id: str
    employer_id: str

class CreateUniversityRequest(BaseModel):
    university_id: str
    capacity: int = 50

class CreateEmployerRequest(BaseModel):
    employer_id: str
    bizno: str

@router.post("/student/create")
def create_student(req: CreateStudentRequest):
    return adapter.create_student(req.student_id, req.university_id, req.employer_id)

@router.post("/university/create")
def create_university(req: CreateUniversityRequest):
    return adapter.create_university(req.university_id, req.capacity)

@router.post("/employer/create")
def create_employer(req: CreateEmployerRequest):
    return adapter.create_employer(req.employer_id, req.bizno)

@router.post("/student/event")
def student_event(event: StudentEvent):
    gmu_id = f"STU_PH_{event.student_id}"
    
    # Guardrail 체크
    gr_result = guardrails.gr01_student({}, event.event_type, event.value)
    
    # 슬롯 계산
    tasks, pressure, resource = adapter.map_student_event(event)
    slots = adapter.compute_slots(tasks)
    
    return {
        "gmu_id": gmu_id,
        "event": event.dict(),
        "guardrail": {
            "id": gr_result.guardrail_id,
            "action": gr_result.action.value,
            "reason": gr_result.reason
        },
        "slots": slots,
        "pressure": pressure,
        "blocked": gr_result.action.value == "block"
    }

@router.post("/employer/event")
def employer_event(event: EmployerEvent):
    gmu_id = f"EMP_KR_{event.employer_id}"
    gr_result = guardrails.gr02_employer({}, event.event_type, event.value)
    tasks, pressure, resource = adapter.map_employer_event(event)
    slots = adapter.compute_slots(tasks)
    
    return {
        "gmu_id": gmu_id,
        "guardrail": {"action": gr_result.action.value, "reason": gr_result.reason},
        "slots": slots,
        "blocked": gr_result.action.value == "block"
    }

@router.post("/university/event")
def university_event(event: UniversityEvent):
    gmu_id = f"UNI_KR_{event.university_id}"
    gr_result = guardrails.gr03_university({}, event.value)
    tasks, pressure, resource = adapter.map_university_event(event)
    slots = adapter.compute_slots(tasks)
    
    return {
        "gmu_id": gmu_id,
        "guardrail": {"action": gr_result.action.value, "reason": gr_result.reason},
        "slots": slots
    }

@router.get("/scenarios")
def list_scenarios():
    return {"scenarios": list(SCENARIOS.keys())}

@router.post("/scenario/{name}")
def run_scenario(name: str):
    if name not in SCENARIOS:
        return {"error": f"Unknown scenario: {name}"}
    
    events = SCENARIOS[name]
    results = []
    
    for event in events:
        if hasattr(event, 'student_id'):
            result = student_event(event)
        elif hasattr(event, 'employer_id'):
            result = employer_event(event)
        else:
            result = university_event(event)
        results.append(result)
    
    blocked_count = sum(1 for r in results if r.get("blocked"))
    
    return {
        "scenario": name,
        "events": len(results),
        "blocked": blocked_count,
        "results": results
    }

# Boundary Rules
from packs.ph_kr_talent.boundary import BoundaryRules, BoundaryEvent

boundary_rules = BoundaryRules()

class BoundaryEventRequest(BaseModel):
    gmu_id: str
    event: str
    employer_gmu: Optional[str] = None

@router.post("/boundary/check")
def check_boundary(req: BoundaryEventRequest):
    result = boundary_rules.check(req.event, req.gmu_id, req.employer_gmu)
    return {
        "rule_id": result.rule_id,
        "action": result.action.value,
        "reason": result.reason,
        "affects_gmu": result.affects_gmu,
        "ledger_entry": result.ledger_entry
    }

@router.get("/boundary/events")
def list_boundary_events():
    return {
        "visa": ["VISA_STATUS_CHANGE", "VISA_EXPIRY_D30", "VISA_EXPIRY_D14", "VISA_EXPIRY_D7", "VISA_RENEWAL_FAILED"],
        "labor": ["WORK_HOUR_EXCEEDED", "JOB_ROLE_CHANGED", "PAYMENT_DELAYED", "CONTRACT_MISMATCH"],
        "academic": ["ENROLLMENT_SUSPENDED", "CREDIT_SHORTFALL", "ATTENDANCE_BELOW_THRESHOLD"]
    }
