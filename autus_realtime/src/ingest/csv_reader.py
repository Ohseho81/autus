"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)


"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)


"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)


"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)


"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)












"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)


"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)


"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)


"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)


"""
CSV Reader
==========
CSV 데이터 로드
"""

import pandas as pd
from pathlib import Path
from ..config import MONEY_CSV, BURN_CSV, DATA_DIR


def load_money_normalized() -> pd.DataFrame:
    """정규화된 Money 이벤트 로드"""
    path = Path(MONEY_CSV)
    
    if not path.exists():
        # 샘플 데이터 생성
        return _create_sample_money()
    
    df = pd.read_csv(path)
    return df


def load_burn_normalized() -> pd.DataFrame:
    """정규화된 Burn 이벤트 로드"""
    path = Path(BURN_CSV)
    
    if not path.exists():
        return pd.DataFrame(columns=["event_id", "week", "status", "amount", "person_id", "minutes"])
    
    df = pd.read_csv(path)
    return df


def _create_sample_money() -> pd.DataFrame:
    """샘플 Money 데이터 생성"""
    from datetime import datetime, timedelta
    
    # 샘플 데이터
    data = [
        {
            "event_id": "E0001",
            "date": (datetime.now() - timedelta(days=6)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 50000000,
            "minutes": 2400,
            "people_tags": "P01",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0002",
            "date": (datetime.now() - timedelta(days=5)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 20000000,
            "minutes": 1800,
            "people_tags": "P02",
            "industry_id": "education",
            "customer_id": "C001",
            "project_id": "PRJ-001"
        },
        {
            "event_id": "E0003",
            "date": (datetime.now() - timedelta(days=4)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 35000000,
            "minutes": 2000,
            "people_tags": "P01;P03",
            "industry_id": "education",
            "customer_id": "C002",
            "project_id": "PRJ-002"
        },
        {
            "event_id": "E0004",
            "date": (datetime.now() - timedelta(days=3)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 25000000,
            "minutes": 1500,
            "people_tags": "P01;P02;P03",
            "industry_id": "education",
            "customer_id": "C003",
            "project_id": "PRJ-003"
        },
        {
            "event_id": "E0005",
            "date": (datetime.now() - timedelta(days=2)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 18000000,
            "minutes": 1200,
            "people_tags": "P02;P04",
            "industry_id": "education",
            "customer_id": "C004",
            "project_id": "PRJ-004"
        },
        {
            "event_id": "E0006",
            "date": (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d"),
            "event_type": "CASH_IN",
            "amount": 15000000,
            "minutes": 900,
            "people_tags": "P03;P05",
            "industry_id": "education",
            "customer_id": "C005",
            "project_id": "PRJ-005"
        },
    ]
    
    return pd.DataFrame(data)

















