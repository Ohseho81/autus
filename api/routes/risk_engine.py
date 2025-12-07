from fastapi import APIRouter
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from enum import Enum

router = APIRouter(prefix="/risk", tags=["Risk Engine v2.0"])

class RiskCategory(str, Enum):
    ATTENDANCE = "attendance"
    WORK = "work"
    VISA = "visa"
    FINANCIAL = "financial"
    HEALTH = "health"
    ACADEMIC = "academic"

class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

# Risk weights
RISK_WEIGHTS = {
    RiskCategory.ATTENDANCE: 0.20,
    RiskCategory.WORK: 0.15,
    RiskCategory.VISA: 0.25,
    RiskCategory.FINANCIAL: 0.20,
    RiskCategory.HEALTH: 0.10,
    RiskCategory.ACADEMIC: 0.10,
}

# In-memory risk data
STUDENT_RISKS: Dict[str, Dict] = {}
RISK_ALERTS: List[Dict] = []

class RiskInput(BaseModel):
    attendance_rate: float = 100  # 0-100
    work_rating: float = 5  # 1-5
    days_to_visa_expiry: int = 365
    bank_balance_krw: float = 5000000
    health_issues: int = 0
    gpa: float = 3.0
    absences_consecutive: int = 0

def calculate_category_risk(category: RiskCategory, data: RiskInput) -> tuple[float, str]:
    """Calculate risk score (0-100) for each category"""
    
    if category == RiskCategory.ATTENDANCE:
        score = 100 - data.attendance_rate
        if data.absences_consecutive >= 3:
            score = min(100, score + 30)
        note = f"Attendance: {data.attendance_rate}%"
        
    elif category == RiskCategory.WORK:
        score = (5 - data.work_rating) * 20  # 5=0, 1=80
        note = f"Work rating: {data.work_rating}/5"
        
    elif category == RiskCategory.VISA:
        if data.days_to_visa_expiry <= 30:
            score = 90
        elif data.days_to_visa_expiry <= 60:
            score = 60
        elif data.days_to_visa_expiry <= 90:
            score = 30
        else:
            score = 0
        note = f"Visa expires in {data.days_to_visa_expiry} days"
        
    elif category == RiskCategory.FINANCIAL:
        if data.bank_balance_krw < 1000000:
            score = 80
        elif data.bank_balance_krw < 3000000:
            score = 50
        elif data.bank_balance_krw < 5000000:
            score = 20
        else:
            score = 0
        note = f"Balance: {data.bank_balance_krw:,.0f} KRW"
        
    elif category == RiskCategory.HEALTH:
        score = min(100, data.health_issues * 30)
        note = f"Health issues: {data.health_issues}"
        
    elif category == RiskCategory.ACADEMIC:
        if data.gpa < 2.0:
            score = 80
        elif data.gpa < 2.5:
            score = 40
        elif data.gpa < 3.0:
            score = 20
        else:
            score = 0
        note = f"GPA: {data.gpa}"
    
    else:
        score = 0
        note = ""
    
    return score, note

def get_risk_level(score: float) -> RiskLevel:
    if score >= 70:
        return RiskLevel.CRITICAL
    elif score >= 50:
        return RiskLevel.HIGH
    elif score >= 30:
        return RiskLevel.MEDIUM
    else:
        return RiskLevel.LOW

@router.post("/assess/{student_id}")
async def assess_risk(student_id: str, data: RiskInput):
    """Comprehensive risk assessment"""
    category_scores = {}
    category_details = {}
    alerts = []
    
    total_weighted_score = 0
    
    for category in RiskCategory:
        score, note = calculate_category_risk(category, data)
        weight = RISK_WEIGHTS[category]
        weighted = score * weight
        total_weighted_score += weighted
        
        level = get_risk_level(score)
        category_scores[category.value] = {
            "score": round(score, 1),
            "weight": weight,
            "weighted_score": round(weighted, 1),
            "level": level.value,
            "note": note
        }
        
        # Generate alerts for high-risk categories
        if level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            alert = {
                "id": f"ALERT-{student_id}-{category.value}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "student_id": student_id,
                "category": category.value,
                "level": level.value,
                "score": score,
                "message": note,
                "timestamp": datetime.now().isoformat(),
                "status": "active"
            }
            alerts.append(alert)
            RISK_ALERTS.append(alert)
    
    overall_score = round(total_weighted_score, 1)
    overall_level = get_risk_level(overall_score)
    
    # Recommendations
    recommendations = []
    if category_scores["attendance"]["score"] > 30:
        recommendations.append("Improve attendance - contact student advisor")
    if category_scores["visa"]["score"] > 30:
        recommendations.append("Urgent: Start visa renewal process")
    if category_scores["financial"]["score"] > 30:
        recommendations.append("Financial counseling recommended")
    if category_scores["academic"]["score"] > 30:
        recommendations.append("Academic support needed")
    
    result = {
        "student_id": student_id,
        "assessed_at": datetime.now().isoformat(),
        "overall": {
            "score": overall_score,
            "level": overall_level.value,
            "max_possible": 100
        },
        "categories": category_scores,
        "alerts": alerts,
        "recommendations": recommendations
    }
    
    STUDENT_RISKS[student_id] = result
    return result

@router.get("/assess/{student_id}")
async def get_risk_assessment(student_id: str):
    """Get existing risk assessment"""
    if student_id not in STUDENT_RISKS:
        return {"error": "assessment_not_found"}
    return STUDENT_RISKS[student_id]

@router.get("/alerts")
async def get_all_alerts(status: str = "active", limit: int = 50):
    """Get all risk alerts"""
    filtered = [a for a in RISK_ALERTS if a["status"] == status]
    return {"alerts": filtered[-limit:], "total": len(filtered)}

@router.get("/alerts/{student_id}")
async def get_student_alerts(student_id: str):
    """Get alerts for specific student"""
    filtered = [a for a in RISK_ALERTS if a["student_id"] == student_id]
    return {"alerts": filtered, "total": len(filtered)}

@router.put("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: str, resolution: str = "resolved"):
    """Resolve an alert"""
    for alert in RISK_ALERTS:
        if alert["id"] == alert_id:
            alert["status"] = "resolved"
            alert["resolution"] = resolution
            alert["resolved_at"] = datetime.now().isoformat()
            return alert
    return {"error": "alert_not_found"}

@router.get("/dashboard")
async def risk_dashboard():
    """Risk dashboard summary"""
    if not STUDENT_RISKS:
        return {"message": "No assessments yet"}
    
    levels = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    for data in STUDENT_RISKS.values():
        level = data["overall"]["level"]
        levels[level] = levels.get(level, 0) + 1
    
    active_alerts = len([a for a in RISK_ALERTS if a["status"] == "active"])
    
    return {
        "total_students": len(STUDENT_RISKS),
        "risk_distribution": levels,
        "active_alerts": active_alerts,
        "categories_avg": {
            cat: round(sum(d["categories"][cat]["score"] for d in STUDENT_RISKS.values()) / len(STUDENT_RISKS), 1)
            for cat in ["attendance", "work", "visa", "financial", "health", "academic"]
        }
    }

@router.get("/demo")
async def demo_risk():
    """Demo risk assessment"""
    demo_data = RiskInput(
        attendance_rate=85,
        work_rating=3.5,
        days_to_visa_expiry=45,
        bank_balance_krw=2500000,
        health_issues=0,
        gpa=2.8,
        absences_consecutive=2
    )
    return await assess_risk("STU-DEMO", demo_data)
