#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Weekly Cycle                            ║
║                                                                                           ║
║  v1.0: ControllerScore (PREVENTED/FIXED), Synergy Uplift                                  ║
║  v1.1: BaseRate SOLO only, Group Synergy (k=3~4)                                          ║
║  v1.2: BaseRate 백오프 (SOLO → ROLE_BUCKET → ALL), Synergy 파티션                          ║
║  v1.3: 프로젝트 가중치 기반 시너지 합산, customer_id 필수                                   ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle                                                      ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

from .config import CFG
from .ingest import (
    read_money_events, read_burn_events, read_fx_rates,
    read_edges, read_historical_burns
)
from .normalize import (
    attach_fx_and_convert_amount_krw, explode_people_tags,
    normalize_person_ids, add_week_id, calculate_week_id
)
from .transform import (
    compute_person_aggregates, compute_weekly_totals,
    compute_burn_totals, compute_kpi, compute_indirect_stats,
    compute_person_baseline_v12, compute_project_weights_4w
)
from .synergy import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights,
    compute_indirect_scores,
    get_top_synergy_pairs, get_negative_synergy_pairs
)
from .roles import compute_role_scores, assign_roles, get_role_summary
from .consortium import (
    find_best_team_v11, analyze_team_composition,
    suggest_team_improvements
)
from .tuning import tune_params, suggest_intervention
from .audit import AuditLogger
from .report import (
    write_json, write_markdown_report, write_csv_report,
    write_synergy_report, generate_executive_summary
)


def get_week_ids(target_date: datetime = None) -> tuple:
    """현재/전주/전전주 ID 계산"""
    if target_date is None:
        target_date = datetime.now()
    
    current = calculate_week_id(pd.Timestamp(target_date))
    prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=1)))
    prev_prev = calculate_week_id(pd.Timestamp(target_date - timedelta(weeks=2)))
    
    return current, prev, prev_prev


def run_weekly_cycle(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    target_date: datetime = None
) -> dict:
    """
    v1.3 FINAL 주간 사이클
    
    전체 파이프라인:
    1. 데이터 수집 (Ingest)
    2. 정규화 (Normalize)
    3. 변환 (Transform)
    4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    5. Synergy v1.2 (파티션 계산)
    6. Synergy v1.3 (프로젝트 가중치 합산)
    7. 역할 계산 (ControllerScore v1)
    8. 컨소시엄 탐색 (Team Score v1.1)
    9. 파라미터 튜닝
    10. 감사 로그 & 리포트
    """
    # 기본값 설정
    if params_path is None:
        params_path = os.path.join(out_dir, "params.json")
    if audit_dir is None:
        audit_dir = out_dir
    
    os.makedirs(out_dir, exist_ok=True)
    
    # 주차 ID 계산
    current_week, prev_week, prev_prev_week = get_week_ids(target_date)
    
    print(f"🧬 AUTUS Pipeline v1.3 FINAL - Week {current_week}")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 1. 데이터 수집 (Ingest)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📥 [1/10] Loading data...")
    
    money_raw = read_money_events(money_path)
    
    burn_raw = None
    if burn_path and os.path.exists(burn_path):
        burn_raw = read_burn_events(burn_path)
    else:
        burn_raw = pd.DataFrame(columns=[
            "burn_id", "date", "burn_type", "person_or_edge",
            "loss_minutes", "evidence_id", "prevented_by", "prevented_minutes"
        ])
    
    fx = None
    if fx_path and os.path.exists(fx_path):
        fx = read_fx_rates(fx_path)
    else:
        fx = pd.DataFrame(columns=["date", "currency", "fx_rate_to_krw", "source"])
    
    edges = None
    if edges_path and os.path.exists(edges_path):
        edges = read_edges(edges_path)
    
    print(f"   Money events: {len(money_raw)}")
    print(f"   Burn events: {len(burn_raw)}")
    print(f"   Customers: {money_raw['customer_id'].nunique() if 'customer_id' in money_raw.columns else 'N/A'}")
    print(f"   Projects: {money_raw['project_id'].nunique() if 'project_id' in money_raw.columns else 'N/A'}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 2. 정규화 (Normalize)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🔄 [2/10] Normalizing...")
    
    money = attach_fx_and_convert_amount_krw(money_raw, fx)
    money_exp = explode_people_tags(money)
    money_exp = normalize_person_ids(money_exp, "person_id")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 3. 변환 (Transform)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [3/10] Computing aggregates...")
    
    # 개인 집계
    person = compute_person_aggregates(money_exp)
    
    # 주간 총계
    totals = compute_weekly_totals(money)
    mint = totals["mint_krw"]
    effective_minutes = totals["effective_minutes"]
    
    # 평균 Coin Rate
    avg_coin_per_min = mint / (effective_minutes + 1e-9) if effective_minutes > 0 else 0.0
    
    # Burn 총계
    burn_tot = compute_burn_totals(burn_raw, avg_coin_per_min)
    burn = burn_tot["burn_krw"]
    
    # KPI 계산
    prev_params = {}
    if os.path.exists(params_path):
        with open(params_path, "r", encoding="utf-8") as f:
            prev_params = json.load(f)
    
    kpi = compute_kpi(
        mint_krw=mint,
        burn_krw=burn,
        effective_minutes=effective_minutes,
        events_count=int(money["event_id"].nunique()),
        prev_coin_velocity=prev_params.get("_prev_coin_velocity")
    )
    
    # 간접 기여 통계
    indirect_stats = compute_indirect_stats(money)
    
    print(f"   Mint: ₩{mint:,.0f}")
    print(f"   Burn: ₩{burn:,.0f}")
    print(f"   Net: ₩{kpi['net_krw']:,.0f}")
    print(f"   Entropy: {kpi['entropy_ratio']:.2%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 4. BaseRate v1.2 (SOLO → ROLE_BUCKET → ALL)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📊 [4/10] Computing BaseRate v1.2...")
    
    baseline = compute_person_baseline_v12(money_exp, min_events=2)
    
    solo_count = (baseline["base_rate_source"] == "SOLO").sum()
    rb_count = baseline["base_rate_source"].str.startswith("ROLE_BUCKET").sum()
    fallback_count = (baseline["base_rate_source"] == "FALLBACK_ALL").sum()
    
    print(f"   SOLO baseline: {solo_count}")
    print(f"   ROLE_BUCKET baseline: {rb_count}")
    print(f"   FALLBACK_ALL baseline: {fallback_count}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 5. Synergy v1.2 (파티션 계산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🤝 [5/10] Computing partitioned synergy...")
    
    pair_part = compute_pair_synergy_uplift_partitioned(money, baseline)
    group_part = compute_group_synergy_uplift_partitioned(money, baseline, k_min=3, k_max=4)
    
    print(f"   Pair synergy (partitioned): {len(pair_part)}")
    print(f"   Group synergy (partitioned): {len(group_part)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 6. Synergy v1.3 (프로젝트 가중치 합산)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚖️ [6/10] Aggregating with project weights...")
    
    project_weights = compute_project_weights_4w(money, weeks=4)
    print(f"   Projects with weights: {len(project_weights)}")
    
    pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
        pair_part, group_part, project_weights
    )
    
    print(f"   Final pair synergy: {len(pair_synergy)}")
    print(f"   Final group synergy: {len(group_synergy)}")
    
    # 간접 점수 계산
    person_scored = compute_indirect_scores(person, edges, CFG.lambda_decay)
    
    # 시너지 분석
    synergy_top = get_top_synergy_pairs(pair_synergy, top_n=10)
    synergy_negative = get_negative_synergy_pairs(pair_synergy)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 7. 역할 계산 (ControllerScore v1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n👤 [7/10] Computing roles (ControllerScore v1)...")
    
    role_scores = compute_role_scores(money_exp, burn_raw)
    roles = assign_roles(role_scores)
    role_summary = get_role_summary(roles)
    
    print(f"   Roles assigned: {len(roles)}")
    for role, persons in role_summary.items():
        if persons:
            print(f"   - {role}: {', '.join(persons)}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 8. 컨소시엄 탐색 (Team Score v1.1)
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n🏆 [8/10] Finding best consortium (v1.1)...")
    
    best_team = find_best_team_v11(
        person_scores=person_scored,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        burn_krw=burn,
        team_size=CFG.base_consortium_size,
        top_k=min(12, len(person_scored)),
        group_weight=0.6
    )
    
    team_composition = {}
    if best_team["team"]:
        team_composition = analyze_team_composition(
            best_team["team"], roles, role_scores
        )
    
    print(f"   Best team: {best_team['team']}")
    print(f"   Team score: {best_team['score']:.4f}")
    if team_composition:
        print(f"   Role coverage: {team_composition['role_coverage']:.0%}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 9. 파라미터 튜닝
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n⚙️ [9/10] Tuning parameters...")
    
    tuned_params = tune_params(
        prev_params=prev_params,
        kpi={
            **kpi,
            "coin_velocity_prev": prev_params.get("_prev_coin_velocity", kpi["coin_velocity"])
        },
        indirect_stats={
            "indirect_mint_ratio": indirect_stats["indirect_mint_ratio"],
            "indirect_burn_ratio": 0.0
        },
        corr_team_to_net=None
    )
    tuned_params["_prev_coin_velocity"] = kpi["coin_velocity"]
    
    print(f"   α: {tuned_params['alpha']}")
    print(f"   λ: {tuned_params['lambda']}")
    print(f"   γ: {tuned_params['gamma']}")
    print(f"   Reason: {tuned_params['reason']}")
    
    # 개입 권장
    role_coverage = team_composition.get("role_coverage", 0) if team_composition else 0
    synergy_avg = float(pair_synergy["synergy_uplift_per_min"].mean()) if not pair_synergy.empty else 0
    interventions = suggest_intervention(kpi, role_coverage, synergy_avg)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 10. 감사 로그 & 리포트
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n📝 [10/10] Writing outputs...")
    
    audit = AuditLogger(audit_dir)
    
    audit.log_kpi(current_week, kpi)
    audit.log_parameter_update(prev_params, tuned_params, kpi, tuned_params.get("reason", ""))
    audit.log_role_assignment(
        current_week,
        roles.to_dict("records") if not roles.empty else [],
        role_scores.to_dict("records") if not role_scores.empty else []
    )
    audit.log_consortium(
        current_week,
        best_team["team"],
        best_team["score"],
        team_composition
    )
    
    if interventions:
        audit.log_intervention(current_week, interventions)
    
    # 파라미터 저장
    with open(params_path, "w", encoding="utf-8") as f:
        json.dump(tuned_params, f, ensure_ascii=False, indent=2)
    
    # KPI JSON
    write_json(os.path.join(out_dir, "weekly_metrics.json"), kpi)
    
    # 역할 CSV
    roles.to_csv(os.path.join(out_dir, "role_assignments.csv"), index=False, encoding="utf-8-sig")
    
    # 컨소시엄 JSON
    write_json(os.path.join(out_dir, "consortium_best.json"), {
        **best_team,
        "composition": team_composition,
    })
    
    # 시너지 CSV
    if not pair_synergy.empty:
        pair_synergy.to_csv(os.path.join(out_dir, "pair_synergy.csv"), index=False, encoding="utf-8-sig")
    if not group_synergy.empty:
        group_synergy.to_csv(os.path.join(out_dir, "group_synergy.csv"), index=False, encoding="utf-8-sig")
    
    # Baseline CSV
    baseline.to_csv(os.path.join(out_dir, "baseline_rates.csv"), index=False, encoding="utf-8-sig")
    
    # 개인 성과 CSV
    write_csv_report(
        os.path.join(out_dir, "person_scores.csv"),
        person_scored, role_scores
    )
    
    # 마크다운 리포트
    write_markdown_report(
        os.path.join(out_dir, "weekly_report.md"),
        kpi=kpi,
        best_team=best_team,
        roles=roles,
        synergy_top=synergy_top,
        synergy_negative=synergy_negative,
        params=tuned_params,
        interventions=interventions,
        week_id=current_week
    )
    
    # 경영진 요약
    exec_summary = generate_executive_summary(kpi, best_team)
    
    print("\n" + "=" * 70)
    print("✅ AUTUS Pipeline v1.3 FINAL - Complete!")
    print(f"\n📋 Executive Summary:\n{exec_summary}")
    print("\n📂 Outputs:")
    for f in ["weekly_metrics.json", "role_assignments.csv", "consortium_best.json",
              "pair_synergy.csv", "group_synergy.csv", "baseline_rates.csv",
              "person_scores.csv", "weekly_report.md"]:
        fpath = os.path.join(out_dir, f)
        if os.path.exists(fpath):
            print(f"   - {f}")
    
    return {
        "week_id": current_week,
        "kpi": kpi,
        "best_team": best_team,
        "roles": roles.to_dict("records") if not roles.empty else [],
        "params": tuned_params,
        "interventions": interventions,
        "executive_summary": exec_summary,
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
    )
    
    return result


if __name__ == "__main__":
    main()





















