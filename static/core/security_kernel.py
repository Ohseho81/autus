class SecurityKernel:
    def enforce(self, payload: dict):
        if any(k in payload for k in ["name", "email", "phone"]):
            raise ValueError("PII detected")
        return True
