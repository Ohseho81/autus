#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏛️ AUTUS 5 PILLARS - Unified Integration                               ║
║                                                                                           ║
║  5가지 기둥 통합:                                                                          ║
║  1. Vision Mastery - 비전 장악 (Goal + Flywheel)                                          ║
║  2. Risk Equilibrium - 위험 균형 (Entropy + Safety)                                       ║
║  3. Innovation Disruption - 혁신 주도 (First Principles + Moat)                           ║
║  4. Learning Acceleration - 학습 가속 (Audit + Post-Mortem)                               ║
║  5. Impact Amplification - 영향 증폭 (Social Value + Reinvest)                            ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - PIPELINE 호출 후 추가 분석                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Optional, Tuple

# 5 기둥 모듈
from .vision import GoalTree, compute_vision_score, compute_regret_score
from .flywheel import analyze_flywheel, FlywheelState
from .moat import analyze_team_moat, compute_innovation_score
from .innovation import analyze_innovation
from .impact import analyze_impact


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 2: Risk Equilibrium (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_risk_equilibrium(
    kpi: Dict,
    burn_events: pd.DataFrame = None,
    tuning_params: Dict = None
) -> Dict:
    """
    Risk Equilibrium 기둥 분석
    
    PIPELINE의 Entropy와 Tuning 결과 활용
    """
    # Entropy 기반 위험
    entropy = kpi.get("entropy_ratio", 0)
    
    # 안전 여유 (Margin of Safety)
    # Net이 양수이고 Entropy가 낮으면 안전 여유 있음
    net = kpi.get("net_krw", 0)
    mint = kpi.get("mint_krw", 1)
    
    if mint > 0:
        net_margin = net / mint  # 순수익률
    else:
        net_margin = 0
    
    # 안전 여유 점수 (높을수록 좋음)
    safety_margin_score = max(0, min(1.0, net_margin))
    
    # Entropy 점수 (낮을수록 좋음 → 뒤집어서 점수화)
    entropy_score = max(0, 1 - entropy)
    
    # 안정화 모드 여부
    if tuning_params:
        stabilization = tuning_params.get("reason", "").find("STABILIZATION") >= 0
    else:
        stabilization = False
    
    # 위험 균형 점수
    risk_score = entropy_score * 0.5 + safety_margin_score * 0.5
    
    # 상태 판단
    if risk_score >= 0.7 and not stabilization:
        status = "BALANCED"
        advice = "위험 균형 양호. 현재 전략 유지."
    elif risk_score >= 0.5:
        status = "ACCEPTABLE"
        advice = "위험 수용 가능. 모니터링 필요."
    elif risk_score >= 0.3:
        status = "ELEVATED"
        advice = "위험 상승. 다각화 필요."
    else:
        status = "CRITICAL"
        advice = "위험 심각. 즉시 방어 조치."
    
    return {
        "risk_pillar_score": risk_score,
        "entropy_ratio": entropy,
        "entropy_score": entropy_score,
        "safety_margin_score": safety_margin_score,
        "net_margin": net_margin,
        "stabilization_mode": stabilization,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Pillar 4: Learning Acceleration (PIPELINE 데이터 활용)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_learning_acceleration(
    kpi: Dict,
    prev_kpi: Dict = None,
    tuning_params: Dict = None,
    audit_entries: List[Dict] = None
) -> Dict:
    """
    Learning Acceleration 기둥 분석
    
    PIPELINE의 Audit과 Tuning 결과 활용
    """
    # 파라미터 변화 추적 (학습 증거)
    param_changes = 0
    if tuning_params and prev_kpi:
        # 파라미터가 변경되었으면 학습 중
        reason = tuning_params.get("reason", "")
        if "UP" in reason or "DOWN" in reason:
            param_changes = 1
    
    # KPI 개선 추적
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            improvement = (curr_net - prev_net) / prev_net
        else:
            improvement = 1.0 if curr_net > 0 else 0.0
    else:
        improvement = 0.0
    
    # Audit 활동 (기록이 있으면 학습 증거)
    audit_score = 0.5  # 기본 점수
    if audit_entries:
        audit_score = min(1.0, len(audit_entries) / 10)  # 10개 이상 = 1.0
    
    # 개선 점수
    improvement_score = min(1.0, max(0, improvement))
    
    # 학습 가속 점수
    learning_score = (
        audit_score * 0.3 +
        improvement_score * 0.4 +
        param_changes * 0.3
    )
    
    # 상태 판단
    if learning_score >= 0.7:
        status = "ACCELERATING"
        advice = "학습 가속 중. 패턴을 원칙으로 문서화하세요."
    elif learning_score >= 0.5:
        status = "LEARNING"
        advice = "학습 진행 중. 실패 분석 강화하세요."
    elif learning_score >= 0.3:
        status = "SLOW_LEARNING"
        advice = "학습 느림. 데이터 기반 실험 필요."
    else:
        status = "STAGNANT"
        advice = "학습 정체. Post-Mortem 도입하세요."
    
    return {
        "learning_pillar_score": learning_score,
        "audit_score": audit_score,
        "improvement_score": improvement_score,
        "param_changes": param_changes,
        "net_improvement": improvement,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 5 Pillars 통합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_all_pillars(
    # PIPELINE 결과
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    best_team: Dict,
    tuning_params: Dict,
    # 추가 데이터
    goal_tree: GoalTree = None,
    prev_kpi: Dict = None,
    flywheel_history: List[FlywheelState] = None,
    audit_entries: List[Dict] = None,
    history_events: pd.DataFrame = None,
) -> Dict:
    """
    5가지 기둥 전체 분석
    
    PIPELINE v1.3 결과를 받아서 5기둥 점수 계산
    """
    results = {}
    
    # ═══ Pillar 1: Vision Mastery ═══
    if goal_tree:
        vision_score = compute_vision_score(goal_tree)
        goal_tree.cascade_from_kpi(kpi)
    else:
        vision_score = {"vision_score": 0.0, "status": "NO_GOALS"}
    
    flywheel = analyze_flywheel(money_events, flywheel_history)
    
    results["vision_mastery"] = {
        "pillar_score": (vision_score.get("vision_score", 0) * 0.5 + 
                        flywheel["score"]["flywheel_score"] * 0.5),
        "goal_score": vision_score,
        "flywheel": flywheel,
    }
    
    # ═══ Pillar 2: Risk Equilibrium ═══
    results["risk_equilibrium"] = analyze_risk_equilibrium(
        kpi, burn_events, tuning_params
    )
    
    # ═══ Pillar 3: Innovation Disruption ═══
    team = best_team.get("team", [])
    
    moat = analyze_team_moat(
        team, money_events, pair_synergy,
        roles, role_scores, group_synergy
    )
    
    innovation = analyze_innovation(
        kpi, money_events, burn_events,
        prev_kpi, history_events
    )
    
    results["innovation_disruption"] = {
        "pillar_score": (moat["team_moat_score"] * 0.5 + 
                        innovation["innovation_pillar_score"] * 0.5),
        "moat": moat,
        "innovation": innovation,
    }
    
    # ═══ Pillar 4: Learning Acceleration ═══
    results["learning_acceleration"] = analyze_learning_acceleration(
        kpi, prev_kpi, tuning_params, audit_entries
    )
    
    # ═══ Pillar 5: Impact Amplification ═══
    synergy_data = None
    if not pair_synergy.empty:
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
        synergy_data = {"avg_uplift": pair_synergy[col].mean()}
    
    results["impact_amplification"] = analyze_impact(
        kpi, money_events, team, synergy_data
    )
    
    # ═══ 종합 점수 ═══
    pillar_scores = {
        "vision_mastery": results["vision_mastery"]["pillar_score"],
        "risk_equilibrium": results["risk_equilibrium"]["risk_pillar_score"],
        "innovation_disruption": results["innovation_disruption"]["pillar_score"],
        "learning_acceleration": results["learning_acceleration"]["learning_pillar_score"],
        "impact_amplification": results["impact_amplification"]["impact_pillar_score"],
    }
    
    # 동일 가중치 평균
    total_score = np.mean(list(pillar_scores.values()))
    
    # 종합 상태
    if total_score >= 0.7:
        overall_status = "EXCELLENCE"
        overall_advice = "모든 기둥 강함. 10x 목표 추진하세요."
    elif total_score >= 0.5:
        overall_status = "SOLID"
        overall_advice = "기반 튼튼. 약한 기둥 강화하세요."
    elif total_score >= 0.3:
        overall_status = "DEVELOPING"
        overall_advice = "성장 중. 핵심 기둥에 집중하세요."
    else:
        overall_status = "FOUNDATION_NEEDED"
        overall_advice = "기초 필요. 가장 약한 기둥부터 강화."
    
    # 가장 약한 기둥 찾기
    weakest_pillar = min(pillar_scores, key=pillar_scores.get)
    
    results["summary"] = {
        "total_score": total_score,
        "pillar_scores": pillar_scores,
        "overall_status": overall_status,
        "overall_advice": overall_advice,
        "weakest_pillar": weakest_pillar,
        "weakest_score": pillar_scores[weakest_pillar],
        "timestamp": datetime.now().isoformat(),
    }
    
    return results


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 리포트 생성
# ═══════════════════════════════════════════════════════════════════════════════════════════

def generate_pillars_report(analysis: Dict) -> str:
    """5기둥 마크다운 리포트 생성"""
    summary = analysis.get("summary", {})
    
    report = []
    report.append("# 🏛️ AUTUS 5 Pillars Report\n")
    report.append(f"> Generated: {summary.get('timestamp', '')}\n")
    report.append("---\n")
    
    # 종합 점수
    total = summary.get("total_score", 0)
    report.append(f"## 📊 Total Score: {total:.0%}\n")
    report.append(f"**Status**: {summary.get('overall_status', 'N/A')}\n")
    report.append(f"**Advice**: {summary.get('overall_advice', '')}\n\n")
    
    # 기둥별 점수
    report.append("## 🏛️ Pillar Scores\n")
    report.append("| Pillar | Score | Status |")
    report.append("|--------|-------|--------|")
    
    pillar_names = {
        "vision_mastery": "🎯 Vision Mastery",
        "risk_equilibrium": "⚖️ Risk Equilibrium",
        "innovation_disruption": "💡 Innovation Disruption",
        "learning_acceleration": "📚 Learning Acceleration",
        "impact_amplification": "🌍 Impact Amplification",
    }
    
    scores = summary.get("pillar_scores", {})
    for key, name in pillar_names.items():
        score = scores.get(key, 0)
        status_key = f"{key}"
        pillar_data = analysis.get(key, {})
        status = pillar_data.get("status", pillar_data.get("overall_status", "N/A"))
        report.append(f"| {name} | {score:.0%} | {status} |")
    
    report.append("\n")
    
    # 약한 기둥
    weak = summary.get("weakest_pillar", "")
    weak_score = summary.get("weakest_score", 0)
    if weak:
        report.append(f"### ⚠️ Focus Area: {pillar_names.get(weak, weak)}\n")
        report.append(f"Score: {weak_score:.0%} - Needs attention\n\n")
    
    # 상세 섹션
    report.append("---\n")
    report.append("## 📋 Detailed Analysis\n")
    
    # Vision
    vision = analysis.get("vision_mastery", {})
    fw = vision.get("flywheel", {}).get("score", {})
    report.append("### 🎯 Vision Mastery\n")
    report.append(f"- Flywheel Velocity: {fw.get('velocity', 0):.0%}\n")
    report.append(f"- Flywheel Status: {fw.get('status', 'N/A')}\n")
    report.append(f"- Advice: {fw.get('advice', '')}\n\n")
    
    # Risk
    risk = analysis.get("risk_equilibrium", {})
    report.append("### ⚖️ Risk Equilibrium\n")
    report.append(f"- Entropy: {risk.get('entropy_ratio', 0):.0%}\n")
    report.append(f"- Safety Margin: {risk.get('safety_margin_score', 0):.0%}\n")
    report.append(f"- Advice: {risk.get('advice', '')}\n\n")
    
    # Innovation
    innov = analysis.get("innovation_disruption", {})
    moat = innov.get("moat", {})
    report.append("### 💡 Innovation Disruption\n")
    report.append(f"- Team Moat: {moat.get('team_moat_strength', 'N/A')}\n")
    report.append(f"- Moat Type: {moat.get('team_moat_type', 'N/A')}\n")
    report.append(f"- Advice: {moat.get('recommendation', '')}\n\n")
    
    # Learning
    learn = analysis.get("learning_acceleration", {})
    report.append("### 📚 Learning Acceleration\n")
    report.append(f"- Improvement: {learn.get('net_improvement', 0):.0%}\n")
    report.append(f"- Advice: {learn.get('advice', '')}\n\n")
    
    # Impact
    impact = analysis.get("impact_amplification", {})
    reinvest = impact.get("reinvestment", {})
    report.append("### 🌍 Impact Amplification\n")
    report.append(f"- Reinvestment Ratio: {reinvest.get('reinvestment_ratio', 0):.0%}\n")
    report.append(f"- Advice: {impact.get('advice', '')}\n\n")
    
    report.append("---\n")
    report.append("*AUTUS 5 Pillars Framework v1.0*\n")
    
    return "\n".join(report)





















