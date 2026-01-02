#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🌍 AUTUS PILLAR 5: Impact Amplification                                ║
║                                                                                           ║
║  목적: 지속 가능 영향 극대화 (Altman + Soros + Bezos Earth Fund)                           ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Impact KPI - 사회 기여 측정                                                            ║
║  2. Reinvestment Ratio - 재투자 비율                                                       ║
║  3. Compound Growth - 복리 성장 추적                                                       ║
║  4. Social Value - 사회적 가치 계산                                                        ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact KPI
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class ImpactMetrics:
    """영향 지표"""
    # 직접 영향
    direct_value_krw: float = 0.0          # 직접 창출 가치
    indirect_value_krw: float = 0.0        # 간접 창출 가치 (Synergy)
    
    # 사회적 영향
    jobs_supported: int = 0                 # 지원된 일자리 수
    customers_served: int = 0               # 서비스된 고객 수
    partners_empowered: int = 0             # 역량 강화된 파트너 수
    
    # 재투자
    reinvested_krw: float = 0.0            # 재투자 금액
    reinvestment_ratio: float = 0.0        # 재투자 비율
    
    @property
    def total_value(self) -> float:
        return self.direct_value_krw + self.indirect_value_krw
    
    @property
    def impact_score(self) -> float:
        """
        Impact 점수 (0~1)
        
        = 재투자 비율 × 0.3 + 간접/직접 비율 × 0.3 + 고객 다양성 × 0.4
        """
        # 재투자 점수
        reinvest_score = min(1.0, self.reinvestment_ratio * 3.33)  # 30% = 1.0
        
        # 레버리지 점수 (간접 효과)
        if self.direct_value_krw > 0:
            leverage = self.indirect_value_krw / self.direct_value_krw
            leverage_score = min(1.0, leverage)
        else:
            leverage_score = 0.0
        
        # 규모 점수
        scale_score = min(1.0, (self.customers_served + self.partners_empowered) / 100)
        
        return reinvest_score * 0.3 + leverage_score * 0.3 + scale_score * 0.4


def compute_impact_metrics(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None
) -> ImpactMetrics:
    """
    KPI에서 Impact 지표 계산
    """
    metrics = ImpactMetrics()
    
    # 직접 가치 = Net
    metrics.direct_value_krw = kpi.get("net_krw", 0)
    
    # 간접 가치 = INDIRECT_DRIVEN 이벤트
    if not money_events.empty and "recommendation_type" in money_events.columns:
        indirect = money_events[money_events["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
        if "amount_krw" in indirect.columns:
            metrics.indirect_value_krw = indirect["amount_krw"].sum()
    
    # 고객 수
    if "customer_id" in money_events.columns:
        metrics.customers_served = money_events["customer_id"].nunique()
    
    # 파트너 수 (people_tags 기준)
    if "people_tags" in money_events.columns:
        all_tags = money_events["people_tags"].str.split(";").explode().unique()
        metrics.partners_empowered = len([t for t in all_tags if t])
    
    # 일자리 = 팀 크기
    if team:
        metrics.jobs_supported = len(team)
    
    return metrics


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Reinvestment Tracking
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_reinvestment_ratio(
    profit_krw: float,
    cost_saved_krw: float,
    investment_krw: float = None
) -> Dict:
    """
    재투자 비율 계산
    
    재투자 = COST_SAVED (비용 절감 → 재투자 가능)
    또는 명시적 투자 금액
    """
    if investment_krw is not None:
        reinvest = investment_krw
    else:
        reinvest = cost_saved_krw
    
    if profit_krw <= 0:
        ratio = 0.0
    else:
        ratio = reinvest / profit_krw
    
    # 목표 대비
    target_ratio = 0.10  # 10% 목표
    if ratio >= target_ratio * 2:
        status = "EXCELLENT"
        advice = "재투자 우수. 복리 효과 기대."
    elif ratio >= target_ratio:
        status = "ON_TARGET"
        advice = "목표 달성. 유지하세요."
    elif ratio >= target_ratio * 0.5:
        status = "BELOW_TARGET"
        advice = "재투자 부족. 비율 높이세요."
    else:
        status = "MINIMAL"
        advice = "재투자 거의 없음. 장기 성장 위험."
    
    return {
        "reinvestment_krw": reinvest,
        "profit_krw": profit_krw,
        "reinvestment_ratio": ratio,
        "target_ratio": target_ratio,
        "gap_to_target": target_ratio - ratio,
        "status": status,
        "advice": advice,
    }


def project_compound_growth(
    initial_value: float,
    reinvestment_ratio: float,
    growth_rate: float = 0.05,
    years: int = 10
) -> List[Dict]:
    """
    복리 성장 예측
    
    재투자 → 성장 가속 (Flywheel 효과)
    """
    projections = []
    value = initial_value
    
    for year in range(1, years + 1):
        # 재투자 효과가 성장률에 추가
        effective_growth = growth_rate * (1 + reinvestment_ratio)
        value = value * (1 + effective_growth)
        
        projections.append({
            "year": year,
            "projected_value": value,
            "growth_rate": effective_growth,
            "multiplier": value / initial_value if initial_value > 0 else 0,
        })
    
    return projections


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Social Value Calculation
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_social_value(
    impact_metrics: ImpactMetrics,
    synergy_data: Dict = None
) -> Dict:
    """
    사회적 가치 계산
    
    = 직접 가치 + 간접 가치 + 네트워크 효과
    """
    # 직접 가치
    direct = impact_metrics.direct_value_krw
    
    # 간접 가치
    indirect = impact_metrics.indirect_value_krw
    
    # 네트워크 승수 (Synergy 기반)
    if synergy_data and "avg_uplift" in synergy_data:
        network_multiplier = 1 + synergy_data["avg_uplift"]
    else:
        network_multiplier = 1.0
    
    # 사회적 가치 = (직접 + 간접) × 네트워크 승수
    social_value = (direct + indirect) * network_multiplier
    
    # 일자리당 가치
    jobs = impact_metrics.jobs_supported
    value_per_job = social_value / jobs if jobs > 0 else 0
    
    # 고객당 가치
    customers = impact_metrics.customers_served
    value_per_customer = social_value / customers if customers > 0 else 0
    
    return {
        "social_value_krw": social_value,
        "direct_value_krw": direct,
        "indirect_value_krw": indirect,
        "network_multiplier": network_multiplier,
        "value_per_job": value_per_job,
        "value_per_customer": value_per_customer,
        "jobs_supported": jobs,
        "customers_served": customers,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Impact 종합 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_impact(
    kpi: Dict,
    money_events: pd.DataFrame,
    team: List[str] = None,
    synergy_data: Dict = None,
    history_kpi: List[Dict] = None
) -> Dict:
    """
    Impact Amplification 기둥 전체 분석
    """
    # Impact 지표
    metrics = compute_impact_metrics(kpi, money_events, team)
    
    # 재투자 비율
    cost_saved = 0.0
    if not money_events.empty and "event_type" in money_events.columns:
        cs = money_events[money_events["event_type"] == "COST_SAVED"]
        if "amount_krw" in cs.columns:
            cost_saved = cs["amount_krw"].sum()
    
    reinvestment = compute_reinvestment_ratio(
        profit_krw=kpi.get("net_krw", 0),
        cost_saved_krw=cost_saved
    )
    metrics.reinvested_krw = reinvestment["reinvestment_krw"]
    metrics.reinvestment_ratio = reinvestment["reinvestment_ratio"]
    
    # 사회적 가치
    social = compute_social_value(metrics, synergy_data)
    
    # 복리 성장 예측
    projection = project_compound_growth(
        initial_value=kpi.get("net_krw", 0),
        reinvestment_ratio=metrics.reinvestment_ratio,
        years=10
    )
    
    # Impact 기둥 점수
    impact_pillar_score = metrics.impact_score
    
    # 상태 판단
    if impact_pillar_score >= 0.7:
        status = "HIGH_IMPACT"
        advice = "높은 영향력. 지속 확대하세요."
    elif impact_pillar_score >= 0.5:
        status = "GROWING_IMPACT"
        advice = "영향력 성장 중. 재투자 비율 높이세요."
    elif impact_pillar_score >= 0.3:
        status = "LIMITED_IMPACT"
        advice = "제한적 영향. 간접 효과 확대 필요."
    else:
        status = "MINIMAL_IMPACT"
        advice = "영향 미미. 네트워크 효과 활용하세요."
    
    return {
        "impact_pillar_score": impact_pillar_score,
        "metrics": {
            "direct_value_krw": metrics.direct_value_krw,
            "indirect_value_krw": metrics.indirect_value_krw,
            "total_value_krw": metrics.total_value,
            "customers_served": metrics.customers_served,
            "partners_empowered": metrics.partners_empowered,
            "jobs_supported": metrics.jobs_supported,
        },
        "reinvestment": reinvestment,
        "social_value": social,
        "projection_10y": projection[-1] if projection else None,
        "status": status,
        "advice": advice,
    }




















