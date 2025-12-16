from kernel.constants import K1, K2, K3
from kernel.physics.energy import energy
from kernel.physics.gravity import gravity
from kernel.physics.entropy import entropy

def evolve(state):
    E = energy(state)
    G = gravity(E)
    H = entropy(state)

    delta = [
        K1 * E - K3 * H,   # inner
        K1 * E - K3 * H,
        K1 * E,
        K1 * E,
        K1 * E,
        K1 * E,

        K2 * G,            # outer
        K2 * G,
        K2 * G,
        K2 * G,
        K2 * G,

        -K3 * H,           # system
        -K3 * H,
        -K3 * H,
        0,
        0,
    ]

    return state.update(state.vector + delta)

