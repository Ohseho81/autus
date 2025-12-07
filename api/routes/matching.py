from fastapi import APIRouter
from typing import Dict, List, Any
from pydantic import BaseModel
from matching_engine.models import StudentProfile, EmploymentRule, RuleCondition, EmploymentRulePack, MatchRequest
from matching_engine.engine import match_students_to_jobs
from matching_engine.rulepack_generator import generate_employment_rulepack

router = APIRouter(prefix="/match", tags=["Matching Engine"])

# Sample Data
SAMPLE_STUDENTS = [
    StudentProfile("STU-001", "Maria Santos", 780, 3, "Physical Education", "high", 3.5, 25000, "negative"),
    StudentProfile("STU-002", "Juan Dela Cruz", 650, 2, "Sports Science", "medium", 3.2, 18000, "negative"),
    StudentProfile("STU-003", "Ana Reyes", 850, 4, "Kinesiology", "high", 3.8, 30000, "negative"),
    StudentProfile("STU-004", "Carlos Garcia", 580, 1, "Business", "medium", 2.8, 15000, "negative"),
    StudentProfile("STU-005", "Sofia Cruz", 720, 2, "Sports Management", "high", 3.6, 22000, "negative"),
]

SAMPLE_JOBS = [
    {
        "id": "JOB-ATB-COACH-001",
        "employer_id": "EMP-ATB-SEOUL",
        "position": "ATB Indoor Basketball Coach",
        "english_level": "intermediate",
        "experience_years": 2,
        "preferred_majors": ["Physical Education", "Sports Science", "Kinesiology"],
        "fitness_level": "high",
        "min_gpa": 2.5,
        "salary_min": 2600000,
        "salary_max": 3200000
    },
    {
        "id": "JOB-ATB-TRAINER-002",
        "employer_id": "EMP-ATB-SEOUL",
        "position": "ATB Academy Skills Trainer",
        "english_level": "basic",
        "experience_years": 1,
        "preferred_majors": ["Physical Education", "Education", "Sports Science"],
        "fitness_level": "medium",
        "min_gpa": 2.0,
        "salary_min": 2400000,
        "salary_max": 3000000
    }
]

class MatchRequestBody(BaseModel):
    student_ids: List[str] = []
    job_ids: List[str] = []
    top_k: int = 10

@router.get("/demo")
async def demo_matching():
    """Run demo matching with sample data"""
    rulepacks = [generate_employment_rulepack(j) for j in SAMPLE_JOBS]
    req = MatchRequest(students=SAMPLE_STUDENTS, jobs=rulepacks, top_k_per_job=5)
    result = match_students_to_jobs(req)
    
    return {
        "jobs": [
            {
                "job_id": j.job_posting_id,
                "position": j.position,
                "top_candidates": [
                    {"student": f.student_name, "score": f.fit_percent, "recommendation": f.recommendation}
                    for f in j.fits[:5]
                ]
            }
            for j in result.jobs
        ],
        "students": [
            {
                "student": s.student_name,
                "best_match": s.best_match,
                "job_scores": [{"job": j.job_posting_id, "score": j.fit_percent} for j in s.jobs]
            }
            for s in result.students
        ],
        "summary": result.summary
    }

@router.post("/run")
async def run_matching(data: Dict[str, Any]):
    """Run custom matching"""
    students_data = data.get("students", [])
    jobs_data = data.get("jobs", [])
    top_k = data.get("top_k", 10)
    
    # Convert to StudentProfile
    students = []
    for s in students_data:
        students.append(StudentProfile(
            id=s.get("id", ""),
            full_name=s.get("name", ""),
            english_score=s.get("english_score", 0),
            sports_experience_years=s.get("experience", 0),
            major=s.get("major", ""),
            fitness_level=s.get("fitness", "medium"),
            gpa=s.get("gpa", 0),
            bank_balance_usd=s.get("bank_balance", 0)
        ))
    
    # Generate RulePacks
    rulepacks = [generate_employment_rulepack(j) for j in jobs_data]
    
    req = MatchRequest(students=students, jobs=rulepacks, top_k_per_job=top_k)
    result = match_students_to_jobs(req)
    
    return {
        "jobs": [{"job_id": j.job_posting_id, "fits": [{"student": f.student_id, "score": f.fit_percent, "rec": f.recommendation} for f in j.fits]} for j in result.jobs],
        "students": [{"student": s.student_id, "best": s.best_match, "scores": [{"job": j.job_posting_id, "score": j.fit_percent} for j in s.jobs]} for s in result.students],
        "summary": result.summary
    }

@router.get("/students")
async def list_sample_students():
    """List sample students"""
    return {"students": [{"id": s.id, "name": s.full_name, "english": s.english_score, "exp": s.sports_experience_years, "major": s.major, "fitness": s.fitness_level, "gpa": s.gpa} for s in SAMPLE_STUDENTS]}

@router.get("/jobs")
async def list_sample_jobs():
    """List sample jobs"""
    return {"jobs": SAMPLE_JOBS}

@router.get("/jobs/{job_id}/rulepack")
async def get_job_rulepack(job_id: str):
    """Get generated rulepack for a job"""
    job = next((j for j in SAMPLE_JOBS if j["id"] == job_id), None)
    if not job:
        return {"error": "job_not_found"}
    
    pack = generate_employment_rulepack(job)
    return {
        "job_id": pack.job_posting_id,
        "employer_id": pack.employer_id,
        "rules": [{"id": r.id, "field": r.conditions[0].field, "op": r.conditions[0].operator, "value": r.conditions[0].value, "weight": r.weight} for r in pack.rules]
    }
