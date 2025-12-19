# AUTUS COLLAPSE CONSTITUTION v1.0 (FROZEN)

COLLAPSE_RULE = {
    "entropy_min": 0.75,       # v[11]
    "pressure_min": 0.90,      # v[10]
    "growth_max": 0.30,        # v[9]
    "consistency_max": 0.35,   # v[8]
}

def check_collapse(state):
    v = state.vector.v
    return (
        v[11] >= COLLAPSE_RULE["entropy_min"] and
        v[10] >= COLLAPSE_RULE["pressure_min"] and
        v[9]  <= COLLAPSE_RULE["growth_max"] and
        v[8]  <= COLLAPSE_RULE["consistency_max"]
    )

