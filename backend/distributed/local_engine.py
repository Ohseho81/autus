"""
AUTUS Local Physics Engine v2.1
================================

로컬 디바이스에서 실행되는 물리 엔진

- Raw Data 처리 (사용자 디바이스에서만)
- 6가지 물리 법칙 적용
- Top-1 출력
- 익명화된 Upstream 생성

핵심 원칙: 데이터는 로컬에 가둔다
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
import hashlib
import uuid

# 기존 engine_v2에서 재사용
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from engine_v2 import (
    Node, Edge, PressureCard,
    EdgeType, State, Direction, Layer,
    PhysicsConstants, Thresholds,
    create_all_nodes, create_all_edges
)

from .protocol import (
    UpstreamPacket, DownstreamPacket, Cohort,
    CalibrationWeights, NodeStat, EdgeCorrelation
)


class LocalPhysicsEngine:
    """
    로컬 물리 엔진
    
    - Raw Data 처리 (사용자 디바이스에서만)
    - 6가지 물리 법칙 적용
    - Top-1 출력
    - 3-Tier Calibration 적용
    """
    
    VERSION = "2.1.0"
    
    def __init__(
        self,
        device_id: Optional[str] = None,
        cohort: Cohort = Cohort.ENTREPRENEUR_EARLY
    ):
        self.device_id = device_id or self._generate_anonymous_id()
        self.cohort = cohort
        
        # 노드 & 엣지 초기화
        self.nodes: Dict[str, Node] = create_all_nodes()
        self.edges: List[Edge] = create_all_edges()
        self._build_edge_index()
        
        # 3-Tier Calibration 가중치
        self.calibration_weights = CalibrationWeights()
        
        # Personal Override (로컬 학습)
        self.personal_overrides: Dict[str, float] = {}
        
        # 회로 활성화 카운터
        self.circuit_activations = {
            "survival": 0,
            "fatigue": 0,
            "repeat_capital": 0,
            "people": 0,
            "growth": 0
        }
        
        # 압력 히스토리 (24시간)
        self.pressure_history: Dict[str, List[float]] = {
            nid: [] for nid in self.nodes
        }
    
    def _generate_anonymous_id(self) -> str:
        """익명화된 디바이스 ID 생성 (절대 복원 불가)"""
        raw = str(uuid.uuid4()) + str(datetime.now().timestamp())
        return hashlib.sha256(raw.encode()).hexdigest()[:16]
    
    def _build_edge_index(self):
        """엣지 인덱스 구축 (빠른 조회)"""
        self.edges_by_target: Dict[str, List[Edge]] = {}
        self.edges_by_source: Dict[str, List[Edge]] = {}
        
        for edge in self.edges:
            self.edges_by_target.setdefault(edge.target, []).append(edge)
            self.edges_by_source.setdefault(edge.source, []).append(edge)
    
    # ========================================
    # 데이터 입력 (로컬에서만)
    # ========================================
    
    def update_node_value(
        self,
        node_id: str,
        value: float,
        days_since_action: int = 0
    ):
        """노드 값 업데이트 (Raw Data - 로컬에서만)"""
        if node_id in self.nodes:
            node = self.nodes[node_id]
            node.value = value
            node.days_since_action = days_since_action
            node.last_updated = datetime.now()
    
    def update_all_values(self, values: Dict[str, float]):
        """전체 노드 값 업데이트"""
        for node_id, value in values.items():
            self.update_node_value(node_id, value)
    
    # ========================================
    # 물리 법칙 적용
    # ========================================
    
    def _calculate_pressure(self, node: Node) -> float:
        """값을 압력으로 변환 (0.0 ~ 1.0)"""
        if node.value is None:
            return 0.0
        
        v = node.value
        th = node.thresholds
        
        if node.direction == Direction.HIGHER_BETTER:
            if v >= th.ignorable:
                return 0.0
            elif v <= th.irreversible:
                return 1.0
            elif v >= th.pressuring:
                return 0.3 * (th.ignorable - v) / (th.ignorable - th.pressuring)
            else:
                return 0.3 + 0.7 * (th.pressuring - v) / (th.pressuring - th.irreversible)
        
        elif node.direction == Direction.LOWER_BETTER:
            if v <= th.ignorable:
                return 0.0
            elif v >= th.irreversible:
                return 1.0
            elif v <= th.pressuring:
                return 0.3 * (v - th.ignorable) / (th.pressuring - th.ignorable)
            else:
                return 0.3 + 0.7 * (v - th.pressuring) / (th.irreversible - th.pressuring)
        
        else:  # TARGET_RANGE, CONTEXT
            if v >= th.ignorable:
                return 0.0
            elif v <= th.irreversible:
                return 1.0
            elif v >= th.pressuring:
                return 0.3 * (th.ignorable - v) / (th.ignorable - th.pressuring)
            else:
                return 0.3 + 0.7 * (th.pressuring - v) / (th.pressuring - th.irreversible)
    
    def _diffuse_pressure(self) -> Dict[str, float]:
        """라플라시안 압력 전파"""
        delta = {nid: 0.0 for nid in self.nodes}
        
        for edge in self.edges:
            src = self.nodes[edge.source]
            tgt = self.nodes[edge.target]
            
            k = src.physics.conductivity
            w = edge.weight
            P_s, P_t = src.pressure, tgt.pressure
            
            if edge.edge_type == EdgeType.DEPENDENCY:
                flow = k * w * (P_s - P_t)
                if flow > 0:
                    delta[edge.target] += flow
            
            elif edge.edge_type == EdgeType.BUFFER:
                buffer = max(0, 1 - P_s)
                absorption = k * w * min(P_t, buffer) * 0.5
                delta[edge.target] -= absorption
            
            elif edge.edge_type == EdgeType.SUBSTITUTION:
                if P_s < 0.3:
                    relief = k * w * P_t * 0.3
                    delta[edge.target] -= relief
            
            elif edge.edge_type == EdgeType.AMPLIFY:
                if P_s > 0.3 and P_t > 0.3:
                    amp = k * w * P_s * P_t
                    delta[edge.target] += amp
                    delta[edge.source] += amp * 0.5
        
        return delta
    
    def _apply_inertia(self, delta: Dict[str, float]) -> Dict[str, float]:
        """관성 적용 (질량이 크면 변화 저항)"""
        return {
            nid: d / self.nodes[nid].physics.mass
            for nid, d in delta.items()
        }
    
    def _apply_entropy(self):
        """엔트로피 적용 (방치에 의한 자연 악화)"""
        for node in self.nodes.values():
            if node.physics.entropy > 0 and node.days_since_action > 0:
                node.pressure = min(
                    1.0,
                    node.pressure + node.physics.entropy * node.days_since_action
                )
    
    def _classify_state(self, node: Node) -> State:
        """상태 분류"""
        if node.pressure < 0.3:
            return State.IGNORABLE
        elif node.pressure < 0.7:
            return State.PRESSURING
        else:
            node.phase_transitioned = True
            return State.IRREVERSIBLE
    
    def _update_circuit_activations(self):
        """회로 활성화 카운트"""
        circuits = {
            "survival": ["n03", "n01", "n05"],
            "fatigue": ["n18", "n09", "n10", "n16"],
            "repeat_capital": ["n26", "n02", "n01"],
            "people": ["n31", "n17", "n20"],
            "growth": ["n29", "n23", "n02"]
        }
        
        for name, node_ids in circuits.items():
            avg_pressure = sum(
                self.nodes[nid].pressure for nid in node_ids
            ) / len(node_ids)
            if avg_pressure > 0.4:
                self.circuit_activations[name] += 1
    
    def _update_pressure_history(self):
        """압력 히스토리 업데이트"""
        for nid, node in self.nodes.items():
            self.pressure_history[nid].append(node.pressure)
            if len(self.pressure_history[nid]) > 24:
                self.pressure_history[nid].pop(0)
    
    # ========================================
    # 메인 계산 사이클
    # ========================================
    
    def compute_cycle(self):
        """전체 물리 계산 사이클"""
        # 1. 값 → 압력 변환
        for node in self.nodes.values():
            node.pressure = self._calculate_pressure(node)
        
        # 2. 엔트로피 적용
        self._apply_entropy()
        
        # 3. 라플라시안 전파
        delta = self._diffuse_pressure()
        
        # 4. 관성 적용
        effective_delta = self._apply_inertia(delta)
        
        # 5. 압력 업데이트
        for nid, d in effective_delta.items():
            self.nodes[nid].pressure = max(0.0, min(1.0, self.nodes[nid].pressure + d))
        
        # 6. 상태 분류
        for node in self.nodes.values():
            node.state = self._classify_state(node)
        
        # 7. 회로 활성화 업데이트
        self._update_circuit_activations()
        
        # 8. 히스토리 업데이트
        self._update_pressure_history()
    
    # ========================================
    # Top-1 출력
    # ========================================
    
    def select_top1(self) -> Optional[Node]:
        """최고 압력 노드 선택"""
        candidates = [
            n for n in self.nodes.values()
            if n.state != State.IGNORABLE
        ]
        
        if not candidates:
            return None
        
        candidates.sort(key=lambda n: (
            -n.state.value,
            -n.pressure,
            -n.physics.entropy
        ))
        
        return candidates[0]
    
    def generate_output(self) -> Optional[PressureCard]:
        """출력 카드 생성 (Top-1)"""
        top1 = self.select_top1()
        
        if not top1:
            return None
        
        try:
            msg = top1.message_template.format(value=top1.value or 0)
        except Exception:
            msg = f"{top1.name}: N/A"
        
        return PressureCard(
            node_id=top1.id,
            node_name=top1.name,
            state=top1.state,
            value=str(top1.value) if top1.value else "N/A",
            message=msg,
            timestamp=datetime.now()
        )
    
    # ========================================
    # 유틸리티
    # ========================================
    
    def calculate_equilibrium(self) -> float:
        """시스템 평형점"""
        return sum(n.pressure for n in self.nodes.values()) / len(self.nodes)
    
    def system_stability(self) -> float:
        """시스템 안정성 (0=불안정, 1=안정)"""
        eq = self.calculate_equilibrium()
        var = sum(
            (n.pressure - eq) ** 2
            for n in self.nodes.values()
        ) / len(self.nodes)
        return 1 / (1 + var * 10)
    
    def get_critical_nodes(self, limit: int = 10) -> List[Node]:
        """위험 노드 목록"""
        critical = [
            n for n in self.nodes.values()
            if n.state != State.IGNORABLE
        ]
        critical.sort(key=lambda n: -n.pressure)
        return critical[:limit]
    
    # ========================================
    # Protocol: Upstream 생성
    # ========================================
    
    def generate_upstream_packet(self) -> UpstreamPacket:
        """
        클라우드로 보낼 익명화된 패킷 생성
        
        절대 포함되지 않는 것:
        - 실제 현금 금액
        - 실제 수면 시간
        - 개인 식별 정보
        - Raw 데이터 어떤 것도
        """
        node_stats = []
        for nid, node in self.nodes.items():
            history = self.pressure_history.get(nid, [node.pressure])
            if not history:
                history = [node.pressure]
            
            node_stats.append({
                "node_id": nid,
                "avg_pressure_24h": sum(history) / len(history),
                "max_pressure_24h": max(history),
                "min_pressure_24h": min(history),
                "phase_shift_count": 1 if node.phase_transitioned else 0,
                "current_state": node.state.name,
                "days_since_action": node.days_since_action
            })
        
        edge_correlations = []
        for edge in self.edges:
            src = self.nodes[edge.source]
            tgt = self.nodes[edge.target]
            
            # 관측된 상관관계 강도 계산
            if src.pressure > 0 and tgt.pressure > 0:
                observed = min(1.0, abs(src.pressure - tgt.pressure) / max(src.pressure, tgt.pressure))
                edge_correlations.append({
                    "edge_id": edge.id,
                    "source": edge.source,
                    "target": edge.target,
                    "observed_strength": observed,
                    "propagation_delay_hours": 0.0
                })
        
        return UpstreamPacket(
            device_id=self.device_id,
            timestamp=datetime.now().isoformat(),
            cohort=self.cohort.value,
            node_stats=node_stats,
            edge_correlations=edge_correlations,
            circuit_activations=self.circuit_activations.copy(),
            system_stability=self.system_stability()
        )
    
    # ========================================
    # Protocol: Downstream 적용
    # ========================================
    
    def apply_downstream_packet(self, packet: DownstreamPacket):
        """
        클라우드에서 받은 패킷 적용 (3-Tier Calibration)
        
        W_effective = α × W_global + β × W_cohort + γ × W_personal
        """
        g_consts = packet.global_constants
        c_consts = packet.cohort_constants
        ext_entropy = packet.external_entropy
        early_warn = packet.early_warning
        
        # 1. 물리 상수 3-Tier 보정
        self._apply_calibrated_physics(g_consts, c_consts)
        
        # 2. 외부 엔트로피 반영
        self._apply_external_entropy(ext_entropy)
        
        # 3. 조기 경보 패턴 적용
        self._apply_early_warning(early_warn)
    
    def _apply_calibrated_physics(self, global_c: dict, cohort_c: dict):
        """3-Tier 물리 상수 보정"""
        cw = self.calibration_weights
        
        for node_id, node in self.nodes.items():
            # Global 값
            g_physics = global_c.get("physics", {}).get(node_id, {})
            g_k = g_physics.get("k", node.physics.conductivity)
            g_e = g_physics.get("entropy", node.physics.entropy)
            
            # Cohort 값
            c_physics = cohort_c.get("physics", {}).get(node_id, {})
            c_k = c_physics.get("k", g_k)
            c_e = c_physics.get("entropy", g_e)
            
            # Personal 값 (로컬 학습)
            p_k = self.personal_overrides.get(f"{node_id}_k", c_k)
            p_e = self.personal_overrides.get(f"{node_id}_e", c_e)
            
            # 3-Tier 가중 평균
            node.physics.conductivity = cw.calibrate(g_k, c_k, p_k)
            node.physics.entropy = cw.calibrate(g_e, c_e, p_e)
        
        # 엣지 가중치도 동일하게
        for edge in self.edges:
            g_w = global_c.get("edges", {}).get(edge.id, {}).get("weight", edge.weight)
            c_w = cohort_c.get("edges", {}).get(edge.id, {}).get("weight", g_w)
            p_w = self.personal_overrides.get(f"{edge.id}_w", c_w)
            
            edge.weight = cw.calibrate(g_w, c_w, p_w)
    
    def _apply_external_entropy(self, external: dict):
        """외부 환경 엔트로피 반영"""
        for node_id, delta in external.items():
            if node_id in self.nodes:
                self.nodes[node_id].physics.entropy += delta
    
    def _apply_early_warning(self, warning: dict):
        """조기 경보 패턴 적용"""
        patterns = warning.get("patterns", [])
        for pattern in patterns:
            trigger = pattern.get("trigger", "")
            if self._evaluate_trigger(trigger):
                edge_id = pattern.get("boost_edge")
                factor = pattern.get("boost_factor", 1.0)
                for edge in self.edges:
                    if edge.id == edge_id:
                        edge.weight *= factor
                        break
    
    def _evaluate_trigger(self, trigger: str) -> bool:
        """트리거 조건 평가"""
        if not trigger:
            return False
        
        try:
            expr = trigger
            for nid, node in self.nodes.items():
                if node.value is not None:
                    expr = expr.replace(nid, str(node.value))
            expr = expr.replace("AND", "and").replace("OR", "or")
            return eval(expr)
        except Exception:
            return False
    
    def learn_personal_override(
        self,
        key: str,
        observed: float,
        learning_rate: float = 0.1
    ):
        """
        개인 특성 학습 (지수 이동 평균)
        
        "잠을 적게 자도 HRV가 높은 특이 체질" 같은 경우 반영
        """
        current = self.personal_overrides.get(key, observed)
        self.personal_overrides[key] = (
            (1 - learning_rate) * current +
            learning_rate * observed
        )
    
    # ========================================
    # 상태 조회
    # ========================================
    
    def to_dict(self) -> dict:
        """전체 상태를 딕셔너리로 변환"""
        return {
            "version": self.VERSION,
            "device_id": self.device_id,
            "cohort": self.cohort.value,
            "equilibrium": self.calculate_equilibrium(),
            "stability": self.system_stability(),
            "total_nodes": len(self.nodes),
            "critical_count": len(self.get_critical_nodes()),
            "circuit_activations": self.circuit_activations,
            "calibration_weights": self.calibration_weights.to_dict()
        }
