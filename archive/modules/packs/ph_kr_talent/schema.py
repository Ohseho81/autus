from pydantic import BaseModel
from typing import Literal, Optional
from enum import Enum

class GMUType(str, Enum):
    STUDENT = "STUDENT"
    UNIVERSITY = "UNIVERSITY"
    EMPLOYER = "EMPLOYER"

class StudentEvent(BaseModel):
    student_id: str
    event_type: Literal["attendance", "grade", "visa", "work", "violation"]
    value: float
    description: Optional[str] = None

class EmployerEvent(BaseModel):
    employer_id: str
    event_type: Literal["condition_change", "legal_risk", "capacity", "payment"]
    value: float

class UniversityEvent(BaseModel):
    university_id: str
    event_type: Literal["capacity", "management_load", "compliance"]
    value: float
