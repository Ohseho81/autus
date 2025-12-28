from .models import Action, StateVector, Theta

def _clip01(x: float) -> float:
    return max(0.0, min(1.0, x))

def update_state(S: StateVector, action: Action, theta: Theta) -> StateVector:
    if action == Action.HOLD:
        d = {"stability": 0.02, "pressure": -0.03, "drag": -0.01 * theta.k_drag, "momentum": -0.02, "volatility": -0.02 * theta.k_vol, "recovery": 0.03 * theta.k_recovery}
    elif action == Action.PUSH:
        d = {"stability": -0.02, "pressure": 0.04, "drag": 0.03 * theta.k_drag, "momentum": 0.05, "volatility": 0.04 * theta.k_vol, "recovery": -0.03 * theta.k_recovery}
    else:
        d = {"stability": 0.01, "pressure": -0.01, "drag": -0.02 * theta.k_drag, "momentum": -0.01, "volatility": -0.01 * theta.k_vol, "recovery": 0.02 * theta.k_recovery}
    
    for k in d:
        setattr(S, k, _clip01(getattr(S, k) + d[k]))
    return S

def compute_cu_delta(focus: float, commit: float, option_loss: float) -> float:
    return focus + commit + option_loss







