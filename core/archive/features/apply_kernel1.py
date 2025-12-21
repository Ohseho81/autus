"""
Kernel 1 - Feature → Core Slot 매핑
"""
from typing import List, Dict
import json
from pathlib import Path

FEATURE_MAP = json.loads(Path(__file__).parent.joinpath("feature_map.json").read_text())

def apply_kernel1(features: List[Dict]) -> Dict[str, float]:
    """Feature → 7슬롯 매핑"""
    slots = {"Brain": 0, "Sensors": 0, "Heart": 0, "Core": 0, "Engines": 0, "Base": 0, "Boundary": 0}
    counts = {k: 0 for k in slots}
    
    feature_map = {f["id"]: f["slot"] for f in FEATURE_MAP["features"]}
    
    for f in features:
        fid = f.get("id", 0)
        slot = feature_map.get(fid, "Core")
        value = f.get("value", 0) * f.get("conf", 1)
        slots[slot] += value
        counts[slot] += 1
    
    # 평균
    for k in slots:
        if counts[k] > 0:
            slots[k] /= counts[k]
    
    return slots
