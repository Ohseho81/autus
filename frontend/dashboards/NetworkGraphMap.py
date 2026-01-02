#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()



















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()









#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                                                                                           ║
║                    🕸️ AUTUS NETWORK GRAPH MAP - 인맥 시각화                                ║
║                                                                                           ║
║  "점(Node)과 선(Edge)으로 보는 인간 관계도"                                                 ║
║                                                                                           ║
║  Features:                                                                                ║
║  ✅ Force-Directed Graph 시각화                                                           ║
║  ✅ 허브(Hub) 하이라이트                                                                   ║
║  ✅ 클러스터(Community) 색상 구분                                                          ║
║  ✅ 관계 강도별 선 굵기                                                                    ║
║  ✅ 이탈 영향 시뮬레이션 시각화                                                             ║
║                                                                                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝

실행:
    streamlit run NetworkGraphMap.py
    
요구사항:
    pip install streamlit plotly networkx pandas numpy
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
import json
from typing import Dict, List, Any, Optional, Tuple

# Plotly for network visualization
try:
    import plotly.graph_objects as go
    PLOTLY_AVAILABLE = True
except ImportError:
    PLOTLY_AVAILABLE = False

# NetworkX for graph analysis
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 테스트 데이터 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_sample_network() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """샘플 네트워크 데이터 생성"""
    
    # 노드 (사람)
    nodes: List[Dict[str, Any]] = [
        {"id": "kim", "name": "김철수", "m_score": 90, "pagerank": 85, "is_vip": True, "total_spent": 5000000},
        {"id": "lee", "name": "이영희", "m_score": 70, "pagerank": 60, "is_vip": True, "total_spent": 3000000},
        {"id": "park", "name": "박민수", "m_score": 50, "pagerank": 40, "is_vip": False, "total_spent": 1500000},
        {"id": "choi", "name": "최지훈", "m_score": 60, "pagerank": 35, "is_vip": False, "total_spent": 2000000},
        {"id": "jung", "name": "정수진", "m_score": 40, "pagerank": 25, "is_vip": False, "total_spent": 1000000},
        {"id": "kang", "name": "강미영", "m_score": 55, "pagerank": 45, "is_vip": False, "total_spent": 1800000},
        {"id": "cho", "name": "조현우", "m_score": 80, "pagerank": 30, "is_vip": False, "total_spent": 4000000, "is_risk": True},
        {"id": "yoon", "name": "윤서연", "m_score": 45, "pagerank": 20, "is_vip": False, "total_spent": 800000},
        {"id": "han", "name": "한지민", "m_score": 35, "pagerank": 15, "is_vip": False, "total_spent": 600000},
        {"id": "song", "name": "송민호", "m_score": 65, "pagerank": 50, "is_vip": True, "total_spent": 2500000},
    ]
    
    # 엣지 (관계)
    edges: List[Dict[str, Any]] = [
        {"source": "kim", "target": "lee", "type": "FAMILY", "weight": 5},
        {"source": "kim", "target": "park", "type": "REFERRAL", "weight": 4},
        {"source": "kim", "target": "choi", "type": "REFERRAL", "weight": 4},
        {"source": "lee", "target": "kang", "type": "FAMILY", "weight": 5},
        {"source": "park", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "jung", "type": "FRIEND", "weight": 2},
        {"source": "cho", "target": "yoon", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "han", "type": "REFERRAL", "weight": 4},
        {"source": "song", "target": "kang", "type": "FRIEND", "weight": 2},
        {"source": "choi", "target": "song", "type": "FRIEND", "weight": 2},
    ]
    
    return nodes, edges


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 그래프 시각화 (Plotly)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_network_graph(
    nodes: List[Dict[str, Any]], 
    edges: List[Dict[str, Any]], 
    highlight_node: Optional[str] = None
) -> Optional[go.Figure]:
    """네트워크 그래프 생성"""
    
    if not NETWORKX_AVAILABLE or not PLOTLY_AVAILABLE:
        return None
    
    # NetworkX 그래프 생성
    G = nx.Graph()
    
    # 노드 추가
    for node in nodes:
        G.add_node(node["id"], **node)
    
    # 엣지 추가
    for edge in edges:
        G.add_edge(edge["source"], edge["target"], 
                   rel_type=edge["type"], weight=edge["weight"])
    
    # 레이아웃 계산 (Force-directed)
    pos = nx.spring_layout(G, k=2, iterations=50, seed=42)
    
    # 엣지 트레이스
    edge_traces: List[go.Scatter] = []
    
    # 관계 유형별 색상
    colors: Dict[str, str] = {
        "FAMILY": "#FFD700",
        "REFERRAL": "#00FFFF",
        "FRIEND": "#888888",
        "GROUP": "#FF69B4",
    }
    
    for edge in edges:
        x0, y0 = pos[edge["source"]]
        x1, y1 = pos[edge["target"]]
        
        # 가중치별 굵기
        width = edge["weight"] * 1.5
        
        edge_trace = go.Scatter(
            x=[x0, x1, None],
            y=[y0, y1, None],
            mode='lines',
            line=dict(
                width=width,
                color=colors.get(edge["type"], "#666666"),
            ),
            hoverinfo='text',
            text=f"{edge['type']} (강도: {edge['weight']})",
            showlegend=False,
        )
        edge_traces.append(edge_trace)
    
    # 노드 트레이스
    node_x: List[float] = []
    node_y: List[float] = []
    node_text: List[str] = []
    node_colors: List[str] = []
    node_sizes: List[float] = []
    
    for node in nodes:
        x, y = pos[node["id"]]
        node_x.append(x)
        node_y.append(y)
        
        # 호버 텍스트
        text = f"""
        <b>{node['name']}</b><br>
        💰 매출: ₩{node['total_spent']:,}<br>
        📊 M: {node['m_score']} | PR: {node['pagerank']:.0f}<br>
        {'👑 VIP' if node.get('is_vip') else ''}
        {'⚠️ Risk' if node.get('is_risk') else ''}
        """
        node_text.append(text)
        
        # 색상 결정
        if highlight_node and node["id"] == highlight_node:
            color = "#FF0000"
        elif node.get("is_vip"):
            color = "#FFD700"
        elif node.get("is_risk"):
            color = "#FF4444"
        else:
            color = "#4488FF"
        node_colors.append(color)
        
        # 크기 (PageRank 기반)
        size = 15 + node["pagerank"] * 0.5
        node_sizes.append(size)
    
    node_trace = go.Scatter(
        x=node_x,
        y=node_y,
        mode='markers+text',
        hoverinfo='text',
        text=[n["name"] for n in nodes],
        textposition="top center",
        textfont=dict(size=10, color="white"),
        hovertext=node_text,
        marker=dict(
            size=node_sizes,
            color=node_colors,
            line=dict(width=2, color='white'),
        ),
    )
    
    # Figure 생성
    fig = go.Figure(
        data=edge_traces + [node_trace],
        layout=go.Layout(
            title=dict(
                text="🕸️ Human Network Map",
                font=dict(size=20, color="white"),
            ),
            showlegend=False,
            hovermode='closest',
            margin=dict(b=0, l=0, r=0, t=40),
            xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
            paper_bgcolor='rgba(10,10,26,1)',
            plot_bgcolor='rgba(10,10,26,1)',
            height=600,
        )
    )
    
    return fig


def create_pagerank_chart(nodes: List[Dict[str, Any]]) -> go.Figure:
    """PageRank 순위 차트"""
    
    sorted_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)
    
    names = [n["name"] for n in sorted_nodes[:10]]
    scores = [n["pagerank"] for n in sorted_nodes[:10]]
    colors = ["#FFD700" if n.get("is_vip") else "#4488FF" for n in sorted_nodes[:10]]
    
    fig = go.Figure(data=[
        go.Bar(
            x=scores,
            y=names,
            orientation='h',
            marker=dict(color=colors),
            text=[f"{s:.0f}" for s in scores],
            textposition='outside',
        )
    ])
    
    fig.update_layout(
        title="👑 영향력 순위 (PageRank)",
        paper_bgcolor='rgba(10,10,26,1)',
        plot_bgcolor='rgba(10,10,26,1)',
        font=dict(color="white"),
        xaxis=dict(showgrid=False),
        yaxis=dict(autorange="reversed"),
        height=400,
        margin=dict(l=100, r=50, t=50, b=30),
    )
    
    return fig


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Streamlit UI
# ═══════════════════════════════════════════════════════════════════════════════════════════

def run_network_map() -> None:
    """네트워크 맵 대시보드"""
    
    st.set_page_config(
        page_title="AUTUS Network Map",
        page_icon="🕸️",
        layout="wide",
    )
    
    # 스타일
    st.markdown("""
    <style>
        .stApp {
            background: linear-gradient(135deg, #0a0a1a 0%, #1a1a2e 50%, #0a0a1a 100%);
        }
        .info-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid #333;
            border-radius: 15px;
            padding: 20px;
            margin: 10px 0;
        }
        .hub-badge {
            background: linear-gradient(135deg, #f5a524, #ff6b6b);
            color: #1a1a2e;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
        }
        .legend-item {
            display: inline-block;
            margin: 5px 10px;
        }
        .legend-color {
            display: inline-block;
            width: 20px;
            height: 10px;
            margin-right: 5px;
            border-radius: 2px;
        }
    </style>
    """, unsafe_allow_html=True)
    
    # 데이터 로드
    nodes, edges = create_sample_network()
    
    # 헤더
    st.markdown("""
    <div style="text-align: center; padding: 20px;">
        <h1 style="color: #f5a524;">🕸️ AUTUS NETWORK MAP</h1>
        <p style="color: #888;">인간 관계 기반 시너지(S) 시각화 | 점과 선으로 보는 제국의 인맥</p>
    </div>
    """, unsafe_allow_html=True)
    
    # 범례
    st.markdown("""
    <div style="text-align: center; padding: 10px; background: rgba(0,0,0,0.3); border-radius: 10px; margin-bottom: 20px;">
        <span class="legend-item"><span class="legend-color" style="background: #FFD700;"></span> 가족 (FAMILY)</span>
        <span class="legend-item"><span class="legend-color" style="background: #00FFFF;"></span> 소개 (REFERRAL)</span>
        <span class="legend-item"><span class="legend-color" style="background: #888888;"></span> 친구 (FRIEND)</span>
        <span class="legend-item">│</span>
        <span class="legend-item">👑 VIP</span>
        <span class="legend-item">⚠️ Risk</span>
    </div>
    """, unsafe_allow_html=True)
    
    # 사이드바
    with st.sidebar:
        st.markdown("### 🎛️ 컨트롤")
        
        # 노드 선택
        selected_node = st.selectbox(
            "노드 선택 (이탈 시뮬레이션)",
            ["없음"] + [n["name"] for n in nodes],
        )
        
        selected_id: Optional[str] = None
        if selected_node != "없음":
            selected_id = next((n["id"] for n in nodes if n["name"] == selected_node), None)
        
        # 필터
        st.markdown("---")
        show_vip_only = st.checkbox("VIP만 표시")
        show_edges = st.multiselect(
            "관계 유형 필터",
            ["FAMILY", "REFERRAL", "FRIEND"],
            default=["FAMILY", "REFERRAL", "FRIEND"]
        )
        
        # 통계
        st.markdown("---")
        st.markdown("### 📊 네트워크 통계")
        st.metric("총 노드", len(nodes))
        st.metric("총 연결", len(edges))
        st.metric("VIP 수", sum(1 for n in nodes if n.get("is_vip")))
        
        avg_connections = len(edges) * 2 / len(nodes)
        st.metric("평균 연결 수", f"{avg_connections:.1f}")
    
    # 메인 영역
    col1, col2 = st.columns([2, 1])
    
    with col1:
        # 필터 적용
        filtered_nodes = nodes
        if show_vip_only:
            filtered_nodes = [n for n in nodes if n.get("is_vip")]
        
        filtered_edges = [e for e in edges if e["type"] in show_edges]
        
        # 그래프 생성
        if NETWORKX_AVAILABLE and PLOTLY_AVAILABLE:
            fig = create_network_graph(filtered_nodes, filtered_edges, selected_id)
            if fig:
                st.plotly_chart(fig, use_container_width=True)
        else:
            st.warning("networkx와 plotly가 필요합니다: pip install networkx plotly")
            
            # 대안: 테이블로 표시
            st.markdown("### 연결 목록")
            edge_df = pd.DataFrame(edges)
            st.dataframe(edge_df, use_container_width=True)
    
    with col2:
        # PageRank 차트
        if PLOTLY_AVAILABLE:
            fig = create_pagerank_chart(nodes)
            st.plotly_chart(fig, use_container_width=True)
        
        # 선택된 노드 정보
        if selected_id:
            node = next((n for n in nodes if n["id"] == selected_id), None)
            if node:
                st.markdown("### 🎯 선택된 노드")
                st.markdown(f"""
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f5a524;">{node['name']}</h3>
                    <p>💰 총 매출: ₩{node['total_spent']:,}</p>
                    <p>📊 M: {node['m_score']} | PageRank: {node['pagerank']:.0f}</p>
                    <p>{'👑 VIP 고객' if node.get('is_vip') else '일반 고객'}</p>
                </div>
                """, unsafe_allow_html=True)
                
                # 연결된 사람들
                connected: List[Tuple[str, str]] = []
                for e in edges:
                    if e["source"] == selected_id:
                        connected.append((e["target"], e["type"]))
                    elif e["target"] == selected_id:
                        connected.append((e["source"], e["type"]))
                
                if connected:
                    st.markdown("#### 🔗 연결된 사람")
                    for cid, rel_type in connected:
                        cnode = next((n for n in nodes if n["id"] == cid), None)
                        if cnode:
                            icon = "🏠" if rel_type == "FAMILY" else "📢" if rel_type == "REFERRAL" else "👫"
                            st.markdown(f"- {icon} {cnode['name']} ({rel_type})")
                
                # 이탈 시뮬레이션
                st.markdown("### 🚨 이탈 시뮬레이션")
                churn_risk = len(connected) * 0.3
                revenue_at_risk = sum(
                    next((n["total_spent"] for n in nodes if n["id"] == cid), 0) * 0.5
                    for cid, _ in connected
                ) + node["total_spent"]
                
                st.metric("예상 동반 이탈", f"{churn_risk:.1f}명")
                st.metric("위험 매출", f"₩{revenue_at_risk:,.0f}")
                
                if churn_risk >= 2:
                    st.error("⚠️ 고위험: 이 사람이 떠나면 연쇄 이탈 발생!")
    
    # 허브 분석
    st.markdown("---")
    st.markdown("### 👑 TOP 3 영향력자 (Queen Bee)")
    
    top_nodes = sorted(nodes, key=lambda x: x["pagerank"], reverse=True)[:3]
    
    cols = st.columns(3)
    for i, node in enumerate(top_nodes):
        with cols[i]:
            medal = "🥇" if i == 0 else "🥈" if i == 1 else "🥉"
            st.markdown(f"""
            <div class="info-card" style="text-align: center;">
                <div style="font-size: 2em;">{medal}</div>
                <h3 style="color: #f5a524; margin: 10px 0;">{node['name']}</h3>
                <p>PageRank: {node['pagerank']:.0f}</p>
                <p>💰 ₩{node['total_spent']:,}</p>
            </div>
            """, unsafe_allow_html=True)
            
            if i == 0:
                connected_count = sum(1 for e in edges if e["source"] == node["id"] or e["target"] == node["id"])
                st.info(f"💡 이 사람에게 단체 쿠폰을 주면 {connected_count}명이 따라옵니다.")
    
    # 푸터
    st.markdown("---")
    st.caption("🕸️ AUTUS Network Map v2.0 | S(Synergy) = 인간 관계의 중력")


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 메인
# ═══════════════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    run_network_map()
























