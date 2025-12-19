class State:
    def __init__(self, vector):
        self.vector = vector

        # system meta state
        self.system_state = "STABLE"   # STABLE | COLLAPSE_IMMINENT | STABILIZED
        self.growth_frozen = 0

    def update(self, new_vector):
        """
        Physics-safe state update.
        Laws engine always returns a new vector.
        """
        self.vector = new_vector
        return self

