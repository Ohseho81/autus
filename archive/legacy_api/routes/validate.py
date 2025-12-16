from fastapi import APIRouter
from typing import Dict, Any

router = APIRouter(prefix="/validate", tags=["Validators"])

from validators.v1_syntax import validate_syntax
from validators.v2_schema import validate_schema
from validators.v3_semantic import validate_semantic
from validators.v4_flow import validate_flow

@router.post("/app/{app_id}")
async def validate_app(app_id: str, data: Dict[str, Any] = None):
    report = {
        "app_id": app_id,
        "v1_syntax": {"status": "OK", "errors": []},
        "v2_schema": {"status": "OK", "errors": []},
        "v3_semantic": {"status": "OK", "errors": [], "warnings": []},
        "v4_flow": {"status": "OK", "errors": []},
        "summary": {"total_errors": 0, "total_warnings": 0, "status": "PASS"}
    }
    
    if data:
        rules = data.get("rules", [])
        questions = data.get("questions", [])
        flow = data.get("flow", {})
        
        if rules:
            ok, errors = validate_schema({"rules": rules}, "rules")
            if not ok:
                report["v2_schema"]["status"] = "FAIL"
                report["v2_schema"]["errors"] = errors
        
        if questions:
            ok, errors = validate_schema({"questions": questions}, "questions")
            if not ok:
                report["v2_schema"]["errors"].extend(errors)
        
        if rules and questions:
            ok, errors, warnings = validate_semantic(rules, questions)
            report["v3_semantic"]["errors"] = errors
            report["v3_semantic"]["warnings"] = warnings
            if not ok:
                report["v3_semantic"]["status"] = "FAIL"
        
        if flow and rules:
            rule_ids = [r["id"] for r in rules]
            ok, errors = validate_flow(flow, rule_ids)
            if not ok:
                report["v4_flow"]["status"] = "FAIL"
                report["v4_flow"]["errors"] = errors
    
    total_errors = sum(len(report[k]["errors"]) for k in ["v1_syntax", "v2_schema", "v3_semantic", "v4_flow"])
    report["summary"]["total_errors"] = total_errors
    report["summary"]["total_warnings"] = len(report["v3_semantic"]["warnings"])
    report["summary"]["status"] = "FAIL" if total_errors > 0 else "PASS"
    
    return report

@router.get("/health")
async def validator_health():
    return {"status": "ok", "validators": ["v1", "v2", "v3", "v4"]}
