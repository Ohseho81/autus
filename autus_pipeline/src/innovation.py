#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    💡 AUTUS PILLAR 3: Innovation Engine                                   ║
║                                                                                           ║
║  목적: 제1원칙 사고 + 10x 목표 설정 (Musk + Page + Thiel)                                  ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. First Principles 분해 - 기존 가정 파괴                                                 ║
║  2. 10x Thinking - 10배 개선 목표                                                          ║
║  3. Disruption Score - 파괴적 혁신 점수                                                    ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field


# ═══════════════════════════════════════════════════════════════════════════════════════════
# First Principles 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Assumption:
    """기존 가정"""
    id: str
    description: str
    category: str  # "COST", "TIME", "PROCESS", "MARKET", "TECH"
    current_value: float
    unit: str
    is_challenged: bool = False
    first_principle_value: Optional[float] = None
    potential_improvement: float = 0.0


@dataclass  
class FirstPrincipleAnalysis:
    """제1원칙 분석 결과"""
    assumptions: List[Assumption] = field(default_factory=list)
    
    def add_assumption(self, assumption: Assumption):
        self.assumptions.append(assumption)
    
    def challenge_assumption(self, assumption_id: str, first_principle_value: float):
        """가정 도전"""
        for a in self.assumptions:
            if a.id == assumption_id:
                a.is_challenged = True
                a.first_principle_value = first_principle_value
                if a.current_value > 0:
                    a.potential_improvement = (a.current_value - first_principle_value) / a.current_value
                break
    
    @property
    def disruption_potential(self) -> float:
        """파괴적 잠재력 = 평균 개선 가능성"""
        challenged = [a for a in self.assumptions if a.is_challenged]
        if not challenged:
            return 0.0
        return np.mean([a.potential_improvement for a in challenged])
    
    @property
    def challenge_rate(self) -> float:
        """도전된 가정 비율"""
        if not self.assumptions:
            return 0.0
        return len([a for a in self.assumptions if a.is_challenged]) / len(self.assumptions)


def analyze_cost_first_principles(money_events: pd.DataFrame, burn_events: pd.DataFrame) -> FirstPrincipleAnalysis:
    """
    비용 관련 제1원칙 분석
    
    "왜 이 비용이 필요한가? 근본 원리로 다시 계산하면?"
    """
    analysis = FirstPrincipleAnalysis()
    
    if burn_events.empty:
        return analysis
    
    # 시간 손실 가정
    total_loss_minutes = burn_events["loss_minutes"].sum() if "loss_minutes" in burn_events.columns else 0
    if total_loss_minutes > 0:
        analysis.add_assumption(Assumption(
            id="A-TIME-001",
            description="현재 시간 손실량",
            category="TIME",
            current_value=total_loss_minutes,
            unit="minutes",
        ))
    
    # Burn 유형별 가정
    if "burn_type" in burn_events.columns:
        for bt in burn_events["burn_type"].unique():
            bt_sum = burn_events[burn_events["burn_type"] == bt]["loss_minutes"].sum()
            analysis.add_assumption(Assumption(
                id=f"A-BURN-{bt}",
                description=f"{bt} 유형 손실",
                category="PROCESS",
                current_value=bt_sum,
                unit="minutes",
            ))
    
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 10x Thinking
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class TenXGoal:
    """10x 목표"""
    metric: str
    current_value: float
    target_10x: float = 0.0
    progress: float = 0.0
    
    def __post_init__(self):
        if self.target_10x == 0:
            self.target_10x = self.current_value * 10
        if self.target_10x > 0:
            self.progress = self.current_value / self.target_10x


def compute_10x_targets(kpi: Dict) -> List[TenXGoal]:
    """
    현재 KPI 기반 10x 목표 생성
    
    "현재의 10배를 달성하려면?"
    """
    targets = []
    
    # Net
    if "net_krw" in kpi:
        targets.append(TenXGoal(
            metric="net_krw",
            current_value=kpi["net_krw"],
        ))
    
    # Velocity
    if "coin_velocity" in kpi:
        targets.append(TenXGoal(
            metric="coin_velocity",
            current_value=kpi["coin_velocity"],
        ))
    
    return targets


def compute_10x_gap_analysis(current: float, target_10x: float) -> Dict:
    """
    10x 갭 분석
    
    "10배 달성까지 얼마나 남았나?"
    """
    if target_10x <= 0:
        return {"gap": 0, "multiplier_needed": 0, "status": "NO_TARGET"}
    
    gap = target_10x - current
    multiplier_needed = target_10x / current if current > 0 else 10
    
    if multiplier_needed <= 1:
        status = "ACHIEVED"
    elif multiplier_needed <= 2:
        status = "CLOSE"
    elif multiplier_needed <= 5:
        status = "HALFWAY"
    else:
        status = "MOONSHOT"
    
    return {
        "gap": gap,
        "multiplier_needed": multiplier_needed,
        "status": status,
        "progress_pct": (current / target_10x) * 100 if target_10x > 0 else 0,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Disruption Score
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_disruption_score(
    kpi: Dict,
    prev_kpi: Dict = None,
    money_events: pd.DataFrame = None,
    innovation_data: Dict = None
) -> Dict:
    """
    파괴적 혁신 점수
    
    요소:
    1. 성장률 (전주 대비)
    2. 혁신 점수 (새로운 이벤트/고객)
    3. Moonshot 비율 (상위 10% 이벤트)
    4. 10x 진행률
    """
    scores = {}
    
    # 1. 성장률
    if prev_kpi and "net_krw" in kpi and "net_krw" in prev_kpi:
        prev_net = prev_kpi["net_krw"]
        curr_net = kpi["net_krw"]
        if prev_net > 0:
            growth_rate = (curr_net - prev_net) / prev_net
        else:
            growth_rate = 1.0 if curr_net > 0 else 0.0
        scores["growth_score"] = min(1.0, growth_rate / 0.5)  # 50% 성장 = 1.0
    else:
        scores["growth_score"] = 0.0
    
    # 2. 혁신 점수
    if innovation_data:
        scores["innovation_score"] = innovation_data.get("innovation_score", 0)
    else:
        scores["innovation_score"] = 0.0
    
    # 3. Moonshot 비율
    if innovation_data:
        scores["moonshot_score"] = min(1.0, innovation_data.get("moonshot_ratio", 0) * 10)
    else:
        scores["moonshot_score"] = 0.0
    
    # 4. 10x 진행률
    targets = compute_10x_targets(kpi)
    if targets:
        avg_progress = np.mean([t.progress for t in targets])
        scores["tenx_score"] = avg_progress
    else:
        scores["tenx_score"] = 0.0
    
    # 종합 점수
    disruption_score = (
        scores["growth_score"] * 0.25 +
        scores["innovation_score"] * 0.30 +
        scores["moonshot_score"] * 0.20 +
        scores["tenx_score"] * 0.25
    )
    
    # 상태
    if disruption_score >= 0.7:
        status = "DISRUPTOR"
        advice = "파괴적 혁신 진행 중. 가속하세요."
    elif disruption_score >= 0.5:
        status = "INNOVATOR"
        advice = "혁신 중. 10x 목표에 집중하세요."
    elif disruption_score >= 0.3:
        status = "IMPROVER"
        advice = "점진적 개선 중. 제1원칙으로 돌아가세요."
    else:
        status = "STAGNANT"
        advice = "정체. 기존 가정을 파괴해야 합니다."
    
    return {
        "disruption_score": disruption_score,
        "component_scores": scores,
        "status": status,
        "advice": advice,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_innovation(
    kpi: Dict,
    money_events: pd.DataFrame,
    burn_events: pd.DataFrame = None,
    prev_kpi: Dict = None,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    Innovation Disruption 기둥 전체 분석
    """
    # 제1원칙 분석
    if burn_events is not None and not burn_events.empty:
        first_principles = analyze_cost_first_principles(money_events, burn_events)
        fp_score = first_principles.disruption_potential
    else:
        first_principles = None
        fp_score = 0.0
    
    # 혁신 점수 (from moat.py logic)
    from .moat import compute_innovation_score
    innovation_data = compute_innovation_score(money_events, history_events)
    
    # 10x 목표
    tenx_targets = compute_10x_targets(kpi)
    tenx_gaps = [
        compute_10x_gap_analysis(t.current_value, t.target_10x)
        for t in tenx_targets
    ]
    
    # 파괴적 혁신 점수
    disruption = compute_disruption_score(kpi, prev_kpi, money_events, innovation_data)
    
    # Innovation 기둥 최종 점수
    innovation_pillar_score = (
        fp_score * 0.20 +
        innovation_data.get("innovation_score", 0) * 0.30 +
        disruption["disruption_score"] * 0.50
    )
    
    return {
        "innovation_pillar_score": innovation_pillar_score,
        "first_principles_score": fp_score,
        "innovation_data": innovation_data,
        "disruption": disruption,
        "tenx_targets": [
            {
                "metric": t.metric,
                "current": t.current_value,
                "target_10x": t.target_10x,
                "progress": t.progress,
            }
            for t in tenx_targets
        ],
        "tenx_gaps": tenx_gaps,
        "status": disruption["status"],
        "advice": disruption["advice"],
    }




















