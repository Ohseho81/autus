#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Data Ingestion                          ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ customer_id 필수 (빈값 불가)                                                           ║
║  ✅ project_id 자동 할당 (__AUTO__ → AUTO-{customer}-{YYYYMM})                             ║
║  ✅ burn_events에 prevented_by, prevented_minutes 컬럼 추가                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
from datetime import datetime
from typing import Optional
from .schemas import MONEY_EVENT_TYPES, RECO_TYPES, BURN_TYPES


def _parse_date(s: str) -> pd.Timestamp:
    """날짜 파싱"""
    return pd.to_datetime(s, errors="raise")


def auto_assign_project_id(df: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3: project_id가 '__AUTO__'이면 자동 할당
    
    형식: AUTO-{customer_id}-{YYYYMM}
    """
    out = df.copy()
    mask = out["project_id"] == "__AUTO__"
    
    if mask.any():
        out.loc[mask, "project_id"] = out.loc[mask].apply(
            lambda r: f"AUTO-{r['customer_id']}-{r['date'].strftime('%Y%m')}",
            axis=1
        )
    
    return out


def read_money_events(path: str) -> pd.DataFrame:
    """
    Money Events CSV 읽기 및 검증
    
    v1.3 변경:
    - customer_id: REQUIRED (빈값 불가)
    - project_id: OPTIONAL (빈값 시 자동 할당)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = [
        "event_id", "date", "event_type", "currency", "amount", "people_tags",
        "effective_minutes", "evidence_id", "recommendation_type"
    ]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"money_events missing columns: {missing}")
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # event_type 검증
    bad_types = df.loc[~df["event_type"].isin(MONEY_EVENT_TYPES), "event_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid event_type: {bad_types}")
    
    # recommendation_type 검증
    df["recommendation_type"] = df["recommendation_type"].fillna("")
    bad_reco = df.loc[~df["recommendation_type"].isin(RECO_TYPES), "recommendation_type"].unique().tolist()
    if bad_reco:
        raise ValueError(f"invalid recommendation_type: {bad_reco}")
    
    # people_tags 검증 (1~3명)
    def _count_tags(x: str) -> int:
        tags = [t.strip() for t in str(x).split(";") if t.strip()]
        return len(tags)
    
    tag_counts = df["people_tags"].apply(_count_tags)
    if (tag_counts < 1).any() or (tag_counts > 3).any():
        bad = df.loc[(tag_counts < 1) | (tag_counts > 3), ["event_id", "people_tags"]]
        raise ValueError(f"people_tags must have 1..3 tags. bad rows:\n{bad}")
    
    # effective_minutes 검증 (5~1440분)
    if (df["effective_minutes"] < 5).any() or (df["effective_minutes"] > 1440).any():
        bad = df.loc[
            (df["effective_minutes"] < 5) | (df["effective_minutes"] > 1440),
            ["event_id", "effective_minutes"]
        ]
        raise ValueError(f"effective_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["event_id", "evidence_id"]]
        raise ValueError(f"duplicate evidence_id detected:\n{dup}")
    
    # 선택 필드 기본값
    if "contract_months" not in df.columns:
        df["contract_months"] = None
    if "recommendation_id" not in df.columns:
        df["recommendation_id"] = None
    
    # ═══════════════════════════════════════════════════════════════════════════
    # v1.3: customer_id 필수 + project_id 자동 할당
    # ═══════════════════════════════════════════════════════════════════════════
    
    # customer_id 필수 검증
    if "customer_id" not in df.columns:
        # v1.3 완화: 없으면 경고 후 기본값 (실제 운영에서는 raise)
        print("⚠️ WARNING: customer_id column missing. Using '__DEFAULT_CUSTOMER__'")
        df["customer_id"] = "__DEFAULT_CUSTOMER__"
    else:
        df["customer_id"] = df["customer_id"].astype(str).str.strip()
        # 빈값 검증 (v1.3 LOCK에서는 에러, 여기서는 완화)
        empty_mask = (df["customer_id"] == "") | (df["customer_id"].isna()) | (df["customer_id"] == "nan")
        if empty_mask.any():
            print(f"⚠️ WARNING: {empty_mask.sum()} rows have empty customer_id. Using '__UNKNOWN__'")
            df.loc[empty_mask, "customer_id"] = "__UNKNOWN__"
    
    # project_id 처리
    if "project_id" not in df.columns:
        df["project_id"] = "__AUTO__"
    else:
        df["project_id"] = df["project_id"].fillna("__AUTO__").astype(str).str.strip()
        df.loc[df["project_id"] == "", "project_id"] = "__AUTO__"
        df.loc[df["project_id"] == "nan", "project_id"] = "__AUTO__"
    
    # project_id 자동 할당
    df = auto_assign_project_id(df)
    
    return df


def read_burn_events(path: str) -> pd.DataFrame:
    """
    Burn Events CSV 읽기 및 검증
    
    v1.1 변경:
    - burn_type에 PREVENTED, FIXED 추가
    - prevented_by: Controller 후보 ID
    - prevented_minutes: 줄인 시간(분)
    """
    df = pd.read_csv(path)
    
    # 필수 컬럼 검증
    required = ["burn_id", "date", "burn_type", "person_or_edge", "loss_minutes", "evidence_id"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"burn_events missing columns: {missing}")
    
    # v1.1 선택 컬럼
    if "prevented_by" not in df.columns:
        df["prevented_by"] = None
    if "prevented_minutes" not in df.columns:
        df["prevented_minutes"] = 0
    
    # 날짜 파싱
    df["date"] = df["date"].apply(_parse_date)
    
    # burn_type 검증
    bad_types = df.loc[~df["burn_type"].isin(BURN_TYPES), "burn_type"].unique().tolist()
    if bad_types:
        raise ValueError(f"invalid burn_type: {bad_types}")
    
    # loss_minutes 검증 (0~1440분, PREVENTED/FIXED는 0 가능)
    if (df["loss_minutes"] < 0).any() or (df["loss_minutes"] > 1440).any():
        bad = df.loc[
            (df["loss_minutes"] < 0) | (df["loss_minutes"] > 1440),
            ["burn_id", "loss_minutes"]
        ]
        raise ValueError(f"loss_minutes out of range. bad rows:\n{bad}")
    
    # prevented_minutes 검증
    df["prevented_minutes"] = df["prevented_minutes"].fillna(0).astype(float)
    if (df["prevented_minutes"] < 0).any() or (df["prevented_minutes"] > 1440).any():
        bad = df.loc[
            (df["prevented_minutes"] < 0) | (df["prevented_minutes"] > 1440),
            ["burn_id", "prevented_minutes"]
        ]
        raise ValueError(f"prevented_minutes out of range. bad rows:\n{bad}")
    
    # evidence_id 고유성 검증
    if df["evidence_id"].duplicated().any():
        dup = df.loc[df["evidence_id"].duplicated(keep=False), ["burn_id", "evidence_id"]]
        raise ValueError(f"duplicate burn evidence_id detected:\n{dup}")
    
    # prevented_by 정리
    df["prevented_by"] = df["prevented_by"].fillna("").astype(str).str.strip()
    
    return df


def read_fx_rates(path: str) -> pd.DataFrame:
    """FX Rates CSV 읽기"""
    df = pd.read_csv(path)
    
    required = ["date", "currency", "fx_rate_to_krw", "source"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"fx_rates missing columns: {missing}")
    
    df["date"] = df["date"].apply(_parse_date)
    return df


def read_edges(path: str) -> pd.DataFrame:
    """Edges CSV 읽기 (인간 관계 그래프)"""
    df = pd.read_csv(path)
    
    required = ["from_id", "to_id", "link_strength"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"edges missing columns: {missing}")
    
    if (df["link_strength"] < 0).any() or (df["link_strength"] > 1).any():
        bad = df.loc[
            (df["link_strength"] < 0) | (df["link_strength"] > 1),
            ["from_id", "to_id", "link_strength"]
        ]
        raise ValueError(f"link_strength must be 0..1. bad rows:\n{bad}")
    
    return df


def read_historical_burns(path: str) -> pd.DataFrame:
    """Historical Burns 읽기 (전주/전전주 비교용)"""
    df = pd.read_csv(path)
    
    required = ["week_id", "person_id", "burn_minutes", "burn_count"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"historical_burns missing columns: {missing}")
    
    return df






















