"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors


"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors


"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors


"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors


"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors












"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors


"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors


"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors


"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors


"""
Validators
==========
데이터 검증
"""

import pandas as pd
from typing import List, Tuple


def validate_money_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Money 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "date", "amount", "minutes", "people_tags"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    if "amount" in df.columns and (df["amount"] < 0).any():
        errors.append("Negative amounts found")
    
    if "minutes" in df.columns and (df["minutes"] <= 0).any():
        errors.append("Non-positive minutes found")
    
    return len(errors) == 0, errors


def validate_burn_events(df: pd.DataFrame) -> Tuple[bool, List[str]]:
    """Burn 이벤트 검증"""
    errors = []
    
    required_cols = ["event_id", "week", "status"]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        errors.append(f"Missing columns: {missing}")
    
    return len(errors) == 0, errors

















