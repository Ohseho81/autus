#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()



















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    👻 AUTUS WAR GAME SIMULATOR - Ghost UI                                 ║
║                                                                                           ║
║  "버튼을 누르기 전에, 실행하면 무슨 일이 벌어질지 미리 본다"                                   ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ 쿠폰 할인율 시뮬레이션                                                                 ║
║  ✅ 인력 배치 시뮬레이션                                                                   ║
║  ✅ 수강료 인상 시뮬레이션                                                                 ║
║  ✅ 마케팅 ROI 예측                                                                       ║
║  ✅ 실시간 Ghost Projection                                                               ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run WarGameSimulator.py
    
요구사항:
    pip install streamlit pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 시뮬레이션 모델
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class SimulationResult:
    """시뮬레이션 결과"""
    scenario_name: str
    input_vars: Dict[str, Any]
    expected_customers: int
    expected_revenue: float
    expected_cost: float
    expected_profit: float
    response_rate: float
    risk_level: str
    recommendations: List[str]
    optimal: bool = False


class SimulationEngine:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        # 기준 데이터 (실제로는 DB에서 로드)
        self.baseline: Dict[str, Any] = {
            "total_customers": 1000,
            "avg_ticket": 20000,
            "cost_per_customer": 10000,
            "vip_count": 100,
            "risk_count": 50,
            "new_count": 300,
        }
        
        # 고객 유형별 민감도
        self.sensitivity: Dict[str, float] = {
            "all": 1.0,
            "vip": 0.5,
            "risk": 0.3,
            "new": 2.0,
            "dormant": 1.5,
        }
    
    def simulate_coupon(
        self,
        discount_rate: float,
        target_group: str = "all",
        budget: float = 1000000
    ) -> SimulationResult:
        """
        쿠폰 할인 시뮬레이션
        
        Args:
            discount_rate: 할인율 (0~100)
            target_group: 타겟 그룹 (all, vip, risk, new, dormant)
            budget: 마케팅 예산
        """
        # 기준 고객 수
        if target_group == "vip":
            base_customers = self.baseline["vip_count"]
        elif target_group == "risk":
            base_customers = self.baseline["risk_count"]
        elif target_group == "new":
            base_customers = self.baseline["new_count"]
        else:
            base_customers = self.baseline["total_customers"]
        
        sensitivity = self.sensitivity.get(target_group, 1.0)
        
        # 반응률 계산 (할인율 * 민감도)
        response_rate = min(100, discount_rate * sensitivity * 1.5)
        
        # 예상 방문객
        expected_customers = int(base_customers * (response_rate / 100))
        
        # 객단가 (할인 적용)
        discounted_ticket = self.baseline["avg_ticket"] * (1 - discount_rate / 100)
        
        # 매출 및 비용
        expected_revenue = expected_customers * discounted_ticket
        expected_cost = expected_customers * self.baseline["cost_per_customer"] + (discount_rate / 100 * budget)
        expected_profit = expected_revenue - expected_cost
        
        # 리스크 판단
        if expected_profit < 0:
            risk_level = "HIGH"
        elif expected_profit < expected_revenue * 0.1:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 최적점 판단
        optimal = 0.15 <= expected_profit / max(expected_revenue, 1) <= 0.25
        
        # 권장 사항
        recommendations: List[str] = []
        if discount_rate > 30:
            recommendations.append("⚠️ 할인율이 너무 높습니다. 마진 감소 우려.")
        if target_group == "risk":
            recommendations.append("⚠️ 진상 고객 대상 쿠폰은 비효율적입니다.")
        if response_rate > 80 and expected_profit < 0:
            recommendations.append("💡 반응은 좋지만 수익이 없습니다. 할인율을 낮추세요.")
        if optimal:
            recommendations.append("⭐ 최적의 할인율입니다!")
        
        return SimulationResult(
            scenario_name=f"쿠폰 {discount_rate}% - {target_group}",
            input_vars={"discount_rate": discount_rate, "target_group": target_group},
            expected_customers=expected_customers,
            expected_revenue=expected_revenue,
            expected_cost=expected_cost,
            expected_profit=expected_profit,
            response_rate=response_rate,
            risk_level=risk_level,
            recommendations=recommendations,
            optimal=optimal,
        )
    
    def simulate_price_change(
        self,
        price_delta: int,
        current_students: int = 100
    ) -> SimulationResult:
        """
        수강료/가격 변경 시뮬레이션
        
        Args:
            price_delta: 가격 변동 (원)
            current_students: 현재 학생 수
        """
        # 가격 탄력성 (가격 1만원 인상당 이탈률)
        churn_rate_per_10k = 0.05
        
        if price_delta > 0:
            # 인상 시 이탈
            churn_rate = (price_delta / 10000) * churn_rate_per_10k
            expected_students = int(current_students * (1 - churn_rate))
        else:
            # 인하 시 유입
            growth_rate = abs(price_delta / 10000) * churn_rate_per_10k * 0.5
            expected_students = int(current_students * (1 + growth_rate))
        
        # 기존 수강료 가정
        base_price = 300000
        new_price = base_price + price_delta
        
        # 매출 계산
        current_revenue = current_students * base_price
        expected_revenue = expected_students * new_price
        
        revenue_change = expected_revenue - current_revenue
        student_change = expected_students - current_students
        
        # 리스크 판단
        if student_change < -10:
            risk_level = "HIGH"
        elif student_change < -5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
        
        # 권장 사항
        recommendations: List[str] = []
        if revenue_change > 0 and student_change < 0:
            recommendations.append("💰 매출은 증가하나 학생 수 감소. 분위기 저하 우려.")
        if revenue_change < 0:
            recommendations.append("⚠️ 매출 감소가 예상됩니다.")
        if price_delta > 50000:
            recommendations.append("⚠️ 급격한 인상은 대량 이탈을 유발할 수 있습니다.")
        if -20000 <= price_delta <= 30000 and revenue_change > 0:
            recommendations.append("⭐ 적정 범위의 가격 조정입니다.")
        
        return SimulationResult(
            scenario_name=f"가격 변경 {price_delta:+,}원",
            input_vars={"price_delta": price_delta, "current_students": current_students},
            expected_customers=expected_students,
            expected_revenue=expected_revenue,
            expected_cost=current_revenue,
            expected_profit=revenue_change,
            response_rate=(expected_students / current_students) * 100,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def simulate_staff_assignment(
        self,
        staff_level: str,
        customer_type: str
    ) -> SimulationResult:
        """
        직원 배치 시뮬레이션
        
        Args:
            staff_level: 직원 수준 (rookie, regular, senior, manager)
            customer_type: 고객 유형 (vip, normal, risk)
        """
        # 직원 수준별 서비스 품질
        quality_scores: Dict[str, int] = {
            "rookie": 60,
            "regular": 75,
            "senior": 85,
            "manager": 95,
        }
        
        # 고객 유형별 요구 수준
        requirement_scores: Dict[str, int] = {
            "vip": 90,
            "normal": 70,
            "risk": 85,
        }
        
        quality = quality_scores.get(staff_level, 70)
        requirement = requirement_scores.get(customer_type, 70)
        
        # 매칭 점수
        match_score = quality - requirement
        
        # 결과 예측
        if match_score >= 10:
            satisfaction = 95
            complaint_prob = 5
            tip_prob = 80 if customer_type == "vip" else 30
            risk_level = "LOW"
        elif match_score >= 0:
            satisfaction = 80
            complaint_prob = 15
            tip_prob = 50 if customer_type == "vip" else 10
            risk_level = "LOW"
        elif match_score >= -10:
            satisfaction = 60
            complaint_prob = 30
            tip_prob = 10
            risk_level = "MEDIUM"
        else:
            satisfaction = 40
            complaint_prob = 60
            tip_prob = 0
            risk_level = "HIGH"
        
        # 권장 사항
        recommendations: List[str] = []
        if match_score < 0 and customer_type == "vip":
            recommendations.append("⚠️ VIP에게 신입을 배정하면 안 됩니다!")
        if match_score < 0 and customer_type == "risk":
            recommendations.append("⚠️ 진상 고객에게 경력자가 필요합니다.")
        if match_score >= 10:
            recommendations.append("✅ 최적의 배치입니다.")
        if staff_level == "manager" and customer_type == "normal":
            recommendations.append("💡 매니저 투입은 과잉일 수 있습니다.")
        
        return SimulationResult(
            scenario_name=f"{staff_level} → {customer_type}",
            input_vars={"staff_level": staff_level, "customer_type": customer_type},
            expected_customers=1,
            expected_revenue=satisfaction * 1000,
            expected_cost=complaint_prob * 500,
            expected_profit=tip_prob * 100,
            response_rate=satisfaction,
            risk_level=risk_level,
            recommendations=recommendations,
        )
    
    def find_optimal_discount(self, target_group: str = "all") -> Dict[str, Any]:
        """최적 할인율 찾기"""
        results: List[Dict[str, Any]] = []
        
        for discount in range(0, 55, 5):
            result = self.simulate_coupon(discount, target_group)
            results.append({
                "discount": discount,
                "profit": result.expected_profit,
                "customers": result.expected_customers,
                "response_rate": result.response_rate,
            })
        
        # 최대 이익 지점
        optimal = max(results, key=lambda x: x["profit"])
        
        return {
            "optimal_discount": optimal["discount"],
            "expected_profit": optimal["profit"],
            "expected_customers": optimal["customers"],
            "all_results": results,
        }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_war_game() -> None:
    """War Game Simulator UI"""
    
    st.set_page_config(
        page_title="AUTUS War Game",
        page_icon="👻",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .ghost-box {
            background: rgba(255,255,255,0.03);
            border: 1px dashed #666;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .ghost-text {
            color: rgba(255,255,255,0.6);
            font-style: italic;
        }
        .optimal-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .risk-high { color: #ff4444; }
        .risk-medium { color: #ffaa00; }
        .risk-low { color: #44ff44; }
    </style>
    """, unsafe_allow_html=True)
    
    # 엔진 초기화
    engine = SimulationEngine()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">👻 WAR GAME SIMULATOR</h1>
        <p style="color: #888;">변수를 조작하여 미래를 예측하십시오. (실제 실행되지 않음)</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 탭
    tab1, tab2, tab3, tab4 = st.tabs([
        "💳 쿠폰 시뮬레이션", 
        "💰 가격 변경", 
        "👤 인력 배치",
        "🎯 최적점 찾기"
    ])
    
    # ─── Tab 1: 쿠폰 시뮬레이션 ───
    with tab1:
        st.markdown("### 💳 쿠폰 할인율 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            discount_rate = st.slider(
                "할인율 (%)", 
                min_value=0, 
                max_value=50, 
                value=10, 
                step=5,
                help="슬라이더를 움직여 다양한 시나리오를 테스트하세요"
            )
            
            target_group = st.selectbox(
                "타겟 그룹",
                ["all", "vip", "new", "risk", "dormant"],
                format_func=lambda x: {
                    "all": "전체 고객",
                    "vip": "👑 VIP (Orbit)",
                    "new": "🌟 신규 (Nebula)",
                    "risk": "⚠️ 진상 (Risk)",
                    "dormant": "😴 휴면 고객",
                }.get(x, x)
            )
            
            budget = st.number_input("마케팅 예산 (원)", value=1000000, step=100000)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            # 실시간 시뮬레이션
            result = engine.simulate_coupon(discount_rate, target_group, budget)
            
            # 결과 표시
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric(
                    "예상 방문객", 
                    f"{result.expected_customers:,}명",
                    f"{result.response_rate:.0f}% 반응"
                )
            
            with col_b:
                st.metric(
                    "예상 매출",
                    f"₩{result.expected_revenue:,.0f}",
                )
            
            with col_c:
                profit_delta = "normal" if result.expected_profit > 0 else "inverse"
                st.metric(
                    "예상 순이익",
                    f"₩{result.expected_profit:,.0f}",
                    delta_color=profit_delta
                )
            
            # 리스크 표시
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f"""
            <p class="{risk_class}">
                리스크 수준: <strong>{result.risk_level}</strong>
            </p>
            """, unsafe_allow_html=True)
            
            # 권장 사항
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 차트
            chart_data = pd.DataFrame({
                "항목": ["매출", "비용", "이익"],
                "금액": [result.expected_revenue, result.expected_cost, result.expected_profit]
            })
            st.bar_chart(chart_data.set_index("항목"))
    
    # ─── Tab 2: 가격 변경 ───
    with tab2:
        st.markdown("### 💰 수강료/가격 변경 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            price_delta = st.slider(
                "가격 변동 (원)",
                min_value=-100000,
                max_value=100000,
                value=0,
                step=10000,
                format="%+d"
            )
            
            current_students = st.number_input("현재 학생/고객 수", value=100, step=10)
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_price_change(price_delta, current_students)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b = st.columns(2)
            
            with col_a:
                student_change = result.expected_customers - current_students
                st.metric(
                    "예상 학생 수",
                    f"{result.expected_customers}명",
                    f"{student_change:+d}명"
                )
            
            with col_b:
                st.metric(
                    "매출 변화",
                    f"₩{result.expected_profit:+,.0f}",
                    delta_color="normal" if result.expected_profit >= 0 else "inverse"
                )
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>', 
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.warning(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 이탈 시각화
            if price_delta > 0:
                churned = current_students - result.expected_customers
                st.markdown(f"""
                <div style="text-align: center; padding: 20px;">
                    <span style="font-size: 3em;">👥</span>
                    <span style="font-size: 2em; color: #888;"> → </span>
                    <span style="font-size: 3em; color: #ff4444;">-{churned}명</span>
                </div>
                """, unsafe_allow_html=True)
    
    # ─── Tab 3: 인력 배치 ───
    with tab3:
        st.markdown("### 👤 인력 배치 시뮬레이션")
        
        col1, col2 = st.columns([1, 2])
        
        with col1:
            st.markdown("#### 🎛️ 변수 조작")
            
            staff_level = st.selectbox(
                "직원 수준",
                ["rookie", "regular", "senior", "manager"],
                format_func=lambda x: {
                    "rookie": "🌱 신입 알바",
                    "regular": "👤 일반 직원",
                    "senior": "⭐ 시니어",
                    "manager": "👔 매니저",
                }.get(x, x)
            )
            
            customer_type = st.selectbox(
                "고객 유형",
                ["normal", "vip", "risk"],
                format_func=lambda x: {
                    "normal": "😊 일반 고객",
                    "vip": "👑 VIP 고객",
                    "risk": "⚠️ 주의 고객",
                }.get(x, x)
            )
        
        with col2:
            st.markdown("#### 👻 Ghost Projection")
            
            result = engine.simulate_staff_assignment(staff_level, customer_type)
            
            st.markdown('<div class="ghost-box">', unsafe_allow_html=True)
            
            col_a, col_b, col_c = st.columns(3)
            
            with col_a:
                st.metric("예상 만족도", f"{result.response_rate:.0f}%")
            
            with col_b:
                complaint_prob = result.expected_cost / 5
                st.metric("컴플레인 확률", f"{complaint_prob:.0f}%")
            
            with col_c:
                tip_prob = result.expected_profit
                st.metric("팁 확률", f"{tip_prob:.0f}%")
            
            risk_class = f"risk-{result.risk_level.lower()}"
            st.markdown(f'<p class="{risk_class}">리스크: <strong>{result.risk_level}</strong></p>',
                       unsafe_allow_html=True)
            
            for rec in result.recommendations:
                if "✅" in rec or "⭐" in rec:
                    st.success(rec)
                elif "⚠️" in rec:
                    st.error(rec)
                else:
                    st.info(rec)
            
            st.markdown('</div>', unsafe_allow_html=True)
            
            # 매칭 시각화
            staff_icons = {"rookie": "🌱", "regular": "👤", "senior": "⭐", "manager": "👔"}
            customer_icons = {"normal": "😊", "vip": "👑", "risk": "⚠️"}
            
            match_color = "#44ff44" if result.risk_level == "LOW" else "#ffaa00" if result.risk_level == "MEDIUM" else "#ff4444"
            
            st.markdown(f"""
            <div style="text-align: center; padding: 30px; font-size: 2em;">
                <span>{staff_icons.get(staff_level, '👤')}</span>
                <span style="color: {match_color};"> ━━━ </span>
                <span>{customer_icons.get(customer_type, '😊')}</span>
            </div>
            """, unsafe_allow_html=True)
    
    # ─── Tab 4: 최적점 찾기 ───
    with tab4:
        st.markdown("### 🎯 최적점 자동 탐색")
        
        target = st.selectbox(
            "타겟 그룹 선택",
            ["all", "vip", "new"],
            format_func=lambda x: {"all": "전체", "vip": "VIP", "new": "신규"}.get(x, x)
        )
        
        if st.button("🔍 최적 할인율 찾기", use_container_width=True):
            with st.spinner("시뮬레이션 실행 중..."):
                optimal = engine.find_optimal_discount(target)
            
            st.success(f"""
            ⭐ **최적 할인율: {optimal['optimal_discount']}%**
            
            - 예상 이익: ₩{optimal['expected_profit']:,.0f}
            - 예상 고객: {optimal['expected_customers']}명
            """)
            
            # 차트
            df = pd.DataFrame(optimal['all_results'])
            
            st.markdown("#### 할인율별 이익 곡선")
            st.line_chart(df.set_index('discount')['profit'])
            
            st.markdown("#### 할인율별 반응률")
            st.line_chart(df.set_index('discount')['response_rate'])
    
    # 푸터
    st.markdown("---")
    st.markdown("""
    <div style="text-align: center; color: #666; font-size: 0.85em;">
        👻 Ghost UI - 실행 전 미리 보는 미래 | AUTUS WAR GAME SIMULATOR
    </div>
    """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_war_game()

























