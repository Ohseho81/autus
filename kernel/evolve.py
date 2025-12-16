from kernel.collapse import check_collapse
from kernel.stabilization import execute_stabilization
from kernel.failure_memory import record_failure
from kernel.physics.energy import energy
from kernel.laws import evolve

def simulate(state, steps=1, adapt=False, delta=None):
    for _ in range(steps):
        state = evolve(state)

        # Energy → Sun
        if delta and "energy_delta" in delta:
            state.vector.v[0] = energy(
                state, input_energy=delta["energy_delta"]
            )

        # 🔴 COLLAPSE PATH
        if check_collapse(state):
            state.system_state = "COLLAPSE_IMMINENT"
            record_failure(state, reason="AUTO_COLLAPSE")
            state = execute_stabilization(state)
            return state

        if adapt:
            state = adapt_constants(state)

    return state

