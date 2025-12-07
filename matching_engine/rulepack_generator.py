from typing import List, Dict, Any
from .models import EmploymentRule, RuleCondition, EmploymentRulePack

ENGLISH_LEVEL_MAP = {"none": 0, "basic": 400, "intermediate": 600, "advanced": 800}
FITNESS_LEVEL_MAP = {"low": ["low", "medium", "high"], "medium": ["medium", "high"], "high": ["high"]}

def generate_employment_rulepack(job: Dict[str, Any]) -> EmploymentRulePack:
    job_id = job.get("id", "JOB-UNKNOWN")
    rules: List[EmploymentRule] = []
    
    # English Rule
    english_level = job.get("english_level", "none")
    min_score = ENGLISH_LEVEL_MAP.get(english_level, 0)
    if min_score > 0:
        rules.append(EmploymentRule(
            id=f"{job_id}-ENG",
            group="employment",
            trigger="EVT::EMP_PREF",
            severity="warning" if min_score < 700 else "blocker",
            conditions=[RuleCondition("english_score", ">=", min_score)],
            delta={"A4": 0.05, "A9": -0.05},
            weight=0.20,
            description=f"English score >= {min_score}"
        ))
    
    # Experience Rule
    exp_years = job.get("experience_years", 0)
    if exp_years > 0:
        rules.append(EmploymentRule(
            id=f"{job_id}-EXP",
            group="employment",
            trigger="EVT::EMP_PREF",
            severity="info",
            conditions=[RuleCondition("sports_experience_years", ">=", exp_years)],
            delta={"A4": 0.05, "A7": 0.10},
            weight=0.15,
            description=f"At least {exp_years} years experience"
        ))
    
    # Major Rule
    majors = job.get("preferred_majors", [])
    if majors:
        rules.append(EmploymentRule(
            id=f"{job_id}-MAJOR",
            group="employment",
            trigger="EVT::EMP_PREF",
            severity="warning",
            conditions=[RuleCondition("major", "in", majors)],
            delta={"A4": 0.05, "A9": -0.02},
            weight=0.15,
            description=f"Major in {majors}"
        ))
    
    # Fitness Rule
    fitness = job.get("fitness_level", "low")
    if fitness != "low":
        allowed = FITNESS_LEVEL_MAP.get(fitness, ["medium", "high"])
        rules.append(EmploymentRule(
            id=f"{job_id}-FIT",
            group="employment",
            trigger="EVT::HEALTH_INPUT",
            severity="warning",
            conditions=[RuleCondition("fitness_level", "in", allowed)],
            delta={"A5": 0.10, "A9": -0.10},
            weight=0.15,
            description=f"Fitness level: {fitness}"
        ))
    
    # GPA Rule (if specified)
    min_gpa = job.get("min_gpa", 0)
    if min_gpa > 0:
        rules.append(EmploymentRule(
            id=f"{job_id}-GPA",
            group="employment",
            trigger="EVT::ACADEMIC_INPUT",
            severity="warning",
            conditions=[RuleCondition("gpa", ">=", min_gpa)],
            delta={"A4": 0.10},
            weight=0.10,
            description=f"GPA >= {min_gpa}"
        ))
    
    return EmploymentRulePack(
        job_posting_id=job_id,
        employer_id=job.get("employer_id", "UNKNOWN"),
        rules=rules
    )
