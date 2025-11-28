from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
@dataclass
class AxisState:
    """6대 축 상태를 표현하는 최소 단위."""
    id: str
    score: float = 0.0
    load: float = 0.0
    risk: float = 0.0
    meta: Dict[str, Any] = field(default_factory=dict)
@dataclass
class ModuleState:
    """19개 모듈 하나의 상태."""
    id: str
    axis: str
    activity: float = 0.0
    health: float = 1.0
    enabled: bool = True
    meta: Dict[str, Any] = field(default_factory=dict)
class RuntimeController:
    """
    AUTUS의 최상위 통제 코어.
    - 6대 축 / 19모듈 상태를 메모리에서 관리
    - Pack / Workflow 우선순위 결정
    - 3D Shell / CLI / API 명령의 브리지 역할
    """
    def __init__(self) -> None:
        self.axes: Dict[str, AxisState] = {}
        self.modules: Dict[str, ModuleState] = {}
    def load_from_config(self, config: Dict[str, Any]) -> None:
        """AUTUS_PROJECT.yaml의 axes/modules 섹션을 그대로 받아 초기화한다."""
        self.axes = {
            a["id"]: AxisState(
                id=a["id"],
                meta={"name": a.get("name"), "description": a.get("description")},
            )
            for a in config.get("axes", [])
        }
        self.modules = {
            m["id"]: ModuleState(
                id=m["id"],
                axis=m["axis"],
                meta={"kind": m.get("kind"), "description": m.get("description")},
            )
            for m in config.get("modules", [])
        }
    def update_module_activity(self, module_id: str, activity_delta: float) -> None:
        """특정 모듈이 사용될 때마다 활동도와 축 상태를 갱신한다."""
        module = self.modules.get(module_id)
        if module is None:
            return
        module.activity = max(0.0, min(1.0, module.activity + activity_delta))
        axis = self.axes.get(module.axis)
        if axis is not None:
            axis.load = max(0.0, min(1.0, axis.load + activity_delta * 0.5))
    def route_command(self, target: Optional[str], command: str) -> Dict[str, Any]:
        """3D Shell / CLI / API에서 들어오는 명령의 단일 진입점."""
        return {
            "target": target or "ALL",
            "command": command,
            "plan": [
                {"step": "analyze", "via": "packs/development/architect"},
                {"step": "route", "via": "core/engine/per_loop"},
            ],
        }
    def snapshot(self) -> Dict[str, Any]:
        """3D Shell에서 사용할 축/모듈 상태 스냅샷을 반환한다."""
        return {
            "axes": [vars(a) for a in self.axes.values()],
            "modules": [vars(m) for m in self.modules.values()],
        }
