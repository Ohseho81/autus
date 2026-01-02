#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🏰 AUTUS PILLAR 3: Moat (Economic Moat)                                ║
║                                                                                           ║
║  목적: 독점적 강점 분석 (Warren Buffett Economic Moat + Peter Thiel Zero to One)           ║
║                                                                                           ║
║  핵심 개념:                                                                                ║
║  - 경쟁자가 따라올 수 없는 독점적 강점                                                      ║
║  - PIPELINE의 Roles를 활용해 독점 요소 측정                                                 ║
║                                                                                           ║
║  Moat 유형:                                                                                ║
║  1. Network Effect (네트워크 효과) - Synergy 기반                                          ║
║  2. Switching Cost (전환 비용) - 고객 유지 기반                                            ║
║  3. Cost Advantage (비용 우위) - COST_SAVED 기반                                           ║
║  4. Intangible Asset (무형 자산) - 역할 희소성 기반                                         ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from dataclasses import dataclass


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 유형 정의
# ═══════════════════════════════════════════════════════════════════════════════════════════

MOAT_TYPES = {
    "NETWORK_EFFECT": {
        "description": "협업할수록 가치 증가 (시너지 기반)",
        "source": "synergy",
        "weight": 0.30,
    },
    "SWITCHING_COST": {
        "description": "떠나기 어려움 (고객 유지율 기반)",
        "source": "retention",
        "weight": 0.25,
    },
    "COST_ADVANTAGE": {
        "description": "비용 우위 (COST_SAVED 기반)",
        "source": "cost_saved",
        "weight": 0.20,
    },
    "INTANGIBLE_ASSET": {
        "description": "대체 불가 역할 (역할 희소성 기반)",
        "source": "role_scarcity",
        "weight": 0.25,
    },
}


@dataclass
class MoatAnalysis:
    """Moat 분석 결과"""
    person_id: str
    network_effect_score: float = 0.0
    switching_cost_score: float = 0.0
    cost_advantage_score: float = 0.0
    intangible_asset_score: float = 0.0
    
    @property
    def total_moat_score(self) -> float:
        """가중 합산"""
        return (
            self.network_effect_score * 0.30 +
            self.switching_cost_score * 0.25 +
            self.cost_advantage_score * 0.20 +
            self.intangible_asset_score * 0.25
        )
    
    @property
    def moat_type(self) -> str:
        """주력 Moat 유형"""
        scores = {
            "NETWORK_EFFECT": self.network_effect_score,
            "SWITCHING_COST": self.switching_cost_score,
            "COST_ADVANTAGE": self.cost_advantage_score,
            "INTANGIBLE_ASSET": self.intangible_asset_score,
        }
        return max(scores, key=scores.get)
    
    @property
    def moat_strength(self) -> str:
        """Moat 강도"""
        score = self.total_moat_score
        if score >= 0.7:
            return "WIDE"       # 넓은 해자
        elif score >= 0.5:
            return "NARROW"     # 좁은 해자
        elif score >= 0.3:
            return "THIN"       # 얇은 해자
        else:
            return "NONE"       # 해자 없음


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Moat 계산 함수들
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_network_effect_score(
    person_id: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> float:
    """
    네트워크 효과 점수
    
    = 해당 인물이 포함된 시너지의 평균 uplift
    높을수록 협업 시 가치가 크게 증가
    """
    if pair_synergy.empty:
        return 0.0
    
    # 해당 인물이 포함된 페어
    mask = (pair_synergy["i"] == person_id) | (pair_synergy["j"] == person_id)
    person_pairs = pair_synergy[mask]
    
    if person_pairs.empty:
        return 0.0
    
    # 평균 uplift
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in person_pairs.columns else "uplift"
    avg_uplift = person_pairs[col].mean()
    
    # 0~1 정규화 (상위 30% = 1.0 기준)
    threshold = pair_synergy[col].quantile(0.70)
    if threshold <= 0:
        return 0.0
    
    return min(1.0, avg_uplift / threshold)


def compute_switching_cost_score(
    person_id: str,
    money_events: pd.DataFrame,
    customer_col: str = "customer_id"
) -> float:
    """
    전환 비용 점수
    
    = 해당 인물이 담당한 고객의 반복 거래 비율
    높을수록 고객이 떠나기 어려움
    """
    if money_events.empty or customer_col not in money_events.columns:
        return 0.0
    
    # 해당 인물이 태그된 이벤트
    if "person_id" in money_events.columns:
        person_events = money_events[money_events["person_id"] == person_id]
    elif "people_tags" in money_events.columns:
        person_events = money_events[money_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    if person_events.empty:
        return 0.0
    
    # 고객별 이벤트 수
    customer_counts = person_events.groupby(customer_col).size()
    
    # 재구매 고객 비율 (2회 이상)
    repeat_customers = (customer_counts >= 2).sum()
    total_customers = len(customer_counts)
    
    if total_customers == 0:
        return 0.0
    
    return repeat_customers / total_customers


def compute_cost_advantage_score(
    person_id: str,
    money_events: pd.DataFrame
) -> float:
    """
    비용 우위 점수
    
    = 해당 인물의 COST_SAVED 기여 비율
    높을수록 비용 절감 능력
    """
    if money_events.empty:
        return 0.0
    
    # COST_SAVED 이벤트만
    cost_events = money_events[money_events["event_type"] == "COST_SAVED"]
    
    if cost_events.empty:
        return 0.0
    
    # 해당 인물 기여
    if "person_id" in cost_events.columns:
        person_cost = cost_events[cost_events["person_id"] == person_id]
    elif "people_tags" in cost_events.columns:
        person_cost = cost_events[cost_events["people_tags"].str.contains(person_id, na=False)]
    else:
        return 0.0
    
    # 기여 비율
    total_cost_saved = cost_events["amount_krw"].sum() if "amount_krw" in cost_events.columns else 0
    person_cost_saved = person_cost["amount_krw"].sum() if "amount_krw" in person_cost.columns else 0
    
    if total_cost_saved <= 0:
        return 0.0
    
    return min(1.0, person_cost_saved / total_cost_saved)


def compute_intangible_asset_score(
    person_id: str,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> float:
    """
    무형 자산 점수 (역할 희소성)
    
    = 해당 인물의 역할 독점 정도
    유일한 역할 담당자일수록 높음
    """
    if roles.empty:
        return 0.0
    
    # 해당 인물의 역할
    person_roles = roles[roles["person_id"] == person_id]
    if person_roles.empty:
        return 0.0
    
    primary = person_roles.iloc[0].get("primary_role", "")
    secondary = person_roles.iloc[0].get("secondary_role", "")
    
    # 역할별 담당자 수
    role_holders = {}
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            role_holders[r["primary_role"]] = role_holders.get(r["primary_role"], 0) + 1
        if r.get("secondary_role"):
            role_holders[r["secondary_role"]] = role_holders.get(r["secondary_role"], 0) + 1
    
    # 희소성 점수 (유일하면 1.0, 2명이면 0.5, ...)
    scarcity_scores = []
    if primary and primary in role_holders:
        scarcity_scores.append(1.0 / role_holders[primary])
    if secondary and secondary in role_holders:
        scarcity_scores.append(1.0 / role_holders[secondary])
    
    if not scarcity_scores:
        return 0.0
    
    # 역할 점수 가중치
    if not role_scores.empty and person_id in role_scores["person_id"].values:
        person_scores = role_scores[role_scores["person_id"] == person_id].iloc[0]
        score_cols = [c for c in role_scores.columns if c.endswith("_score")]
        avg_role_score = np.mean([person_scores.get(c, 0) for c in score_cols])
    else:
        avg_role_score = 0.5
    
    return np.mean(scarcity_scores) * min(1.0, avg_role_score * 2)


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 통합 Moat 분석
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_person_moat(
    person_id: str,
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> MoatAnalysis:
    """개인별 Moat 분석"""
    return MoatAnalysis(
        person_id=person_id,
        network_effect_score=compute_network_effect_score(person_id, pair_synergy, group_synergy),
        switching_cost_score=compute_switching_cost_score(person_id, money_events),
        cost_advantage_score=compute_cost_advantage_score(person_id, money_events),
        intangible_asset_score=compute_intangible_asset_score(person_id, roles, role_scores),
    )


def analyze_team_moat(
    team: List[str],
    money_events: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    roles: pd.DataFrame,
    role_scores: pd.DataFrame,
    group_synergy: pd.DataFrame = None
) -> Dict:
    """팀 전체 Moat 분석"""
    
    # 개인별 분석
    individual = []
    for pid in team:
        moat = analyze_person_moat(
            pid, money_events, pair_synergy,
            roles, role_scores, group_synergy
        )
        individual.append({
            "person_id": pid,
            "moat_score": moat.total_moat_score,
            "moat_type": moat.moat_type,
            "moat_strength": moat.moat_strength,
            "network_effect": moat.network_effect_score,
            "switching_cost": moat.switching_cost_score,
            "cost_advantage": moat.cost_advantage_score,
            "intangible_asset": moat.intangible_asset_score,
        })
    
    # 팀 평균
    if individual:
        avg_moat = np.mean([i["moat_score"] for i in individual])
        
        # 팀 Moat 유형 (가장 강한 것)
        type_scores = {
            "NETWORK_EFFECT": np.mean([i["network_effect"] for i in individual]),
            "SWITCHING_COST": np.mean([i["switching_cost"] for i in individual]),
            "COST_ADVANTAGE": np.mean([i["cost_advantage"] for i in individual]),
            "INTANGIBLE_ASSET": np.mean([i["intangible_asset"] for i in individual]),
        }
        team_moat_type = max(type_scores, key=type_scores.get)
    else:
        avg_moat = 0.0
        team_moat_type = "NONE"
        type_scores = {}
    
    # 팀 Moat 강도
    if avg_moat >= 0.7:
        team_strength = "WIDE"
    elif avg_moat >= 0.5:
        team_strength = "NARROW"
    elif avg_moat >= 0.3:
        team_strength = "THIN"
    else:
        team_strength = "NONE"
    
    return {
        "team_moat_score": avg_moat,
        "team_moat_type": team_moat_type,
        "team_moat_strength": team_strength,
        "type_breakdown": type_scores,
        "individual": individual,
        "recommendation": _moat_recommendation(avg_moat, team_moat_type),
    }


def _moat_recommendation(score: float, moat_type: str) -> str:
    """Moat 강화 권장"""
    if score >= 0.7:
        return f"강한 Moat 유지 중. {moat_type} 강점을 더 강화하세요."
    elif score >= 0.5:
        return f"Moat 있음. 약한 영역 보강 필요."
    elif score >= 0.3:
        return f"Moat 취약. 독점적 강점 개발 시급."
    else:
        return "Moat 없음. Zero to One 전략 필요 - 경쟁 없는 시장 창조."


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Innovation 관련 추가 (Peter Thiel Zero to One)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_innovation_score(
    money_events: pd.DataFrame,
    history_events: pd.DataFrame = None
) -> Dict:
    """
    혁신 점수 (Zero to One)
    
    = 새로운 이벤트 타입 / 전체 이벤트 타입
    = 새로운 고객 / 전체 고객
    = 10x 성장 이벤트 비율
    """
    if money_events.empty:
        return {"innovation_score": 0.0, "status": "NO_DATA"}
    
    current_types = set(money_events["event_type"].unique())
    current_customers = set(money_events["customer_id"].unique()) if "customer_id" in money_events.columns else set()
    
    # 이력 대비 새로운 것
    if history_events is not None and not history_events.empty:
        hist_types = set(history_events["event_type"].unique())
        hist_customers = set(history_events["customer_id"].unique()) if "customer_id" in history_events.columns else set()
        
        new_types = current_types - hist_types
        new_customers = current_customers - hist_customers
    else:
        new_types = current_types
        new_customers = current_customers
    
    # 점수 계산
    type_novelty = len(new_types) / max(len(current_types), 1)
    customer_novelty = len(new_customers) / max(len(current_customers), 1)
    
    # 종합 점수
    innovation_score = type_novelty * 0.4 + customer_novelty * 0.6
    
    # 10x 판단 (금액 기준 상위 10% 이벤트)
    if "amount_krw" in money_events.columns:
        threshold_10x = money_events["amount_krw"].quantile(0.90)
        big_events = (money_events["amount_krw"] >= threshold_10x).sum()
        moonshot_ratio = big_events / len(money_events)
    else:
        moonshot_ratio = 0.0
    
    return {
        "innovation_score": innovation_score,
        "type_novelty": type_novelty,
        "customer_novelty": customer_novelty,
        "new_event_types": list(new_types),
        "new_customers_count": len(new_customers),
        "moonshot_ratio": moonshot_ratio,
        "status": "INNOVATIVE" if innovation_score >= 0.5 else "INCREMENTAL",
    }




















