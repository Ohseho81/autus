class State3DProtocol:
    def build_state(self, packs_state: dict):
        return {
            "core": {"status": "ok"},
            "protocols": {"count": 12},
            "packs": packs_state
        }
