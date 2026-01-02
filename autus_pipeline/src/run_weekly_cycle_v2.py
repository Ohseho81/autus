#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars                      ║
║                                                                                           ║
║  구조:                                                                                     ║
║  1. PIPELINE v1.3 FINAL LOCK 실행 (기존 로직 100% 보존)                                    ║
║  2. 5 Pillars 분석 추가 (신규 모듈)                                                        ║
║                                                                                           ║
║  ⚠️ v1.3 코드 수정 없음 - 호출만 함                                                        ║
║                                                                                           ║
║  실행: python -m src.run_weekly_cycle_v2                                                   ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
import pandas as pd
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK 모듈들 (수정 없이 호출)
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# 5 Pillars 모듈들 (신규)
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .flywheel import FlywheelState
from .pillars import analyze_all_pillars, generate_pillars_report


def run_weekly_cycle_v2(
    money_path: str,
    burn_path: str,
    fx_path: str,
    edges_path: str = None,
    burn_history_path: str = None,
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    v2.0 주간 사이클 = v1.3 LOCK + 5 Pillars
    
    Phase 1: PIPELINE v1.3 실행 (기존 로직 100% 보존)
    Phase 2: 5 Pillars 분석 (신규 추가)
    """
    
    print("=" * 70)
    print("🧬 AUTUS PIPELINE v2.0 - Weekly Cycle + 5 Pillars")
    print("=" * 70)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK 실행
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("📦 PHASE 1: Running PIPELINE v1.3 FINAL LOCK...")
    print("─" * 70)
    
    v13_result = run_weekly_cycle(
        money_path=money_path,
        burn_path=burn_path,
        fx_path=fx_path,
        edges_path=edges_path,
        burn_history_path=burn_history_path,
        out_dir=out_dir,
        params_path=params_path,
        audit_dir=audit_dir,
        target_date=target_date,
    )
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars 분석
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("🏛️ PHASE 2: Analyzing 5 Pillars...")
    print("─" * 70)
    
    # 데이터 다시 로드 (v1.3 결과물)
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    # CSV 다시 로드 (상세 분석용)
    try:
        money_events = pd.read_csv(money_path)
        if "amount_krw" not in money_events.columns:
            money_events["amount_krw"] = money_events["amount"]
    except:
        money_events = pd.DataFrame()
    
    try:
        burn_events = pd.read_csv(burn_path) if burn_path and os.path.exists(burn_path) else pd.DataFrame()
    except:
        burn_events = pd.DataFrame()
    
    # Synergy/Roles 로드
    try:
        pair_synergy = pd.read_csv(os.path.join(out_dir, "pair_synergy.csv"))
    except:
        pair_synergy = pd.DataFrame()
    
    try:
        group_synergy = pd.read_csv(os.path.join(out_dir, "group_synergy.csv"))
    except:
        group_synergy = pd.DataFrame()
    
    try:
        roles = pd.read_csv(os.path.join(out_dir, "role_assignments.csv"))
    except:
        roles = pd.DataFrame()
    
    try:
        role_scores = pd.read_csv(os.path.join(out_dir, "person_scores.csv"))
    except:
        role_scores = pd.DataFrame()
    
    # Goal Tree 로드 또는 생성
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
        print(f"   Loaded goals from {goals_path}")
    else:
        # 기본 목표 생성 (현재 Net 기준)
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
        print(f"   Created default goals at {goals_path}")
    
    # 이전 KPI 로드 (있으면)
    prev_kpi = None
    prev_params_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_params_path):
        try:
            with open(prev_params_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석 실행
    pillars_result = analyze_all_pillars(
        kpi=kpi,
        money_events=money_events,
        burn_events=burn_events,
        pair_synergy=pair_synergy,
        group_synergy=group_synergy,
        roles=roles,
        role_scores=role_scores,
        best_team=best_team,
        tuning_params=tuning_params,
        goal_tree=goal_tree,
        prev_kpi=prev_kpi,
        flywheel_history=None,  # TODO: 이력 관리
        audit_entries=None,
        history_events=None,
    )
    
    # 결과 출력
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   📊 Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   📍 Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ 🎯 Vision Mastery:       {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ ⚖️  Risk Equilibrium:     {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ 💡 Innovation Disruption: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ 📚 Learning Acceleration: {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ 🌍 Impact Amplification:  {scores.get('impact_amplification', 0):.0%}")
    
    weakest = summary.get("weakest_pillar", "")
    if weakest:
        print(f"\n   ⚠️  Weakest: {weakest} ({scores.get(weakest, 0):.0%})")
    
    print(f"\n   💡 Advice: {summary.get('overall_advice', '')}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 저장
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 70)
    print("💾 Saving results...")
    print("─" * 70)
    
    # 5 Pillars JSON
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    print(f"   ✅ {pillars_json_path}")
    
    # 5 Pillars 리포트
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    print(f"   ✅ {pillars_md_path}")
    
    # 현재 KPI를 다음 주를 위해 저장
    with open(prev_params_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    print(f"   ✅ {prev_params_path}")
    
    # 목표 저장 (업데이트된 진행률)
    save_goals(goal_tree, goals_path)
    print(f"   ✅ {goals_path}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 70)
    print("✅ AUTUS PIPELINE v2.0 Complete!")
    print("=" * 70)
    
    # 통합 결과
    return {
        # v1.3 결과
        "v13": v13_result,
        # 5 Pillars 결과
        "pillars": pillars_result,
        # 요약
        "summary": {
            "week_id": v13_result.get("week_id"),
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "team": best_team.get("team", []),
            "total_pillar_score": summary.get("total_score", 0),
            "pillar_status": summary.get("overall_status", ""),
            "weakest_pillar": summary.get("weakest_pillar", ""),
        }
    }


def main():
    """메인 엔트리포인트"""
    result = run_weekly_cycle_v2(
        money_path="data/input/money_events.csv",
        burn_path="data/input/burn_events.csv",
        fx_path="data/input/fx_rates.csv",
        edges_path="data/input/edges.csv",
        burn_history_path="data/input/historical_burns.csv",
        out_dir="data/output",
        params_path="data/output/params.json",
        audit_dir="data/output",
        goals_path="data/output/goals.json",
    )
    
    return result


if __name__ == "__main__":
    main()





















