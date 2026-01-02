#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })
















#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })






#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
╔═══════════════════════════════════════════════════════════════════════════════════════════╗
║                    🧬 AUTUS PIPELINE v1.3 FINAL - Audit Logging                           ║
╚═══════════════════════════════════════════════════════════════════════════════════════════╝
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional


def append_jsonl(path: str, obj: dict) -> None:
    """JSONL 파일에 한 줄 추가"""
    obj = dict(obj)
    obj["_ts"] = datetime.now().isoformat()
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, ensure_ascii=False) + "\n")


class AuditLogger:
    """
    감사 로그 관리
    
    각 로그 유형별 JSONL 파일 생성:
    - kpi_log.jsonl: 주간 KPI 기록
    - parameter_updates.jsonl: 파라미터 변경 기록
    - role_assignments.jsonl: 역할 할당 기록
    - consortium_log.jsonl: 컨소시엄 구성 기록
    - interventions.jsonl: 개입 권장 기록
    """
    
    def __init__(self, audit_dir: str):
        self.audit_dir = audit_dir
        os.makedirs(audit_dir, exist_ok=True)
        
        self.kpi_path = os.path.join(audit_dir, "kpi_log.jsonl")
        self.param_path = os.path.join(audit_dir, "parameter_updates.jsonl")
        self.role_path = os.path.join(audit_dir, "role_assignments.jsonl")
        self.consortium_path = os.path.join(audit_dir, "consortium_log.jsonl")
        self.intervention_path = os.path.join(audit_dir, "interventions.jsonl")
    
    def log_kpi(self, week_id: str, kpi: Dict[str, Any]) -> None:
        """주간 KPI 로그"""
        append_jsonl(self.kpi_path, {
            "week_id": week_id,
            "kpi": kpi
        })
    
    def log_parameter_update(
        self,
        prev_params: Dict[str, Any],
        new_params: Dict[str, Any],
        kpi: Dict[str, Any],
        reason: str
    ) -> None:
        """파라미터 변경 로그"""
        append_jsonl(self.param_path, {
            "prev": {
                "alpha": prev_params.get("alpha"),
                "lambda": prev_params.get("lambda"),
                "gamma": prev_params.get("gamma")
            },
            "new": {
                "alpha": new_params.get("alpha"),
                "lambda": new_params.get("lambda"),
                "gamma": new_params.get("gamma")
            },
            "reason": reason,
            "trigger_kpi": {
                "entropy_ratio": kpi.get("entropy_ratio"),
                "coin_velocity": kpi.get("coin_velocity"),
                "velocity_change": kpi.get("velocity_change")
            }
        })
    
    def log_role_assignment(
        self,
        week_id: str,
        roles: List[Dict[str, Any]],
        role_scores: List[Dict[str, Any]]
    ) -> None:
        """역할 할당 로그"""
        append_jsonl(self.role_path, {
            "week_id": week_id,
            "assignments": roles,
            "scores_summary": {
                "count": len(role_scores),
                "roles_assigned": len(roles)
            }
        })
    
    def log_consortium(
        self,
        week_id: str,
        team: List[str],
        score: float,
        composition: Optional[Dict[str, Any]] = None
    ) -> None:
        """컨소시엄 구성 로그"""
        append_jsonl(self.consortium_path, {
            "week_id": week_id,
            "team": team,
            "score": score,
            "composition": composition or {}
        })
    
    def log_intervention(
        self,
        week_id: str,
        interventions: List[Dict[str, Any]]
    ) -> None:
        """개입 권장 로그"""
        if not interventions:
            return
        
        append_jsonl(self.intervention_path, {
            "week_id": week_id,
            "interventions": interventions,
            "high_count": sum(1 for i in interventions if i.get("level") == "HIGH"),
            "medium_count": sum(1 for i in interventions if i.get("level") == "MEDIUM"),
            "low_count": sum(1 for i in interventions if i.get("level") == "LOW")
        })





















