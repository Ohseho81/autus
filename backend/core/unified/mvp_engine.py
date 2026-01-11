"""
═══════════════════════════════════════════════════════════════════════════════
🎯 AUTUS v3.0 MVP - 통합 엔진
═══════════════════════════════════════════════════════════════════════════════

"무슨 존재가 될지는 당신이 정한다.
 그 존재를 유지하는 일은 우리가 한다."

Final Outcome: 개인·기업의 "존재 유지 엔진"
Process: 비전 → 구조 → 구현 → 운영 → 진화
Logic: 라플라스 결정론 + 물리 법칙 (같은 입력 = 같은 출력)
Refinement: 통계적 미세 조정 (피드백 → 임계값 ±5% 보정)
Data: API + 센서 자동 수집

핵심 구성:
- 10 MVP Nodes (36개 중 선별)
- 6 Physics Laws
- 4 Edge Types (Laplacian Propagation)
- ERT Framework (Eliminate 30% + Replace 40% + Transform 20%)
- Ghost Protocol (Zero-Drafting, Invisible Network, Self-Healing)
"""

from dataclasses import dataclass, field
from typing import Dict, List, Literal, Optional
from datetime import datetime
import math

from .physics_laws import (
    ForceVector, UserState, PhaseState,
    apply_inertia, natural_entropy_increase, analyze_phase,
    calculate_diffusion, apply_all_physics_laws
)
from .aggressive_mode import (
    Work, ERTResult, AggressiveConfig, AGGRESSIVE_PRESETS,
    batch_classify_ert, generate_aggressive_output, generate_ghost_report
)
from .ghost_protocol import (
    GhostAgent, PersonaWeights, AgentPermissions,
    WorkItem, run_ghost_protocol, generate_ghost_output
)


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 상수 및 열거형
# ═══════════════════════════════════════════════════════════════════════════════

NodeState = Literal['STABLE', 'MONITORING', 'PRESSURING', 'IRREVERSIBLE', 'CRITICAL']
NodeLayer = Literal['FINANCIAL', 'BIOMETRIC', 'OPERATIONAL', 'CUSTOMER', 'EXTERNAL']
EdgeType = Literal['DEPENDENCY', 'BUFFER', 'SUBSTITUTION', 'AMPLIFY']


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 노드 정의
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class Node:
    """36노드 중 하나"""
    id: str
    name: str
    name_ko: str
    layer: NodeLayer
    
    pressure: float = 0.2
    entropy_rate: float = 0.01
    mass: float = 1.0
    
    theta_low: float = 0.3
    theta_high: float = 0.78
    
    outcomes: List[dict] = field(default_factory=list)
    
    @property
    def state(self) -> NodeState:
        if self.pressure >= 0.9:
            return 'CRITICAL'
        elif self.pressure >= self.theta_high:
            return 'IRREVERSIBLE'
        elif self.pressure >= 0.5:
            return 'PRESSURING'
        elif self.pressure >= self.theta_low:
            return 'MONITORING'
        return 'STABLE'


@dataclass
class Edge:
    """노드 간 연결"""
    from_id: str
    to_id: str
    edge_type: EdgeType
    weight: float = 0.5
    conductivity: float = 0.5


@dataclass
class Alert:
    """Top-1 경고"""
    node_id: str
    node_name: str
    pressure: float
    state: NodeState
    horizon: str
    cost_type: str
    message: str


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 MVP 10개 핵심 노드 정의
# ═══════════════════════════════════════════════════════════════════════════════

def create_mvp_nodes() -> Dict[str, Node]:
    """MVP 10개 노드 생성"""
    return {
        # FINANCIAL (3)
        'n01': Node('n01', 'Cash', '현금', 'FINANCIAL', entropy_rate=0.01, mass=1.5),
        'n03': Node('n03', 'Runway', '런웨이', 'FINANCIAL', entropy_rate=0.015, mass=2.0),
        'n05': Node('n05', 'Debt', '부채', 'FINANCIAL', entropy_rate=0.012, mass=2.5),
        
        # BIOMETRIC (3)
        'n09': Node('n09', 'Sleep', '수면', 'BIOMETRIC', entropy_rate=0.02, mass=1.0),
        'n10': Node('n10', 'HRV', 'HRV', 'BIOMETRIC', entropy_rate=0.015, mass=1.2),
        'n15': Node('n15', 'Stress', '스트레스', 'BIOMETRIC', entropy_rate=0.02, mass=1.3),
        
        # OPERATIONAL (2)
        'n16': Node('n16', 'Deadline', '마감', 'OPERATIONAL', entropy_rate=0.01, mass=1.2),
        'n20': Node('n20', 'ErrorRate', '오류율', 'OPERATIONAL', entropy_rate=0.008, mass=1.3),
        
        # CUSTOMER (1)
        'n25': Node('n25', 'Churn', '이탈률', 'CUSTOMER', entropy_rate=0.01, mass=1.3),
        
        # EXTERNAL (1)
        'n36': Node('n36', 'TippingPoint', '티핑포인트', 'EXTERNAL', entropy_rate=0.008, mass=3.0),
    }


def create_mvp_edges() -> List[Edge]:
    """MVP 엣지 생성"""
    return [
        # 재무 내부
        Edge('n01', 'n03', 'DEPENDENCY', 0.9, 0.95),   # 현금 → 런웨이
        Edge('n05', 'n03', 'DEPENDENCY', 0.8, 0.85),   # 부채 → 런웨이
        
        # 재무 ↔ 신체
        Edge('n03', 'n15', 'AMPLIFY', 0.75, 0.8),      # 런웨이 → 스트레스
        Edge('n09', 'n15', 'BUFFER', 0.6, 0.5),        # 수면 → 스트레스 완충
        Edge('n15', 'n10', 'AMPLIFY', 0.8, 0.85),      # 스트레스 → HRV
        
        # 신체 ↔ 업무
        Edge('n15', 'n20', 'AMPLIFY', 0.65, 0.7),      # 스트레스 → 오류율
        Edge('n10', 'n16', 'DEPENDENCY', 0.55, 0.6),   # HRV → 마감
        
        # 업무 → 고객
        Edge('n20', 'n25', 'DEPENDENCY', 0.7, 0.75),   # 오류율 → 이탈률
        
        # 외부 → 전체
        Edge('n36', 'n03', 'AMPLIFY', 0.85, 0.9),      # 티핑포인트 → 런웨이
    ]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 압력 전파 엔진
# ═══════════════════════════════════════════════════════════════════════════════

class PressureEngine:
    """압력 전파 엔진 (Laplacian Propagation)"""
    
    def __init__(self, nodes: Dict[str, Node], edges: List[Edge]):
        self.nodes = nodes
        self.edges = edges
        self.history: List[Dict[str, float]] = []
    
    def propagate(self, delta_time: float = 1) -> Dict[str, float]:
        """1 사이클 압력 전파"""
        deltas: Dict[str, float] = {nid: 0 for nid in self.nodes}
        
        # 엣지별 압력 전파
        for edge in self.edges:
            if edge.from_id not in self.nodes or edge.to_id not in self.nodes:
                continue
            
            from_p = self.nodes[edge.from_id].pressure
            to_p = self.nodes[edge.to_id].pressure
            
            delta = self._calculate_delta(from_p, to_p, edge)
            deltas[edge.to_id] += delta
        
        # 엔트로피 자연 증가
        for nid, node in self.nodes.items():
            deltas[nid] += node.entropy_rate * delta_time
        
        # 새 압력 적용
        for nid, node in self.nodes.items():
            new_p = max(0, min(1, node.pressure + deltas[nid]))
            node.pressure = new_p
        
        # 히스토리 저장
        self.history.append({nid: n.pressure for nid, n in self.nodes.items()})
        
        return deltas
    
    def _calculate_delta(self, from_p: float, to_p: float, edge: Edge) -> float:
        """엣지 타입별 압력 델타 계산"""
        w = edge.weight
        k = edge.conductivity
        
        if edge.edge_type == 'DEPENDENCY':
            return w * k * (from_p - to_p)
        elif edge.edge_type == 'BUFFER':
            return -min(to_p, 0.3) * w * k
        elif edge.edge_type == 'SUBSTITUTION':
            ratio = max(0, 1 - from_p)
            return -ratio * to_p * w * 0.5
        elif edge.edge_type == 'AMPLIFY':
            return w * k * from_p * to_p
        return 0
    
    def get_top_one_alert(self) -> Optional[Alert]:
        """Top-1 경고 (나머지 침묵)"""
        if not self.nodes:
            return None
        
        sorted_nodes = sorted(
            self.nodes.values(),
            key=lambda n: n.pressure,
            reverse=True
        )
        top = sorted_nodes[0]
        
        if top.pressure < 0.5:
            return None
        
        horizon = '즉시' if top.pressure >= 0.9 else '24시간 내' if top.pressure >= 0.78 else '1주일 내'
        
        cost_type_map = {
            'FINANCIAL': '재무',
            'BIOMETRIC': '건강',
            'OPERATIONAL': '업무',
            'CUSTOMER': '관계',
            'EXTERNAL': '환경',
        }
        cost_type = cost_type_map.get(top.layer, '기타')
        
        return Alert(
            node_id=top.id,
            node_name=top.name_ko,
            pressure=top.pressure,
            state=top.state,
            horizon=horizon,
            cost_type=cost_type,
            message=f'⚠️ {top.name_ko} 압력 {top.pressure*100:.0f}% - {top.state}'
        )


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 피드백 루프 (임계값 정교화)
# ═══════════════════════════════════════════════════════════════════════════════

def refine_threshold(node: Node, min_samples: int = 3) -> bool:
    """
    피드백 루프: 사용자 행동 로그 → 임계값 ±5% 보정
    
    outcomes 예시:
    {"predicted": "danger", "actual": "safe"}  → False Positive
    {"predicted": "safe", "actual": "damage"} → False Negative
    """
    outcomes = node.outcomes
    if len(outcomes) < min_samples:
        return False
    
    fn = sum(1 for o in outcomes if o.get('predicted') == 'safe' and o.get('actual') == 'damage')
    fp = sum(1 for o in outcomes if o.get('predicted') == 'danger' and o.get('actual') == 'safe')
    
    if fn > fp:
        node.theta_high = max(0.5, node.theta_high - 0.05)
        return True
    elif fp > fn:
        node.theta_high = min(0.95, node.theta_high + 0.05)
        return True
    
    return False


def log_outcome(node: Node, predicted: str, actual: str):
    """결과 로깅"""
    node.outcomes.append({
        'predicted': predicted,
        'actual': actual,
        'timestamp': datetime.now().isoformat(),
    })
    if len(node.outcomes) > 20:
        node.outcomes = node.outcomes[-20:]


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 AUTUS 통합 시스템
# ═══════════════════════════════════════════════════════════════════════════════

class AUTUS:
    """
    AUTUS v3.0 MVP - 통합 시스템
    
    "무슨 존재가 될지는 당신이 정한다.
     그 존재를 유지하는 일은 우리가 한다."
    """
    
    VERSION = '3.0-MVP'
    
    def __init__(self, aggressive: bool = True):
        self.nodes = create_mvp_nodes()
        self.edges = create_mvp_edges()
        
        self.pressure_engine = PressureEngine(self.nodes, self.edges)
        self.aggressive_config = AGGRESSIVE_PRESETS['AGGRESSIVE'] if aggressive else AGGRESSIVE_PRESETS['CONSERVATIVE']
        
        self.cycle_count = 0
        self.works: List[Work] = []
        
        # Ghost Agents
        self.agents: List[GhostAgent] = [
            GhostAgent(
                id='agent_1',
                name='PersonaProxy-AGI',
                agent_type='PERSONA_PROXY',
                persona_weights=PersonaWeights(0.5, 0.6, 0.7, 0.8),
                permissions=AgentPermissions(True, 1_000_000, True, True),
            ),
        ]
    
    def update_pressure(self, node_id: str, pressure: float):
        """노드 압력 업데이트"""
        if node_id in self.nodes:
            self.nodes[node_id].pressure = max(0, min(1, pressure))
    
    def add_work(
        self,
        title: str,
        entity: str,
        relation: str,
        time_type: str,
        pressure: float = 0.5,
        mass: float = 1.0,
        entropy: float = 0.3,
        weight: float = 0.5
    ) -> Work:
        """업무 추가"""
        work = Work(
            id=f'w{len(self.works)+1}',
            title=title,
            entity=entity,
            relation=relation,
            time_type=time_type,
            pressure=pressure,
            mass=mass,
            entropy=entropy,
            weight=weight,
        )
        self.works.append(work)
        return work
    
    def run_cycle(self) -> dict:
        """1 사이클 실행"""
        # 1. 압력 전파
        deltas = self.pressure_engine.propagate()
        
        # 2. ERT 처리
        pending_works = [w for w in self.works if w.status == 'pending']
        ert_result = None
        if pending_works:
            ert_result = batch_classify_ert(pending_works, self.aggressive_config)
            for result in ert_result.results:
                for work in self.works:
                    if work.id == result.work_id:
                        work.status = 'executed' if result.status == 'EXECUTING' else 'proposed'
        
        # 3. Top-1 경고
        alert = self.pressure_engine.get_top_one_alert()
        
        self.cycle_count += 1
        
        return {
            'cycle': self.cycle_count,
            'deltas': deltas,
            'ert_result': ert_result,
            'alert': alert,
        }
    
    def run_ghost_protocol(
        self,
        incoming_requests: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """Ghost Protocol 실행"""
        work_items = [
            WorkItem(w.id, w.title, w.pressure, w.entropy)
            for w in self.works
        ]
        
        result = run_ghost_protocol(work_items, self.agents, incoming_requests)
        return generate_ghost_output(result)
    
    def get_status(self) -> str:
        """시스템 상태 출력"""
        alert = self.pressure_engine.get_top_one_alert()
        
        # 계층별 평균
        layer_pressures: Dict[str, float] = {}
        for layer in ['FINANCIAL', 'BIOMETRIC', 'OPERATIONAL', 'CUSTOMER', 'EXTERNAL']:
            layer_nodes = [n for n in self.nodes.values() if n.layer == layer]
            if layer_nodes:
                avg = sum(n.pressure for n in layer_nodes) / len(layer_nodes)
                layer_pressures[layer] = avg
        
        # 상태 카운트
        stable = sum(1 for n in self.nodes.values() if n.state in ['STABLE', 'MONITORING'])
        warning = sum(1 for n in self.nodes.values() if n.state == 'PRESSURING')
        danger = sum(1 for n in self.nodes.values() if n.state in ['IRREVERSIBLE', 'CRITICAL'])
        
        if danger > 0:
            health = '🔴 CRITICAL'
        elif warning > 0:
            health = '🟠 WARNING'
        else:
            health = '🟢 HEALTHY'
        
        def bar(v: float) -> str:
            w = 20
            f = int(v * w)
            if v >= 0.78:
                c = '█'
            elif v >= 0.5:
                c = '▓'
            elif v >= 0.3:
                c = '▒'
            else:
                c = '░'
            return c * f + '░' * (w - f)
        
        output = f"""
╔═══════════════════════════════════════════════════════════════════════════════╗
║ 🎯 AUTUS v{self.VERSION} - 자율 존재 유지 시스템                               ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║ 시스템: {health:<20}  사이클: {self.cycle_count:>5}                            ║
║                                                                               ║
║ 10노드: 안정 {stable:>2}개 | 경고 {warning:>2}개 | 위험 {danger:>2}개                               ║
╠───────────────────────────────────────────────────────────────────────────────╣
║ 계층별 압력                                                                   ║"""
        
        for layer, avg in layer_pressures.items():
            output += f"\n║   {layer:<12} [{bar(avg)}] {avg*100:>3.0f}%                      ║"
        
        if alert:
            output += f"""
╠═══════════════════════════════════════════════════════════════════════════════╣
║ ⚠️  TOP-1 경고                                                                ║
║                                                                               ║
║   노드: {alert.node_name:<15} ({alert.node_id})                                         ║
║   압력: {alert.pressure*100:.1f}%  |  상태: {alert.state:<12}  |  Horizon: {alert.horizon:<8}  ║
║   비용: {alert.cost_type}                                                              ║
║                                                                               ║
║   "{alert.message}"                                                           """
        
        output += """
╠═══════════════════════════════════════════════════════════════════════════════╣
║ "무슨 존재가 될지는 당신이 정한다. 그 존재를 유지하는 일은 우리가 한다."        ║
╚═══════════════════════════════════════════════════════════════════════════════╝"""
        
        return output
    
    def generate_full_report(self) -> str:
        """전체 리포트 생성"""
        status = self.get_status()
        
        # ERT 결과
        ert_output = ''
        pending_works = [w for w in self.works if w.status == 'pending']
        if pending_works:
            ert_result = batch_classify_ert(pending_works, self.aggressive_config)
            ert_output = generate_aggressive_output(ert_result)
        
        # Ghost Report
        ghost_output = self.run_ghost_protocol()
        
        return f"{status}\n{ert_output}\n{ghost_output}"


# ═══════════════════════════════════════════════════════════════════════════════
# 📌 데모 실행
# ═══════════════════════════════════════════════════════════════════════════════

def run_demo():
    """AUTUS v3.0 데모"""
    print('=' * 80)
    print('🎯 AUTUS v3.0 MVP Demo')
    print('=' * 80)
    
    # 1. AUTUS 초기화
    autus = AUTUS(aggressive=True)
    
    # 2. 위기 상황 시뮬레이션
    autus.update_pressure('n01', 0.85)  # 현금 위기
    autus.update_pressure('n03', 0.75)  # 런웨이 압박
    autus.update_pressure('n15', 0.55)  # 스트레스 상승
    
    print('\n[초기 상태]')
    print(autus.get_status())
    
    # 3. 업무 추가
    autus.add_work('일일 잔고 확인', 'CASH', 'OWN', 'FREQUENCY', weight=0.1, pressure=0.05)
    autus.add_work('의례적 회의', 'PEOPLE', 'INFLUENCE', 'FREQUENCY', weight=0.15, pressure=0.08)
    autus.add_work('청구서 처리', 'CASH', 'EXCHANGE', 'SEQUENCE', entropy=0.6)
    autus.add_work('투자자 미팅', 'PEOPLE', 'INFLUENCE', 'POINT', pressure=0.8, weight=0.9)
    autus.add_work('팀 프로젝트', 'PEOPLE', 'COOPERATE', 'DURATION', mass=2.5)
    
    # 4. 3 사이클 실행
    print('\n[3 사이클 실행]')
    for _ in range(3):
        result = autus.run_cycle()
        if result.get('ert_result'):
            print(f"사이클 {result['cycle']}: ERT 처리 {len(result['ert_result'].results)}건")
    
    # 5. 최종 상태
    print('\n[최종 상태]')
    print(autus.get_status())
    
    # 6. Aggressive Mode
    print('\n[Aggressive Mode]')
    autus.works = [
        Work('w1', '일일 잔고 확인', 'CASH', 'OWN', 'FREQUENCY', 0.05, 0.3, 0.1, 0.1),
        Work('w2', '의례적 회의', 'PEOPLE', 'INFLUENCE', 'FREQUENCY', 0.08, 0.5, 0.2, 0.15),
        Work('w3', '청구서 처리', 'CASH', 'EXCHANGE', 'SEQUENCE', 0.4, 0.4, 0.6, 0.6),
        Work('w4', '투자자 미팅', 'PEOPLE', 'INFLUENCE', 'POINT', 0.8, 0.5, 0.2, 0.9),
        Work('w5', '팀 프로젝트', 'PEOPLE', 'COOPERATE', 'DURATION', 0.6, 2.5, 0.4, 0.8),
    ]
    ert_result = batch_classify_ert(autus.works, autus.aggressive_config)
    print(generate_aggressive_output(ert_result))
    
    # 7. Ghost Protocol
    print('\n[Ghost Protocol]')
    print(autus.run_ghost_protocol())
    
    print('\n' + '=' * 80)
    print('✅ Demo 완료')
    print('=' * 80)


if __name__ == '__main__':
    run_demo()
