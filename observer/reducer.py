from collections import Counter

def reduce(hints):
    hints = [h for h in hints if h]
    if not hints:
        return None

    keys = [tuple(sorted(h.keys())) for h in hints]
    freq = Counter(keys)
    total = sum(freq.values())

    def wavg(k):
        s = 0.0
        for h in hints:
            w = freq[tuple(sorted(h.keys()))] / total
            s += h[k] * w
        return s / len(hints)

    return {
        "focus_delta": wavg("focus_delta"),
        "energy_delta": wavg("energy_delta"),
        "entropy_delta": wavg("entropy_delta"),
    }
