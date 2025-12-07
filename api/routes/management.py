from fastapi import APIRouter
from typing import Dict, List
from datetime import datetime

router = APIRouter(prefix="/management", tags=["School & Work Management"])

# In-Memory DB
ATTENDANCE: List[Dict] = []
WORKLOGS: List[Dict] = []
RISKS: List[Dict] = []
GRADES: List[Dict] = []

# === Attendance API ===
@router.post("/attendance")
async def log_attendance(data: Dict):
    record = {
        "id": f"ATT-{len(ATTENDANCE)+1:04d}",
        "student_id": data.get("student_id"),
        "class_id": data.get("class_id"),
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
        "status": data.get("status", "present"),  # present, absent, late, excused
        "timestamp": datetime.now().isoformat()
    }
    ATTENDANCE.append(record)
    
    # Check risk
    student_absences = len([a for a in ATTENDANCE if a["student_id"] == record["student_id"] and a["status"] == "absent"])
    if student_absences >= 3:
        await log_risk({"student_id": record["student_id"], "type": "attendance", "severity": "warning", "note": f"{student_absences} absences"})
    
    return record

@router.get("/attendance/{student_id}")
async def get_attendance(student_id: str):
    records = [a for a in ATTENDANCE if a["student_id"] == student_id]
    present = len([a for a in records if a["status"] == "present"])
    total = len(records)
    return {
        "student_id": student_id,
        "records": records,
        "attendance_rate": round(present / total * 100, 1) if total > 0 else 100
    }

# === Work Log API ===
@router.post("/worklog")
async def log_work(data: Dict):
    record = {
        "id": f"WRK-{len(WORKLOGS)+1:04d}",
        "student_id": data.get("student_id"),
        "employer_id": data.get("employer_id"),
        "date": data.get("date", datetime.now().strftime("%Y-%m-%d")),
        "hours": data.get("hours", 8),
        "task": data.get("task", ""),
        "rating": data.get("rating", 3),  # 1-5
        "timestamp": datetime.now().isoformat()
    }
    WORKLOGS.append(record)
    
    # Check risk for low rating
    if record["rating"] <= 2:
        await log_risk({"student_id": record["student_id"], "type": "performance", "severity": "warning", "note": f"Low rating: {record['rating']}"})
    
    return record

@router.get("/worklog/{student_id}")
async def get_worklogs(student_id: str):
    records = [w for w in WORKLOGS if w["student_id"] == student_id]
    total_hours = sum(w["hours"] for w in records)
    avg_rating = sum(w["rating"] for w in records) / len(records) if records else 0
    return {
        "student_id": student_id,
        "records": records,
        "total_hours": total_hours,
        "avg_rating": round(avg_rating, 2)
    }

# === Risk API ===
@router.post("/risk")
async def log_risk(data: Dict):
    record = {
        "id": f"RSK-{len(RISKS)+1:04d}",
        "student_id": data.get("student_id"),
        "type": data.get("type"),  # attendance, performance, visa, health, financial
        "severity": data.get("severity", "info"),  # info, warning, critical
        "note": data.get("note", ""),
        "status": "open",
        "timestamp": datetime.now().isoformat()
    }
    RISKS.append(record)
    return record

@router.get("/risk/{student_id}")
async def get_risks(student_id: str):
    records = [r for r in RISKS if r["student_id"] == student_id]
    open_risks = len([r for r in records if r["status"] == "open"])
    return {
        "student_id": student_id,
        "risks": records,
        "open_count": open_risks,
        "risk_level": "high" if open_risks >= 3 else "medium" if open_risks >= 1 else "low"
    }

@router.put("/risk/{risk_id}/resolve")
async def resolve_risk(risk_id: str):
    for r in RISKS:
        if r["id"] == risk_id:
            r["status"] = "resolved"
            r["resolved_at"] = datetime.now().isoformat()
            return r
    return {"error": "risk_not_found"}

# === Grades API ===
@router.post("/grades")
async def log_grade(data: Dict):
    record = {
        "id": f"GRD-{len(GRADES)+1:04d}",
        "student_id": data.get("student_id"),
        "course": data.get("course"),
        "grade": data.get("grade"),  # A, B, C, D, F or numeric
        "semester": data.get("semester"),
        "timestamp": datetime.now().isoformat()
    }
    GRADES.append(record)
    
    # Check risk for failing grade
    if record["grade"] in ["F", "D"] or (isinstance(record["grade"], (int, float)) and record["grade"] < 2.0):
        await log_risk({"student_id": record["student_id"], "type": "academic", "severity": "warning", "note": f"Low grade in {record['course']}"})
    
    return record

@router.get("/grades/{student_id}")
async def get_grades(student_id: str):
    records = [g for g in GRADES if g["student_id"] == student_id]
    return {
        "student_id": student_id,
        "grades": records,
        "total_courses": len(records)
    }

# === Dashboard ===
@router.get("/dashboard/{student_id}")
async def student_dashboard(student_id: str):
    attendance = await get_attendance(student_id)
    worklogs = await get_worklogs(student_id)
    risks = await get_risks(student_id)
    grades = await get_grades(student_id)
    
    return {
        "student_id": student_id,
        "attendance_rate": attendance["attendance_rate"],
        "work_hours": worklogs["total_hours"],
        "work_rating": worklogs["avg_rating"],
        "risk_level": risks["risk_level"],
        "open_risks": risks["open_count"],
        "courses": grades["total_courses"],
        "status": "good" if risks["risk_level"] == "low" and attendance["attendance_rate"] >= 80 else "attention_needed"
    }
