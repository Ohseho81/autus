from fastapi import APIRouter
from typing import Dict, List
from datetime import datetime, timedelta

router = APIRouter(prefix="/settlement", tags=["90-Day Settlement Program"])

# Settlement stages
STAGES = {
    "T1_AIRPORT": ["pickup", "sim_card", "accommodation"],
    "T2_ADMIN": ["bank_account", "insurance", "alien_registration", "arc_card"],
    "T3_ACADEMIC": ["course_registration", "syllabus", "attendance_setup"],
    "T4_WORK": ["atb_orientation", "work_assignment", "first_paycheck"],
    "T5_VISA": ["d2_check", "d10_prep", "e7_roadmap"]
}

STUDENTS_SETTLEMENT: Dict[str, Dict] = {}

@router.post("/enroll/{student_id}")
async def enroll_settlement(student_id: str, data: Dict = None):
    arrival_date = data.get("arrival_date") if data else datetime.now().strftime("%Y-%m-%d")
    
    checklist = {}
    for stage, items in STAGES.items():
        checklist[stage] = {item: {"status": "pending", "completed_at": None} for item in items}
    
    STUDENTS_SETTLEMENT[student_id] = {
        "student_id": student_id,
        "arrival_date": arrival_date,
        "day_90_deadline": (datetime.strptime(arrival_date, "%Y-%m-%d") + timedelta(days=90)).strftime("%Y-%m-%d"),
        "checklist": checklist,
        "current_stage": "T1_AIRPORT",
        "progress_percent": 0,
        "enrolled_at": datetime.now().isoformat()
    }
    
    return STUDENTS_SETTLEMENT[student_id]

@router.get("/status/{student_id}")
async def get_settlement_status(student_id: str):
    if student_id not in STUDENTS_SETTLEMENT:
        return {"error": "not_enrolled"}
    return STUDENTS_SETTLEMENT[student_id]

@router.post("/complete/{student_id}/{stage}/{item}")
async def complete_item(student_id: str, stage: str, item: str):
    if student_id not in STUDENTS_SETTLEMENT:
        return {"error": "not_enrolled"}
    
    student = STUDENTS_SETTLEMENT[student_id]
    
    if stage not in student["checklist"]:
        return {"error": "invalid_stage"}
    if item not in student["checklist"][stage]:
        return {"error": "invalid_item"}
    
    student["checklist"][stage][item] = {
        "status": "completed",
        "completed_at": datetime.now().isoformat()
    }
    
    # Calculate progress
    total_items = sum(len(items) for items in STAGES.values())
    completed = sum(
        1 for stage_items in student["checklist"].values()
        for item_data in stage_items.values()
        if item_data["status"] == "completed"
    )
    student["progress_percent"] = round(completed / total_items * 100, 1)
    
    # Update current stage
    for stage_name in ["T1_AIRPORT", "T2_ADMIN", "T3_ACADEMIC", "T4_WORK", "T5_VISA"]:
        stage_complete = all(
            item["status"] == "completed"
            for item in student["checklist"][stage_name].values()
        )
        if not stage_complete:
            student["current_stage"] = stage_name
            break
    else:
        student["current_stage"] = "COMPLETED"
    
    return {"status": "updated", "progress": student["progress_percent"], "current_stage": student["current_stage"]}

@router.get("/checklist/{student_id}")
async def get_checklist(student_id: str):
    if student_id not in STUDENTS_SETTLEMENT:
        return {"error": "not_enrolled"}
    
    student = STUDENTS_SETTLEMENT[student_id]
    
    # Format for UI
    stages = []
    for stage_id, items in STAGES.items():
        stage_data = student["checklist"][stage_id]
        completed = sum(1 for i in stage_data.values() if i["status"] == "completed")
        stages.append({
            "id": stage_id,
            "name": stage_id.replace("_", " "),
            "items": [{"name": item, **stage_data[item]} for item in items],
            "completed": completed,
            "total": len(items),
            "percent": round(completed / len(items) * 100)
        })
    
    return {"student_id": student_id, "stages": stages, "overall_progress": student["progress_percent"]}

@router.get("/alerts/{student_id}")
async def get_alerts(student_id: str):
    if student_id not in STUDENTS_SETTLEMENT:
        return {"error": "not_enrolled"}
    
    student = STUDENTS_SETTLEMENT[student_id]
    arrival = datetime.strptime(student["arrival_date"], "%Y-%m-%d")
    today = datetime.now()
    days_in_korea = (today - arrival).days
    
    alerts = []
    
    # Day-based alerts
    if days_in_korea >= 7 and student["checklist"]["T1_AIRPORT"]["accommodation"]["status"] == "pending":
        alerts.append({"type": "urgent", "message": "Accommodation not confirmed after 7 days"})
    
    if days_in_korea >= 14 and student["checklist"]["T2_ADMIN"]["alien_registration"]["status"] == "pending":
        alerts.append({"type": "urgent", "message": "Alien registration required within 90 days"})
    
    if days_in_korea >= 30 and student["checklist"]["T2_ADMIN"]["bank_account"]["status"] == "pending":
        alerts.append({"type": "warning", "message": "Bank account needed for salary"})
    
    if days_in_korea >= 60 and student["progress_percent"] < 70:
        alerts.append({"type": "warning", "message": "Settlement progress behind schedule"})
    
    return {"student_id": student_id, "days_in_korea": days_in_korea, "alerts": alerts}

@router.get("/stats")
async def settlement_stats():
    if not STUDENTS_SETTLEMENT:
        return {"enrolled": 0}
    
    total = len(STUDENTS_SETTLEMENT)
    completed = len([s for s in STUDENTS_SETTLEMENT.values() if s["current_stage"] == "COMPLETED"])
    avg_progress = sum(s["progress_percent"] for s in STUDENTS_SETTLEMENT.values()) / total
    
    return {
        "enrolled": total,
        "completed": completed,
        "in_progress": total - completed,
        "avg_progress": round(avg_progress, 1)
    }
