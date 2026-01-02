#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Report Generation                       ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import json
import pandas as pd
from datetime import datetime
from typing import Dict, List, Any, Optional


def write_json(path: str, obj: dict) -> None:
    """JSON 파일 저장"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)


def write_csv_report(
    path: str,
    person_scores: pd.DataFrame,
    role_scores: pd.DataFrame
) -> None:
    """개인 성과 CSV 저장"""
    if person_scores.empty:
        pd.DataFrame().to_csv(path, index=False)
        return
    
    merged = person_scores.copy()
    if not role_scores.empty:
        merged = merged.merge(role_scores, on="person_id", how="left")
    
    merged.to_csv(path, index=False, encoding="utf-8-sig")


def write_synergy_report(
    pair_path: str,
    group_path: str,
    pair_synergy: pd.DataFrame,
    group_synergy: pd.DataFrame
) -> None:
    """시너지 CSV 저장"""
    if not pair_synergy.empty:
        pair_synergy.to_csv(pair_path, index=False, encoding="utf-8-sig")
    
    if not group_synergy.empty:
        group_synergy.to_csv(group_path, index=False, encoding="utf-8-sig")


def write_markdown_report(
    path: str,
    kpi: Dict[str, Any],
    best_team: Dict[str, Any],
    roles: pd.DataFrame,
    synergy_top: pd.DataFrame = None,
    synergy_negative: pd.DataFrame = None,
    params: Dict[str, Any] = None,
    interventions: List[Dict[str, Any]] = None,
    week_id: str = None
) -> None:
    """주간 마크다운 리포트 생성"""
    lines = []
    
    # 헤더
    if week_id:
        lines.append(f"# 🧬 AUTUS Weekly Report - {week_id}\n")
    else:
        lines.append("# 🧬 AUTUS Weekly Report\n")
    
    lines.append(f"> Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append("\n---\n\n")
    
    # KPI 요약
    lines.append("## 📊 KPI Summary\n")
    lines.append("| Metric | Value |\n")
    lines.append("|--------|-------|\n")
    
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    minutes = kpi.get("effective_minutes", 0)
    velocity = kpi.get("coin_velocity", 0)
    entropy = kpi.get("entropy_ratio", 0)
    events = kpi.get("events_count", 0)
    
    lines.append(f"| 💰 Mint | ₩{mint/1e6:.1f}M |\n")
    lines.append(f"| 🔥 Burn | ₩{burn/1e6:.1f}M |\n")
    lines.append(f"| 📈 Net | ₩{net/1e6:.1f}M |\n")
    lines.append(f"| ⏱️ Time | {minutes/60:.1f}h |\n")
    lines.append(f"| 🎯 Velocity | ₩{velocity/1000:.1f}K/min |\n")
    lines.append(f"| 🌡️ Entropy | {entropy:.2%} |\n")
    lines.append(f"| 📋 Events | {events} |\n")
    
    # 엔트로피 상태
    if entropy < 0.15:
        lines.append("\n> ✅ Entropy healthy ({:.1%})\n".format(entropy))
    elif entropy < 0.25:
        lines.append("\n> ⚠️ Entropy warning ({:.1%})\n".format(entropy))
    else:
        lines.append("\n> 🚨 Entropy critical ({:.1%})\n".format(entropy))
    
    # 최적 팀
    lines.append("\n## 🏆 Best Consortium\n")
    team = best_team.get("team", [])
    score = best_team.get("score", 0)
    lines.append(f"**Team**: {', '.join(team) if team else '(none)'}\n")
    lines.append(f"**Score**: {score:.4f}\n")
    
    # 역할 할당
    lines.append("\n## 👤 Role Assignments\n")
    lines.append("| Person | Primary Role | Secondary Role |\n")
    lines.append("|--------|--------------|----------------|\n")
    
    if roles.empty:
        lines.append("| (none) | - | - |\n")
    else:
        for _, r in roles.sort_values("person_id").iterrows():
            primary = r.get("primary_role", "-")
            secondary = r.get("secondary_role", "-") or "-"
            lines.append(f"| {r['person_id']} | {primary} | {secondary} |\n")
    
    # 시너지 탑
    if synergy_top is not None and not synergy_top.empty:
        lines.append("\n## 🤝 Top Synergy Pairs\n")
        lines.append("| Pair | Uplift | Type |\n")
        lines.append("|------|--------|------|\n")
        
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_top.columns else "uplift"
        for _, r in synergy_top.head(5).iterrows():
            uplift = r.get(col, 0)
            pair = f"{r['i']} + {r['j']}"
            synergy_type = "Positive" if uplift > 0 else "Neutral" if uplift == 0 else "N/A"
            lines.append(f"| {pair} | +{uplift:.1%} | {synergy_type} |\n")
    
    # 부정 시너지
    if synergy_negative is not None and not synergy_negative.empty:
        lines.append("\n### ⚠️ Negative Synergy (Conflict)\n")
        col = "synergy_uplift_per_min" if "synergy_uplift_per_min" in synergy_negative.columns else "uplift"
        for _, r in synergy_negative.head(3).iterrows():
            uplift = r.get(col, 0)
            lines.append(f"- {r['i']} + {r['j']}: {uplift:.1%}\n")
    
    # 파라미터
    if params:
        lines.append("\n## ⚙️ Current Parameters\n")
        lines.append(f"- **α (alpha)**: {params.get('alpha', 'N/A')}\n")
        lines.append(f"- **λ (lambda)**: {params.get('lambda', 'N/A')}\n")
        lines.append(f"- **γ (gamma)**: {params.get('gamma', 'N/A')}\n")
        if params.get("reason"):
            lines.append(f"\n*Tuning reason*: `{params['reason']}`\n")
    
    # 개입 권장
    if interventions:
        lines.append("\n## 🚨 Recommended Interventions\n")
        for item in interventions:
            level = item.get("level", "INFO")
            msg = item.get("message", "")
            emoji = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(level, "ℹ️")
            lines.append(f"- {emoji} **{level}**: {msg}\n")
    
    # 푸터
    lines.append("\n---\n")
    lines.append("*AUTUS Pipeline v1.3 FINAL | 2025*\n")
    
    with open(path, "w", encoding="utf-8") as f:
        f.write("".join(lines))


def generate_executive_summary(kpi: Dict[str, Any], best_team: Dict[str, Any]) -> str:
    """경영진 요약 생성"""
    mint = kpi.get("mint_krw", 0)
    burn = kpi.get("burn_krw", 0)
    net = kpi.get("net_krw", 0)
    entropy = kpi.get("entropy_ratio", 0)
    velocity = kpi.get("coin_velocity", 0)
    vel_change = kpi.get("velocity_change", 0)
    
    team = best_team.get("team", [])
    team_score = best_team.get("score", 0)
    
    lines = []
    
    # 핵심 지표
    lines.append(f"📊 순수익 ₩{net/1e6:.1f}M (Mint ₩{mint/1e6:.1f}M - Burn ₩{burn/1e6:.1f}M)")
    
    # 속도 변화
    if vel_change > 0.1:
        lines.append(f"📈 생산성 상승 ({vel_change:+.1%})")
    elif vel_change < -0.1:
        lines.append(f"📉 생산성 하락 ({vel_change:+.1%})")
    else:
        lines.append(f"➡️ 생산성 유지 ({vel_change:+.1%})")
    
    # 엔트로피
    if entropy < 0.15:
        lines.append(f"✅ 엔트로피 양호 ({entropy:.1%})")
    elif entropy < 0.25:
        lines.append(f"⚠️ 엔트로피 주의 ({entropy:.1%})")
    else:
        lines.append(f"🚨 엔트로피 위험 ({entropy:.1%})")
    
    # 최적 팀
    if team:
        lines.append(f"🏆 최적 팀: {', '.join(team)} (점수: {team_score:.2f})")
    
    return "\n".join(lines)






















