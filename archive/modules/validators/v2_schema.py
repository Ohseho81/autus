from typing import List, Tuple, Dict, Any

REQUIRED_RULE_FIELDS = ["id", "severity", "conditions"]
REQUIRED_QUESTION_FIELDS = ["field", "input_type"]
VALID_SEVERITIES = ["blocker", "warning", "info"]
VALID_INPUT_TYPES = ["text", "number", "select", "file", "boolean", "date", "textarea"]

def validate_schema(data: Dict[str, Any], schema_type: str) -> Tuple[bool, List[str]]:
    errors = []
    
    if schema_type == "rules":
        rules = data.get("rules", [])
        for i, rule in enumerate(rules):
            for field in REQUIRED_RULE_FIELDS:
                if field not in rule:
                    errors.append(f"MISSING_FIELD: Rule[{i}] missing '{field}'")
            if rule.get("severity") not in VALID_SEVERITIES:
                errors.append(f"INVALID_SEVERITY: Rule[{i}] has '{rule.get('severity')}'")
    
    elif schema_type == "questions":
        questions = data.get("questions", [])
        for i, q in enumerate(questions):
            for field in REQUIRED_QUESTION_FIELDS:
                if field not in q:
                    errors.append(f"MISSING_FIELD: Question[{i}] missing '{field}'")
            if q.get("input_type") not in VALID_INPUT_TYPES:
                errors.append(f"INVALID_INPUT_TYPE: Question[{i}] has '{q.get('input_type')}'")
    
    return len(errors) == 0, errors
