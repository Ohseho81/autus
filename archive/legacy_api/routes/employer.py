from fastapi import APIRouter
from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/employer", tags=["Employer Portal"])

# === Models ===
class JobPosting(BaseModel):
    position: str
    company: str
    salary_min: int
    salary_max: int
    work_location: str
    contract_months: int = 24
    visa_type: str = "E-7"
    english_min: int = 600
    fitness_level: str = "normal"
    experience_years: int = 0
    skills: List[str] = []
    working_hours: int = 40
    additional: str = ""

# === In-Memory DB ===
JOBS_DB: Dict[str, Dict] = {}
GENERATED_RULES: Dict[str, List] = {}
MATCHES: Dict[str, List] = {}

# Sample applicants for matching
APPLICANTS = [
    {"id": "APP-001", "name": "Maria Santos", "gpa": 3.5, "english": 780, "major": "Sports Science", "experience": 2, "fitness": "athletic", "bank": 25000},
    {"id": "APP-002", "name": "Juan Dela Cruz", "gpa": 3.2, "english": 650, "major": "PE", "experience": 1, "fitness": "normal", "bank": 18000},
    {"id": "APP-003", "name": "Ana Reyes", "gpa": 3.8, "english": 850, "major": "Kinesiology", "experience": 3, "fitness": "athletic", "bank": 30000},
    {"id": "APP-004", "name": "Carlos Garcia", "gpa": 2.8, "english": 580, "major": "Business", "experience": 0, "fitness": "normal", "bank": 15000},
    {"id": "APP-005", "name": "Sofia Cruz", "gpa": 3.6, "english": 720, "major": "Sports Management", "experience": 2, "fitness": "athletic", "bank": 22000},
]

# === RulePack Generator ===
def generate_rulepack(job: JobPosting) -> List[Dict]:
    rules = []
    job_id = f"JOB-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # English requirement
    if job.english_min > 0:
        rules.append({
            "id": f"{job_id}-ENG",
            "group": "employment",
            "field": "english",
            "operator": ">=",
            "value": job.english_min,
            "severity": "warning" if job.english_min < 700 else "blocker",
            "weight": 0.20
        })
    
    # Experience requirement
    if job.experience_years > 0:
        rules.append({
            "id": f"{job_id}-EXP",
            "group": "employment",
            "field": "experience",
            "operator": ">=",
            "value": job.experience_years,
            "severity": "warning",
            "weight": 0.15
        })
    
    # Fitness requirement
    if job.fitness_level == "athletic":
        rules.append({
            "id": f"{job_id}-FIT",
            "group": "employment",
            "field": "fitness",
            "operator": "==",
            "value": "athletic",
            "severity": "warning",
            "weight": 0.15
        })
    
    # Salary expectation (bank balance proxy)
    rules.append({
        "id": f"{job_id}-SAL",
        "group": "finance",
        "field": "bank",
        "operator": ">=",
        "value": 15000,
        "severity": "info",
        "weight": 0.10
    })
    
    # Skills matching
    for skill in job.skills[:3]:
        rules.append({
            "id": f"{job_id}-SKILL-{skill.upper()[:3]}",
            "group": "skills",
            "field": "major",
            "operator": "contains",
            "value": skill,
            "severity": "info",
            "weight": 0.10
        })
    
    return rules

def calculate_fit_score(applicant: Dict, rules: List[Dict]) -> float:
    score = 0.0
    max_score = sum(r["weight"] for r in rules)
    
    for rule in rules:
        field = rule["field"]
        value = applicant.get(field)
        target = rule["value"]
        op = rule["operator"]
        
        passed = False
        if op == ">=" and isinstance(value, (int, float)):
            passed = value >= target
        elif op == "==" and value == target:
            passed = True
        elif op == "contains" and isinstance(value, str):
            passed = target.lower() in value.lower()
        
        if passed:
            score += rule["weight"]
    
    return round(score / max_score if max_score > 0 else 0, 3)

# === Endpoints ===
@router.post("/jobs")
async def create_job(job: JobPosting):
    job_id = f"JOB-{datetime.now().strftime('%Y%m%d%H%M%S')}"
    
    # Generate RulePack
    rules = generate_rulepack(job)
    
    # Store
    JOBS_DB[job_id] = {
        "id": job_id,
        "posting": job.dict(),
        "status": "active",
        "created_at": datetime.now().isoformat(),
        "rules_count": len(rules)
    }
    GENERATED_RULES[job_id] = rules
    
    return {"job_id": job_id, "rules_generated": len(rules), "status": "active"}

@router.get("/jobs")
async def list_jobs():
    return {"jobs": list(JOBS_DB.values()), "total": len(JOBS_DB)}

@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    if job_id not in JOBS_DB:
        return {"error": "job_not_found"}
    return {"job": JOBS_DB[job_id], "rules": GENERATED_RULES.get(job_id, [])}

@router.get("/jobs/{job_id}/rules")
async def get_job_rules(job_id: str):
    if job_id not in GENERATED_RULES:
        return {"error": "rules_not_found"}
    return {"job_id": job_id, "rules": GENERATED_RULES[job_id]}

@router.get("/jobs/{job_id}/matches")
async def get_job_matches(job_id: str, top: int = 10):
    if job_id not in GENERATED_RULES:
        return {"error": "job_not_found"}
    
    rules = GENERATED_RULES[job_id]
    
    # Calculate fit scores
    matches = []
    for app in APPLICANTS:
        fit_score = calculate_fit_score(app, rules)
        matches.append({
            "applicant_id": app["id"],
            "name": app["name"],
            "fit_score": fit_score,
            "gpa": app["gpa"],
            "english": app["english"],
            "major": app["major"]
        })
    
    # Sort by fit score
    matches.sort(key=lambda x: x["fit_score"], reverse=True)
    
    return {"job_id": job_id, "matches": matches[:top], "total_candidates": len(APPLICANTS)}

@router.post("/jobs/{job_id}/interview")
async def schedule_interview(job_id: str, data: Dict):
    applicant_id = data.get("applicant_id")
    datetime_str = data.get("datetime")
    
    return {
        "status": "scheduled",
        "job_id": job_id,
        "applicant_id": applicant_id,
        "interview_datetime": datetime_str,
        "meeting_link": f"https://meet.autus-ai.com/{job_id}-{applicant_id}"
    }

@router.post("/jobs/{job_id}/offer")
async def send_offer(job_id: str, data: Dict):
    applicant_id = data.get("applicant_id")
    
    if job_id not in JOBS_DB:
        return {"error": "job_not_found"}
    
    job = JOBS_DB[job_id]
    posting = job["posting"]
    
    return {
        "status": "offer_sent",
        "offer": {
            "job_id": job_id,
            "applicant_id": applicant_id,
            "position": posting["position"],
            "company": posting["company"],
            "salary_range": f"${posting['salary_min']}-${posting['salary_max']}",
            "contract_months": posting["contract_months"],
            "visa_type": posting["visa_type"],
            "start_date": "TBD"
        }
    }

@router.get("/stats")
async def employer_stats():
    return {
        "total_jobs": len(JOBS_DB),
        "total_rules_generated": sum(len(r) for r in GENERATED_RULES.values()),
        "total_applicants": len(APPLICANTS),
        "avg_rules_per_job": round(sum(len(r) for r in GENERATED_RULES.values()) / max(len(JOBS_DB), 1), 1)
    }
