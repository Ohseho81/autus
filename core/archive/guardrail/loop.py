from .reflex import GuardrailReflex
from .pressure_adapter import QueuePressureAdapter

reflex = GuardrailReflex()
adapter = QueuePressureAdapter()

def guardrail_tick(base: float = 0.5):
    metrics = adapter.compute()
    state, R = reflex.evaluate(
        pressure=metrics["pressure"],
        sigma=metrics["sigma"],
        dP_dt=metrics["dP_dt"],
        base=base
    )
    return {
        "state": state,
        "risk": round(R, 4),
        "metrics": metrics
    }

def observe_queue(length: int):
    adapter.observe(length)
