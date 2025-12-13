from .matrix import MATRIX, TASKS, SLOTS

def compute_slots(task_inputs: dict) -> dict:
    slots = {slot: 0.0 for slot in SLOTS}
    for task in TASKS:
        v = float(task_inputs.get(task, 0.0))
        for slot in SLOTS:
            slots[slot] += v * MATRIX[task][slot]
    return {k: round(v, 6) for k, v in slots.items()}
