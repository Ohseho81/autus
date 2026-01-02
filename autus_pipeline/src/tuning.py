#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Parameter Tuning                        ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

from typing import List, Dict
from .config import CFG, AutusConfig


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

def tune_params(prev_params: dict, kpi: dict, indirect_stats: dict, corr_team_to_net: float | None) -> dict:
    """
    prev_params: {"alpha":..,"lambda":..,"gamma":..}
    kpi: {"entropy_ratio":..,"coin_velocity":..,"coin_velocity_prev":..,"events_count":..}
    indirect_stats: {"indirect_mint_ratio":..,"indirect_burn_ratio":..}
    corr_team_to_net: optional correlation proxy, can be None in v0
    """
    alpha = float(prev_params.get("alpha", CFG.alpha_update))
    lam = float(prev_params.get("lambda", CFG.lambda_decay))
    gamma = float(prev_params.get("gamma", CFG.gamma_team_bonus))

    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        return {"alpha": alpha, "lambda": lam, "gamma": gamma, "reason": "FROZEN_LOW_DATA"}

    entropy = float(kpi["entropy_ratio"])
    vel = float(kpi["coin_velocity"])
    vel_prev = float(kpi.get("coin_velocity_prev", vel))

    # α
    if entropy <= CFG.entropy_good and vel > vel_prev:
        alpha += CFG.d_alpha
        reason_a = "ALPHA_UP"
    elif entropy >= CFG.entropy_warn or vel < vel_prev:
        alpha -= CFG.d_alpha
        reason_a = "ALPHA_DOWN"
    else:
        reason_a = "ALPHA_HOLD"

    # λ
    ind_m = float(indirect_stats.get("indirect_mint_ratio", 0.0))
    ind_b = float(indirect_stats.get("indirect_burn_ratio", 0.0))
    if ind_m >= CFG.indirect_mint_up:
        lam += CFG.d_lambda
        reason_l = "LAMBDA_UP"
    elif ind_b >= CFG.indirect_burn_down:
        lam -= CFG.d_lambda
        reason_l = "LAMBDA_DOWN"
    else:
        reason_l = "LAMBDA_HOLD"

    # γ
    if corr_team_to_net is not None and corr_team_to_net >= 0.6:
        gamma += CFG.d_gamma
        reason_g = "GAMMA_UP"
    elif entropy >= CFG.entropy_warn or (corr_team_to_net is not None and corr_team_to_net <= 0.3):
        gamma -= CFG.d_gamma
        reason_g = "GAMMA_DOWN"
    else:
        reason_g = "GAMMA_HOLD"

    # stabilization mode
    if entropy >= CFG.entropy_bad:
        alpha -= CFG.d_alpha
        gamma -= CFG.d_gamma
        lam -= CFG.d_lambda
        reason_s = "STABILIZE"
    else:
        reason_s = "NORMAL"

    alpha = clamp(alpha, CFG.alpha_min, CFG.alpha_max)
    lam = clamp(lam, CFG.lambda_min, CFG.lambda_max)
    gamma = clamp(gamma, CFG.gamma_min, CFG.gamma_max)

    return {
        "alpha": alpha, "lambda": lam, "gamma": gamma,
        "reason": "|".join([reason_a, reason_l, reason_g, reason_s])
    }


def suggest_intervention(
    kpi: Dict,
    role_coverage: float,
    synergy_avg: float
) -> List[Dict]:
    """
    KPI 및 팀 상태 기반 개입 권장
    
    출력: [{"level": "HIGH|MEDIUM|LOW", "message": "..."}]
    """
    interventions = []
    
    # 엔트로피 체크
    entropy = float(kpi.get("entropy_ratio", 0.0))
    if entropy >= CFG.entropy_bad:
        interventions.append({
            "level": "HIGH",
            "message": f"엔트로피 위험 수준 ({entropy:.1%}). Burn 원인 분석 및 즉각 개입 필요."
        })
    elif entropy >= CFG.entropy_warn:
        interventions.append({
            "level": "MEDIUM",
            "message": f"엔트로피 경고 수준 ({entropy:.1%}). Burn 트렌드 모니터링 필요."
        })
    
    # 속도 변화 체크
    vel_change = float(kpi.get("velocity_change", 0.0))
    if vel_change < -0.2:
        interventions.append({
            "level": "HIGH",
            "message": f"Coin Velocity 급감 ({vel_change:+.1%}). 생산성 저하 원인 분석 필요."
        })
    elif vel_change < -0.1:
        interventions.append({
            "level": "MEDIUM",
            "message": f"Coin Velocity 하락 ({vel_change:+.1%}). 주의 필요."
        })
    
    # 역할 커버리지 체크
    if role_coverage < 0.5:
        interventions.append({
            "level": "HIGH",
            "message": f"역할 커버리지 부족 ({role_coverage:.0%}). 팀 구성 재검토 필요."
        })
    elif role_coverage < 0.7:
        interventions.append({
            "level": "MEDIUM",
            "message": f"역할 커버리지 미흡 ({role_coverage:.0%}). 추가 인력 고려."
        })
    
    # 시너지 체크
    if synergy_avg < 0:
        interventions.append({
            "level": "MEDIUM",
            "message": "팀 시너지 음수. 조합 재검토 필요."
        })
    
    # 이벤트 수 체크
    events_count = int(kpi.get("events_count", 0))
    if events_count < 5:
        interventions.append({
            "level": "LOW",
            "message": f"이벤트 수 부족 ({events_count}). 데이터 신뢰도 낮음."
        })
    
    return interventions






















