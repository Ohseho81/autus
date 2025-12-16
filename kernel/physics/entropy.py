def entropy(state):
    structural = abs(state.vector.v[2] - state.vector.v[3])
    decision = abs(state.vector.v[0] - state.vector.v[1])
    temporal = state.vector.v[11]
    H = (structural + decision + temporal) / 3
    return max(0.0, min(1.0, H))

