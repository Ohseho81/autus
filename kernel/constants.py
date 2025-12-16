K1 = 0.1
K2 = 0.05
K3 = 0.08

ETA = 0.02

def clamp(x, lo=0.001, hi=1.0):
    return max(lo, min(hi, x))
# === Entropy / Stability protected indices ===
PROTECTED_IDX = {8, 9, 10, 11, 12, 13}

