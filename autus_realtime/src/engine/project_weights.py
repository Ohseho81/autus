"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals


"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals


"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals


"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals


"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals












"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals


"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals


"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals


"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals


"""
Project Weights
===============
프로젝트 가중치 계산
"""

import pandas as pd
from datetime import datetime, timedelta


def compute_project_weights_4w(
    money: pd.DataFrame,
    weeks: int = 4
) -> pd.DataFrame:
    """
    최근 N주 프로젝트 가중치 계산
    
    Args:
        money: Money 이벤트
        weeks: 윈도우 크기 (주)
        
    Returns:
        DataFrame with columns: [project_id, total_amount, weight]
    """
    cutoff = datetime.now() - timedelta(weeks=weeks)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    if "date" in money.columns:
        recent = money[money["date"] >= cutoff_str]
    else:
        recent = money
    
    if len(recent) == 0 or "project_id" not in recent.columns:
        return pd.DataFrame(columns=["project_id", "total_amount", "weight"])
    
    # 프로젝트별 합계
    project_totals = recent.groupby("project_id")["amount"].sum().reset_index()
    project_totals.columns = ["project_id", "total_amount"]
    
    # 가중치 정규화
    total = project_totals["total_amount"].sum()
    project_totals["weight"] = project_totals["total_amount"] / total if total > 0 else 1.0
    
    return project_totals

















