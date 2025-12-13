PHASE_RULES = [
    ("CITY", ["SETTLEMENT", "HOUSING", "BANK", "ARRIVAL"]),
    ("GOV", ["VISA", "IMMIGRATION", "PERMIT"]),
    ("EMP", ["EMPLOYMENT", "JOB", "OFFER", "CONTRACT"]),
    ("EDU", ["SCHOOL", "ADMISSION", "TRAINING", "LANGUAGE"]),
    ("LIME", ["APPLY", "DOC", "SCREENING", "MEDICAL"]),
]

def infer_phase(event_code: str, current_phase: str = "LIME") -> str:
    event_upper = event_code.upper()
    for phase, keywords in PHASE_RULES:
        if any(kw in event_upper for kw in keywords):
            return phase
    return current_phase

def get_phase_order() -> list:
    return ["LIME", "EDU", "EMP", "GOV", "CITY"]

def get_phase_index(phase: str) -> int:
    order = get_phase_order()
    return order.index(phase) if phase in order else 0
