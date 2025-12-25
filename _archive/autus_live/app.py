#!/usr/bin/env python3
"""
AUTUS v1.0 Live Dashboard
=========================
Streamlit 기반 듀얼 모드 대시보드

Modes:
- Expert Mode: 냉정한 금융 전문가 (다크 테마)
- Navigator Mode: 미래지향 네비게이션 (네온/사이버 테마)

Usage:
    streamlit run app.py
"""

import streamlit as st
import json
import time
from datetime import datetime, timedelta
import plotly.graph_objects as go
import plotly.express as px

# 커널 임포트
from kernel import AutusKernel, load_entities

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE CONFIG
# ═══════════════════════════════════════════════════════════════════════════════

st.set_page_config(
    page_title="AUTUS v1.0 | 무결성 자산 요새",
    page_icon="🏰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOM CSS
# ═══════════════════════════════════════════════════════════════════════════════

EXPERT_CSS = """
<style>
    .stApp {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #eee;
    }
    .metric-card {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 10px;
        padding: 20px;
        margin: 10px 0;
    }
    .danger { color: #ff4757; }
    .warning { color: #ffa502; }
    .success { color: #2ed573; }
    .info { color: #1e90ff; }
    .big-number {
        font-size: 3rem;
        font-weight: 700;
        line-height: 1;
    }
    .subtitle {
        font-size: 0.9rem;
        color: #888;
    }
</style>
"""

NAVIGATOR_CSS = """
<style>
    .stApp {
        background: linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%);
        color: #fff;
    }
    .metric-card {
        background: rgba(0,255,255,0.05);
        border: 1px solid rgba(0,255,255,0.3);
        border-radius: 15px;
        padding: 20px;
        margin: 10px 0;
        box-shadow: 0 0 20px rgba(0,255,255,0.1);
    }
    .neon-text {
        text-shadow: 0 0 10px #0ff, 0 0 20px #0ff, 0 0 30px #0ff;
    }
    .glow-box {
        animation: glow 2s ease-in-out infinite alternate;
    }
    @keyframes glow {
        from { box-shadow: 0 0 10px #0ff; }
        to { box-shadow: 0 0 30px #0ff, 0 0 40px #f0f; }
    }
    .countdown {
        font-size: 4rem;
        font-weight: 900;
        background: linear-gradient(90deg, #00ffff, #ff00ff);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }
</style>
"""

# ═══════════════════════════════════════════════════════════════════════════════
# SESSION STATE
# ═══════════════════════════════════════════════════════════════════════════════

if 'kernel' not in st.session_state:
    st.session_state.kernel = AutusKernel()

if 'mode' not in st.session_state:
    st.session_state.mode = "expert"

if 'user' not in st.session_state:
    st.session_state.user = "founder"

if 'transfer_ratio' not in st.session_state:
    st.session_state.transfer_ratio = 0.30

kernel = st.session_state.kernel

# ═══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ═══════════════════════════════════════════════════════════════════════════════

with st.sidebar:
    st.image("https://via.placeholder.com/200x60/1a1a2e/00ffff?text=AUTUS+v1.0", use_container_width=True)
    
    st.markdown("---")
    
    # 사용자 선택
    st.subheader("👤 사용자")
    user = st.selectbox(
        "계정 선택",
        ["founder", "jongho", "jinho"],
        format_func=lambda x: {
            "founder": "🏰 파운더 (ATB)",
            "jongho": "📚 김종호 (교육법인)",
            "jinho": "🍽️ 김진호 (F&B)"
        }[x],
        key="user_select"
    )
    st.session_state.user = user
    
    st.markdown("---")
    
    # 모드 선택
    st.subheader("🎨 테마 모드")
    mode = st.radio(
        "선택",
        ["expert", "navigator"],
        format_func=lambda x: {
            "expert": "📊 Expert Mode (금융 전문가)",
            "navigator": "🚀 Navigator Mode (미래 네비)"
        }[x],
        key="mode_select"
    )
    st.session_state.mode = mode
    
    st.markdown("---")
    
    # 이전 비율 조절
    st.subheader("⚙️ 이전 비율")
    transfer_ratio = st.slider(
        "김종호 수익 → ATB",
        min_value=0.10,
        max_value=0.50,
        value=st.session_state.transfer_ratio,
        step=0.05,
        format="%.0f%%",
        key="ratio_slider"
    )
    st.session_state.transfer_ratio = transfer_ratio
    
    st.markdown("---")
    
    # 실시간 시계
    st.subheader("🕐 현재 시각")
    time_placeholder = st.empty()

# ═══════════════════════════════════════════════════════════════════════════════
# APPLY CSS
# ═══════════════════════════════════════════════════════════════════════════════

if st.session_state.mode == "expert":
    st.markdown(EXPERT_CSS, unsafe_allow_html=True)
else:
    st.markdown(NAVIGATOR_CSS, unsafe_allow_html=True)

# ═══════════════════════════════════════════════════════════════════════════════
# DATA LOAD
# ═══════════════════════════════════════════════════════════════════════════════

report = kernel.generate_full_report(st.session_state.transfer_ratio)
founder = report["founder"]
jongho = report["jongho"]
plan = report["optimized_plan"]
loss = report["loss_velocity"]
clark = report["clark_hub"]
jeju = report["jeju_2026"]

# ═══════════════════════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════════════════════

if st.session_state.mode == "expert":
    st.title("📊 AUTUS v1.0 | Expert Dashboard")
    st.caption("냉정한 금융 전문가의 시선으로 본 무결성 자산 요새")
else:
    st.markdown("<h1 class='neon-text'>🚀 AUTUS v1.0 | Navigator</h1>", unsafe_allow_html=True)
    st.caption("미래를 향한 자산 증류 시스템")

# ═══════════════════════════════════════════════════════════════════════════════
# ALERT BANNER
# ═══════════════════════════════════════════════════════════════════════════════

debt_ratio = founder["debt_ratio"]
if debt_ratio >= 0.9:
    alert_type = "error"
    alert_msg = f"🚨 CRITICAL: 부채 압력 {debt_ratio:.0%} - 즉시 현금 유입 필요!"
elif debt_ratio >= 0.7:
    alert_type = "warning"
    alert_msg = f"⚠️ WARNING: 부채 압력 {debt_ratio:.0%} - 모니터링 필요"
else:
    alert_type = "success"
    alert_msg = f"✅ STABLE: 부채 압력 {debt_ratio:.0%}"

if alert_type == "error":
    st.error(alert_msg)
elif alert_type == "warning":
    st.warning(alert_msg)
else:
    st.success(alert_msg)

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN CONTENT - BY USER
# ═══════════════════════════════════════════════════════════════════════════════

if st.session_state.user == "founder":
    # ─────────────────────────────────────────────────────────────────────────
    # FOUNDER VIEW
    # ─────────────────────────────────────────────────────────────────────────
    
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            "💰 자산",
            f"₩{founder['assets']}억",
            delta=None
        )
    
    with col2:
        st.metric(
            "💳 부채",
            f"₩{founder['debt']}억",
            delta=f"-{plan['debt_reduction']:.1f}억/년" if plan['debt_reduction'] > 0 else None,
            delta_color="inverse"
        )
    
    with col3:
        st.metric(
            "📉 연간 적자",
            f"₩{founder['annual_deficit']}억",
            delta=f"커버 {plan['deficit_coverage']:.1f}억" if plan['deficit_coverage'] > 0 else None
        )
    
    with col4:
        st.metric(
            "💸 손실 속도",
            f"₩{loss['per_second']:,.0f}/초",
            delta=f"{loss['state']}",
            delta_color="inverse" if loss['state'] != "STABLE" else "normal"
        )
    
    st.markdown("---")
    
    # 최적화된 거래
    st.subheader("✅ 최적화된 거래 계획")
    
    col1, col2 = st.columns([2, 1])
    
    with col1:
        tx_data = []
        for tx in plan["transactions"]:
            tx_data.append({
                "유형": tx["type"],
                "금액 (억)": tx["amount"],
                "설명": tx["desc"]
            })
        
        if tx_data:
            st.dataframe(tx_data, use_container_width=True)
    
    with col2:
        st.metric("총 이전액", f"₩{plan['total']:.1f}억")
        st.metric("국세청 적합성", f"{plan['compliance']:.0%}")
        st.metric("절세액", f"₩{plan['tax_saved']:.1f}억")
        
        if plan["warnings"]:
            for w in plan["warnings"]:
                st.warning(w)
    
    st.markdown("---")
    
    # 제주 카운트다운
    if st.session_state.mode == "navigator":
        st.subheader("🏝️ JEJU 2026 COUNTDOWN")
        
        col1, col2, col3 = st.columns(3)
        
        with col1:
            st.markdown(f"<div class='countdown'>{jeju['days_remaining']}</div>", unsafe_allow_html=True)
            st.caption("일 남음")
        
        with col2:
            st.metric("월 매출 추가", f"₩{jeju['monthly_revenue']}억")
            st.metric("연간 절세", f"₩{jeju['tax_savings']:.2f}억")
        
        with col3:
            # 진행률 차트
            progress = 1 - (jeju['months_remaining'] / 24)
            fig = go.Figure(go.Indicator(
                mode="gauge+number",
                value=progress * 100,
                title={'text': "완공 진행률"},
                gauge={
                    'axis': {'range': [0, 100]},
                    'bar': {'color': "#00ffff"},
                    'bgcolor': "rgba(0,0,0,0.5)",
                    'steps': [
                        {'range': [0, 50], 'color': "rgba(255,0,0,0.3)"},
                        {'range': [50, 80], 'color': "rgba(255,255,0,0.3)"},
                        {'range': [80, 100], 'color': "rgba(0,255,0,0.3)"}
                    ]
                }
            ))
            fig.update_layout(
                paper_bgcolor="rgba(0,0,0,0)",
                font={'color': "white"},
                height=200,
                margin=dict(l=20, r=20, t=40, b=20)
            )
            st.plotly_chart(fig, use_container_width=True)
    else:
        st.subheader("🏝️ 제주 사옥 마일스톤 (2026.06)")
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("남은 기간", f"{jeju['months_remaining']}개월")
        with col2:
            st.metric("월 매출", f"₩{jeju['monthly_revenue']}억")
        with col3:
            st.metric("감가상각", f"₩{jeju['annual_depreciation']:.2f}억/년")
        with col4:
            st.metric("절세 효과", f"₩{jeju['tax_savings']:.2f}억/년")

elif st.session_state.user == "jongho":
    # ─────────────────────────────────────────────────────────────────────────
    # JONGHO VIEW
    # ─────────────────────────────────────────────────────────────────────────
    
    st.subheader("📚 김종호 교육법인 대시보드")
    
    # 핵심 지표
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric("총 매출", f"₩{jongho['total_revenue']}억")
    
    with col2:
        st.metric("총 수익", f"₩{jongho['total_profit']}억")
    
    with col3:
        st.metric("이번 달 절세", f"₩{plan['tax_saved']/12:.1f}억", delta="예상")
    
    with col4:
        st.metric("연간 절세 확정", f"₩{plan['tax_saved']:.1f}억")
    
    st.markdown("---")
    
    # 법인별 현황
    st.subheader("📊 법인별 현황")
    
    corp_data = []
    for corp in jongho["corporations"]:
        corp_data.append({
            "법인명": corp["name"],
            "매출 (억)": corp["revenue"],
            "수익 (억)": corp["profit"],
            "수익률": f"{corp['profit']/corp['revenue']*100:.1f}%"
        })
    
    st.dataframe(corp_data, use_container_width=True)
    
    # 수익 분포 차트
    fig = px.pie(
        values=[c["profit"] for c in jongho["corporations"]],
        names=[c["name"] for c in jongho["corporations"]],
        title="법인별 수익 분포",
        hole=0.4
    )
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={'color': "white"}
    )
    st.plotly_chart(fig, use_container_width=True)
    
    st.markdown("---")
    
    # 이전 구조
    st.subheader("💸 AUTUS 협력 구조")
    
    st.info(f"""
    **김종호 법인 → ATB 이전 계획**
    
    - 총 이전액: **₩{plan['total']:.1f}억/년**
    - 로열티: ₩{sum(tx['amount'] for tx in plan['transactions'] if tx['type']=='ROYALTY'):.1f}억
    - R&D 분담: ₩{sum(tx['amount'] for tx in plan['transactions'] if tx['type']=='RND_SHARE'):.1f}억
    - 용역비: ₩{sum(tx['amount'] for tx in plan['transactions'] if tx['type']=='SERVICE_FEE'):.1f}억
    
    **귀하의 절세 효과: ₩{plan['tax_saved']:.1f}억/년** ✅
    """)

else:
    # ─────────────────────────────────────────────────────────────────────────
    # JINHO VIEW
    # ─────────────────────────────────────────────────────────────────────────
    
    st.subheader("🍽️ 김진호 F&B 대시보드")
    
    jinho_data = kernel.jinho["financials"]
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("매출", f"₩{jinho_data['revenue']}억")
    
    with col2:
        st.metric("수익", f"₩{jinho_data['profit']}억")
    
    with col3:
        st.metric("수익률", f"{jinho_data['profit']/jinho_data['revenue']*100:.1f}%")
    
    st.markdown("---")
    
    st.info("""
    **AUTUS 연합 참여 현황**
    
    - 현재 상태: 독립 운영
    - 연합 참여 시 예상 절세: 약 ₩2억/년
    - 권장 사항: R&D 분담금 협력 검토
    """)

# ═══════════════════════════════════════════════════════════════════════════════
# CLARK HUB (FOUNDER ONLY)
# ═══════════════════════════════════════════════════════════════════════════════

if st.session_state.user == "founder":
    st.markdown("---")
    st.subheader("🌏 Clark Hub (필리핀 절세 센터)")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("이전 가능액", f"₩{clark['transferable']:.1f}억")
    
    with col2:
        st.metric("회피 세금", f"₩{clark['domestic_tax_avoided']:.1f}억")
    
    with col3:
        st.metric("순 절세액", f"₩{clark['net_tax_saved']:.1f}억")
    
    # 5년 시뮬레이션
    sim_data = kernel.clark.simulate_5_years(plan['total'])
    
    fig = go.Figure()
    fig.add_trace(go.Bar(
        x=[f"Year {d['year']}" for d in sim_data],
        y=[d['tax_saved'] for d in sim_data],
        name="연간 절세",
        marker_color="#00ffff"
    ))
    fig.add_trace(go.Scatter(
        x=[f"Year {d['year']}" for d in sim_data],
        y=[d['cumulative_saved'] for d in sim_data],
        name="누적 절세",
        line=dict(color="#ff00ff", width=3)
    ))
    fig.update_layout(
        title="5년 절세 시뮬레이션",
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={'color': "white"},
        legend=dict(orientation="h", yanchor="bottom", y=1.02)
    )
    st.plotly_chart(fig, use_container_width=True)

# ═══════════════════════════════════════════════════════════════════════════════
# FOOTER
# ═══════════════════════════════════════════════════════════════════════════════

st.markdown("---")

col1, col2, col3 = st.columns(3)

with col1:
    st.caption(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

with col2:
    st.caption("🔬 L = ∫(P + R×S)dt")

with col3:
    st.caption("🏰 AUTUS v1.0 | 무결성 자산 요새")

# 사이드바 시계 업데이트
with st.sidebar:
    time_placeholder.markdown(f"**{datetime.now().strftime('%H:%M:%S')}**")
