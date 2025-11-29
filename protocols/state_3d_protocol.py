from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class SphereNode:
    id: str
    label: str
    level: int  # 1=Core, 2=Protocol, 3=Pack
    status: str = "ok"


class State3DProtocol:
    def build_state(self, packs_state: Dict[str, Any]) -> Dict[str, Any]:
        core_nodes = [
            SphereNode(id="runtime_kernel", label="Runtime", level=1),
            SphereNode(id="loop_engine", label="Loop", level=1),
            SphereNode(id="security_kernel", label="Security", level=1),
        ]

        protocol_nodes = [
            SphereNode(id="identity_core", label="Identity", level=2),
            SphereNode(id="memory_protocol", label="Memory", level=2),
            SphereNode(id="workflow_protocol", label="Workflow", level=2),
        ]

        pack_nodes = [
            SphereNode(id=pack_id, label=pack_id, level=3)
            for pack_id in packs_state.keys()
        ]

        def serialize(nodes: list[SphereNode]) -> list[dict]:
            return [node.__dict__ for node in nodes]

        return {
            "core": {
                "nodes": serialize(core_nodes),
            },
            "protocols": {
                "nodes": serialize(protocol_nodes),
            },
            "packs": {
                "nodes": serialize(pack_nodes),
                "state": packs_state,
            },
        }
