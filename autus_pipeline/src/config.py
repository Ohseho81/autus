from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()






from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()






from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()






from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()






from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()
















from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()






from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()






from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()






from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()






from dataclasses import dataclass

@dataclass(frozen=True)
class AutusConfig:
    # Consortium
    base_consortium_size: int = 5
    sprint_size: int = 3
    expansion_size: int = 7
    expansion_max_weeks: int = 4

    # Indirect decay (default)
    lambda_decay: float = 0.40
    # Team bonus
    gamma_team_bonus: float = 0.20
    # Update rate
    alpha_update: float = 0.10

    # Role thresholds (LOCK)
    thr_rainmaker: float = 0.40
    thr_closer: float = 0.35
    thr_operator: float = 0.30
    thr_builder: float = 0.25
    thr_connector: float = 0.20
    thr_controller: float = 0.30

    # Money conversion caps
    cap_months_mrr: int = 12
    cap_months_cost_saved: int = 12

    # Tuning clamps
    alpha_min: float = 0.05
    alpha_max: float = 0.20
    lambda_min: float = 0.20
    lambda_max: float = 0.60
    gamma_min: float = 0.05
    gamma_max: float = 0.30

    # Tuning step limits
    d_alpha: float = 0.02
    d_lambda: float = 0.05
    d_gamma: float = 0.02

    # KPI thresholds
    entropy_good: float = 0.15
    entropy_warn: float = 0.25
    entropy_bad: float = 0.30

    # Indirect tuning thresholds
    indirect_mint_up: float = 0.30
    indirect_burn_down: float = 0.20

CFG = AutusConfig()





















