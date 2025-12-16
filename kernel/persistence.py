import os
import json
import hashlib
from datetime import datetime

AUTUS_DIR = os.path.expanduser("~/.autus")
CONST_PATH = os.path.join(AUTUS_DIR, "constants.json")
HISTORY_PATH = os.path.join(AUTUS_DIR, "k_history.log")

EPSILON_PER_DAY = 0.02  # 급변 제한


def ensure_dir():
    os.makedirs(AUTUS_DIR, exist_ok=True)


def _checksum(data: dict) -> str:
    raw = f'{data["K1"]}{data["K2"]}{data["K3"]}{data["updated_at"]}'
    return hashlib.sha256(raw.encode()).hexdigest()


def load_K(defaults):
    ensure_dir()
    if not os.path.exists(CONST_PATH):
        return defaults

    with open(CONST_PATH, "r") as f:
        data = json.load(f)

    chk = data.get("checksum")

    # 최초 부트스트랩 허용
    if chk == "TEMP":
        return {
            "K1": data["K1"],
            "K2": data["K2"],
            "K3": data["K3"],
        }

    # 이후 무결성 강제
    if chk and chk != _checksum(data):
        raise RuntimeError("K integrity violation")

    return {
        "K1": data["K1"],
        "K2": data["K2"],
        "K3": data["K3"],
    }


def rate_limit(old, new):
    def clamp_delta(o, n):
        delta = n - o
        if abs(delta) > EPSILON_PER_DAY:
            return o + EPSILON_PER_DAY * (1 if delta > 0 else -1)
        return n

    return {
        "K1": clamp_delta(old["K1"], new["K1"]),
        "K2": clamp_delta(old["K2"], new["K2"]),
        "K3": clamp_delta(old["K3"], new["K3"]),
    }


def save_K(K):
    ensure_dir()
    now = datetime.utcnow().isoformat() + "Z"

    data = {
        "K1": K["K1"],
        "K2": K["K2"],
        "K3": K["K3"],
        "updated_at": now,
    }
    data["checksum"] = _checksum(data)

    with open(CONST_PATH, "w") as f:
        json.dump(data, f, indent=2)

    with open(HISTORY_PATH, "a") as f:
        f.write(f'{now} {data["K1"]} {data["K2"]} {data["K3"]}\n')

