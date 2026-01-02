"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df


"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df


"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df


"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df


"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df












"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df


"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df


"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df


"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df


"""
Synergy Partitioned
===================
파티션별 시너지 계산
"""

import pandas as pd
from itertools import combinations
from typing import Dict, Tuple


def compute_pair_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame
) -> pd.DataFrame:
    """
    Pair 시너지 계산 (파티션별)
    
    Returns:
        DataFrame with columns: [person_i, person_j, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    pair_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < 2:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        # 모든 쌍
        for i, j in combinations(sorted(tags), 2):
            key = (i, j, project_id)
            
            b_i = baseline_dict.get(i, 0)
            b_j = baseline_dict.get(j, 0)
            baseline_avg = (b_i + b_j) / 2
            
            uplift = event_rate - baseline_avg
            
            if key not in pair_stats:
                pair_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
            
            pair_stats[key]["uplift_sum"] += max(0, uplift)
            pair_stats[key]["event_count"] += 1
    
    rows = []
    for (i, j, proj), stats in pair_stats.items():
        rows.append({
            "person_i": i,
            "person_j": j,
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def compute_group_synergy_uplift_partitioned(
    money: pd.DataFrame,
    baseline: pd.DataFrame,
    k_min: int = 3,
    k_max: int = 4
) -> pd.DataFrame:
    """
    Group 시너지 계산 (k_min ~ k_max 명)
    
    Returns:
        DataFrame with columns: [group, project_id, uplift, event_count]
    """
    baseline_dict = dict(zip(baseline["person_id"], baseline["base_rate_per_min"]))
    
    group_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if len(tags) < k_min or len(tags) > k_max:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        project_id = row.get("project_id", "UNKNOWN")
        
        if minutes <= 0:
            continue
        
        event_rate = amount / minutes
        
        group_key = tuple(sorted(tags))
        key = (group_key, project_id)
        
        # 그룹 평균 baseline
        baselines = [baseline_dict.get(t, 0) for t in tags]
        baseline_avg = sum(baselines) / len(baselines) if baselines else 0
        
        uplift = event_rate - baseline_avg
        
        if key not in group_stats:
            group_stats[key] = {"uplift_sum": 0.0, "event_count": 0}
        
        group_stats[key]["uplift_sum"] += max(0, uplift)
        group_stats[key]["event_count"] += 1
    
    rows = []
    for (group, proj), stats in group_stats.items():
        rows.append({
            "group": ";".join(group),
            "project_id": proj,
            "uplift": stats["uplift_sum"],
            "event_count": stats["event_count"]
        })
    
    return pd.DataFrame(rows)


def aggregate_synergy_with_project_weights(
    pair_part: pd.DataFrame,
    group_part: pd.DataFrame,
    weights: pd.DataFrame
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """
    프로젝트 가중치로 시너지 집계
    """
    weight_dict = dict(zip(weights["project_id"], weights["weight"])) if len(weights) > 0 else {}
    
    # Pair 집계
    pair_agg = {}
    for _, row in pair_part.iterrows():
        key = (row["person_i"], row["person_j"])
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in pair_agg:
            pair_agg[key] = 0.0
        pair_agg[key] += row["uplift"] * w
    
    pair_df = pd.DataFrame([
        {"person_i": k[0], "person_j": k[1], "synergy": v}
        for k, v in pair_agg.items()
    ])
    
    # Group 집계
    group_agg = {}
    for _, row in group_part.iterrows():
        key = row["group"]
        w = weight_dict.get(row["project_id"], 1.0)
        
        if key not in group_agg:
            group_agg[key] = 0.0
        group_agg[key] += row["uplift"] * w
    
    group_df = pd.DataFrame([
        {"group": k, "synergy": v}
        for k, v in group_agg.items()
    ])
    
    return pair_df, group_df

















