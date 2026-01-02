#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Transform                               ║
║                                                                                           ║
║  v1.2 업그레이드:                                                                          ║
║  ✅ BaseRate 백오프: SOLO → ROLE_BUCKET → ALL                                              ║
║  ✅ is_solo_event 플래그 추가                                                              ║
║                                                                                           ║
║  v1.3 업그레이드:                                                                          ║
║  ✅ 프로젝트 가중치 계산 (최근 4주 Mint 비중)                                               ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, Any


# ═══════════════════════════════════════════════════════════════════════════════════════════
# Role Bucket Mapping (LOCK)
# ═══════════════════════════════════════════════════════════════════════════════════════════

ROLE_BUCKET_MAP = {
    "INVEST_CONFIRMED": "RAINMAKER_BUCKET",
    "CONTRACT_SIGNED": "CLOSER_BUCKET",
    "CASH_IN": "CLOSER_BUCKET",
    "DELIVERY_COMPLETE": "OPERATOR_BUCKET",
    "INVOICE_ISSUED": "OPERATOR_BUCKET",
    "MRR": "BUILDER_BUCKET",
    "COST_SAVED": "BUILDER_BUCKET",
    "REFERRAL_TO_CONTRACT": "CONNECTOR_BUCKET",
}


def compute_person_aggregates(money_exp: pd.DataFrame) -> pd.DataFrame:
    """
    개인별 집계
    
    출력:
    - person_id: 개인 ID
    - money_krw: 총 기여 금액
    - minutes: 총 투입 시간
    - events: 참여 이벤트 수
    - coin_rate_per_min: 분당 코인 생성률
    - coin_rate_per_hr: 시간당 코인 생성률
    """
    g = money_exp.groupby("person_id", as_index=False).agg(
        money_krw=("amount_krw_person", "sum"),
        minutes=("minutes_person", "sum"),
        events=("event_id", "nunique"),
    )
    
    g["coin_rate_per_min"] = g["money_krw"] / (g["minutes"] + 1e-9)
    g["coin_rate_per_hr"] = g["coin_rate_per_min"] * 60.0
    
    return g


def compute_weekly_totals(money: pd.DataFrame) -> Dict[str, float]:
    """주간 총계"""
    mint = float(money["amount_krw"].sum())
    effective_minutes = float(money["effective_minutes"].sum())
    
    return {
        "mint_krw": mint,
        "effective_minutes": effective_minutes
    }


def compute_burn_totals(burn: pd.DataFrame, avg_coin_per_min: float) -> Dict[str, float]:
    """Burn 총계"""
    if burn is None or burn.empty:
        return {"burn_krw": 0.0, "loss_minutes": 0.0}
    
    total_loss_minutes = float(burn["loss_minutes"].sum())
    burn_krw = total_loss_minutes * avg_coin_per_min
    
    return {
        "burn_krw": float(burn_krw),
        "loss_minutes": total_loss_minutes
    }


def compute_person_burn(burn: pd.DataFrame) -> pd.DataFrame:
    """개인별 Burn 집계"""
    if burn is None or burn.empty:
        return pd.DataFrame(columns=["person_id", "burn_minutes", "burn_count"])
    
    burn_person = burn.copy()
    burn_person["person_id"] = burn_person["person_or_edge"].astype(str).str.strip()
    
    g = burn_person.groupby("person_id", as_index=False).agg(
        burn_minutes=("loss_minutes", "sum"),
        burn_count=("burn_id", "nunique"),
    )
    
    return g


def compute_kpi(
    mint_krw: float,
    burn_krw: float,
    effective_minutes: float,
    events_count: int,
    prev_coin_velocity: float = None
) -> Dict[str, Any]:
    """KPI 계산"""
    net = mint_krw - burn_krw
    coin_velocity = net / (effective_minutes + 1e-9)
    entropy_ratio = burn_krw / (mint_krw + 1e-9)
    
    if prev_coin_velocity is not None and prev_coin_velocity > 0:
        velocity_change = (coin_velocity - prev_coin_velocity) / prev_coin_velocity
    else:
        velocity_change = 0.0
    
    return {
        "mint_krw": mint_krw,
        "burn_krw": burn_krw,
        "net_krw": net,
        "effective_minutes": effective_minutes,
        "coin_velocity": coin_velocity,
        "entropy_ratio": entropy_ratio,
        "events_count": events_count,
        "velocity_change": velocity_change,
    }


def compute_indirect_stats(money: pd.DataFrame) -> Dict[str, float]:
    """간접 기여 통계"""
    mint = float(money["amount_krw"].sum())
    
    indirect_mask = money["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])
    indirect_mint = float(money.loc[indirect_mask, "amount_krw"].sum())
    indirect_mint_ratio = indirect_mint / (mint + 1e-9)
    
    return {
        "indirect_mint": indirect_mint,
        "indirect_mint_ratio": indirect_mint_ratio,
    }


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.1: BaseRate SOLO only
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_solo(money_exp: pd.DataFrame, min_solo_events: int = 2) -> pd.DataFrame:
    """
    v1.1: Baseline은 SOLO 이벤트(tag_count==1)만으로 계산
    SOLO 이벤트 부족 시 전체로 백오프
    """
    # overall (fallback)
    overall = money_exp.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    overall["rate_all_per_min"] = overall["money_all"] / (overall["minutes_all"] + 1e-9)
    
    # solo only
    solo = money_exp[money_exp["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    out = overall.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    
    # LOCK: baseline selection rule
    out["base_rate_per_min"] = out.apply(
        lambda r: float(r["rate_solo_per_min"]) if r["events_solo"] >= min_solo_events else float(r["rate_all_per_min"]),
        axis=1
    )
    out["base_rate_source"] = out["events_solo"].apply(
        lambda n: "SOLO" if n >= min_solo_events else "FALLBACK_ALL"
    )
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.2: BaseRate with ROLE_BUCKET fallback
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_person_baseline_v12(money_exp: pd.DataFrame, min_events: int = 2) -> pd.DataFrame:
    """
    v1.2: BaseRate 우선순위
    1) SOLO 이벤트 (tag_count==1)
    2) ROLE_BUCKET 이벤트 (event_type 기반)
    3) ALL 이벤트 (fallback)
    """
    df = money_exp.copy()
    df["role_bucket"] = df["event_type"].map(ROLE_BUCKET_MAP).fillna("ALL_BUCKET")
    
    # ALL fallback
    all_agg = df.groupby("person_id", as_index=False).agg(
        money_all=("amount_krw_person", "sum"),
        minutes_all=("minutes_person", "sum"),
        events_all=("event_id", "nunique"),
    )
    all_agg["rate_all_per_min"] = all_agg["money_all"] / (all_agg["minutes_all"] + 1e-9)
    
    # SOLO
    solo = df[df["tag_count"] == 1].groupby("person_id", as_index=False).agg(
        money_solo=("amount_krw_person", "sum"),
        minutes_solo=("minutes_person", "sum"),
        events_solo=("event_id", "nunique"),
    )
    solo["rate_solo_per_min"] = solo["money_solo"] / (solo["minutes_solo"] + 1e-9)
    
    # ROLE_BUCKET (use all events in bucket, not only solo)
    rb = df[df["role_bucket"] != "ALL_BUCKET"].groupby(
        ["person_id", "role_bucket"], as_index=False
    ).agg(
        money_rb=("amount_krw_person", "sum"),
        minutes_rb=("minutes_person", "sum"),
        events_rb=("event_id", "nunique"),
    )
    rb["rate_rb_per_min"] = rb["money_rb"] / (rb["minutes_rb"] + 1e-9)
    
    # pick best available bucket rate by most events (then rate)
    if not rb.empty:
        rb_best = rb.sort_values(
            ["person_id", "events_rb", "rate_rb_per_min"],
            ascending=[True, False, False]
        ).drop_duplicates(["person_id"])[["person_id", "role_bucket", "events_rb", "rate_rb_per_min"]]
    else:
        rb_best = pd.DataFrame(columns=["person_id", "role_bucket", "events_rb", "rate_rb_per_min"])
    
    out = all_agg.merge(
        solo[["person_id", "events_solo", "rate_solo_per_min"]],
        on="person_id", how="left"
    )
    out = out.merge(rb_best, on="person_id", how="left")
    
    out["events_solo"] = out["events_solo"].fillna(0).astype(int)
    out["rate_solo_per_min"] = out["rate_solo_per_min"].fillna(0.0)
    out["events_rb"] = out["events_rb"].fillna(0).astype(int)
    out["rate_rb_per_min"] = out["rate_rb_per_min"].fillna(0.0)
    out["role_bucket"] = out["role_bucket"].fillna("")
    
    def _choose(r):
        if r["events_solo"] >= min_events:
            return float(r["rate_solo_per_min"]), "SOLO"
        if r["events_rb"] >= min_events:
            return float(r["rate_rb_per_min"]), f"ROLE_BUCKET:{r['role_bucket']}"
        return float(r["rate_all_per_min"]), "FALLBACK_ALL"
    
    chosen = out.apply(lambda r: _choose(r), axis=1, result_type="expand")
    out["base_rate_per_min"] = chosen[0].astype(float)
    out["base_rate_source"] = chosen[1].astype(str)
    
    return out[["person_id", "base_rate_per_min", "base_rate_source", "events_solo", "events_rb", "events_all"]]


# ═══════════════════════════════════════════════════════════════════════════════════════════
# v1.3: Project Weights (최근 4주 Mint 비중)
# ═══════════════════════════════════════════════════════════════════════════════════════════

def compute_project_weights_4w(money: pd.DataFrame, weeks: int = 4) -> pd.DataFrame:
    """
    v1.3: 최근 N주 프로젝트 가중치 계산
    
    w_p = Mint_{p,4w} / Σ Mint_{q,4w}
    
    출력:
    - customer_id
    - project_id
    - weight (0~1, 합계 1.0)
    """
    if money.empty:
        return pd.DataFrame(columns=["customer_id", "project_id", "weight"])
    
    max_date = money["date"].max()
    start_date = max_date - pd.Timedelta(weeks=weeks)
    
    m4 = money[money["date"] >= start_date].copy()
    
    if m4.empty:
        # 최근 데이터 없으면 전체 사용
        m4 = money.copy()
    
    g = m4.groupby(["customer_id", "project_id"], as_index=False).agg(
        mint_krw=("amount_krw", "sum")
    )
    
    total = float(g["mint_krw"].sum())
    if total <= 0:
        g["weight"] = 0.0
    else:
        g["weight"] = g["mint_krw"] / total
    
    return g[["customer_id", "project_id", "weight"]]






















