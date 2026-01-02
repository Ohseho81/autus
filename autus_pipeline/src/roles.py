#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Roles                                   ║
║                                                                                           ║
║  v1.0 업그레이드:                                                                          ║
║  ✅ ControllerScore v1: PREVENTED/FIXED 기반 정확 계산                                     ║
║                                                                                           ║
║  v1.1 업그레이드:                                                                          ║
║  ✅ 역할 점수에 개선/방지 분리 기여 추가                                                    ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from .config import CFG


def _top30_amount_threshold(money_exp: pd.DataFrame) -> float:
    """상위 30% 금액 기준점"""
    ev = money_exp[["event_id", "amount_krw"]].drop_duplicates()
    if ev.empty:
        return 0.0
    return float(ev["amount_krw"].quantile(0.70))


def compute_role_scores(money_exp: pd.DataFrame, burn: pd.DataFrame) -> pd.DataFrame:
    """
    v1.3 FINAL: 역할 점수 계산
    
    ControllerScore v1:
    - PREVENTED/FIXED 이벤트의 prevented_minutes를 기준으로 계산
    - controller_score = prevented_minutes_i / total_prevented_minutes
    """
    if money_exp.empty:
        return pd.DataFrame(columns=["person_id"])
    
    # 기본 집계
    base = money_exp.groupby("person_id", as_index=False).agg(
        money=("amount_krw_person", "sum")
    )
    base["money"] = base["money"].astype(float)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # RAINMAKER: 상위 30% 이벤트 기여율
    # ═══════════════════════════════════════════════════════════════════════════
    thr_top30 = _top30_amount_threshold(money_exp)
    top_ev = money_exp[money_exp["amount_krw"] >= thr_top30]
    rain = top_ev.groupby("person_id", as_index=False).agg(top_money=("amount_krw_person", "sum"))
    df = base.merge(rain, on="person_id", how="left").fillna({"top_money": 0.0})
    df["rainmaker_score"] = df["top_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CLOSER: CONTRACT_SIGNED + CASH_IN
    # ═══════════════════════════════════════════════════════════════════════════
    closer_ev = money_exp[money_exp["event_type"].isin(["CONTRACT_SIGNED", "CASH_IN"])]
    closer = closer_ev.groupby("person_id", as_index=False).agg(closer_money=("amount_krw_person", "sum"))
    df = df.merge(closer, on="person_id", how="left").fillna({"closer_money": 0.0})
    df["closer_score"] = df["closer_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # OPERATOR: DELIVERY_COMPLETE + INVOICE_ISSUED
    # ═══════════════════════════════════════════════════════════════════════════
    op_ev = money_exp[money_exp["event_type"].isin(["DELIVERY_COMPLETE", "INVOICE_ISSUED"])]
    op = op_ev.groupby("person_id", as_index=False).agg(op_money=("amount_krw_person", "sum"))
    df = df.merge(op, on="person_id", how="left").fillna({"op_money": 0.0})
    df["operator_score"] = df["op_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # BUILDER: MRR + COST_SAVED
    # ═══════════════════════════════════════════════════════════════════════════
    b_ev = money_exp[money_exp["event_type"].isin(["MRR", "COST_SAVED"])]
    b = b_ev.groupby("person_id", as_index=False).agg(builder_money=("amount_krw_person", "sum"))
    df = df.merge(b, on="person_id", how="left").fillna({"builder_money": 0.0})
    df["builder_score"] = df["builder_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONNECTOR: INDIRECT_DRIVEN + MIXED
    # ═══════════════════════════════════════════════════════════════════════════
    c_ev = money_exp[money_exp["recommendation_type"].isin(["INDIRECT_DRIVEN", "MIXED"])]
    c = c_ev.groupby("person_id", as_index=False).agg(conn_money=("amount_krw_person", "sum"))
    df = df.merge(c, on="person_id", how="left").fillna({"conn_money": 0.0})
    df["connector_score"] = df["conn_money"] / (df["money"] + 1e-9)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # CONTROLLER v1: PREVENTED/FIXED 기반 (LOCK)
    # ═══════════════════════════════════════════════════════════════════════════
    if burn is None or burn.empty:
        df["controller_score"] = 0.0
        df["prevented_minutes"] = 0.0
    else:
        b = burn.copy()
        
        # prevented_by 정리
        if "prevented_by" not in b.columns:
            b["prevented_by"] = ""
        b["prevented_by"] = b["prevented_by"].fillna("").astype(str).str.strip()
        
        # prevented_minutes 정리
        if "prevented_minutes" not in b.columns:
            b["prevented_minutes"] = 0
        b["prevented_minutes"] = b["prevented_minutes"].fillna(0).astype(float)
        
        # PREVENTED/FIXED 이벤트만 필터
        ctrl = b[
            (b["burn_type"].isin(["PREVENTED", "FIXED"])) &
            (b["prevented_minutes"] > 0) &
            (b["prevented_by"] != "")
        ]
        
        if ctrl.empty:
            df["controller_score"] = 0.0
            df["prevented_minutes"] = 0.0
        else:
            ctrl_sum = ctrl.groupby("prevented_by", as_index=False).agg(
                ctrl_minutes=("prevented_minutes", "sum")
            )
            total_ctrl = float(ctrl_sum["ctrl_minutes"].sum())
            
            ctrl_sum = ctrl_sum.rename(columns={"prevented_by": "person_id"})
            df = df.merge(ctrl_sum, on="person_id", how="left").fillna({"ctrl_minutes": 0.0})
            
            if total_ctrl <= 0:
                df["controller_score"] = 0.0
            else:
                df["controller_score"] = df["ctrl_minutes"] / total_ctrl
            
            df["prevented_minutes"] = df["ctrl_minutes"]
            df = df.drop(columns=["ctrl_minutes"])
    
    return df[[
        "person_id",
        "rainmaker_score", "closer_score", "operator_score",
        "builder_score", "connector_score", "controller_score"
    ]]


def assign_roles(role_scores: pd.DataFrame) -> pd.DataFrame:
    """
    역할 할당
    
    규칙:
    - 각 역할은 임계값 통과자 중 최고 점수 1명에게 할당
    - 1인 최대 2개 역할
    - 충돌 시 더 높은 점수 역할 유지
    """
    if role_scores.empty:
        return pd.DataFrame(columns=["person_id", "primary_role", "secondary_role"])
    
    candidates = role_scores.copy()
    
    role_defs = [
        ("RAINMAKER", "rainmaker_score", CFG.thr_rainmaker),
        ("CLOSER", "closer_score", CFG.thr_closer),
        ("OPERATOR", "operator_score", CFG.thr_operator),
        ("BUILDER", "builder_score", CFG.thr_builder),
        ("CONNECTOR", "connector_score", CFG.thr_connector),
        ("CONTROLLER", "controller_score", CFG.thr_controller),
    ]
    
    chosen = []  # (role, person_id, score)
    
    for role, col, thr in role_defs:
        if col not in candidates.columns:
            continue
        
        pool = candidates[candidates[col] >= thr]
        if pool.empty:
            continue
        
        best = pool.sort_values(col, ascending=False).iloc[0]
        chosen.append((role, best["person_id"], float(best[col])))
    
    # 1인 최대 2개 역할
    per = {}
    for role, pid, score in sorted(chosen, key=lambda x: x[2], reverse=True):
        slots = per.get(pid, [])
        if len(slots) >= 2:
            continue
        slots.append((role, score))
        per[pid] = slots
    
    # 결과 정리
    out_rows = []
    for pid, roles in per.items():
        primary = roles[0][0]
        secondary = roles[1][0] if len(roles) > 1 else ""
        out_rows.append({
            "person_id": pid,
            "primary_role": primary,
            "secondary_role": secondary
        })
    
    return pd.DataFrame(out_rows)


def get_role_summary(roles: pd.DataFrame) -> Dict[str, List[str]]:
    """역할별 담당자 요약"""
    summary = {
        "RAINMAKER": [],
        "CLOSER": [],
        "OPERATOR": [],
        "BUILDER": [],
        "CONNECTOR": [],
        "CONTROLLER": [],
    }
    
    if roles.empty:
        return summary
    
    for _, r in roles.iterrows():
        if r.get("primary_role"):
            summary[r["primary_role"]].append(r["person_id"])
        if r.get("secondary_role"):
            summary[r["secondary_role"]].append(r["person_id"])
    
    return summary






















