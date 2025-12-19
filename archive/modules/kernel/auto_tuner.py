"""
AUTUS Auto-Tuner v1.0
Failure Memory 기반 상수 자동 튜닝
"""

import json
import os
import sys
from typing import List, Dict
from dataclasses import dataclass
from datetime import datetime

FAILURE_LOG = os.path.expanduser("~/.autus/failure_history.jsonl")
TUNING_LOG = os.path.expanduser("~/.autus/tuning_history.jsonl")

@dataclass
class TuningResult:
    k1: float
    k2: float
    k3: float
    eta: float
    reason: str
    confidence: float


def load_failures() -> List[Dict]:
    if not os.path.exists(FAILURE_LOG):
        return []
    failures = []
    with open(FAILURE_LOG, "r") as f:
        for line in f:
            if line.strip():
                failures.append(json.loads(line))
    return failures


def analyze_pattern(failures: List[Dict]) -> Dict:
    if not failures:
        return {"pattern": "NO_DATA", "dominant": None}
    
    avg = {"energy": 0, "consistency": 0, "growth": 0, "pressure": 0, "entropy": 0}
    n = len(failures)
    
    for f in failures:
        snap = f.get("snapshot", {})
        for k in avg:
            avg[k] += snap.get(k, 0.5) / n
    
    dominant = None
    if avg["entropy"] > 0.7:
        dominant = "HIGH_ENTROPY"
    elif avg["pressure"] > 0.85:
        dominant = "HIGH_PRESSURE"
    elif avg["growth"] < 0.35:
        dominant = "LOW_GROWTH"
    elif avg["consistency"] < 0.4:
        dominant = "LOW_CONSISTENCY"
    elif avg["energy"] < 0.3:
        dominant = "ENERGY_DRAIN"
    else:
        dominant = "BALANCED_COLLAPSE"
    
    return {"pattern": dominant, "avg_snapshot": avg, "sample_count": n}


def load_current_constants() -> Dict:
    constants_path = os.path.join(os.path.dirname(__file__), "constants.py")
    result = {"k1": 0.1, "k2": 0.05, "k3": 0.08, "eta": 0.02}
    
    if os.path.exists(constants_path):
        with open(constants_path, "r") as f:
            content = f.read()
            for line in content.split("\n"):
                if line.startswith("K1"):
                    result["k1"] = float(line.split("=")[1].strip())
                elif line.startswith("K2"):
                    result["k2"] = float(line.split("=")[1].strip())
                elif line.startswith("K3"):
                    result["k3"] = float(line.split("=")[1].strip())
                elif line.startswith("ETA"):
                    result["eta"] = float(line.split("=")[1].strip())
    return result


def compute_tuning(analysis: Dict, current: Dict) -> TuningResult:
    pattern = analysis.get("pattern", "NO_DATA")
    k1, k2, k3, eta = current["k1"], current["k2"], current["k3"], current["eta"]
    confidence = 0.5
    reason = "NO_ADJUSTMENT"
    
    if pattern == "NO_DATA":
        reason = "NO_FAILURE_DATA"
        confidence = 0.0
    elif pattern == "HIGH_ENTROPY":
        k3 = min(0.20, k3 * 1.25)
        k1 = max(0.05, k1 * 0.90)
        reason = "ENTROPY_DAMPING_INCREASED"
        confidence = 0.8
    elif pattern == "HIGH_PRESSURE":
        k2 = min(0.15, k2 * 1.30)
        eta = min(0.05, eta * 1.10)
        reason = "STABILIZATION_BOOSTED"
        confidence = 0.75
    elif pattern == "LOW_GROWTH":
        k1 = min(0.20, k1 * 1.20)
        k2 = max(0.02, k2 * 0.95)
        reason = "GROWTH_STIMULATED"
        confidence = 0.7
    elif pattern == "LOW_CONSISTENCY":
        eta = max(0.01, eta * 0.80)
        k3 = min(0.15, k3 * 1.10)
        reason = "CONSISTENCY_PROTECTED"
        confidence = 0.7
    elif pattern == "ENERGY_DRAIN":
        k1 = max(0.05, k1 * 0.85)
        k2 = min(0.10, k2 * 1.15)
        reason = "ENERGY_CONSERVATION"
        confidence = 0.65
    elif pattern == "BALANCED_COLLAPSE":
        k2 = min(0.10, k2 * 1.10)
        k3 = min(0.12, k3 * 1.10)
        reason = "BALANCED_ADJUSTMENT"
        confidence = 0.6
    
    return TuningResult(k1=round(k1,4), k2=round(k2,4), k3=round(k3,4), eta=round(eta,4), reason=reason, confidence=confidence)


def apply_tuning(result: TuningResult) -> bool:
    constants_path = os.path.join(os.path.dirname(__file__), "constants.py")
    new_content = f'''K1 = {result.k1}
K2 = {result.k2}
K3 = {result.k3}

ETA = {result.eta}

def clamp(x, lo=0.001, hi=1.0):
    return max(lo, min(hi, x))

PROTECTED_IDX = {{8, 9, 10, 11, 12, 13}}

# Auto-tuned: {result.reason} (confidence: {result.confidence})
'''
    with open(constants_path, "w") as f:
        f.write(new_content)
    record_tuning(result)
    return True


def record_tuning(result: TuningResult):
    os.makedirs(os.path.dirname(TUNING_LOG), exist_ok=True)
    event = {
        "ts": datetime.utcnow().isoformat() + "Z",
        "k1": result.k1, "k2": result.k2, "k3": result.k3, "eta": result.eta,
        "reason": result.reason, "confidence": result.confidence
    }
    with open(TUNING_LOG, "a") as f:
        f.write(json.dumps(event) + "\n")


def auto_tune(apply: bool = False) -> TuningResult:
    current = load_current_constants()
    failures = load_failures()
    analysis = analyze_pattern(failures)
    result = compute_tuning(analysis, current)
    if apply and result.confidence > 0.5:
        apply_tuning(result)
    return result


if __name__ == "__main__":
    apply_flag = "--apply" in sys.argv
    print("=== AUTUS Auto-Tuner v1.0 ===\n")
    
    current = load_current_constants()
    print(f"Current: K1={current['k1']}, K2={current['k2']}, K3={current['k3']}, ETA={current['eta']}")
    
    failures = load_failures()
    print(f"Failure records: {len(failures)}")
    
    analysis = analyze_pattern(failures)
    print(f"Pattern: {analysis.get('pattern')}")
    print(f"Avg snapshot: {analysis.get('avg_snapshot')}\n")
    
    result = auto_tune(apply=apply_flag)
    print("=== Tuning Result ===")
    print(f"K1: {result.k1}, K2: {result.k2}, K3: {result.k3}, ETA: {result.eta}")
    print(f"Reason: {result.reason}, Confidence: {result.confidence}\n")
    
    if apply_flag:
        print("Applied to kernel/constants.py")
    else:
        print("(dry-run, use --apply to save)")
