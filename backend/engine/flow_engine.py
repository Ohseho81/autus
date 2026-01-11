"""
AUTUS Flow Engine - 자금 흐름 분석

흐름 유형:
- TRADE: 무역
- INVESTMENT: 투자
- AID: 원조
- REMITTANCE: 송금
- SALARY: 급여
- TAX: 세금
- DIVIDEND: 배당
- LOAN: 대출
- PAYMENT: 결제

핵심 기능:
- 경로 탐색 (Dijkstra, MaxFlow, All Paths)
- 병목 노드 탐지
- 흐름 행렬 생성
- 제거 시뮬레이션
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple, Set
from enum import Enum
from collections import defaultdict
from datetime import datetime
import heapq


class FlowType(str, Enum):
    """흐름 유형"""
    TRADE = "trade"              # 무역
    INVESTMENT = "investment"    # 투자
    AID = "aid"                  # 원조
    REMITTANCE = "remittance"    # 송금
    SALARY = "salary"            # 급여
    TAX = "tax"                  # 세금
    DIVIDEND = "dividend"        # 배당
    LOAN = "loan"                # 대출
    PAYMENT = "payment"          # 결제
    TRANSFER = "transfer"        # 이체


@dataclass
class Flow:
    """개별 흐름"""
    id: str
    source_id: str
    target_id: str
    amount: float              # 금액 (USD)
    flow_type: FlowType
    timestamp: str = ""
    
    # 메타데이터
    description: str = ""
    evidence_url: str = ""     # 출처
    confidence: float = 1.0    # 신뢰도 (0-1)
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "source_id": self.source_id,
            "target_id": self.target_id,
            "amount": self.amount,
            "flow_type": self.flow_type.value,
            "timestamp": self.timestamp,
            "description": self.description,
            "evidence_url": self.evidence_url,
            "confidence": self.confidence,
        }


@dataclass
class FlowPath:
    """경로 (노드 + 흐름)"""
    nodes: List[str]           # 경로 상 노드 ID
    flows: List[Flow]          # 경로 상 흐름
    total_amount: float = 0.0
    bottleneck_id: str = ""    # 병목 노드
    bottleneck_flow: float = 0.0  # 병목 유량
    path_cost: float = 0.0     # 경로 비용
    
    def to_dict(self) -> Dict:
        return {
            "nodes": self.nodes,
            "flows": [f.to_dict() for f in self.flows],
            "total_amount": self.total_amount,
            "bottleneck_id": self.bottleneck_id,
            "bottleneck_flow": self.bottleneck_flow,
            "path_cost": round(self.path_cost, 4),
            "hop_count": len(self.nodes) - 1,
        }


@dataclass
class FlowStats:
    """노드 흐름 통계"""
    node_id: str
    total_inflow: float = 0.0
    total_outflow: float = 0.0
    net_flow: float = 0.0
    inflow_count: int = 0
    outflow_count: int = 0
    flow_count: int = 0
    top_source: str = ""
    top_target: str = ""
    top_source_amount: float = 0.0
    top_target_amount: float = 0.0
    flow_types: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict:
        return {
            "node_id": self.node_id,
            "total_inflow": self.total_inflow,
            "total_outflow": self.total_outflow,
            "net_flow": self.net_flow,
            "inflow_count": self.inflow_count,
            "outflow_count": self.outflow_count,
            "flow_count": self.flow_count,
            "top_source": self.top_source,
            "top_target": self.top_target,
            "top_source_amount": self.top_source_amount,
            "top_target_amount": self.top_target_amount,
            "flow_types": self.flow_types,
        }


@dataclass
class BottleneckInfo:
    """병목 노드 정보"""
    node_id: str
    impact_score: float        # 제거 시 영향도
    bridge_score: float        # 브릿지 점수
    in_nodes: int              # 유입 노드 수
    out_nodes: int             # 유출 노드 수
    through_flow: float        # 통과 유량
    
    def to_dict(self) -> Dict:
        return {
            "node_id": self.node_id,
            "impact_score": round(self.impact_score, 4),
            "bridge_score": round(self.bridge_score, 4),
            "in_nodes": self.in_nodes,
            "out_nodes": self.out_nodes,
            "through_flow": self.through_flow,
        }


class FlowEngine:
    """
    자금 흐름 분석 엔진
    
    - 경로 탐색 (Dijkstra, MaxFlow, All Paths)
    - 병목 노드 탐지
    - 흐름 행렬 생성
    - 제거 시뮬레이션
    """
    
    def __init__(self):
        self.flows: Dict[str, Flow] = {}
        # {from_id: {to_id: [flow_ids]}}
        self.adjacency: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
        # {to_id: {from_id: [flow_ids]}}
        self.reverse_adj: Dict[str, Dict[str, List[str]]] = defaultdict(lambda: defaultdict(list))
        # 모든 노드
        self.nodes: Set[str] = set()
    
    def add_flow(self, flow: Flow) -> None:
        """흐름 추가 + 인덱싱"""
        self.flows[flow.id] = flow
        self.adjacency[flow.source_id][flow.target_id].append(flow.id)
        self.reverse_adj[flow.target_id][flow.source_id].append(flow.id)
        self.nodes.add(flow.source_id)
        self.nodes.add(flow.target_id)
    
    def remove_flow(self, flow_id: str) -> bool:
        """흐름 제거"""
        if flow_id not in self.flows:
            return False
        
        flow = self.flows[flow_id]
        
        # 인덱스에서 제거
        if flow.source_id in self.adjacency:
            if flow.target_id in self.adjacency[flow.source_id]:
                self.adjacency[flow.source_id][flow.target_id].remove(flow_id)
        
        if flow.target_id in self.reverse_adj:
            if flow.source_id in self.reverse_adj[flow.target_id]:
                self.reverse_adj[flow.target_id][flow.source_id].remove(flow_id)
        
        del self.flows[flow_id]
        return True
    
    def get_flow(self, flow_id: str) -> Optional[Flow]:
        """흐름 조회"""
        return self.flows.get(flow_id)
    
    def get_outflows(self, node_id: str) -> List[Flow]:
        """유출 흐름"""
        flow_ids = []
        for target_flows in self.adjacency.get(node_id, {}).values():
            flow_ids.extend(target_flows)
        return [self.flows[fid] for fid in flow_ids if fid in self.flows]
    
    def get_inflows(self, node_id: str) -> List[Flow]:
        """유입 흐름"""
        flow_ids = []
        for source_flows in self.reverse_adj.get(node_id, {}).values():
            flow_ids.extend(source_flows)
        return [self.flows[fid] for fid in flow_ids if fid in self.flows]
    
    def get_flow_stats(self, node_id: str) -> FlowStats:
        """노드 흐름 통계"""
        inflows = self.get_inflows(node_id)
        outflows = self.get_outflows(node_id)
        
        total_inflow = sum(f.amount for f in inflows)
        total_outflow = sum(f.amount for f in outflows)
        
        # Top Source/Target
        source_amounts = defaultdict(float)
        for f in inflows:
            source_amounts[f.source_id] += f.amount
        
        target_amounts = defaultdict(float)
        for f in outflows:
            target_amounts[f.target_id] += f.amount
        
        top_source = max(source_amounts, key=source_amounts.get) if source_amounts else ""
        top_target = max(target_amounts, key=target_amounts.get) if target_amounts else ""
        
        # Flow Types
        flow_types = defaultdict(float)
        for f in inflows + outflows:
            flow_types[f.flow_type.value] += f.amount
        
        return FlowStats(
            node_id=node_id,
            total_inflow=total_inflow,
            total_outflow=total_outflow,
            net_flow=total_inflow - total_outflow,
            inflow_count=len(inflows),
            outflow_count=len(outflows),
            flow_count=len(inflows) + len(outflows),
            top_source=top_source,
            top_target=top_target,
            top_source_amount=source_amounts.get(top_source, 0),
            top_target_amount=target_amounts.get(top_target, 0),
            flow_types=dict(flow_types),
        )
    
    def find_shortest_path(self, source_id: str, target_id: str) -> Optional[FlowPath]:
        """
        Dijkstra - 최소 비용 경로
        
        비용 = 1 / 유량 (유량 클수록 선호)
        """
        if source_id not in self.nodes or target_id not in self.nodes:
            return None
        
        dist = {source_id: 0.0}
        prev: Dict[str, Tuple[str, List[str]]] = {}
        pq = [(0.0, source_id)]
        visited = set()
        
        while pq:
            d, u = heapq.heappop(pq)
            
            if u in visited:
                continue
            visited.add(u)
            
            if u == target_id:
                break
            
            for v, flow_ids in self.adjacency.get(u, {}).items():
                if v in visited:
                    continue
                
                # 비용 = 1 / (유량 + ε)
                flow_sum = sum(self.flows[fid].amount for fid in flow_ids if fid in self.flows)
                cost = 1.0 / (flow_sum + 1e-9)
                
                new_dist = dist[u] + cost
                if new_dist < dist.get(v, float('inf')):
                    dist[v] = new_dist
                    prev[v] = (u, flow_ids)
                    heapq.heappush(pq, (new_dist, v))
        
        # 경로가 없으면
        if target_id not in prev and source_id != target_id:
            return None
        
        # 경로 복원
        path_nodes = []
        path_flows = []
        curr = target_id
        
        while curr in prev:
            path_nodes.append(curr)
            u, flow_ids = prev[curr]
            path_flows.extend([self.flows[fid] for fid in flow_ids if fid in self.flows])
            curr = u
        path_nodes.append(source_id)
        path_nodes.reverse()
        
        # 병목 찾기
        bottleneck_id = ""
        bottleneck_flow = float('inf')
        
        for i in range(len(path_nodes) - 1):
            u, v = path_nodes[i], path_nodes[i + 1]
            flow_ids = self.adjacency.get(u, {}).get(v, [])
            edge_flow = sum(self.flows[fid].amount for fid in flow_ids if fid in self.flows)
            if edge_flow < bottleneck_flow:
                bottleneck_flow = edge_flow
                bottleneck_id = u
        
        return FlowPath(
            nodes=path_nodes,
            flows=path_flows,
            total_amount=sum(f.amount for f in path_flows),
            bottleneck_id=bottleneck_id,
            bottleneck_flow=bottleneck_flow if bottleneck_flow != float('inf') else 0,
            path_cost=dist.get(target_id, 0),
        )
    
    def find_max_flow_path(self, source_id: str, target_id: str) -> Optional[FlowPath]:
        """
        최대 유량 경로
        
        Modified Dijkstra: 최소 병목 유량을 최대화
        """
        if source_id not in self.nodes or target_id not in self.nodes:
            return None
        
        # 최대 유량으로 도달 가능한 경로 찾기
        max_flow = {source_id: float('inf')}
        prev: Dict[str, Tuple[str, List[str]]] = {}
        pq = [(-float('inf'), source_id)]  # 음수로 최대 힙
        visited = set()
        
        while pq:
            neg_flow, u = heapq.heappop(pq)
            
            if u in visited:
                continue
            visited.add(u)
            
            if u == target_id:
                break
            
            for v, flow_ids in self.adjacency.get(u, {}).items():
                if v in visited:
                    continue
                
                edge_flow = sum(self.flows[fid].amount for fid in flow_ids if fid in self.flows)
                new_flow = min(max_flow[u], edge_flow)
                
                if new_flow > max_flow.get(v, 0):
                    max_flow[v] = new_flow
                    prev[v] = (u, flow_ids)
                    heapq.heappush(pq, (-new_flow, v))
        
        if target_id not in prev and source_id != target_id:
            return None
        
        # 경로 복원
        path_nodes = []
        path_flows = []
        curr = target_id
        
        while curr in prev:
            path_nodes.append(curr)
            u, flow_ids = prev[curr]
            path_flows.extend([self.flows[fid] for fid in flow_ids if fid in self.flows])
            curr = u
        path_nodes.append(source_id)
        path_nodes.reverse()
        
        return FlowPath(
            nodes=path_nodes,
            flows=path_flows,
            total_amount=sum(f.amount for f in path_flows),
            bottleneck_id=path_nodes[0] if path_nodes else "",
            bottleneck_flow=max_flow.get(target_id, 0),
            path_cost=0,
        )
    
    def find_all_paths(
        self,
        source_id: str,
        target_id: str,
        max_depth: int = 5,
        max_paths: int = 10,
    ) -> List[FlowPath]:
        """
        DFS로 모든 경로 탐색
        """
        if source_id not in self.nodes or target_id not in self.nodes:
            return []
        
        paths = []
        
        def dfs(current: str, path: List[str], flow_list: List[Flow], visited: Set[str]):
            if len(paths) >= max_paths:
                return
            
            if len(path) > max_depth:
                return
            
            if current == target_id:
                # 병목 찾기
                bottleneck_id = ""
                bottleneck_flow = float('inf')
                
                for i in range(len(path) - 1):
                    u, v = path[i], path[i + 1]
                    flow_ids = self.adjacency.get(u, {}).get(v, [])
                    edge_flow = sum(self.flows[fid].amount for fid in flow_ids if fid in self.flows)
                    if edge_flow < bottleneck_flow:
                        bottleneck_flow = edge_flow
                        bottleneck_id = u
                
                paths.append(FlowPath(
                    nodes=path.copy(),
                    flows=flow_list.copy(),
                    total_amount=sum(f.amount for f in flow_list),
                    bottleneck_id=bottleneck_id,
                    bottleneck_flow=bottleneck_flow if bottleneck_flow != float('inf') else 0,
                ))
                return
            
            for neighbor, flow_ids in self.adjacency.get(current, {}).items():
                if neighbor not in visited:
                    visited.add(neighbor)
                    flows = [self.flows[fid] for fid in flow_ids if fid in self.flows]
                    dfs(neighbor, path + [neighbor], flow_list + flows, visited)
                    visited.remove(neighbor)
        
        dfs(source_id, [source_id], [], {source_id})
        
        # 총 유량 기준 정렬
        paths.sort(key=lambda p: p.total_amount, reverse=True)
        
        return paths
    
    def find_bottlenecks(self, threshold: float = 0.3) -> List[BottleneckInfo]:
        """
        병목 노드 탐지
        
        병목 조건: 제거 시 영향도 > threshold
        """
        bottlenecks = []
        
        total_flow = sum(f.amount for f in self.flows.values())
        if total_flow == 0:
            return []
        
        for node_id in self.nodes:
            # 유입/유출 노드 수
            in_sources = set(self.reverse_adj.get(node_id, {}).keys())
            out_targets = set(self.adjacency.get(node_id, {}).keys())
            
            # 통과 유량 (유입 + 유출)
            inflows = self.get_inflows(node_id)
            outflows = self.get_outflows(node_id)
            through_flow = sum(f.amount for f in inflows) + sum(f.amount for f in outflows)
            
            # 영향도 = 통과 유량 / 전체 유량
            impact_score = through_flow / (total_flow * 2) if total_flow > 0 else 0
            
            # 브릿지 점수 = 유입 노드 수 × 유출 노드 수
            bridge_score = len(in_sources) * len(out_targets)
            
            if impact_score >= threshold or (len(in_sources) > 2 and len(out_targets) > 2):
                bottlenecks.append(BottleneckInfo(
                    node_id=node_id,
                    impact_score=impact_score,
                    bridge_score=bridge_score,
                    in_nodes=len(in_sources),
                    out_nodes=len(out_targets),
                    through_flow=through_flow,
                ))
        
        # 영향도 기준 정렬
        bottlenecks.sort(key=lambda b: b.impact_score, reverse=True)
        
        return bottlenecks
    
    def get_flow_matrix(self, node_ids: List[str]) -> Dict[str, Dict[str, float]]:
        """
        노드 간 흐름 행렬
        
        Returns:
            {from_id: {to_id: amount}}
        """
        matrix = {nid: {nid2: 0.0 for nid2 in node_ids} for nid in node_ids}
        
        for flow in self.flows.values():
            if flow.source_id in node_ids and flow.target_id in node_ids:
                matrix[flow.source_id][flow.target_id] += flow.amount
        
        return matrix
    
    def simulate_removal(self, node_id: str) -> Dict:
        """
        노드 제거 시뮬레이션
        
        Returns:
            - removed_flows: 제거되는 흐름 수
            - lost_amount: 손실 금액
            - affected_nodes: 영향받는 노드
            - disconnected_pairs: 단절되는 연결 쌍
        """
        if node_id not in self.nodes:
            return {"error": f"Node {node_id} not found"}
        
        # 제거되는 흐름
        removed_flow_ids = []
        for flow_id, flow in self.flows.items():
            if flow.source_id == node_id or flow.target_id == node_id:
                removed_flow_ids.append(flow_id)
        
        removed_flows = [self.flows[fid] for fid in removed_flow_ids]
        lost_amount = sum(f.amount for f in removed_flows)
        
        # 영향받는 노드
        affected_nodes = set()
        for flow in removed_flows:
            if flow.source_id != node_id:
                affected_nodes.add(flow.source_id)
            if flow.target_id != node_id:
                affected_nodes.add(flow.target_id)
        
        # 단절 여부 확인 (간단한 연결성 체크)
        remaining_nodes = self.nodes - {node_id}
        remaining_edges = {
            (f.source_id, f.target_id)
            for f in self.flows.values()
            if f.source_id != node_id and f.target_id != node_id
        }
        
        # 연결 그래프 생성
        adj = defaultdict(set)
        for s, t in remaining_edges:
            adj[s].add(t)
            adj[t].add(s)
        
        # BFS로 연결 컴포넌트 찾기
        components = []
        unvisited = set(remaining_nodes)
        
        while unvisited:
            start = unvisited.pop()
            component = {start}
            queue = [start]
            
            while queue:
                curr = queue.pop(0)
                for neighbor in adj[curr]:
                    if neighbor in unvisited:
                        unvisited.remove(neighbor)
                        component.add(neighbor)
                        queue.append(neighbor)
            
            components.append(component)
        
        return {
            "removed_node": node_id,
            "removed_flows_count": len(removed_flows),
            "lost_amount": lost_amount,
            "affected_nodes": list(affected_nodes),
            "affected_nodes_count": len(affected_nodes),
            "remaining_components": len(components),
            "is_disconnecting": len(components) > 1,
            "largest_component_size": max(len(c) for c in components) if components else 0,
        }
    
    def aggregate_flows_by_type(self) -> Dict[str, Dict]:
        """흐름 유형별 집계"""
        aggregation = defaultdict(lambda: {"count": 0, "total_amount": 0.0})
        
        for flow in self.flows.values():
            ft = flow.flow_type.value
            aggregation[ft]["count"] += 1
            aggregation[ft]["total_amount"] += flow.amount
        
        return dict(aggregation)
    
    def get_top_flows(self, n: int = 10) -> List[Flow]:
        """금액 기준 TOP N 흐름"""
        sorted_flows = sorted(
            self.flows.values(),
            key=lambda f: f.amount,
            reverse=True
        )
        return sorted_flows[:n]
    
    def to_dict(self) -> Dict:
        """전체 데이터 덤프"""
        return {
            "flow_count": len(self.flows),
            "node_count": len(self.nodes),
            "flows": [f.to_dict() for f in self.flows.values()],
            "aggregation": self.aggregate_flows_by_type(),
        }


def create_sample_flow_data() -> FlowEngine:
    """
    샘플 흐름 데이터 생성
    """
    engine = FlowEngine()
    
    flows = [
        # 국가 간 무역
        Flow("f1", "usa", "china", 500e9, FlowType.TRADE, "2024-01", "US-China Trade"),
        Flow("f2", "china", "usa", 450e9, FlowType.TRADE, "2024-01", "China-US Trade"),
        Flow("f3", "usa", "korea", 100e9, FlowType.TRADE, "2024-01", "US-Korea Trade"),
        Flow("f4", "korea", "usa", 120e9, FlowType.TRADE, "2024-01", "Korea-US Trade"),
        Flow("f5", "china", "korea", 150e9, FlowType.TRADE, "2024-01", "China-Korea Trade"),
        Flow("f6", "korea", "china", 130e9, FlowType.TRADE, "2024-01", "Korea-China Trade"),
        
        # 금융 투자
        Flow("f10", "larry_fink", "jerome_powell", 200e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f11", "larry_fink", "jamie_dimon", 80e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f12", "jerome_powell", "larry_fink", 150e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f13", "jamie_dimon", "larry_fink", 60e9, FlowType.INVESTMENT, "2024-01"),
        
        # 기술 투자
        Flow("f20", "larry_fink", "tim_cook", 150e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f21", "larry_fink", "satya_nadella", 120e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f22", "larry_fink", "jensen_huang", 80e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f23", "tim_cook", "satya_nadella", 30e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f24", "satya_nadella", "jensen_huang", 50e9, FlowType.INVESTMENT, "2024-01"),
        
        # SWF 투자
        Flow("f30", "mbs", "larry_fink", 100e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f31", "cic", "larry_fink", 150e9, FlowType.INVESTMENT, "2024-01"),
        Flow("f32", "gic", "larry_fink", 80e9, FlowType.INVESTMENT, "2024-01"),
        
        # 원조
        Flow("f40", "usa", "ukraine", 50e9, FlowType.AID, "2024-01"),
        Flow("f41", "germany", "ukraine", 20e9, FlowType.AID, "2024-01"),
        
        # 개인 거래
        Flow("f50", "son_jueun", "kim_director", 10e6, FlowType.SALARY, "2024-01"),
        Flow("f51", "kim_director", "lee_branch", 5e6, FlowType.SALARY, "2024-01"),
        Flow("f52", "parent_park", "son_jueun", 3e6, FlowType.PAYMENT, "2024-01"),
    ]
    
    for flow in flows:
        engine.add_flow(flow)
    
    return engine

