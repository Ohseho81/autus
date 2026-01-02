"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }


"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }


"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }


"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }


"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }












"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }


"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }


"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }


"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }


"""
AUTUS Predictor Service
=======================
입력 → 예측 (핵심)

드래그 입력을 받아 KPI 예측 반환
"""

from dataclasses import dataclass
from typing import Dict, Any, List
import pandas as pd

from ..audit import append_audit
from ..state_store import RealtimeState
from ..engine.rolling_kpi import compute_rolling_kpi
from ..engine.baselines import compute_person_baseline_v12
from ..engine.project_weights import compute_project_weights_4w
from ..engine.synergy_partitioned import (
    compute_pair_synergy_uplift_partitioned,
    compute_group_synergy_uplift_partitioned,
    aggregate_synergy_with_project_weights
)
from ..engine.team_score import find_best_team_v11, compute_team_score
from .mapper import apply_alloc_to_projection, apply_swap_to_team


@dataclass
class PredictorIO:
    """예측 입력 데이터"""
    money: pd.DataFrame
    burn: pd.DataFrame
    baseline: pd.DataFrame


class PredictorService:
    """예측 서비스"""
    
    def __init__(self, audit_path: str):
        self.audit_path = audit_path
    
    def predict_after_input(
        self,
        state: RealtimeState,
        io: PredictorIO,
        input_obj: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        입력 후 예측
        
        Args:
            state: 현재 상태
            io: 입력 데이터 (money, burn, baseline)
            input_obj: 입력 객체 (INPUT_APPLY payload)
            
        Returns:
            {
                "kpi": {
                    "net_7d_pred": float,
                    "entropy_7d_pred": float,
                    "velocity_7d_pred": float,
                    "best_team_score_pred": float,
                    "best_team": List[str]
                }
            }
        """
        # 1. 입력을 Projected State에 적용 (물리 입력)
        projected_team = list(state.current_team)
        projected_money = io.money.copy()
        
        input_type = input_obj.get("input_type", "")
        
        if input_type == "SWAP":
            swap = input_obj.get("swap", {})
            out_pid = swap.get("out")
            in_pid = swap.get("in") or swap.get("in_")
            
            if out_pid and in_pid:
                projected_team = apply_swap_to_team(projected_team, out_pid, in_pid)
        
        elif input_type == "ALLOC":
            alloc = input_obj.get("alloc", [])
            if alloc:
                projected_money = apply_alloc_to_projection(projected_money, alloc)
        
        # 2. 파티션별 시너지 재계산
        baseline = io.baseline
        
        pair_part = compute_pair_synergy_uplift_partitioned(projected_money, baseline)
        group_part = compute_group_synergy_uplift_partitioned(
            projected_money, baseline, k_min=3, k_max=4
        )
        
        weights = compute_project_weights_4w(projected_money, weeks=4)
        pair_synergy, group_synergy = aggregate_synergy_with_project_weights(
            pair_part, group_part, weights
        )
        
        # 3. KPI Rolling 예측 (v0 = rolling approx)
        kpi_7d = compute_rolling_kpi(projected_money, io.burn, window_days=7)
        
        # 4. Best Team 재계산
        # person scoring: baseline base_rate_per_min을 score proxy로 사용
        person_scores = baseline.rename(
            columns={"base_rate_per_min": "score_per_min"}
        )[["person_id", "score_per_min"]].copy()
        person_scores["score_per_hr"] = person_scores["score_per_min"] * 60.0
        
        best = find_best_team_v11(
            person_scores=person_scores,
            pair_synergy=pair_synergy,
            group_synergy=group_synergy,
            burn_krw=kpi_7d["burn_krw"],
            team_size=len(projected_team) if projected_team else 5,
            top_k=min(12, len(person_scores))
        )
        
        # 결과 구성
        result = {
            "kpi": {
                "net_7d_pred": float(kpi_7d["net_krw"]),
                "entropy_7d_pred": float(kpi_7d["entropy_ratio"]),
                "velocity_7d_pred": float(kpi_7d["coin_velocity"]),
                "best_team_score_pred": float(best["score"]),
                "best_team": best["team"],
            }
        }
        
        # Audit 로그
        append_audit(self.audit_path, {
            "type": "PredictAfterInput",
            "input": input_obj,
            "result": result
        })
        
        return result
    
    def predict_current(
        self,
        state: RealtimeState,
        io: PredictorIO
    ) -> Dict[str, Any]:
        """
        현재 상태 예측 (입력 없음)
        """
        return self.predict_after_input(state, io, {"input_type": "NONE"})
    
    def compute_delta(
        self,
        before: Dict[str, Any],
        after: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        예측 변화량(Δ) 계산
        
        Args:
            before: 이전 KPI
            after: 이후 KPI
            
        Returns:
            {
                "net_7d_delta": float,
                "entropy_7d_delta": float,
                "velocity_7d_delta": float,
                "team_changed": bool
            }
        """
        return {
            "net_7d_delta": after["kpi"]["net_7d_pred"] - before.get("net_7d_pred", 0),
            "entropy_7d_delta": after["kpi"]["entropy_7d_pred"] - before.get("entropy_7d_pred", 0),
            "velocity_7d_delta": after["kpi"]["velocity_7d_pred"] - before.get("velocity_7d_pred", 0),
            "team_changed": after["kpi"]["best_team"] != before.get("best_team", [])
        }

















