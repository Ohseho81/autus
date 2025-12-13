"""
Slot Computation - 4업무 → 7슬롯
"""
TASKS = ["People", "Money", "Work", "Policy"]
SLOTS = ["Brain", "Sensors", "Heart", "Core", "Engines", "Base", "Boundary"]

MATRIX = {
    "People": {"Brain": 0.7, "Sensors": 0.8, "Heart": 0.3, "Core": 0.1, "Engines": 0.1, "Base": 0.0, "Boundary": 0.2},
    "Money": {"Brain": 0.2, "Sensors": 0.1, "Heart": 0.4, "Core": 0.8, "Engines": 0.3, "Base": 0.9, "Boundary": 0.3},
    "Work": {"Brain": 0.3, "Sensors": 0.2, "Heart": 0.2, "Core": 0.3, "Engines": 0.9, "Base": 0.2, "Boundary": 0.1},
    "Policy": {"Brain": 0.5, "Sensors": 0.3, "Heart": 0.6, "Core": 0.2, "Engines": 0.1, "Base": 0.3, "Boundary": 0.8},
}

def compute_slots(task_inputs: dict) -> dict:
    """4업무 → 7슬롯 선형 결합"""
    slots = {slot: 0.0 for slot in SLOTS}
    for task in TASKS:
        v = float(task_inputs.get(task, 0.0))
        for slot in SLOTS:
            slots[slot] += v * MATRIX[task][slot]
    return {k: round(v, 6) for k, v in slots.items()}
