from typing import Any, Dict

class ScenarioPack:
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        if input_data.get("action") == "compare":
            j = input_data.get("state", {}).get("j_score", 0.5)
            return {"status": "success", "scenarios": {
                "optimistic": {"j": round(min(1, j + 0.26), 2), "prob": round(min(1, (j + 0.26) * 1.3), 2)},
                "realistic": {"j": round(min(1, j + 0.2), 2), "prob": round(min(1, j + 0.2), 2)},
                "pessimistic": {"j": round(min(1, j + 0.14), 2), "prob": round(min(1, (j + 0.14) * 0.7), 2)},
            }}
        return {"status": "error"}
