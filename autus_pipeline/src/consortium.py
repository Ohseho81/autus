#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Consortium                              ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ Team Score v1.1: pair + group synergy 통합                                             ║
║  ✅ Group synergy에 가중치 적용 (group_weight)                                             ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 기반 시너지 합산 후 팀 점수 계산                                         ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import itertools
from typing import Dict, List, Tuple, Optional
from .config import CFG


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.0: Basic Team Score (pair only)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float
) -> float:
    """
    v1.0: 기본 팀 점수 계산 (pair synergy만)
    
    TeamScore = Σ(개인 Score) + γ × Σ(positive pair uplift) - Burn 패널티
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    # 페어 시너지 보너스 (양수만)
    s_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy.columns else "uplift"
    
    for _, r in synergy.iterrows():
        s_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus = 0.0
    members = sorted(team)
    for i, j in itertools.combinations(members, 2):
        bonus += max(0.0, s_map.get((i, j), 0.0))
    
    # Burn 패널티
    burn_penalty = burn_krw / max(len(team), 1)
    burn_penalty_scaled = burn_penalty * 1e-6
    
    return base + gamma * bonus - burn_penalty_scaled


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: Team Score with Pair + Group Synergy (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_team_score_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    team: List[str],
    gamma: float,
    burn_krw: float,
    group_weight: float = 0.6
) -> float:
    """
    v1.1: 팀 점수 계산 (pair + group synergy)
    
    TeamScore = base + γ × (pair_bonus + group_weight × group_bonus) - burn_penalty
    
    - base: 개인 score_per_min 합산
    - pair_bonus: 양수 pair uplift 합산
    - group_bonus: 팀에 포함된 group의 양수 uplift 합산
    - group_weight < 1로 group 과대평가 방지
    """
    # 개인 점수 합산
    p_map = person_scores.set_index("person_id")["score_per_min"].to_dict()
    base = sum(p_map.get(pid, 0.0) for pid in team)
    
    members = sorted(team)
    team_set = set(members)
    
    # ─── Pair Synergy Bonus ───
    pair_map = {}
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "uplift"
    
    for _, r in pair_synergy.iterrows():
        pair_map[(r["i"], r["j"])] = float(r.get(col, 0.0))
    
    bonus_pair = 0.0
    for i, j in itertools.combinations(members, 2):
        bonus_pair += max(0.0, pair_map.get((i, j), 0.0))
    
    # ─── Group Synergy Bonus ───
    bonus_group = 0.0
    col_g = "synergy_uplift_per_min" if "synergy_uplift_per_min" in group_synergy.columns else "uplift"
    
    for _, r in group_synergy.iterrows():
        g_members = set(str(r["group_key"]).split(";"))
        # group이 팀의 부분집합인 경우만 포함
        if g_members.issubset(team_set):
            bonus_group += max(0.0, float(r.get(col_g, 0.0)))
    
    # ─── Burn Penalty ───
    burn_penalty = (burn_krw / max(len(team), 1)) * 1e-6
    
    return base + gamma * (bonus_pair + group_weight * bonus_group) - burn_penalty


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Finding Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def find_best_team(
    person_scores: pd.DataFrame,
    synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None
) -> Dict:
    """
    v1.0: 최적 팀 탐색 (pair synergy만)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score(person_scores, synergy, list(team), gamma, burn_krw)
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12,
    gamma: float = None,
    group_weight: float = 0.6
) -> Dict:
    """
    v1.1: 최적 팀 탐색 (pair + group synergy) (LOCK)
    """
    if gamma is None:
        gamma = CFG.gamma_team_bonus
    
    if person_scores.empty or len(person_scores) < team_size:
        return {"team": [], "score": 0.0, "reason": "INSUFFICIENT_CANDIDATES"}
    
    cand = person_scores.sort_values("score_per_min", ascending=False).head(top_k)["person_id"].tolist()
    
    if len(cand) < team_size:
        team_size = len(cand)
    
    best = {"team": [], "score": float("-inf")}
    
    for team in itertools.combinations(cand, team_size):
        s = compute_team_score_v11(
            person_scores, pair_synergy, group_synergy,
            list(team), gamma, burn_krw, group_weight
        )
        if s > best["score"]:
            best = {"team": list(team), "score": float(s)}
    
    return best


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Team Analysis Functions
# ═══════════════════════════════════════════════════════════════════════════════════════════

def analyze_team_composition(
    team: List[str],
    roles: pd.DataFrame,
    role_scores: pd.DataFrame
) -> Dict:
    """팀 구성 분석"""
    all_roles = ["RAINMAKER", "CLOSER", "OPERATOR", "BUILDER", "CONNECTOR", "CONTROLLER"]
    
    if roles.empty:
        return {
            "role_coverage": 0.0,
            "covered_roles": [],
            "missing_roles": all_roles,
            "avg_role_scores": {},
        }
    
    team_roles = roles[roles["person_id"].isin(team)]
    
    covered = set()
    for _, r in team_roles.iterrows():
        if r.get("primary_role"):
            covered.add(r["primary_role"])
        if r.get("secondary_role"):
            covered.add(r["secondary_role"])
    
    missing = [r for r in all_roles if r not in covered]
    
    # 역할 점수 평균
    team_scores = role_scores[role_scores["person_id"].isin(team)]
    score_cols = [c for c in role_scores.columns if c.endswith("_score")]
    
    avg_scores = {}
    for col in score_cols:
        if col in team_scores.columns:
            avg_scores[col] = float(team_scores[col].mean())
    
    return {
        "role_coverage": len(covered) / len(all_roles),
        "covered_roles": list(covered),
        "missing_roles": missing,
        "avg_role_scores": avg_scores,
    }


def compute_team_synergy_matrix(
    team: List[str],
    pair_synergy: pd.DataFrame
) -> pd.DataFrame:
    """팀 내 시너지 매트릭스 생성"""
    members = sorted(team)
    
    col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in pair_synergy.columns else "pair_coin_rate_per_min"
    
    rows = []
    for i in members:
        row = {"person_id": i}
        for j in members:
            if i == j:
                row[j] = 1.0
            else:
                key = tuple(sorted([i, j]))
                match = pair_synergy[(pair_synergy["i"] == key[0]) & (pair_synergy["j"] == key[1])]
                if not match.empty:
                    row[j] = float(match.iloc[0].get(col, 0.0))
                else:
                    row[j] = 0.0
        rows.append(row)
    
    return pd.DataFrame(rows).set_index("person_id")


def suggest_team_improvements(
    current_team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float = 0.0
) -> List[Dict]:
    """팀 개선 제안 (1명 교체 시 가장 큰 개선)"""
    if not current_team or len(current_team) < 2:
        return []
    
    suggestions = []
    current_score = compute_team_score_v11(
        person_scores, pair_synergy, group_synergy,
        current_team, CFG.gamma_team_bonus, burn_krw
    )
    
    # 팀 외 후보
    non_team = person_scores[~person_scores["person_id"].isin(current_team)]["person_id"].tolist()
    
    for remove in current_team:
        for add in non_team[:10]:  # 상위 10명만
            new_team = [p for p in current_team if p != remove] + [add]
            new_score = compute_team_score_v11(
                person_scores, pair_synergy, group_synergy,
                new_team, CFG.gamma_team_bonus, burn_krw
            )
            
            improvement = new_score - current_score
            if improvement > 0:
                suggestions.append({
                    "remove": remove,
                    "add": add,
                    "new_team": new_team,
                    "improvement": improvement,
                    "new_score": new_score,
                })
    
    suggestions.sort(key=lambda x: x["improvement"], reverse=True)
    return suggestions[:5]





















