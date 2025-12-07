from typing import List, Tuple, Dict, Any, Set

SYSTEM_FIELDS = {"internal_score", "created_at", "updated_at"}

def validate_semantic(rules: List[Dict], questions: List[Dict]) -> Tuple[bool, List[str], List[str]]:
    errors = []
    warnings = []
    
    question_fields: Set[str] = {q["field"] for q in questions}
    rule_ids: List[str] = [r["id"] for r in rules]
    
    # 1. Field consistency
    for rule in rules:
        for cond in rule.get("conditions", []):
            field = cond.get("field")
            if field and field not in question_fields and field not in SYSTEM_FIELDS:
                errors.append(f"FIELD_MISSING: Rule '{rule['id']}' uses undefined field '{field}'")
    
    # 2. Duplicate rule IDs
    seen = set()
    for rid in rule_ids:
        if rid in seen:
            errors.append(f"DUPLICATE_RULE_ID: '{rid}'")
        seen.add(rid)
    
    # 3. Unused questions
    used_fields = set()
    for rule in rules:
        for cond in rule.get("conditions", []):
            if cond.get("field"):
                used_fields.add(cond["field"])
    
    unused = question_fields - used_fields
    for f in unused:
        warnings.append(f"UNUSED_QUESTION: '{f}' defined but not used")
    
    return len(errors) == 0, errors, warnings
