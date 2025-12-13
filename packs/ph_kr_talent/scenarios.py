"""
PH→KR Talent Pack 시나리오
"""
from .schema import StudentEvent, EmployerEvent, UniversityEvent

# 정상 운영 시나리오
NORMAL_SCENARIO = [
    StudentEvent(student_id="001", event_type="attendance", value=0.95),
    StudentEvent(student_id="001", event_type="grade", value=0.85),
    StudentEvent(student_id="001", event_type="work", value=0.9),
]

# 위기 시나리오 (학업 부진)
ACADEMIC_CRISIS = [
    StudentEvent(student_id="002", event_type="attendance", value=0.7),
    StudentEvent(student_id="002", event_type="grade", value=0.5),  # GR-01 트리거
]

# 고용주 문제 시나리오
EMPLOYER_ISSUE = [
    EmployerEvent(employer_id="E001", event_type="condition_change", value=0.8),  # GR-02 트리거
]

# 대학 과부하 시나리오
UNIVERSITY_OVERLOAD = [
    UniversityEvent(university_id="U001", event_type="management_load", value=0.85),  # GR-03 트리거
]

SCENARIOS = {
    "normal": NORMAL_SCENARIO,
    "academic_crisis": ACADEMIC_CRISIS,
    "employer_issue": EMPLOYER_ISSUE,
    "university_overload": UNIVERSITY_OVERLOAD,
}
