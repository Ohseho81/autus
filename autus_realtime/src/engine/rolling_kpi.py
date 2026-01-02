"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }












"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


"""
Rolling KPI
===========
Rolling Window KPI 계산
"""

import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any


def compute_rolling_kpi(
    money: pd.DataFrame,
    burn: pd.DataFrame,
    window_days: int = 7
) -> Dict[str, Any]:
    """
    Rolling KPI 계산
    
    Args:
        money: Money 이벤트
        burn: Burn 이벤트
        window_days: 윈도우 크기 (일)
        
    Returns:
        {
            "mint_krw": float,
            "burn_krw": float,
            "net_krw": float,
            "entropy_ratio": float,
            "coin_velocity": float,
            "total_minutes": float
        }
    """
    cutoff = datetime.now() - timedelta(days=window_days)
    cutoff_str = cutoff.strftime("%Y-%m-%d")
    
    # Money 필터링
    if "date" in money.columns:
        recent_money = money[money["date"] >= cutoff_str]
    else:
        recent_money = money
    
    mint_krw = float(recent_money["amount"].sum()) if "amount" in recent_money.columns else 0.0
    total_minutes = float(recent_money["minutes"].sum()) if "minutes" in recent_money.columns else 1.0
    
    # Burn 계산
    burn_krw = 0.0
    if len(burn) > 0 and "amount" in burn.columns:
        burn_krw = float(burn["amount"].sum())
    elif len(burn) > 0 and "minutes" in burn.columns:
        # minutes를 KRW로 환산 (평균 단가 사용)
        avg_rate = mint_krw / total_minutes if total_minutes > 0 else 10000
        burn_krw = float(burn["minutes"].sum()) * avg_rate
    
    net_krw = mint_krw - burn_krw
    entropy_ratio = burn_krw / mint_krw if mint_krw > 0 else 0.0
    coin_velocity = mint_krw / total_minutes if total_minutes > 0 else 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net_krw,
        "entropy_ratio": entropy_ratio,
        "coin_velocity": coin_velocity,
        "total_minutes": total_minutes
    }


















