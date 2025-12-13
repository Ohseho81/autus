class GuardrailReflex:
    def evaluate(self, pressure: float, sigma: float, dP_dt: float, base: float):
        R = (
            0.4 * pressure +
            0.2 * sigma +
            0.2 * dP_dt -
            0.2 * base
        )
        R = max(0, min(1, R))

        if R < 0.4:
            return "SAFE", R
        elif R < 0.6:
            return "DEGRADE_1", R
        elif R < 0.8:
            return "DEGRADE_2", R
        else:
            return "BLOCK", R
