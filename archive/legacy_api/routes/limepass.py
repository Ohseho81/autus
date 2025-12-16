from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/limepass", tags=["LimePass"])

# 지원자 상태 단계
STAGES = ["applied", "documents", "interview", "approved", "visa", "entry", "employed"]

# 샘플 데이터
applicants_db = {
    "LP-2025-001": {
        "id": "LP-2025-001",
        "name": "Maria Santos",
        "stage": "interview",
        "origin": "Philippines",
        "destination": "Korea",
        "employer": "Samsung Electronics",
        "created_at": "2025-12-01",
        "documents": ["passport", "nbi_clearance", "medical"],
        "timeline": [
            {"stage": "applied", "date": "2025-12-01", "status": "completed"},
            {"stage": "documents", "date": "2025-12-03", "status": "completed"},
            {"stage": "interview", "date": "2025-12-07", "status": "in_progress"},
        ]
    }
}

class ApplicantCreate(BaseModel):
    name: str
    origin: str = "Philippines"
    destination: str = "Korea"
    employer: Optional[str] = None

@router.get("/applicants")
async def list_applicants():
    return {"applicants": list(applicants_db.values()), "total": len(applicants_db)}

@router.get("/applicants/{applicant_id}")
async def get_applicant(applicant_id: str):
    if applicant_id not in applicants_db:
        return {"error": "not_found", "applicant_id": applicant_id}
    return applicants_db[applicant_id]

@router.post("/applicants")
async def create_applicant(data: ApplicantCreate):
    new_id = f"LP-2025-{len(applicants_db)+1:03d}"
    applicant = {
        "id": new_id,
        "name": data.name,
        "stage": "applied",
        "origin": data.origin,
        "destination": data.destination,
        "employer": data.employer,
        "created_at": datetime.now().isoformat()[:10],
        "documents": [],
        "timeline": [{"stage": "applied", "date": datetime.now().isoformat()[:10], "status": "completed"}]
    }
    applicants_db[new_id] = applicant
    return applicant

@router.post("/applicants/{applicant_id}/advance")
async def advance_stage(applicant_id: str):
    if applicant_id not in applicants_db:
        return {"error": "not_found"}
    applicant = applicants_db[applicant_id]
    current_idx = STAGES.index(applicant["stage"])
    if current_idx < len(STAGES) - 1:
        new_stage = STAGES[current_idx + 1]
        applicant["stage"] = new_stage
        applicant["timeline"].append({
            "stage": new_stage,
            "date": datetime.now().isoformat()[:10],
            "status": "in_progress"
        })
    return applicant

@router.get("/stats")
async def limepass_stats():
    stages_count = {}
    for a in applicants_db.values():
        stages_count[a["stage"]] = stages_count.get(a["stage"], 0) + 1
    return {
        "total_applicants": len(applicants_db),
        "by_stage": stages_count,
        "corridors": ["PH-KR", "PH-JP", "VN-KR"]
    }
