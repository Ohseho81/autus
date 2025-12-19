def propagate_outer_entropy(state, k_pressure=0.5, k_consistency=0.4, k_growth=0.3):
    e = state.vector.v[11]

    # pressure ↑ (index 10)
    state.vector.v[10] = min(1.0, max(0.0,
        state.vector.v[10] + e * k_pressure
    ))

    # consistency ↓ (index 8)
    state.vector.v[8] = min(1.0, max(0.0,
        state.vector.v[8] - e * k_consistency
    ))

    # growth ↓ (index 9)
    state.vector.v[9] = min(1.0, max(0.0,
        state.vector.v[9] - e * k_growth
    ))

    return state
