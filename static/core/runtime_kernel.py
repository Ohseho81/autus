class RuntimeKernel:
    def __init__(self):
        self.initialized = False
    def initialize(self):
        self.initialized = True
    def status(self) -> dict:
        return {"runtime": "ok", "initialized": self.initialized}
