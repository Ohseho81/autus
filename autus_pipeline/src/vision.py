#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🎯 AUTUS PILLAR 1: Vision Mastery                                      ║
║                                                                                           ║
║  목적: 인류 규모 장기 비전 설정 + 자가 강화 루프 가속                                       ║
║                                                                                           ║
║  핵심 기능:                                                                                ║
║  1. Goal Tree (10년/3년/1년/분기 목표)                                                     ║
║  2. 후회 최소화 프레임워크 (Bezos식 80세 자신 질문)                                         ║
║  3. 목표 달성률 계산                                                                       ║
║                                                                                           ║
║  ⚠️ 기존 PIPELINE v1.3 LOCK 영향 없음 - 독립 모듈                                          ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import json


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Goal Tree 구조
# ═══════════════════════════════════════════════════════════════════════════════════════════

@dataclass
class Goal:
    """단일 목표"""
    id: str
    name: str
    horizon: str  # "10Y", "3Y", "1Y", "Q"
    metric: str  # "net_krw", "mint_krw", "team_score", etc.
    target_value: float
    current_value: float = 0.0
    start_date: str = ""
    end_date: str = ""
    parent_id: Optional[str] = None
    children_ids: List[str] = field(default_factory=list)
    
    @property
    def progress(self) -> float:
        """진행률 (0~1)"""
        if self.target_value <= 0:
            return 0.0
        return min(1.0, self.current_value / self.target_value)
    
    @property
    def status(self) -> str:
        """상태 판단"""
        p = self.progress
        if p >= 1.0:
            return "ACHIEVED"
        elif p >= 0.8:
            return "ON_TRACK"
        elif p >= 0.5:
            return "AT_RISK"
        else:
            return "BEHIND"


class GoalTree:
    """계층적 목표 트리"""
    
    HORIZONS = ["10Y", "3Y", "1Y", "Q"]
    
    def __init__(self):
        self.goals: Dict[str, Goal] = {}
    
    def add_goal(self, goal: Goal) -> None:
        """목표 추가"""
        self.goals[goal.id] = goal
        
        # 부모-자식 연결
        if goal.parent_id and goal.parent_id in self.goals:
            parent = self.goals[goal.parent_id]
            if goal.id not in parent.children_ids:
                parent.children_ids.append(goal.id)
    
    def get_by_horizon(self, horizon: str) -> List[Goal]:
        """수평선별 목표 조회"""
        return [g for g in self.goals.values() if g.horizon == horizon]
    
    def update_progress(self, goal_id: str, current_value: float) -> None:
        """진행률 업데이트"""
        if goal_id in self.goals:
            self.goals[goal_id].current_value = current_value
    
    def cascade_from_kpi(self, kpi: Dict) -> None:
        """
        KPI에서 목표 진행률 자동 업데이트
        
        PIPELINE의 KPI 결과를 받아서 관련 목표 업데이트
        """
        metric_map = {
            "net_krw": kpi.get("net_krw", 0),
            "mint_krw": kpi.get("mint_krw", 0),
            "burn_krw": kpi.get("burn_krw", 0),
            "entropy_ratio": kpi.get("entropy_ratio", 0),
            "coin_velocity": kpi.get("coin_velocity", 0),
        }
        
        for goal in self.goals.values():
            if goal.metric in metric_map:
                goal.current_value = metric_map[goal.metric]
    
    def get_tree_summary(self) -> Dict:
        """트리 요약"""
        summary = {h: [] for h in self.HORIZONS}
        
        for goal in self.goals.values():
            summary[goal.horizon].append({
                "id": goal.id,
                "name": goal.name,
                "progress": goal.progress,
                "status": goal.status,
            })
        
        return summary
    
    def to_dict(self) -> Dict:
        """직렬화"""
        return {
            gid: {
                "id": g.id,
                "name": g.name,
                "horizon": g.horizon,
                "metric": g.metric,
                "target_value": g.target_value,
                "current_value": g.current_value,
                "start_date": g.start_date,
                "end_date": g.end_date,
                "parent_id": g.parent_id,
                "children_ids": g.children_ids,
                "progress": g.progress,
                "status": g.status,
            }
            for gid, g in self.goals.items()
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "GoalTree":
        """역직렬화"""
        tree = cls()
        for gid, gdata in data.items():
            goal = Goal(
                id=gdata["id"],
                name=gdata["name"],
                horizon=gdata["horizon"],
                metric=gdata["metric"],
                target_value=gdata["target_value"],
                current_value=gdata.get("current_value", 0),
                start_date=gdata.get("start_date", ""),
                end_date=gdata.get("end_date", ""),
                parent_id=gdata.get("parent_id"),
                children_ids=gdata.get("children_ids", []),
            )
            tree.goals[gid] = goal
        return tree


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 후회 최소화 프레임워크 (Regret Minimization Framework)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_regret_score(
    decision: str,
    potential_upside: float,
    potential_downside: float,
    reversibility: float,  # 0~1 (1 = 완전 되돌릴 수 있음)
    time_sensitivity: float,  # 0~1 (1 = 지금 안 하면 기회 사라짐)
) -> Dict:
    """
    후회 최소화 점수 계산 (Bezos 80세 테스트)
    
    "80세에 이걸 안 했다고 후회할까?"
    
    점수가 높을수록 → 실행해야 함
    점수가 낮을수록 → 보류 가능
    """
    # 안 했을 때 후회 = 잠재적 상승분 × 시간 민감도
    regret_if_not = potential_upside * time_sensitivity
    
    # 했을 때 후회 = 잠재적 하락분 × (1 - 되돌림 가능성)
    regret_if_do = potential_downside * (1 - reversibility)
    
    # 순 후회 점수 (양수 = 해야함, 음수 = 하지 말아야함)
    net_regret_score = regret_if_not - regret_if_do
    
    # 정규화 (-1 ~ 1)
    max_val = max(abs(regret_if_not), abs(regret_if_do), 1)
    normalized_score = net_regret_score / max_val
    
    # 결정 권장
    if normalized_score > 0.3:
        recommendation = "DO_IT"
        reason = "80세에 안 했다고 후회할 가능성 높음"
    elif normalized_score < -0.3:
        recommendation = "SKIP"
        reason = "했다가 후회할 가능성 높음"
    else:
        recommendation = "CONSIDER"
        reason = "더 많은 정보 필요"
    
    return {
        "decision": decision,
        "regret_if_not": regret_if_not,
        "regret_if_do": regret_if_do,
        "net_regret_score": net_regret_score,
        "normalized_score": normalized_score,
        "recommendation": recommendation,
        "reason": reason,
    }


def batch_regret_analysis(decisions: List[Dict]) -> pd.DataFrame:
    """
    여러 결정의 후회 분석
    
    decisions: [{"decision": "...", "upside": 100, "downside": 50, ...}, ...]
    """
    results = []
    for d in decisions:
        result = compute_regret_score(
            decision=d.get("decision", ""),
            potential_upside=d.get("upside", 0),
            potential_downside=d.get("downside", 0),
            reversibility=d.get("reversibility", 0.5),
            time_sensitivity=d.get("time_sensitivity", 0.5),
        )
        results.append(result)
    
    df = pd.DataFrame(results)
    df = df.sort_values("normalized_score", ascending=False)
    return df


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Vision Score 계산
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_vision_score(goal_tree: GoalTree) -> Dict:
    """
    Vision Mastery 점수 계산
    
    가중치:
    - 10Y 목표: 40%
    - 3Y 목표: 30%
    - 1Y 목표: 20%
    - Q 목표: 10%
    """
    weights = {"10Y": 0.4, "3Y": 0.3, "1Y": 0.2, "Q": 0.1}
    
    horizon_scores = {}
    for horizon in GoalTree.HORIZONS:
        goals = goal_tree.get_by_horizon(horizon)
        if goals:
            avg_progress = sum(g.progress for g in goals) / len(goals)
        else:
            avg_progress = 0.0
        horizon_scores[horizon] = avg_progress
    
    # 가중 평균
    weighted_score = sum(
        horizon_scores[h] * weights[h]
        for h in GoalTree.HORIZONS
    )
    
    # 상태 판단
    if weighted_score >= 0.8:
        status = "VISIONARY"
    elif weighted_score >= 0.6:
        status = "ON_TRACK"
    elif weighted_score >= 0.4:
        status = "DRIFTING"
    else:
        status = "LOST"
    
    return {
        "vision_score": weighted_score,
        "horizon_scores": horizon_scores,
        "status": status,
        "goal_count": len(goal_tree.goals),
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# 유틸리티
# ═══════════════════════════════════════════════════════════════════════════════════════════

def create_default_goals(base_net: float = 0) -> GoalTree:
    """
    기본 목표 트리 생성
    
    10Y → 3Y → 1Y → Q 계층 구조
    """
    tree = GoalTree()
    
    # 10년 목표
    tree.add_goal(Goal(
        id="G-10Y-001",
        name="10년 순수익 목표",
        horizon="10Y",
        metric="net_krw",
        target_value=base_net * 100 if base_net > 0 else 10_000_000_000,  # 100억
        current_value=base_net,
    ))
    
    # 3년 목표
    tree.add_goal(Goal(
        id="G-3Y-001",
        name="3년 순수익 목표",
        horizon="3Y",
        metric="net_krw",
        target_value=base_net * 10 if base_net > 0 else 1_000_000_000,  # 10억
        current_value=base_net,
        parent_id="G-10Y-001",
    ))
    
    # 1년 목표
    tree.add_goal(Goal(
        id="G-1Y-001",
        name="1년 순수익 목표",
        horizon="1Y",
        metric="net_krw",
        target_value=base_net * 3 if base_net > 0 else 300_000_000,  # 3억
        current_value=base_net,
        parent_id="G-3Y-001",
    ))
    
    # 분기 목표
    tree.add_goal(Goal(
        id="G-Q-001",
        name="분기 순수익 목표",
        horizon="Q",
        metric="net_krw",
        target_value=base_net * 1.2 if base_net > 0 else 100_000_000,  # 1억
        current_value=base_net,
        parent_id="G-1Y-001",
    ))
    
    # Entropy 목표 (Risk 연계)
    tree.add_goal(Goal(
        id="G-1Y-ENT",
        name="연간 Entropy 목표",
        horizon="1Y",
        metric="entropy_ratio",
        target_value=0.20,  # 20% 이하 유지
        current_value=0.0,
    ))
    
    return tree


def save_goals(tree: GoalTree, path: str) -> None:
    """목표 트리 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(tree.to_dict(), f, ensure_ascii=False, indent=2)


def load_goals(path: str) -> GoalTree:
    """목표 트리 로드"""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return GoalTree.from_dict(data)





















