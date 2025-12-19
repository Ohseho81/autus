from typing import Dict, Tuple

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
        self.students[gmu_id] = {"id": gmu_id, "university": university_id, "employer": employer_id, "blocked": False}
        return self.students[gmu_id]
    
    def create_university(self, university_id: str, capacity: int) -> dict:
        gmu_id = f"UNI_KR_{university_id}"
        self.universities[gmu_id] = {"id": gmu_id, "capacity": capacity}
        return self.universities[gmu_id]
    
    def create_employer(self, employer_id: str, bizno: str) -> dict:
        gmu_id = f"EMP_KR_{employer_id}"
        self.employers[gmu_id] = {"id": gmu_id, "bizno": bizno}
        return self.employers[gmu_id]
    
    def map_student_event(self, event) -> Tuple[Dict, float, float]:
        if event.event_type == "attendance":
            return ({"People": 0.8, "Work": 0.5}, max(0, 1 - event.value), event.value)
        if event.event_type == "grade":
            return ({"People": 0.6, "Work": 0.7}, max(0, 0.7 - event.value), event.value)
        if event.event_type == "violation":
            return ({"Policy": 0.8}, 0.95, 0.1)
        return ({}, 0.3, 0.5)
    
    def compute_slots(self, tasks: Dict[str, float]) -> Dict[str, float]:
        slots = {s: 0.0 for s in SLOTS}
        for task, val in tasks.items():
            if task in TALENT_MATRIX:
                for s in SLOTS:
                    slots[s] += val * TALENT_MATRIX[task][s]
        return {k: round(v, 4) for k, v in slots.items()}
