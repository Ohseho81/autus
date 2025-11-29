"""
AUTUS 3D Node System
- 9종 노드 표준화
- OS가 좌표/색/상태 결정
- 3D는 렌더링만 담당
"""
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from enum import Enum
import hashlib

class NodeType(Enum):
    USER = "user"
    TASK = "task"
    PACK = "pack"
    WORKFLOW = "workflow"
    TIMELINE = "timeline"
    FACILITY = "facility"
    RISK = "risk"
    SENSOR = "sensor"
    MEMORY_PATTERN = "memory_pattern"

@dataclass
class Node3D:
    """Base 3D Node - OS가 생성, 3D가 렌더링"""
    node_id: str
    node_type: NodeType
    position: tuple  # (x, y, z)
    color: str       # hex color
    scale: float = 1.0
    state: str = "idle"
    properties: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.properties is None:
            self.properties = {}
    
    def to_render_json(self) -> Dict:
        """3D 렌더링용 JSON 반환"""
        return {
            "update": f"{self.node_type.value}_state",
            "node_id": self.node_id,
            "position": list(self.position),
            "properties": {
                "color": self.color,
                "scale": self.scale,
                "state": self.state,
                **self.properties
            }
        }


class NodeManager:
    """모든 3D 노드 관리 - OS 레벨"""
    
    def __init__(self):
        self.nodes: Dict[str, Node3D] = {}
        self._listeners = []
    
    def create_node(self, node_type: NodeType, node_id: str, 
                    position: tuple, color: str, **props) -> Node3D:
        node = Node3D(
            node_id=node_id,
            node_type=node_type,
            position=position,
            color=color,
            properties=props
        )
        self.nodes[node_id] = node
        self._notify(node)
        return node
    
    def update_node(self, node_id: str, **updates) -> Optional[Node3D]:
        if node_id not in self.nodes:
            return None
        node = self.nodes[node_id]
        for key, value in updates.items():
            if hasattr(node, key):
                setattr(node, key, value)
            else:
                node.properties[key] = value
        self._notify(node)
        return node
    
    def get_node(self, node_id: str) -> Optional[Dict]:
        node = self.nodes.get(node_id)
        return node.to_render_json() if node else None
    
    def get_all_nodes(self) -> List[Dict]:
        return [n.to_render_json() for n in self.nodes.values()]
    
    def get_nodes_by_type(self, node_type: NodeType) -> List[Dict]:
        return [n.to_render_json() for n in self.nodes.values() 
                if n.node_type == node_type]
    
    def add_listener(self, callback):
        self._listeners.append(callback)
    
    def _notify(self, node: Node3D):
        for listener in self._listeners:
            listener(node.to_render_json())


# ========== 6개 모듈 생성기 ==========

class WorkflowOrbit:
    """Workflow를 3D 구 궤도로 배치"""
    
    @staticmethod
    def create_from_graph(manager: NodeManager, graph_data: Dict) -> List[str]:
        nodes = graph_data.get("nodes", [])
        created = []
        for i, node in enumerate(nodes):
            angle = (i / max(len(nodes), 1)) * 6.28  # 2*pi
            radius = 3.0
            pos = (radius * __import__("math").cos(angle), 
                   0, 
                   radius * __import__("math").sin(angle))
            color = "#00ff88" if node.get("state") == "running" else "#4488ff"
            n = manager.create_node(
                NodeType.WORKFLOW,
                f"workflow_{node.get('id', i)}",
                pos, color,
                label=node.get('name', f'Node {i}'),
                progress=node.get("progress", 0)
            )
            created.append(n.node_id)
        return created


class MemoryGalaxy:
    """Memory 패턴을 Point Cloud로 표현"""
    
    @staticmethod
    def create_from_patterns(manager: NodeManager, patterns: List[Dict]) -> List[str]:
        colors = {"workflow": "#4CAF50", "schedule": "#2196F3", 
                  "preference": "#FF9800", "habit": "#9C27B0"}
        created = []
        for i, p in enumerate(patterns):
            # 해시로 위치 결정
            h = hashlib.md5(p.get("name", str(i)).encode()).digest()
            pos = ((h[0]/128 - 1) * 5, (h[1]/128 - 1) * 5, (h[2]/128 - 1) * 5)
            cat = p.get("category", "workflow")
            n = manager.create_node(
                NodeType.MEMORY_PATTERN,
                f"pattern_{i}",
                pos,
                colors.get(cat, "#888888"),
                name=p.get("name"),
                count=p.get("count", 1),
                scale=0.2 + min(p.get("count", 1) / 20, 0.8)
            )
            created.append(n.node_id)
        return created


class IdentitySurface:
    """Identity Core를 3D Mesh로 표현"""
    
    @staticmethod
    def create_from_identity(manager: NodeManager, identity_data: Dict) -> str:
        core = identity_data.get("core", {})
        pos = tuple(core.get("position", (0, 0, 0)))
        color = core.get("color", {}).get("primary", "#ffffff")
        
        node = manager.create_node(
            NodeType.USER,
            "identity_core",
            pos, color,
            shape=core.get("shape", {}).get("geometry", "sphere"),
            surface_traits=identity_data.get("surface", {}),
            morph_level=len(identity_data.get("patterns", []))
        )
        return node.node_id


class RiskNebula:
    """ARMP 위험 레벨을 블룸으로 표현"""
    
    ARTICLE_COLORS = {
        "article_1": "#ff0000",  # Zero Identity 위반
        "article_2": "#ff8800",  # Privacy 위반
        "article_3": "#ffff00",  # Meta-Circular 위반
    }
    
    @staticmethod
    def create_from_risks(manager: NodeManager, risks: List[Dict]) -> List[str]:
        created = []
        for i, risk in enumerate(risks):
            article = risk.get("article", "article_1")
            level = risk.get("level", 0.5)
            n = manager.create_node(
                NodeType.RISK,
                f"risk_{i}",
                (i * 2 - 2, 4, 0),
                RiskNebula.ARTICLE_COLORS.get(article, "#ff0000"),
                scale=0.5 + level,
                level=level,
                article=article,
                blink=risk.get("active", False)
            )
            created.append(n.node_id)
        return created


class PackUniverse:
    """Pack을 행성으로 표현"""
    
    PACK_COLORS = {
        "development": "#00ff00",
        "integration": "#ff0000",
        "examples": "#0088ff",
        "identity": "#000000",
    }
    
    @staticmethod
    def create_from_packs(manager: NodeManager, packs: List[Dict]) -> List[str]:
        created = []
        for i, pack in enumerate(packs):
            angle = (i / max(len(packs), 1)) * 6.28
            radius = 8.0
            pos = (radius * __import__("math").cos(angle), 
                   2, 
                   radius * __import__("math").sin(angle))
            cat = pack.get("category", "examples")
            n = manager.create_node(
                NodeType.PACK,
                f"pack_{pack.get('name', i)}",
                pos,
                PackUniverse.PACK_COLORS.get(cat, "#888888"),
                scale=1.5,
                name=pack.get("name"),
                category=cat
            )
            created.append(n.node_id)
        return created


# 전역 매니저
node_manager = NodeManager()
