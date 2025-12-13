from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import sys
sys.path.insert(0, '.')

from packs.ph_kr_talent.schema import StudentEvent
from packs.ph_kr_talent.adapter import TalentPackAdapter
from packs.ph_kr_talent.guardrails import TalentGuardrails
from packs.ph_kr_talent.boundary import BoundaryRules

router = APIRouter(prefix="/autus/talent", tags=["autus-talent"])

adapter = TalentPackAdapter()
guardrails = TalentGuardrails()
boundary = BoundaryRules()

class CreateStudentRequest(BaseModel):
    student_id: str
    university_id: str
    employer_id: str

class BoundaryCheckRequest(BaseModel):
    gmu_id: str
    event: str
    employer_gmu: Optional[str] = None

@router.post("/student/create")
def create_student(req: CreateStudentRequest):
    return adapter.create_student(req.student_id, req.university_id, req.employer_id)

@router.post("/student/event")
def student_event(event: StudentEvent):
    gr = guardrails.gr01_student(event.event_type, event.value)
    tasks, pressure, resource = adapter.map_student_event(event)
    slots = adapter.compute_slots(tasks)
    return {
        "gmu_id": f"STU_PH_{event.student_id}",
        "guardrail": {"action": gr.action.value, "reason": gr.reason},
        "slots": slots,
        "blocked": gr.action.value == "block"
    }

@router.post("/boundary/check")
def check_boundary(req: BoundaryCheckRequest):
    result = boundary.check(req.event, req.gmu_id, req.employer_gmu)
    return {"rule": result.rule_id, "action": result.action.value, "reason": result.reason, "ledger": result.ledger_entry}

@router.get("/boundary/events")
def list_events():
    return {
        "visa": ["VISA_EXPIRY_D14", "VISA_EXPIRY_D7", "VISA_RENEWAL_FAILED"],
        "labor": ["WORK_HOUR_EXCEEDED", "JOB_ROLE_CHANGED"],
        "academic": ["ATTENDANCE_BELOW_THRESHOLD", "CREDIT_SHORTFALL"]
    }
