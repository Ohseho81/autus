DECAY = 0.85

def apply_decay(prev, curr):
    if curr is None:
        return prev
    if prev is None:
        return curr

    return {
        k: prev[k] * DECAY + curr[k] * (1 - DECAY)
        for k in curr
    }
