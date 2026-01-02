"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}












"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


"""
Team Score
==========
팀 점수 계산 및 최적 팀 찾기
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Any, List


def compute_team_score(
    team: List[str],
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> float:
    """
    팀 점수 계산
    
    Score = Σ(개인 점수) + Σ(Pair 시너지) + Σ(Group 시너지)
    """
    score = 0.0
    
    # 개인 점수
    person_dict = dict(zip(person_scores["person_id"], person_scores.get("score_per_hr", person_scores.get("score_per_min", [0]*len(person_scores)))))
    for pid in team:
        score += person_dict.get(pid, 0)
    
    # Pair 시너지
    if len(pair_synergy) > 0:
        pair_dict = {}
        for _, row in pair_synergy.iterrows():
            key = tuple(sorted([row["person_i"], row["person_j"]]))
            pair_dict[key] = row["synergy"]
        
        for i, j in combinations(sorted(team), 2):
            score += pair_dict.get((i, j), 0)
    
    # Group 시너지
    if len(group_synergy) > 0:
        group_dict = dict(zip(group_synergy["group"], group_synergy["synergy"]))
        
        team_key = ";".join(sorted(team))
        score += group_dict.get(team_key, 0)
    
    return score


def find_best_team_v11(
    person_scores: pd.DataFrame,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame,
    burn_krw: float,
    team_size: int = 5,
    top_k: int = 12
) -> Dict[str, Any]:
    """
    최적 팀 찾기 (v1.1)
    
    Args:
        person_scores: 개인 점수 [person_id, score_per_hr]
        pair_synergy: Pair 시너지
        group_synergy: Group 시너지
        burn_krw: Burn KRW (미사용, 향후 확장용)
        team_size: 팀 크기
        top_k: 후보 수
        
    Returns:
        {"team": List[str], "score": float}
    """
    # Top K 후보 선정
    if "score_per_hr" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_hr")["person_id"].tolist()
    elif "score_per_min" in person_scores.columns:
        candidates = person_scores.nlargest(top_k, "score_per_min")["person_id"].tolist()
    else:
        candidates = person_scores["person_id"].head(top_k).tolist()
    
    if len(candidates) < team_size:
        return {"team": candidates, "score": 0.0}
    
    best_team = []
    best_score = -float("inf")
    
    # 모든 조합 탐색 (top_k가 작으므로 가능)
    for team in combinations(candidates, team_size):
        score = compute_team_score(list(team), person_scores, pair_synergy, group_synergy)
        if score > best_score:
            best_score = score
            best_team = list(team)
    
    return {"team": best_team, "score": best_score}


















