from typing import List, Tuple, Dict, Any

MAX_STEPS = 12

def validate_flow(flow: Dict[str, Any], all_rule_ids: List[str]) -> Tuple[bool, List[str]]:
    errors = []
    steps = flow.get("steps", [])
    
    # 1. Step count
    if len(steps) > MAX_STEPS:
        errors.append(f"TOO_MANY_STEPS: {len(steps)} > {MAX_STEPS}")
    
    # 2. All rules included
    flow_rule_ids = set()
    for step in steps:
        flow_rule_ids.update(step.get("rule_ids", []))
    
    missing = set(all_rule_ids) - flow_rule_ids
    if missing:
        errors.append(f"RULES_NOT_IN_FLOW: {', '.join(missing)}")
    
    # 3. Step linkage
    for i, step in enumerate(steps[:-1]):
        if step.get("next_step_id") != steps[i + 1]["id"]:
            errors.append(f"BROKEN_LINK: {step['id']} -> {step.get('next_step_id')}")
    
    # 4. Last step has no next
    if steps and steps[-1].get("next_step_id") is not None:
        errors.append(f"LAST_STEP_HAS_NEXT: {steps[-1]['id']}")
    
    return len(errors) == 0, errors
