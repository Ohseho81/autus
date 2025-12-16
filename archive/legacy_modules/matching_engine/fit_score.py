from typing import Any, Dict
from .models import StudentProfile, EmploymentRulePack, EmploymentRule, RuleCondition, JobFitResult

def get_field_value(student: StudentProfile, field_name: str) -> Any:
    return getattr(student, field_name, None)

def evaluate_condition(student: StudentProfile, cond: RuleCondition) -> bool:
    value = get_field_value(student, cond.field)
    if value is None:
        return False
    
    op = cond.operator
    target = cond.value
    
    try:
        if op == ">=": return float(value) >= float(target)
        if op == "<=": return float(value) <= float(target)
        if op == ">": return float(value) > float(target)
        if op == "<": return float(value) < float(target)
        if op == "==": return str(value).lower() == str(target).lower()
        if op == "!=": return str(value).lower() != str(target).lower()
        if op == "in": 
            if isinstance(target, list):
                return any(str(value).lower() == str(t).lower() for t in target)
            return str(value).lower() in str(target).lower()
        if op == "not_in":
            if isinstance(target, list):
                return all(str(value).lower() != str(t).lower() for t in target)
            return str(value).lower() not in str(target).lower()
        if op == "contains":
            return str(target).lower() in str(value).lower()
    except (ValueError, TypeError):
        return False
    
    return False

def evaluate_rule(student: StudentProfile, rule: EmploymentRule) -> bool:
    return all(evaluate_condition(student, c) for c in rule.conditions)

def compute_fit_score_for_job(student: StudentProfile, pack: EmploymentRulePack) -> JobFitResult:
    rule_results: Dict[str, bool] = {}
    score = 0.0
    max_score = sum(r.weight for r in pack.rules)
    
    for rule in pack.rules:
        passed = evaluate_rule(student, rule)
        rule_results[rule.id] = passed
        if passed:
            score += rule.weight
    
    fit_percent = int((score / max_score * 100) if max_score > 0 else 0)
    
    if fit_percent >= 80:
        recommendation = "Strongly Recommended"
    elif fit_percent >= 60:
        recommendation = "Recommended"
    elif fit_percent >= 40:
        recommendation = "Consider with Training"
    else:
        recommendation = "Not Recommended"
    
    return JobFitResult(
        job_posting_id=pack.job_posting_id,
        employer_id=pack.employer_id,
        student_id=student.id,
        student_name=student.full_name,
        fit_score=round(score, 3),
        fit_percent=fit_percent,
        rule_results=rule_results,
        recommendation=recommendation
    )
