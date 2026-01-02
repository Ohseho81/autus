"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected












"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


"""
Mapper
======
드래그 → 물리 입력 변환
"""

import pandas as pd
from typing import List, Dict, Any


def apply_swap_to_team(
    team: List[str],
    out_pid: str,
    in_pid: str
) -> List[str]:
    """
    SWAP 적용: 팀에서 out_pid를 in_pid로 교체
    
    Args:
        team: 현재 팀
        out_pid: 나갈 사람
        in_pid: 들어올 사람
        
    Returns:
        새 팀 리스트
    """
    new_team = [p for p in team if p != out_pid]
    if in_pid not in new_team:
        new_team.append(in_pid)
    return new_team


def apply_alloc_to_projection(
    money: pd.DataFrame,
    alloc: List[Dict[str, Any]]
) -> pd.DataFrame:
    """
    ALLOC 적용: minutes 배분 변경
    
    Args:
        money: 원본 Money 이벤트
        alloc: [{"person_id": str, "delta_minutes": float}, ...]
        
    Returns:
        수정된 Money 이벤트 (프로젝션용)
    """
    if not alloc or len(money) == 0:
        return money
    
    # 복사본 생성
    projected = money.copy()
    
    # 각 할당 변경 적용
    alloc_dict = {a["person_id"]: a["delta_minutes"] for a in alloc}
    
    def adjust_minutes(row):
        tags = str(row.get("people_tags", "")).split(";")
        tags = [t.strip() for t in tags if t.strip()]
        
        if not tags:
            return row["minutes"]
        
        # 해당 이벤트에 참여한 사람들의 delta 합계
        total_delta = sum(alloc_dict.get(t, 0) for t in tags)
        
        # 분배 (참여자 수로 나눔)
        delta_per_tag = total_delta / len(tags)
        
        new_minutes = row["minutes"] + delta_per_tag
        return max(1, new_minutes)  # 최소 1분
    
    if "minutes" in projected.columns:
        projected["minutes"] = projected.apply(adjust_minutes, axis=1)
    
    return projected


















