"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)


"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)


"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)


"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)


"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)












"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)


"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)


"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)


"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)


"""
Baselines
=========
개인 기준선 계산
"""

import pandas as pd
from typing import List


def compute_person_baseline_v12(
    money: pd.DataFrame,
    min_events: int = 2
) -> pd.DataFrame:
    """
    개인 기준선 계산 (v1.2)
    
    Args:
        money: Money 이벤트 (people_tags, amount, minutes, tag_count 포함)
        min_events: 최소 이벤트 수
        
    Returns:
        DataFrame with columns: [person_id, total_amount, total_minutes, event_count, base_rate_per_min]
    """
    if len(money) == 0:
        return pd.DataFrame(columns=["person_id", "total_amount", "total_minutes", "event_count", "base_rate_per_min"])
    
    # 사람별 집계
    person_stats = {}
    
    for _, row in money.iterrows():
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            continue
        
        amount = float(row.get("amount", 0))
        minutes = float(row.get("minutes", 0))
        tag_count = len(tags)
        
        # 분배
        per_person_amount = amount / tag_count
        per_person_minutes = minutes / tag_count
        
        for pid in tags:
            if pid not in person_stats:
                person_stats[pid] = {
                    "total_amount": 0.0,
                    "total_minutes": 0.0,
                    "event_count": 0
                }
            person_stats[pid]["total_amount"] += per_person_amount
            person_stats[pid]["total_minutes"] += per_person_minutes
            person_stats[pid]["event_count"] += 1
    
    # DataFrame 변환
    rows = []
    for pid, stats in person_stats.items():
        if stats["event_count"] >= min_events and stats["total_minutes"] > 0:
            rows.append({
                "person_id": pid,
                "total_amount": stats["total_amount"],
                "total_minutes": stats["total_minutes"],
                "event_count": stats["event_count"],
                "base_rate_per_min": stats["total_amount"] / stats["total_minutes"]
            })
    
    return pd.DataFrame(rows)

















