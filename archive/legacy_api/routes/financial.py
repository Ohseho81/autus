from fastapi import APIRouter
from typing import Dict, List, Any
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/financial", tags=["Financial Simulation"])

# Korean cost constants (KRW)
COSTS = {
    "tuition_semester": 4500000,  # 학비 (학기당)
    "dormitory_month": 350000,     # 기숙사
    "food_month": 400000,          # 식비
    "transport_month": 100000,     # 교통비
    "insurance_month": 50000,      # 보험
    "phone_month": 50000,          # 통신비
    "misc_month": 200000,          # 기타
}

TAX_RATES = {
    "income_tax": 0.06,      # 소득세
    "resident_tax": 0.006,   # 주민세
    "pension": 0.045,        # 국민연금
    "health": 0.0343,        # 건강보험
    "employment": 0.008,     # 고용보험
}

class StudentFinancialProfile(BaseModel):
    student_id: str
    name: str
    initial_savings_usd: float = 20000
    scholarship_percent: float = 0  # 0-100
    part_time_hours_week: float = 20
    hourly_wage_krw: float = 9860  # 최저시급
    full_time_salary_krw: float = 2800000  # 정규직 월급

class FinancialProjection(BaseModel):
    month: int
    phase: str  # study, work
    income: float
    expenses: float
    taxes: float
    net: float
    cumulative: float

# In-memory storage
STUDENT_FINANCIALS: Dict[str, Dict] = {}

def calculate_monthly_expenses(phase: str, has_scholarship: bool = False) -> Dict[str, float]:
    """Calculate monthly expenses by phase"""
    expenses = {
        "dormitory": COSTS["dormitory_month"],
        "food": COSTS["food_month"],
        "transport": COSTS["transport_month"],
        "insurance": COSTS["insurance_month"],
        "phone": COSTS["phone_month"],
        "misc": COSTS["misc_month"],
    }
    
    if phase == "study":
        # Tuition spread across 6 months
        tuition = COSTS["tuition_semester"] / 6
        if has_scholarship:
            tuition = 0
        expenses["tuition"] = tuition
    
    return expenses

def calculate_taxes(gross_income: float) -> Dict[str, float]:
    """Calculate Korean taxes and deductions"""
    if gross_income <= 0:
        return {"total": 0}
    
    taxes = {}
    for name, rate in TAX_RATES.items():
        taxes[name] = round(gross_income * rate)
    taxes["total"] = sum(taxes.values())
    return taxes

def simulate_2_year_finances(profile: StudentFinancialProfile) -> List[FinancialProjection]:
    """Simulate 24-month financial projection"""
    projections = []
    
    # Initial balance in KRW (1 USD = 1300 KRW assumed)
    exchange_rate = 1300
    cumulative = profile.initial_savings_usd * exchange_rate
    
    has_scholarship = profile.scholarship_percent >= 50
    
    for month in range(1, 25):
        # Phase: first 12 months = study, next 12 = work
        if month <= 12:
            phase = "study"
            # Part-time income during study
            weekly_hours = min(profile.part_time_hours_week, 20)  # Legal limit
            monthly_hours = weekly_hours * 4
            income = monthly_hours * profile.hourly_wage_krw
        else:
            phase = "work"
            income = profile.full_time_salary_krw
        
        # Expenses
        expense_breakdown = calculate_monthly_expenses(phase, has_scholarship)
        total_expenses = sum(expense_breakdown.values())
        
        # Taxes
        tax_breakdown = calculate_taxes(income)
        total_taxes = tax_breakdown["total"]
        
        # Net
        net = income - total_expenses - total_taxes
        cumulative += net
        
        projections.append(FinancialProjection(
            month=month,
            phase=phase,
            income=round(income),
            expenses=round(total_expenses),
            taxes=round(total_taxes),
            net=round(net),
            cumulative=round(cumulative)
        ))
    
    return projections

@router.post("/simulate/{student_id}")
async def simulate_finances(student_id: str, profile: StudentFinancialProfile):
    """Run 24-month financial simulation"""
    projections = simulate_2_year_finances(profile)
    
    # Summary stats
    total_income = sum(p.income for p in projections)
    total_expenses = sum(p.expenses for p in projections)
    total_taxes = sum(p.taxes for p in projections)
    final_balance = projections[-1].cumulative
    
    # Risk assessment
    negative_months = [p.month for p in projections if p.cumulative < 0]
    min_balance = min(p.cumulative for p in projections)
    
    result = {
        "student_id": student_id,
        "name": profile.name,
        "projections": [p.__dict__ for p in projections],
        "summary": {
            "total_income_krw": total_income,
            "total_expenses_krw": total_expenses,
            "total_taxes_krw": total_taxes,
            "final_balance_krw": final_balance,
            "final_balance_usd": round(final_balance / 1300),
            "min_balance_krw": min_balance,
            "negative_months": negative_months,
            "financial_risk": "high" if negative_months else "low"
        },
        "recommendations": []
    }
    
    # Add recommendations
    if negative_months:
        result["recommendations"].append(f"Warning: Negative balance in months {negative_months}")
        result["recommendations"].append("Consider: Increase initial savings or find scholarship")
    if profile.scholarship_percent < 50:
        result["recommendations"].append("Apply for scholarship to reduce tuition burden")
    if final_balance < 5000000:
        result["recommendations"].append("Build emergency fund before starting")
    
    STUDENT_FINANCIALS[student_id] = result
    return result

@router.get("/simulate/{student_id}")
async def get_simulation(student_id: str):
    """Get existing simulation"""
    if student_id not in STUDENT_FINANCIALS:
        return {"error": "simulation_not_found"}
    return STUDENT_FINANCIALS[student_id]

@router.get("/demo")
async def demo_simulation():
    """Run demo simulation"""
    demo_profile = StudentFinancialProfile(
        student_id="STU-DEMO",
        name="Demo Student",
        initial_savings_usd=22000,
        scholarship_percent=50,
        part_time_hours_week=20,
        hourly_wage_krw=12000,
        full_time_salary_krw=2800000
    )
    return await simulate_finances("STU-DEMO", demo_profile)

@router.get("/costs")
async def get_cost_breakdown():
    """Get standard cost breakdown"""
    return {
        "monthly_costs_krw": COSTS,
        "tax_rates": TAX_RATES,
        "exchange_rate_assumed": 1300,
        "minimum_wage_2024": 9860
    }

@router.post("/compare")
async def compare_scenarios(data: Dict[str, Any]):
    """Compare multiple financial scenarios"""
    scenarios = data.get("scenarios", [])
    results = []
    
    for scenario in scenarios:
        profile = StudentFinancialProfile(**scenario)
        projections = simulate_2_year_finances(profile)
        final = projections[-1].cumulative
        min_bal = min(p.cumulative for p in projections)
        
        results.append({
            "name": scenario.get("name", profile.name),
            "initial_usd": profile.initial_savings_usd,
            "scholarship": profile.scholarship_percent,
            "final_balance_krw": final,
            "final_balance_usd": round(final / 1300),
            "min_balance_krw": min_bal,
            "risk": "high" if min_bal < 0 else "medium" if min_bal < 3000000 else "low"
        })
    
    return {"comparison": results}
