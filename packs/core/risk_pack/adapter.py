from typing import Any, Dict

class RiskPack:
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        if input_data.get("action") == "assess":
            v = input_data.get("vector", {})
            gap, unc, int_ = v.get("GAP", 0.5), v.get("UNC", 0.5), v.get("INT", 0.5)
            risk = 0.3 * gap + 0.4 * unc + 0.3 * (1 - int_)
            level = "critical" if risk > 0.8 else "high" if risk > 0.6 else "medium" if risk > 0.4 else "low"
            return {"status": "success", "risk_score": round(risk, 2), "level": level}
        return {"status": "error"}
