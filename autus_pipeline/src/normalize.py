import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)






import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)






import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)






import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)






import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)
















import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)






import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)






import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)






import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)






import pandas as pd
from datetime import datetime
from .config import CFG


def calculate_week_id(dt: pd.Timestamp) -> str:
    """날짜를 주차 ID로 변환 (YYYY-Www 형식)"""
    iso = dt.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


def add_week_id(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """DataFrame에 week_id 컬럼 추가"""
    out = df.copy()
    out["week_id"] = out[date_col].apply(calculate_week_id)
    return out


def normalize_person_ids(df: pd.DataFrame, id_col: str = "person_id") -> pd.DataFrame:
    """Person ID 정규화 (공백 제거, 대문자 변환)"""
    out = df.copy()
    out[id_col] = out[id_col].astype(str).str.strip().str.upper()
    return out

def attach_fx_and_convert_amount_krw(money: pd.DataFrame, fx: pd.DataFrame) -> pd.DataFrame:
    money = money.copy()
    fx = fx.copy()

    # Use "previous day" FX: event_date - 1 day
    money["fx_date"] = money["date"] - pd.Timedelta(days=1)

    money["amount_krw"] = None
    money["fx_rate"] = None
    money["fx_source"] = None

    # KRW passthrough
    is_krw = money["currency"].str.upper().fillna("") == "KRW"
    money.loc[is_krw, "amount_krw"] = money.loc[is_krw, "amount"].astype(float)
    money.loc[is_krw, "fx_rate"] = 1.0
    money.loc[is_krw, "fx_source"] = "KRW"

    # Non-KRW lookup
    non = money.loc[~is_krw].copy()
    if not non.empty:
        non["currency"] = non["currency"].str.upper()
        fx["currency"] = fx["currency"].str.upper()

        merged = non.merge(
            fx,
            left_on=["fx_date","currency"],
            right_on=["date","currency"],
            how="left",
            suffixes=("","_fx")
        )
        if merged["fx_rate_to_krw"].isna().any():
            bad = merged.loc[merged["fx_rate_to_krw"].isna(), ["event_id","currency","fx_date"]]
            raise ValueError(f"missing fx rate for rows:\n{bad}")

        money.loc[~is_krw, "fx_rate"] = merged["fx_rate_to_krw"].values
        money.loc[~is_krw, "fx_source"] = merged["source"].values
        money.loc[~is_krw, "amount_krw"] = merged["amount"].astype(float).values * merged["fx_rate_to_krw"].astype(float).values

    # MRR cap
    is_mrr = money["event_type"] == "MRR"
    if is_mrr.any():
        months = money.loc[is_mrr, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_mrr)
        money.loc[is_mrr, "amount_krw"] = money.loc[is_mrr, "amount_krw"].astype(float) * months_capped.astype(float)

    # COST_SAVED cap: contract_months used as "applied_months" if provided
    is_saved = money["event_type"] == "COST_SAVED"
    if is_saved.any():
        months = money.loc[is_saved, "contract_months"].fillna(1).astype(int)
        months_capped = months.clip(lower=1, upper=CFG.cap_months_cost_saved)
        money.loc[is_saved, "amount_krw"] = money.loc[is_saved, "amount_krw"].astype(float) * months_capped.astype(float)

    money["amount_krw"] = money["amount_krw"].astype(float)
    return money

def explode_people_tags(money: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, r in money.iterrows():
        tags = [t.strip() for t in str(r["people_tags"]).split(";") if t.strip()]
        k = len(tags)
        for pid in tags:
            rr = r.copy()
            rr["person_id"] = pid
            rr["tag_count"] = k
            # Initial attribution: equal split
            rr["amount_krw_person"] = float(r["amount_krw"]) / k
            rr["minutes_person"] = float(r["effective_minutes"]) / k
            rows.append(rr)
    return pd.DataFrame(rows)





















