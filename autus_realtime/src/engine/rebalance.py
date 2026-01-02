"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers












"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


"""
Rebalance
=========
리밸런스 트리거
"""

from typing import Dict, Any, List


def check_rebalance_triggers(
    kpi: Dict[str, Any],
    thresholds: Dict[str, float] = None
) -> List[Dict[str, Any]]:
    """
    리밸런스 트리거 체크
    
    Args:
        kpi: 현재 KPI
        thresholds: 임계값
        
    Returns:
        [{"type": str, "reason": str, "urgency": str}, ...]
    """
    if thresholds is None:
        thresholds = {
            "entropy_high": 0.7,
            "entropy_medium": 0.5,
            "velocity_expand": 10000
        }
    
    triggers = []
    
    entropy = kpi.get("entropy_7d_pred", kpi.get("entropy_ratio", 0))
    velocity = kpi.get("velocity_7d_pred", kpi.get("coin_velocity", 0))
    
    # EntropyRatio 트리거
    if entropy > thresholds["entropy_high"]:
        triggers.append({
            "type": "REBALANCE",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_high']}",
            "urgency": "high"
        })
    elif entropy > thresholds["entropy_medium"]:
        triggers.append({
            "type": "SHRINK",
            "reason": f"EntropyRatio {entropy:.2f} > {thresholds['entropy_medium']}",
            "urgency": "medium"
        })
    
    # Velocity 트리거
    if velocity > thresholds["velocity_expand"]:
        triggers.append({
            "type": "EXPAND",
            "reason": f"Velocity {velocity:.0f} > {thresholds['velocity_expand']}",
            "urgency": "low"
        })
    
    return triggers


















