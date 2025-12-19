def inject_delta(state, delta):
    if not delta:
        return state

    # focus (inner index 1)
    state.vector.v[1] = min(1.0, max(0.0,
        state.vector.v[1] + delta.get("focus_delta", 0.0)
    ))

    # system entropy (index 11)
    state.vector.v[11] = min(1.0, max(0.0,
        state.vector.v[11] + delta.get("entropy_delta", 0.0)
    ))

    # energy_delta는 physics.energy에서 처리
    return state
