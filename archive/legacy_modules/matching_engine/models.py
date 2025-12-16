from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class RuleCondition:
    field: str
    operator: str
    value: Any

@dataclass
class EmploymentRule:
    id: str
    group: str
    trigger: str
    severity: str  # blocker, warning, info
    conditions: List[RuleCondition]
    delta: Dict[str, float] = field(default_factory=dict)
    weight: float = 0.0
    description: str = ""

@dataclass
class StudentProfile:
    id: str
    full_name: str
    english_score: float = 0
    sports_experience_years: float = 0
    major: str = ""
    fitness_level: str = "medium"
    gpa: float = 0
    bank_balance_usd: float = 0
    tb_status: str = "not_tested"

@dataclass
class EmploymentRulePack:
    job_posting_id: str
    employer_id: str
    rules: List[EmploymentRule]

@dataclass
class JobFitResult:
    job_posting_id: str
    employer_id: str
    student_id: str
    student_name: str
    fit_score: float
    fit_percent: int
    rule_results: Dict[str, bool]
    recommendation: str

@dataclass
class JobMatchView:
    job_posting_id: str
    employer_id: str
    position: str
    fits: List[JobFitResult]

@dataclass
class StudentMatchView:
    student_id: str
    student_name: str
    jobs: List[JobFitResult]
    best_match: Optional[str] = None

@dataclass
class MatchRequest:
    students: List[StudentProfile]
    jobs: List[EmploymentRulePack]
    top_k_per_job: int = 10

@dataclass
class MatchResponse:
    jobs: List[JobMatchView]
    students: List[StudentMatchView]
    summary: Dict[str, Any]
