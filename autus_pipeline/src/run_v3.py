#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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
║                    🧬 AUTUS v3.0 - Complete Automation System                             ║
║                                                                                           ║
║  우선순위: 1. 최고 품질 → 2. 자동화 → 3. 비용 절감                                          ║
║                                                                                           ║
║  Layer 1: PIPELINE v1.3 FINAL LOCK (100% 보존)                                            ║
║  Layer 2: 5 Pillars Framework                                                             ║
║  Layer 2.5: Physics Map Engine (NEW)                                                      ║
║  Layer 3: 6 Automation Loops                                                              ║
║  Layer 4: Quality System (이중 검증)                                                       ║
║  Layer 5: Multi-Agent Crew                                                                ║
║                                                                                           ║
║  실행: python -m src.run_v3                                                                ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from pathlib import Path

# v1.3 FINAL LOCK
from .run_weekly_cycle import run_weekly_cycle, get_week_ids

# v2.0 5 Pillars
from .vision import GoalTree, create_default_goals, save_goals, load_goals
from .pillars import analyze_all_pillars, generate_pillars_report

# v2.5 Physics Map
from .physics import PhysicsEngine, from_pipeline_result, analyze_physics

# v3.0 Automation
from .database import get_database
from .loops import AutoLoopEngine


def run_v3(
    money_path: str = "data/input/money_events.csv",
    burn_path: str = "data/input/burn_events.csv",
    fx_path: str = "data/input/fx_rates.csv",
    edges_path: str = "data/input/edges.csv",
    burn_history_path: str = "data/input/historical_burns.csv",
    out_dir: str = "data/output",
    params_path: str = None,
    audit_dir: str = None,
    goals_path: str = None,
    db_path: str = None,
    target_date: datetime = None
) -> dict:
    """
    AUTUS v3.0 전체 실행
    
    Phase 1: PIPELINE v1.3 FINAL LOCK
    Phase 2: 5 Pillars Analysis  
    Phase 3: 6 Automation Loops
    """
    
    print("=" * 80)
    print("🧬 AUTUS v3.0 - Complete Automation System")
    print("=" * 80)
    print("   Priority: 1. Quality → 2. Automation → 3. Cost")
    print("=" * 80)
    
    # 출력 디렉토리 생성
    os.makedirs(out_dir, exist_ok=True)
    
    # Week ID 계산
    week_id, prev_week_id = get_week_ids(target_date)
    
    # DB 초기화
    db = get_database(db_path or os.path.join(out_dir, "autus.db"))
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 1: PIPELINE v1.3 FINAL LOCK
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("📦 PHASE 1: PIPELINE v1.3 FINAL LOCK")
    print("─" * 80)
    
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
    
    kpi = v13_result.get("kpi", {})
    best_team = v13_result.get("best_team", {"team": [], "score": 0})
    tuning_params = v13_result.get("params", {})
    
    print(f"\n   ✅ Net: ₩{kpi.get('net_krw', 0):,.0f}")
    print(f"   ✅ Entropy: {kpi.get('entropy_ratio', 0):.0%}")
    print(f"   ✅ Team: {len(best_team.get('team', []))}명")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2: 5 Pillars Analysis
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🏛️ PHASE 2: 5 Pillars Analysis")
    print("─" * 80)
    
    import pandas as pd
    
    # 데이터 로드
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
    
    # 출력 파일 로드
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
    
    # Goal Tree
    if goals_path is None:
        goals_path = os.path.join(out_dir, "goals.json")
    
    if os.path.exists(goals_path):
        goal_tree = load_goals(goals_path)
    else:
        goal_tree = create_default_goals(kpi.get("net_krw", 0))
        save_goals(goal_tree, goals_path)
    
    # 이전 KPI
    prev_kpi = None
    prev_kpi_path = os.path.join(out_dir, "prev_kpi.json")
    if os.path.exists(prev_kpi_path):
        try:
            with open(prev_kpi_path, "r") as f:
                prev_kpi = json.load(f)
        except:
            pass
    
    # 5 Pillars 분석
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
    )
    
    summary = pillars_result.get("summary", {})
    scores = summary.get("pillar_scores", {})
    
    print(f"\n   ✅ Total Score: {summary.get('total_score', 0):.0%}")
    print(f"   ✅ Status: {summary.get('overall_status', 'N/A')}")
    print(f"\n   Pillar Scores:")
    print(f"   ├─ Vision:     {scores.get('vision_mastery', 0):.0%}")
    print(f"   ├─ Risk:       {scores.get('risk_equilibrium', 0):.0%}")
    print(f"   ├─ Innovation: {scores.get('innovation_disruption', 0):.0%}")
    print(f"   ├─ Learning:   {scores.get('learning_acceleration', 0):.0%}")
    print(f"   └─ Impact:     {scores.get('impact_amplification', 0):.0%}")
    
    # Pillars 결과 저장
    pillars_json_path = os.path.join(out_dir, "pillars_analysis.json")
    with open(pillars_json_path, "w", encoding="utf-8") as f:
        json.dump(pillars_result, f, ensure_ascii=False, indent=2, default=str)
    
    pillars_report = generate_pillars_report(pillars_result)
    pillars_md_path = os.path.join(out_dir, "pillars_report.md")
    with open(pillars_md_path, "w", encoding="utf-8") as f:
        f.write(pillars_report)
    
    # KPI 저장
    with open(prev_kpi_path, "w", encoding="utf-8") as f:
        json.dump(kpi, f, ensure_ascii=False, indent=2)
    
    save_goals(goal_tree, goals_path)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 2.5: Physics Map Engine
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🌌 PHASE 2.5: Physics Map Engine")
    print("─" * 80)
    
    # Physics Map 분석
    physics_result = analyze_physics(
        kpi=kpi,
        roles_df=roles,
        synergy_df=pair_synergy,
        out_dir=out_dir
    )
    
    print(f"\n   📊 총 가치:        ₩{physics_result.total_value:,.0f}")
    print(f"   💰 직접 돈:        ₩{physics_result.total_direct_money:,.0f}")
    print(f"   ⏱️  시간 비용:      ₩{physics_result.total_time_cost:,.0f}")
    print(f"   🔗 시너지:         ₩{physics_result.total_synergy_money:,.0f}")
    print(f"\n   📈 12개월 예측:    ₩{physics_result.future_value_12m:,.0f}")
    print(f"   📊 월 성장률:      {physics_result.growth_rate:.1%}")
    
    if physics_result.optimal_structure:
        print(f"\n   🏆 최적 구성:")
        for i, nid in enumerate(physics_result.optimal_structure[:4]):
            node = physics_result.nodes.get(nid)
            if node:
                prefix = "└─" if i == len(physics_result.optimal_structure[:4]) - 1 else "├─"
                print(f"   {prefix} {node.name}: ₩{node.total_value_krw:,.0f}")
    
    # ═══════════════════════════════════════════════════════════════════════════
    # PHASE 3: 6 Automation Loops
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "─" * 80)
    print("🔄 PHASE 3: 6 Automation Loops")
    print("─" * 80)
    
    loop_engine = AutoLoopEngine(db)
    
    # 전체 루프 실행
    loop_result = loop_engine.run_full_cycle(
        pipeline_result=v13_result,
        pillars_result=pillars_result,
        week_id=week_id,
    )
    
    loops = loop_result.get("loops", {})
    flywheel = loop_result.get("flywheel", {})
    
    print(f"\n   📥 Loop 1 (Collect): {loops.get('collect', {}).get('unprocessed', {}).get('money', 0)} items")
    print(f"   🧠 Loop 2 (Learn): {loops.get('learn', {}).get('insights_generated', 0)} new insights")
    print(f"   🗑️  Loop 3 (Delete): {loops.get('delete', {}).get('archived', 0)} archived")
    print(f"   🔄 Loop 4 (Improve): {loops.get('improve', {}).get('proposals_generated', 0)} proposals")
    print(f"   🤖 Loop 5 (Execute): {loops.get('execute', {}).get('agents_run', 0)}/4 tasks completed")
    print(f"   🔁 Loop 6 (Flywheel): Velocity {flywheel.get('velocity', 0):.0%}, ROI {flywheel.get('roi', 0):.0%}")
    
    # Loop 결과 저장
    flywheel_path = os.path.join(out_dir, "flywheel_cycle.json")
    with open(flywheel_path, "w", encoding="utf-8") as f:
        json.dump(loop_result, f, ensure_ascii=False, indent=2, default=str)
    
    # ═══════════════════════════════════════════════════════════════════════════
    # 완료
    # ═══════════════════════════════════════════════════════════════════════════
    print("\n" + "=" * 80)
    print("✅ AUTUS v3.0 Complete!")
    print("=" * 80)
    
    # 전체 결과
    v3_result = {
        "version": "3.0",
        "week_id": week_id,
        "timestamp": datetime.now().isoformat(),
        
        # Layer 1: PIPELINE
        "pipeline": {
            "kpi": kpi,
            "best_team": best_team,
        },
        
        # Layer 2: Pillars
        "pillars": {
            "total_score": summary.get("total_score", 0),
            "status": summary.get("overall_status", ""),
            "scores": scores,
            "weakest_pillar": summary.get("weakest_pillar", ""),
        },
        
        # Layer 2.5: Physics Map
        "physics": {
            "total_value": physics_result.total_value,
            "direct_money": physics_result.total_direct_money,
            "time_cost": physics_result.total_time_cost,
            "synergy_money": physics_result.total_synergy_money,
            "future_value_12m": physics_result.future_value_12m,
            "growth_rate": physics_result.growth_rate,
            "optimal_structure": physics_result.optimal_structure,
        },
        
        # Layer 3: Loops
        "loops": loops,
        "flywheel": flywheel,
        
        # Summary
        "summary": {
            "net_krw": kpi.get("net_krw", 0),
            "entropy": kpi.get("entropy_ratio", 0),
            "pillar_score": summary.get("total_score", 0),
            "velocity": flywheel.get("velocity", 0),
            "roi": flywheel.get("roi", 0),
        }
    }
    
    # 전체 결과 저장
    v3_result_path = os.path.join(out_dir, "v3_results.json")
    with open(v3_result_path, "w", encoding="utf-8") as f:
        json.dump(v3_result, f, ensure_ascii=False, indent=2, default=str)
    
    print(f"\n📁 Results saved to: {out_dir}/")
    print(f"   - v3_results.json")
    print(f"   - pillars_analysis.json")
    print(f"   - pillars_report.md")
    print(f"   - physics_map.json")
    print(f"   - physics_report.txt")
    print(f"   - flywheel_cycle.json")
    print(f"   - autus.db")
    
    return v3_result


def main():
    """메인 엔트리포인트"""
    result = run_v3(
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




















