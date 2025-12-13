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
    value: float  # 0~1
    description: Optional[str] = None

class EmployerEvent(BaseModel):
    employer_id: str
    event_type: Literal["condition_change", "legal_risk", "capacity", "payment"]
    value: float
    description: Optional[str] = None

class UniversityEvent(BaseModel):
    university_id: str
    event_type: Literal["capacity", "management_load", "compliance", "reputation"]
    value: float
    description: Optional[str] = None

class VectorInput(BaseModel):
    angle: float       # 방향 (학업/근무 균형)
    intensity: float   # 강도
    coherence: float   # 일관성

class PressureInput(BaseModel):
    intensity: float   # 압력 강도
    duration: float    # 지속 시간 (일)
    frequency: int     # 빈도

class ResourceInput(BaseModel):
    rate: float        # 자원 유입률
    quality: float     # 품질
    absorption: float  # 흡수율
