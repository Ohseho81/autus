def energy(state, input_energy=0.0, loss_rate=0.02):
    base = sum(state.vector.v[:6]) / 6
    loss = base * loss_rate
    E = base + input_energy - loss
    return max(0.0, min(1.0, E))

