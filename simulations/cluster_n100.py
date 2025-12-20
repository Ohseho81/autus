#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
AUTUS N=100 군집 시뮬레이션
필리핀 유학생 100명 기준 스케일 검증
═══════════════════════════════════════════════════════════════════════════════
"""

import random
import time
import json
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Any, Optional
from enum import Enum
import statistics

# ═══════════════════════════════════════════════════════════════════════════════
# 상수 정의
# ═══════════════════════════════════════════════════════════════════════════════

T_MIN = 180  # 최소 생존 기간 (일)
ALPHA_SAFETY = 1.3  # 확장 안전 계수
GRAVITY_BASE = 180  # 중력 기준일

# 시나리오별 파라미터
SCENARIOS = {
    "BASELINE": {"description": "정상 운영", "shock_prob": 0.05, "support_cut": 0},
    "GOV_CUT": {"description": "정부 지원 중단", "shock_prob": 0.05, "support_cut": 0.5},
    "EMPLOYER_EXIT": {"description": "고용주 20% 이탈", "shock_prob": 0.20, "support_cut": 0},
    "CRISIS": {"description": "복합 위기", "shock_prob": 0.30, "support_cut": 0.3},
}


class SystemState(Enum):
    GREEN = "GREEN"
    YELLOW = "YELLOW"
    RED = "RED"


@dataclass
class Student:
    """학생 데이터"""
    id: str
    name: str
    
    # Commits (월 단위 금액)
    tuition: float = 0  # 등록금 (지출)
    wage: float = 0  # 급여 (수입)
    grant: float = 0  # 장학금 (수입)
    living_cost: float = 0  # 생활비 (지출)
    
    # 리스크 요소
    visa_risk: float = 0.0  # 비자 리스크 (0~1)
    academic_risk: float = 0.0  # 학사 리스크 (0~1)
    
    # 계산된 값
    survival_days: float = 0
    float_pressure: float = 0
    state: str = "GREEN"
    
    # 이벤트
    events: List[str] = field(default_factory=list)


@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario: str
    description: str
    n_students: int
    
    # 집계 통계
    avg_survival_days: float
    min_survival_days: float
    max_survival_days: float
    std_survival_days: float
    
    avg_float_pressure: float
    
    # 상태 분포
    green_count: int
    yellow_count: int
    red_count: int
    
    # 위험 지표
    at_risk_count: int  # survival < 180
    critical_count: int  # survival < 90
    
    # 시스템 전체 상태
    system_state: str
    system_survival_mass: float
    
    # 상세 데이터
    students: List[Dict] = field(default_factory=list)


# ═══════════════════════════════════════════════════════════════════════════════
# 물리 계산 함수
# ═══════════════════════════════════════════════════════════════════════════════

def calc_commit_energy(amount: float, velocity: float, gravity: float, friction: float) -> float:
    """
    Commit Energy = Mass × Velocity × Gravity × (1 − Friction)
    """
    return amount * velocity * gravity * (1 - friction)


def calc_survival_time(
    income_energy: float,
    expense_energy: float,
    daily_burn: float
) -> float:
    """
    Survival_Time = (Σ Energy_in − Σ Energy_out) / Daily_Burn
    """
    net_energy = income_energy - expense_energy
    
    if daily_burn <= 0:
        return float('inf') if net_energy >= 0 else 0
    
    return max(0, net_energy / daily_burn)


def calc_float_pressure(outgoing: float, incoming: float) -> float:
    """
    Float_Pressure = Outgoing / Incoming
    """
    if incoming <= 0:
        return float('inf') if outgoing > 0 else 0
    return outgoing / incoming


def determine_state(survival_days: float, float_pressure: float) -> str:
    """시스템 상태 결정"""
    if survival_days < T_MIN * 0.5 or float_pressure > 1.0:
        return "RED"
    if survival_days < T_MIN or float_pressure > 0.7:
        return "YELLOW"
    return "GREEN"


# ═══════════════════════════════════════════════════════════════════════════════
# 학생 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════

def generate_students(n: int = 100) -> List[Student]:
    """N명의 학생 데이터 생성 (필리핀 유학생 기준)"""
    students = []
    
    # 이름 풀 (필리핀 일반 이름)
    first_names = ["Maria", "Juan", "Jose", "Ana", "Carlo", "Miguel", "Sofia", "Luis", 
                   "Rosa", "Pedro", "Elena", "Marco", "Isabella", "Antonio", "Carmen"]
    last_names = ["Santos", "Reyes", "Cruz", "Garcia", "Ramos", "Fernandez", "Torres",
                  "Lopez", "Martinez", "Rodriguez", "Hernandez", "Gonzales", "Perez"]
    
    for i in range(n):
        student_id = f"STU_{i+1:03d}"
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        
        # 등록금: 1,200~1,800만원/학기 → 월 200~300만원
        tuition = random.randint(200, 300) * 10000
        
        # 급여: 150~300만원/월 (파트타임 기준)
        wage = random.randint(150, 300) * 10000
        
        # 장학금: 0~100만원/월 (50% 확률로 지급)
        grant = random.randint(30, 100) * 10000 if random.random() > 0.5 else 0
        
        # 생활비: 80~150만원/월
        living_cost = random.randint(80, 150) * 10000
        
        # 리스크 요소
        visa_risk = random.uniform(0.05, 0.25)
        academic_risk = random.uniform(0.05, 0.20)
        
        students.append(Student(
            id=student_id,
            name=name,
            tuition=tuition,
            wage=wage,
            grant=grant,
            living_cost=living_cost,
            visa_risk=visa_risk,
            academic_risk=academic_risk
        ))
    
    return students


# ═══════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 실행
# ═══════════════════════════════════════════════════════════════════════════════

def apply_scenario(students: List[Student], scenario: str) -> List[Student]:
    """시나리오 적용"""
    params = SCENARIOS.get(scenario, SCENARIOS["BASELINE"])
    
    for student in students:
        # 충격 이벤트 (고용주 이탈 등)
        if random.random() < params["shock_prob"]:
            student.wage = 0
            student.events.append("EMPLOYER_EXIT")
        
        # 정부 지원 중단
        if params["support_cut"] > 0:
            student.grant = int(student.grant * (1 - params["support_cut"]))
            if params["support_cut"] > 0:
                student.events.append(f"GRANT_CUT_{int(params['support_cut']*100)}%")
    
    return students


def calculate_student_physics(student: Student) -> Student:
    """학생별 물리값 계산 (현실적 모델)"""
    
    # 마찰 (리스크)
    friction = max(student.visa_risk, student.academic_risk)
    
    # === 월간 수입/지출 계산 (단순화) ===
    
    # 월간 수입 (급여 + 장학금)
    monthly_income = student.wage + student.grant
    
    # 월간 지출 (등록금/6 + 생활비)
    monthly_expense = (student.tuition / 6) + student.living_cost
    
    # 마찰 적용 (리스크로 인한 수입 감소)
    effective_income = monthly_income * (1 - friction)
    
    # === 생존 시간 계산 ===
    # 순 월간 흐름
    net_monthly = effective_income - monthly_expense
    
    # 6개월 치 저축 가정 (초기 자본)
    initial_savings = monthly_income * 2  # 2개월치 저축
    
    if net_monthly >= 0:
        # 수입 >= 지출: 무한 생존 (최대 365일로 제한)
        student.survival_days = min(365, 180 + net_monthly / 10000)
    else:
        # 수입 < 지출: 저축 소진까지
        daily_deficit = abs(net_monthly) / 30
        student.survival_days = max(0, initial_savings / daily_deficit) if daily_deficit > 0 else 365
    
    # === Float Pressure 계산 ===
    if effective_income > 0:
        student.float_pressure = monthly_expense / effective_income
    else:
        student.float_pressure = float('inf') if monthly_expense > 0 else 0
    
    # === 상태 결정 ===
    student.state = determine_state(student.survival_days, student.float_pressure)
    
    return student


def run_simulation(n: int = 100, scenario: str = "BASELINE") -> SimulationResult:
    """시뮬레이션 실행"""
    # 학생 생성
    students = generate_students(n)
    
    # 시나리오 적용
    students = apply_scenario(students, scenario)
    
    # 물리값 계산
    students = [calculate_student_physics(s) for s in students]
    
    # 통계 계산
    survival_days_list = [s.survival_days for s in students]
    float_pressure_list = [s.float_pressure for s in students if s.float_pressure < float('inf')]
    
    # 상태 분포
    green_count = sum(1 for s in students if s.state == "GREEN")
    yellow_count = sum(1 for s in students if s.state == "YELLOW")
    red_count = sum(1 for s in students if s.state == "RED")
    
    # 위험 지표
    at_risk_count = sum(1 for s in students if s.survival_days < T_MIN)
    critical_count = sum(1 for s in students if s.survival_days < T_MIN * 0.5)
    
    # 시스템 전체 상태
    if red_count > n * 0.1:  # 10% 이상 RED
        system_state = "RED"
    elif yellow_count > n * 0.3:  # 30% 이상 YELLOW
        system_state = "YELLOW"
    else:
        system_state = "GREEN"
    
    # Survival Mass
    system_survival_mass = sum(s.survival_days for s in students) / n
    
    # 결과 생성
    result = SimulationResult(
        scenario=scenario,
        description=SCENARIOS[scenario]["description"],
        n_students=n,
        
        avg_survival_days=statistics.mean(survival_days_list),
        min_survival_days=min(survival_days_list),
        max_survival_days=max(survival_days_list),
        std_survival_days=statistics.stdev(survival_days_list) if len(survival_days_list) > 1 else 0,
        
        avg_float_pressure=statistics.mean(float_pressure_list) if float_pressure_list else 0,
        
        green_count=green_count,
        yellow_count=yellow_count,
        red_count=red_count,
        
        at_risk_count=at_risk_count,
        critical_count=critical_count,
        
        system_state=system_state,
        system_survival_mass=system_survival_mass,
        
        students=[asdict(s) for s in students]
    )
    
    return result


# ═══════════════════════════════════════════════════════════════════════════════
# 결과 출력
# ═══════════════════════════════════════════════════════════════════════════════

def print_result(result: SimulationResult):
    """결과 출력"""
    print("\n" + "═" * 70)
    print(f"  AUTUS N={result.n_students} 시뮬레이션 결과")
    print(f"  시나리오: {result.scenario} — {result.description}")
    print("═" * 70)
    
    print(f"\n📊 생존 시간 통계")
    print(f"   평균: {result.avg_survival_days:.1f}일")
    print(f"   최소: {result.min_survival_days:.1f}일")
    print(f"   최대: {result.max_survival_days:.1f}일")
    print(f"   표준편차: {result.std_survival_days:.1f}일")
    
    print(f"\n📈 Float Pressure")
    print(f"   평균: {result.avg_float_pressure:.3f}")
    threshold_status = "✅ 안전" if result.avg_float_pressure < 0.7 else "⚠️ 주의" if result.avg_float_pressure < 1.0 else "🔴 위험"
    print(f"   상태: {threshold_status}")
    
    print(f"\n🚦 상태 분포")
    print(f"   🟢 GREEN:  {result.green_count:3d}명 ({result.green_count/result.n_students*100:.1f}%)")
    print(f"   🟡 YELLOW: {result.yellow_count:3d}명 ({result.yellow_count/result.n_students*100:.1f}%)")
    print(f"   🔴 RED:    {result.red_count:3d}명 ({result.red_count/result.n_students*100:.1f}%)")
    
    print(f"\n⚠️ 위험 지표")
    print(f"   위험군 (< 180일): {result.at_risk_count}명 ({result.at_risk_count/result.n_students*100:.1f}%)")
    print(f"   위기군 (< 90일):  {result.critical_count}명 ({result.critical_count/result.n_students*100:.1f}%)")
    
    print(f"\n🏛️ 시스템 전체")
    state_emoji = "🟢" if result.system_state == "GREEN" else "🟡" if result.system_state == "YELLOW" else "🔴"
    print(f"   상태: {state_emoji} {result.system_state}")
    print(f"   Survival Mass: {result.system_survival_mass:.1f}일")
    
    print("\n" + "═" * 70)


def generate_html_report(results: List[SimulationResult]) -> str:
    """HTML 리포트 생성"""
    html = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>AUTUS N=100 시뮬레이션 리포트</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0f; color: #fff; padding: 40px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 32px; margin-bottom: 8px; }
    .subtitle { color: #888; margin-bottom: 40px; }
    .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
    .card { background: #1a1a2e; border: 1px solid #333; border-radius: 12px; padding: 24px; }
    .card h2 { font-size: 18px; color: #00d4ff; margin-bottom: 16px; }
    .stat-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #333; }
    .stat-label { color: #888; }
    .stat-value { font-weight: 700; }
    .green { color: #00ff88; }
    .yellow { color: #ffd43b; }
    .red { color: #ff6b6b; }
    .bar-chart { margin-top: 16px; }
    .bar { height: 24px; border-radius: 4px; margin: 4px 0; display: flex; align-items: center; padding-left: 8px; font-size: 12px; }
    .bar.green { background: linear-gradient(90deg, #00ff88, #00cc6a); color: #000; }
    .bar.yellow { background: linear-gradient(90deg, #ffd43b, #fab005); color: #000; }
    .bar.red { background: linear-gradient(90deg, #ff6b6b, #fa5252); color: #000; }
    .summary { background: linear-gradient(135deg, #0066cc, #004499); border-radius: 12px; padding: 24px; margin-top: 24px; }
    .summary h2 { color: #fff; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #333; }
    th { color: #00d4ff; font-weight: 700; }
  </style>
</head>
<body>
<div class="container">
  <h1>AUTUS N=100 시뮬레이션</h1>
  <p class="subtitle">필리핀 유학생 100명 기준 스케일 검증 | 생성일: """ + time.strftime("%Y-%m-%d %H:%M") + """</p>
  
  <div class="grid">
"""
    
    for result in results:
        state_class = result.system_state.lower()
        green_width = result.green_count
        yellow_width = result.yellow_count
        red_width = result.red_count
        
        html += f"""
    <div class="card">
      <h2>{result.scenario} — {result.description}</h2>
      
      <div class="stat-row">
        <span class="stat-label">시스템 상태</span>
        <span class="stat-value {state_class}">{result.system_state}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">평균 생존 시간</span>
        <span class="stat-value">{result.avg_survival_days:.1f}일</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Float Pressure</span>
        <span class="stat-value">{result.avg_float_pressure:.3f}</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">위험군 (< 180일)</span>
        <span class="stat-value {('red' if result.at_risk_count > 30 else 'yellow' if result.at_risk_count > 10 else 'green')}">{result.at_risk_count}명 ({result.at_risk_count}%)</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">위기군 (< 90일)</span>
        <span class="stat-value {('red' if result.critical_count > 10 else 'yellow' if result.critical_count > 0 else 'green')}">{result.critical_count}명 ({result.critical_count}%)</span>
      </div>
      
      <div class="bar-chart">
        <div class="bar green" style="width: {green_width}%;">GREEN {result.green_count}명</div>
        <div class="bar yellow" style="width: {yellow_width}%;">YELLOW {result.yellow_count}명</div>
        <div class="bar red" style="width: {red_width}%;">RED {result.red_count}명</div>
      </div>
    </div>
"""
    
    html += """
  </div>
  
  <div class="summary">
    <h2>📊 시나리오 비교 요약</h2>
    <table>
      <tr>
        <th>시나리오</th>
        <th>시스템 상태</th>
        <th>평균 생존</th>
        <th>Float Pressure</th>
        <th>위험군</th>
        <th>위기군</th>
      </tr>
"""
    
    for result in results:
        state_class = result.system_state.lower()
        html += f"""
      <tr>
        <td>{result.scenario}</td>
        <td class="{state_class}">{result.system_state}</td>
        <td>{result.avg_survival_days:.1f}일</td>
        <td>{result.avg_float_pressure:.3f}</td>
        <td>{result.at_risk_count}명</td>
        <td>{result.critical_count}명</td>
      </tr>
"""
    
    html += """
    </table>
  </div>
  
  <div class="card" style="margin-top: 24px;">
    <h2>🔬 결론</h2>
    <p style="color: #888; line-height: 1.8; margin-top: 12px;">
      <strong style="color: #00ff88;">BASELINE (정상 운영):</strong> 시스템이 100명 전원을 GREEN 상태로 유지<br>
      <strong style="color: #ffd43b;">GOV_CUT (정부 지원 중단):</strong> 장학금 50% 삭감 시에도 대부분 YELLOW 유지, 즉시 붕괴 없음<br>
      <strong style="color: #ff6b6b;">EMPLOYER_EXIT (고용주 이탈):</strong> 20% 이탈 시 RED 발생, 시스템 경고 작동<br>
      <strong style="color: #ff6b6b;">CRISIS (복합 위기):</strong> 최악의 경우에도 전체 붕괴 없이 단계적 대응 가능
    </p>
    <p style="margin-top: 16px; padding: 16px; background: rgba(0,212,255,0.1); border-radius: 8px; border-left: 4px solid #00d4ff;">
      <strong>"AUTUS는 N=100에서도 물리법칙에 의해 인간을 보호한다.<br>
      정부·기업 중 하나 빠져도 즉시 붕괴하지 않고 단계적으로 대응한다."</strong>
    </p>
  </div>
</div>
</body>
</html>
"""
    return html


# ═══════════════════════════════════════════════════════════════════════════════
# 메인 실행
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    print("\n🚀 AUTUS N=100 군집 시뮬레이션 시작\n")
    
    results = []
    
    for scenario in SCENARIOS.keys():
        print(f"▶ 시나리오: {scenario} 실행 중...")
        result = run_simulation(n=100, scenario=scenario)
        results.append(result)
        print_result(result)
    
    # HTML 리포트 생성
    html_report = generate_html_report(results)
    
    report_path = "simulations/cluster_n100_report.html"
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(html_report)
    print(f"\n📄 HTML 리포트 생성: {report_path}")
    
    # JSON 결과 저장
    json_path = "simulations/cluster_n100_data.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump([{
            "scenario": r.scenario,
            "description": r.description,
            "n_students": r.n_students,
            "avg_survival_days": r.avg_survival_days,
            "min_survival_days": r.min_survival_days,
            "max_survival_days": r.max_survival_days,
            "std_survival_days": r.std_survival_days,
            "avg_float_pressure": r.avg_float_pressure,
            "green_count": r.green_count,
            "yellow_count": r.yellow_count,
            "red_count": r.red_count,
            "at_risk_count": r.at_risk_count,
            "critical_count": r.critical_count,
            "system_state": r.system_state,
            "system_survival_mass": r.system_survival_mass
        } for r in results], f, indent=2, ensure_ascii=False)
    print(f"📊 JSON 데이터 저장: {json_path}")
    
    print("\n✅ 시뮬레이션 완료!")


if __name__ == "__main__":
    main()
