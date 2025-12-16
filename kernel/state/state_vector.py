class StateVector:
    DIM = 16

    def __init__(self, values):
        assert len(values) == self.DIM
        self.v = [self._clamp(x) for x in values]

    def _clamp(self, x):
        return max(0.0, min(1.0, x))

    def __add__(self, delta):
        return StateVector([
            self._clamp(a + b)
            for a, b in zip(self.v, delta)
        ])

