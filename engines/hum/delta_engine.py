from typing import Dict

DELTA_TABLE = {
    "HUM.APPLY.SUBMITTED": {"DIR": 0.05, "FOR": 0.02, "GAP": -0.03, "UNC": -0.01, "TEM": 0.01, "INT": 0.01},
    "HUM.DOC.UPLOADED": {"DIR": 0.02, "FOR": 0.03, "GAP": -0.02, "UNC": -0.02, "TEM": 0.01, "INT": 0.02},
    "HUM.DOC.APPROVED": {"DIR": 0.05, "FOR": 0.05, "GAP": -0.08, "UNC": -0.06, "TEM": -0.02, "INT": 0.04},
    "HUM.DOC.REJECTED": {"DIR": -0.05, "FOR": -0.03, "GAP": 0.08, "UNC": 0.08, "TEM": 0.03, "INT": -0.04},
    "HUM.MEDICAL.PASSED": {"DIR": 0.03, "FOR": 0.04, "GAP": -0.05, "UNC": -0.05, "TEM": -0.02, "INT": 0.03},
    "HUM.SCHOOL.ASSIGNED": {"DIR": 0.06, "FOR": 0.05, "GAP": -0.08, "UNC": -0.06, "TEM": -0.03, "INT": 0.05},
    "HUM.TRAINING.COMPLETED": {"DIR": 0.08, "FOR": 0.08, "GAP": -0.10, "UNC": -0.08, "TEM": -0.04, "INT": 0.06},
    "HUM.VISA.APPROVED": {"DIR": 0.10, "FOR": 0.10, "GAP": -0.15, "UNC": -0.12, "TEM": -0.06, "INT": 0.10},
    "HUM.VISA.REJECTED": {"DIR": -0.10, "FOR": -0.08, "GAP": 0.12, "UNC": 0.15, "TEM": 0.08, "INT": -0.08},
    "HUM.EMPLOYMENT.MATCHED": {"DIR": 0.08, "FOR": 0.08, "GAP": -0.10, "UNC": -0.08, "TEM": -0.05, "INT": 0.08},
    "HUM.EMPLOYMENT.STARTED": {"DIR": 0.10, "FOR": 0.10, "GAP": -0.12, "UNC": -0.10, "TEM": -0.06, "INT": 0.12},
    "HUM.SETTLEMENT.COMPLETE": {"DIR": 0.06, "FOR": 0.05, "GAP": -0.08, "UNC": -0.08, "TEM": -0.05, "INT": 0.10},
}
DEFAULT_DELTA = {"DIR": 0.01, "FOR": 0.01, "GAP": -0.01, "UNC": -0.01, "TEM": 0.0, "INT": 0.01}

def get_delta(event_code: str) -> Dict[str, float]:
    return DELTA_TABLE.get(event_code, DEFAULT_DELTA)

def apply_delta(vector: Dict[str, float], delta: Dict[str, float]) -> Dict[str, float]:
    return {k: round(max(0.0, min(1.0, vector.get(k, 0.5) + delta.get(k, 0.0))), 3) for k in ["DIR", "FOR", "GAP", "UNC", "TEM", "INT"]}

def compute_risk(vector: Dict[str, float]) -> float:
    return round(0.3 * vector.get("GAP", 0.5) + 0.4 * vector.get("UNC", 0.5) + 0.3 * (1 - vector.get("INT", 0.5)), 3)

def compute_success(vector: Dict[str, float]) -> float:
    return round((vector.get("DIR", 0.5) + vector.get("FOR", 0.5) + (1 - vector.get("GAP", 0.5)) + (1 - vector.get("UNC", 0.5))) / 4, 3)

def list_events() -> list:
    return list(DELTA_TABLE.keys())
