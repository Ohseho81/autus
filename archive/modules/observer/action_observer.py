MIN_DURATION = 10
MIN_INTENSITY = 0.2

def entropy_delta(intensity, duration):
    MID = 0.4
    SPREAD = 0.4

    peak = max(0.0, 1 - abs(intensity - MID) / SPREAD)
    sustain = min(1.0, duration / 300)

    return peak * (1 - sustain) * 0.1


def observe_action(event):
    intensity = event.get("intensity")
    if intensity is None:
        intensity = 0.5
    intensity = float(intensity)
    
    duration = event.get("duration")
    if duration is None:
        duration = 1
    duration = float(duration)

    if duration < MIN_DURATION or intensity < MIN_INTENSITY:
        return None

    focus_delta = intensity * min(1.0, duration / 300)
    energy_delta = intensity * 0.05
    entropy = entropy_delta(intensity, duration)

    return {
        "focus_delta": focus_delta,
        "energy_delta": energy_delta,
        "entropy_delta": entropy,
    }
