"""
AUTUS Sovereign - Clark Corndog Protocol
=========================================

Clark 4단계 프로토콜 (스텁 구현)

4단계:
1. D-Rate: 삭제율 최적화
2. A-Rate: 자동화율 향상
3. Human Plugin: 핵심 인력 확보
4. Scale: 복제 및 확장
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any
from datetime import datetime
from enum import Enum


class NodeStatus(Enum):
    """노드 상태"""
    INACTIVE = "inactive"
    STABILIZING = "stabilizing"
    ACTIVE = "active"
    OPTIMIZING = "optimizing"
    REPLICABLE = "replicable"


@dataclass
class ClarkNode:
    """Clark 노드"""
    id: str
    name: str
    location: str
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    # KPIs
    d_rate: float = 0.0         # 삭제율
    a_rate: float = 0.0         # 자동화율
    omega_density: float = 0.0  # 오메가 밀도
    health: float = 0.5         # 건강도
    
    # Financials
    monthly_revenue: int = 0
    monthly_cost: int = 0
    
    status: NodeStatus = NodeStatus.INACTIVE
    
    @property
    def monthly_profit(self) -> int:
        return self.monthly_revenue - self.monthly_cost
    
    @property
    def is_replicable(self) -> bool:
        return (
            self.d_rate >= 0.3 and
            self.a_rate >= 0.5 and
            self.health >= 0.7 and
            self.monthly_profit > 0
        )


@dataclass
class ClarkProtocolResult:
    """프로토콜 실행 결과"""
    entity_id: str
    executed_at: str
    
    # D-Rate
    d_rate_before: float = 0.0
    d_rate_after: float = 0.0
    delete_targets: List[str] = field(default_factory=list)
    delete_savings: int = 0
    
    # A-Rate
    a_rate_before: float = 0.0
    a_rate_after: float = 0.0
    automation_plan: List[Dict] = field(default_factory=list)
    automation_savings: int = 0
    automation_cost: int = 0
    
    # Human
    omega_density_before: float = 0.0
    omega_density_after: float = 0.0
    required_keymans: int = 0
    plugin_count: int = 0
    
    # Scale
    replication_plan: Dict = field(default_factory=dict)
    
    # Summary
    total_monthly_savings: int = 0
    total_investment: int = 0
    payback_months: float = 0.0


class ClarkCorndogProtocol:
    """
    Clark Corndog 프로토콜
    
    핵심: "먼저 삭제하고, 자동화하고, 사람을 채우고, 복제하라"
    """
    
    def __init__(self):
        self.nodes: Dict[str, ClarkNode] = {}
        self.results: Dict[str, ClarkProtocolResult] = {}
    
    def create_node(self, node_id: str, name: str, location: str) -> ClarkNode:
        """노드 생성"""
        node = ClarkNode(id=node_id, name=name, location=location)
        self.nodes[node_id] = node
        return node
    
    def update_node_kpis(
        self,
        node_id: str,
        d_rate: float,
        a_rate: float,
        omega_density: float,
        health: float,
        monthly_revenue: int,
        monthly_cost: int
    ):
        """노드 KPI 업데이트"""
        if node_id not in self.nodes:
            self.nodes[node_id] = ClarkNode(id=node_id, name=node_id, location="unknown")
        
        node = self.nodes[node_id]
        node.d_rate = d_rate
        node.a_rate = a_rate
        node.omega_density = omega_density
        node.health = health
        node.monthly_revenue = monthly_revenue
        node.monthly_cost = monthly_cost
        
        # 상태 업데이트
        if node.is_replicable:
            node.status = NodeStatus.REPLICABLE
        elif node.health >= 0.6:
            node.status = NodeStatus.ACTIVE
        else:
            node.status = NodeStatus.STABILIZING
    
    def execute_protocol(self, entity_id: str) -> ClarkProtocolResult:
        """4단계 프로토콜 실행"""
        result = ClarkProtocolResult(
            entity_id=entity_id,
            executed_at=datetime.now().isoformat(),
        )
        
        # Phase 1: Delete (시뮬레이션)
        result.d_rate_before = 0.1
        result.d_rate_after = 0.35
        result.delete_targets = ["미사용 구독", "불필요 회의", "중복 프로세스"]
        result.delete_savings = 500000
        
        # Phase 2: Automate (시뮬레이션)
        result.a_rate_before = 0.2
        result.a_rate_after = 0.55
        result.automation_plan = [
            {"name": "보고서 자동화", "savings": 200000},
            {"name": "데이터 입력 자동화", "savings": 150000},
        ]
        result.automation_savings = 350000
        result.automation_cost = 1000000
        
        # Phase 3: Human Plugin (시뮬레이션)
        result.omega_density_before = 0.3
        result.omega_density_after = 0.7
        result.required_keymans = 2
        result.plugin_count = 3
        
        # Phase 4: Scale (시뮬레이션)
        result.replication_plan = {
            "waves": [
                {"wave": 1, "month": 3, "new_nodes": 2},
                {"wave": 2, "month": 6, "new_nodes": 3},
            ],
            "total_nodes_12m": 6,
            "projected_monthly_profit": 5000000,
        }
        
        # Summary
        result.total_monthly_savings = result.delete_savings + result.automation_savings
        result.total_investment = result.automation_cost
        result.payback_months = result.total_investment / max(result.total_monthly_savings, 1)
        
        self.results[entity_id] = result
        return result
    
    def get_dashboard_summary(self, entity_id: str) -> Dict:
        """대시보드 요약"""
        if entity_id not in self.results:
            return {"error": "No protocol executed for this entity"}
        
        result = self.results[entity_id]
        return {
            "entity_id": entity_id,
            "executed_at": result.executed_at,
            "d_rate": result.d_rate_after,
            "a_rate": result.a_rate_after,
            "omega_density": result.omega_density_after,
            "monthly_savings": result.total_monthly_savings,
            "investment": result.total_investment,
            "payback_months": result.payback_months,
        }
    
    def check_replication_ready(self, node_id: str) -> Dict:
        """복제 준비 상태 확인"""
        node = self.nodes.get(node_id)
        if not node:
            return {"ready": False, "reason": "Node not found"}
        
        checks = {
            "d_rate >= 0.3": node.d_rate >= 0.3,
            "a_rate >= 0.5": node.a_rate >= 0.5,
            "health >= 0.7": node.health >= 0.7,
            "profitable": node.monthly_profit > 0,
        }
        
        all_passed = all(checks.values())
        
        return {
            "node_id": node_id,
            "ready": all_passed,
            "checks": checks,
            "status": node.status.value,
        }


# 전역 인스턴스
_clark: Optional[ClarkCorndogProtocol] = None


def get_clark() -> ClarkCorndogProtocol:
    """Clark 프로토콜 싱글톤"""
    global _clark
    if _clark is None:
        _clark = ClarkCorndogProtocol()
    return _clark
