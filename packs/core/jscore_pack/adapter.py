from typing import Any, Dict

class JScorePack:
    GRADES = [(95,"A+"),(90,"A"),(80,"B+"),(70,"B"),(60,"C"),(50,"D"),(0,"F")]
    
    def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        if input_data.get("action") == "calculate":
            v = input_data.get("vector", {})
            adj = {"DIR": v.get("DIR",0.5), "FOR": v.get("FOR",0.5), "GAP": 1-v.get("GAP",0.5),
                   "UNC": 1-v.get("UNC",0.5), "TEM": 1-v.get("TEM",0.5), "INT": v.get("INT",0.5)}
            total = round(sum(adj.values()) / 6 * 100)
            grade = next((g for t, g in self.GRADES if total >= t), "F")
            return {"status": "success", "result": {"j_score": total, "grade": grade, "components": adj}}
        return {"status": "error"}
