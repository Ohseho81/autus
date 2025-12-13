from typing import Dict, Tuple
from .schema import StudentEvent, EmployerEvent, UniversityEvent, GMUType

# Pack 전용 Matrix (4업무→7슬롯)
TALENT_MATRIX = {
    "People": {"Brain": 0.4, "Sensors": 0.9, "Heart": 0.6, "Core": 0.2, "Engines": 0.3, "Base": 0.2, "Boundary": 0.4},
    "Money": {"Brain": 0.2, "Sensors": 0.2, "Heart": 0.3, "Core": 0.8, "Engines": 0.3, "Base": 0.9, "Boundary": 0.3},
    "Work": {"Brain": 0.2, "Sensors": 0.4, "Heart": 0.2, "Core": 0.3, "Engines": 0.9, "Base": 0.2, "Boundary": 0.2},
    "Policy": {"Brain": 0.3, "Sensors": 0.5, "Heart": 0.4, "Core": 0.2, "Engines": 0.2, "Base": 0.3, "Boundary": 0.9},
}

SLOTS = ["Brain", "Sensors", "Heart", "Core", "Engines", "Base", "Boundary"]

class TalentPackAdapter:
    def __init__(self):
        self.students = {}
        self.employers = {}
        self.universities = {}
    
    def create_student(self, student_id: str, university_id: str, employer_id: str) -> dict:
        gmu_id = f"STU_PH_{student_id}"
        self.students[gmu_id] = {
            "id": gmu_id,
            "type": GMUType.STUDENT,
            "university": f"UNI_KR_{university_id}",
            "employer": f"EMP_KR_{employer_id}",
            "slots": {},
            "grove_state": "normal",
            "blocked": False,
            "events": []
        }
        return self.students[gmu_id]
    
    def create_university(self, university_id: str, capacity: int) -> dict:
        gmu_id = f"UNI_KR_{university_id}"
        self.universities[gmu_id] = {
            "id": gmu_id,
            "type": GMUType.UNIVERSITY,
            "capacity": capacity,
            "current": 0,
            "slots": {},
            "blocked": False
        }
        return self.universities[gmu_id]
    
    def create_employer(self, employer_id: str, bizno: str) -> dict:
        gmu_id = f"EMP_KR_{employer_id}"
        self.employers[gmu_id] = {
            "id": gmu_id,
            "type": GMUType.EMPLOYER,
            "bizno": bizno,
            "slots": {},
            "blocked": False
        }
        return self.employers[gmu_id]
    
    def map_student_event(self, event: StudentEvent) -> Tuple[Dict[str, float], float, float]:
        """학생 이벤트 → Autus 입력"""
        if event.event_type == "attendance":
            # 출석률 낮으면 압력 증가
            pressure = max(0, 1 - event.value)  # value=1이면 압력 0
            return ({"People": 0.8, "Work": 0.5}, pressure, event.value)
        
        if event.event_type == "grade":
            pressure = max(0, 0.7 - event.value) if event.value < 0.7 else 0
            return ({"People": 0.6, "Work": 0.7}, pressure, event.value)
        
        if event.event_type == "visa":
            # 비자 이슈는 높은 압력
            pressure = 0.9 if event.value < 0.5 else 0.3
            return ({"Policy": 0.9, "People": 0.3}, pressure, 0.2)
        
        if event.event_type == "work":
            return ({"Work": 0.8, "Money": 0.5}, 0.3, event.value)
        
        if event.event_type == "violation":
            return ({"Policy": 0.8, "People": 0.2}, 0.95, 0.1)
        
        return ({}, 0.3, 0.5)
    
    def map_employer_event(self, event: EmployerEvent) -> Tuple[Dict[str, float], float, float]:
        """고용주 이벤트 → Autus 입력"""
        if event.event_type == "condition_change":
            return ({"Policy": 0.7, "Work": 0.5}, 0.6, 0.4)
        
        if event.event_type == "legal_risk":
            return ({"Policy": 0.9}, 0.85, 0.2)
        
        if event.event_type == "payment":
            pressure = 0.7 if event.value < 0.5 else 0.2
            return ({"Money": 0.8}, pressure, event.value)
        
        return ({}, 0.3, 0.5)
    
    def map_university_event(self, event: UniversityEvent) -> Tuple[Dict[str, float], float, float]:
        """대학 이벤트 → Autus 입력"""
        if event.event_type == "management_load":
            pressure = event.value  # 관리부담 = 압력
            return ({"People": 0.6, "Policy": 0.4}, pressure, 1 - pressure)
        
        if event.event_type == "capacity":
            return ({"People": 0.5}, 0.3, event.value)
        
        return ({}, 0.3, 0.5)
    
    def compute_slots(self, tasks: Dict[str, float]) -> Dict[str, float]:
        """Pack 전용 Matrix로 슬롯 계산"""
        slots = {slot: 0.0 for slot in SLOTS}
        for task, value in tasks.items():
            if task in TALENT_MATRIX:
                for slot in SLOTS:
                    slots[slot] += value * TALENT_MATRIX[task][slot]
        return {k: round(v, 4) for k, v in slots.items()}
