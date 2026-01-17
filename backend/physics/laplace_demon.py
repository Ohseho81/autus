"""
═══════════════════════════════════════════════════════════════════════════════
😈 AUTUS Laplace's Demon v2.0 — 결정론적 미래 예측
═══════════════════════════════════════════════════════════════════════════════

"우주의 모든 원자의 위치와 속도를 안다면, 미래를 완벽히 예측할 수 있다"
- Pierre-Simon Laplace

AUTUS 적용:
- 모든 초기 조건 (타입, 상수, 지수, 네트워크)을 반영
- 결정론적 미래 V 계산
- 불확정성 구간으로 양자역학 존중 (±10~20%)

═══════════════════════════════════════════════════════════════════════════════
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
import math
import random
from datetime import datetime


# ═══════════════════════════════════════════════════════════════════════════════
# 의존성 체크
# ═══════════════════════════════════════════════════════════════════════════════

NUMPY_AVAILABLE = False
NETWORKX_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    pass

try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    pass


# ═══════════════════════════════════════════════════════════════════════════════
# 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

class UserType(Enum):
    """사용자 성향 타입"""
    AMBITIOUS = "ambitious"          # 야심형: 높은 위험, 높은 보상 ×1.2
    CAUTIOUS = "cautious"            # 신중형: 낮은 위험, 안정적 ×0.8
    COLLABORATIVE = "collaborative"  # 협업형: 시너지 극대화 ×1.5
    BALANCED = "balanced"            # 균형형: 중간 ×1.0
    CONSERVATIVE = "conservative"    # 보수형: 최저 위험 ×0.6


TYPE_MULTIPLIERS: Dict[UserType, float] = {
    UserType.AMBITIOUS: 1.2,
    UserType.CAUTIOUS: 0.8,
    UserType.COLLABORATIVE: 1.5,
    UserType.BALANCED: 1.0,
    UserType.CONSERVATIVE: 0.6,
}


@dataclass
class Constants:
    """상수 (변하지 않는 초기 조건)"""
    age: int = 30
    location_factor: float = 0.8    # 지역 경제 계수 (0.5~1.5)
    
    def calculate_adjustment(self) -> float:
        """상수 조정 계산: 나이 들수록 위험 감수 감소"""
        return (1 - (self.age / 100)) * self.location_factor


@dataclass
class ExponentialGrowth:
    """지수 성장 요소"""
    growth_rate: float = 0.05       # 기본 성장률 5%
    network_effect: float = 0.0     # 네트워크 효과 (동적 계산)
    
    def apply_to_synergy(self, base_s: float) -> float:
        """Synergy에 지수 성장 적용"""
        return base_s + (self.growth_rate * base_s) + self.network_effect


@dataclass
class Network1_12_144:
    """1-12-144 네트워크 구조"""
    owner: int = 1                  # K1 (자신)
    core_12: int = 0                # 핵심 12명 연결 수 (0~12)
    extended_144: int = 0           # 확장 144명 연결 수 (0~144)
    
    # NetworkX 그래프 (선택적)
    _graph: Any = None
    
    def build_graph(self) -> Any:
        """1-12-144 네트워크 그래프 생성"""
        if not NETWORKX_AVAILABLE:
            return None
        
        G = nx.Graph()
        G.add_node(0)  # 자신 (K1 Owner)
        
        # 핵심 12명 연결
        for i in range(1, self.core_12 + 1):
            G.add_edge(0, i)
        
        # 확장 144명 (핵심 12명 중 랜덤 연결)
        if self.core_12 > 0:
            for i in range(self.core_12 + 1, self.core_12 + self.extended_144 + 1):
                # 랜덤으로 핵심 멤버에 연결
                random_core = random.randint(1, max(1, self.core_12))
                G.add_edge(random_core, i)
        
        self._graph = G
        return G
    
    def calculate_synergy(self) -> float:
        """
        네트워크 밀도 기반 Synergy 계산
        
        실제 AUTUS에서는 Ledger 상호작용 데이터로 대체 가능
        """
        if NETWORKX_AVAILABLE and self._graph is None:
            self.build_graph()
        
        if NETWORKX_AVAILABLE and self._graph is not None:
            try:
                connectivity = nx.average_degree_connectivity(self._graph)
                if 1 in connectivity:
                    return connectivity[1] / 144
            except:
                pass
        
        # Fallback: 간단한 밀도 계산
        total_connections = self.core_12 + self.extended_144
        max_connections = 12 + 144
        return min(1.0, total_connections / max_connections * 0.5)


@dataclass
class Decision:
    """결정 데이터"""
    M: float                        # Mint (생성 가치)
    T: float                        # Tax (비용)
    t: int                          # Time (기간, 월)
    label: str = ""                 # 결정 라벨


@dataclass
class DemonPrediction:
    """라플라스 악마 예측 결과"""
    V: float                        # 예측 V
    V_lower: float                  # 하한 (비관)
    V_upper: float                  # 상한 (낙관)
    adjusted_s: float               # 조정된 Synergy
    type_factor: float              # 타입 승수
    constant_adj: float             # 상수 조정
    decision: Decision              # 원본 결정
    
    def to_dict(self) -> dict:
        return {
            "V": round(self.V, 2),
            "V_range": [round(self.V_lower, 2), round(self.V_upper, 2)],
            "uncertainty": f"±{round((self.V_upper - self.V_lower) / 2 / self.V * 100, 1)}%",
            "adjusted_s": round(self.adjusted_s, 4),
            "type_factor": self.type_factor,
            "constant_adj": round(self.constant_adj, 4),
            "decision": {
                "M": self.decision.M,
                "T": self.decision.T,
                "t": self.decision.t,
                "label": self.decision.label
            }
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 라플라스 악마 코어
# ═══════════════════════════════════════════════════════════════════════════════

class LaplaceDemon:
    """
    라플라스 악마: 모든 초기 조건을 기반으로 결정론적 미래 예측
    
    V = (M - T) × (1 + s)^t × type_factor × constant_adj
    
    불확정성: ±uncertainty (기본 15%)로 양자역학 존중
    """
    
    def __init__(
        self,
        user_type: UserType = UserType.BALANCED,
        constants: Constants = None,
        exponential: ExponentialGrowth = None,
        network: Network1_12_144 = None,
        uncertainty: float = 0.15
    ):
        self.user_type = user_type
        self.constants = constants or Constants()
        self.exponential = exponential or ExponentialGrowth()
        self.network = network or Network1_12_144()
        self.uncertainty = uncertainty
        
        # 캐시
        self._type_factor = TYPE_MULTIPLIERS.get(user_type, 1.0)
        self._constant_adj = self.constants.calculate_adjustment()
        self._network_synergy = self.network.calculate_synergy()
    
    def summon(self, decisions: List[Decision]) -> List[DemonPrediction]:
        """
        라플라스 악마 소환: 결정 리스트에 대한 미래 V 예측
        
        "우주의 모든 초기 조건을 알고 있으므로, 미래를 예측합니다."
        """
        predictions = []
        
        for decision in decisions:
            # Synergy 계산 (네트워크 + 지수 성장)
            base_s = self._network_synergy
            adjusted_s = self.exponential.apply_to_synergy(base_s)
            adjusted_s = min(1.0, adjusted_s)  # 상한 1.0
            
            # 순가치
            base_value = decision.M - decision.T
            
            # 복리 성장
            compound = (1 + adjusted_s) ** decision.t
            
            # 최종 V
            V = base_value * compound * self._type_factor * self._constant_adj
            
            # 불확정성 구간
            V_lower = V * (1 - self.uncertainty)
            V_upper = V * (1 + self.uncertainty)
            
            predictions.append(DemonPrediction(
                V=V,
                V_lower=V_lower,
                V_upper=V_upper,
                adjusted_s=adjusted_s,
                type_factor=self._type_factor,
                constant_adj=self._constant_adj,
                decision=decision
            ))
        
        return predictions
    
    def compare_decisions(self, decisions: List[Decision]) -> Dict[str, Any]:
        """
        여러 결정 비교 분석
        
        Returns:
            비교 결과 + 최적 결정 추천
        """
        predictions = self.summon(decisions)
        
        comparisons = []
        for pred in predictions:
            comparisons.append({
                "label": pred.decision.label,
                "V": pred.V,
                "V_range": [pred.V_lower, pred.V_upper],
                "input": {
                    "M": pred.decision.M,
                    "T": pred.decision.T,
                    "t": pred.decision.t
                }
            })
        
        # 최적 결정 선택
        best = max(comparisons, key=lambda x: x["V"])
        worst = min(comparisons, key=lambda x: x["V"])
        
        return {
            "comparisons": comparisons,
            "recommended": best["label"],
            "reason": f"예상 V {best['V']:.2f}로 최대",
            "avoid": worst["label"] if len(comparisons) > 1 else None,
            "analysis": {
                "best_V": round(best["V"], 2),
                "worst_V": round(worst["V"], 2),
                "difference": round(best["V"] - worst["V"], 2),
                "difference_percent": f"{(best['V'] - worst['V']) / worst['V'] * 100:.1f}%" if worst["V"] > 0 else "N/A"
            }
        }
    
    def simulate_future(
        self,
        initial_M: float,
        initial_T: float,
        periods: int = 12,
        M_growth: float = 0.05,     # 월별 M 성장률
        T_growth: float = 0.02      # 월별 T 성장률
    ) -> List[Dict[str, float]]:
        """
        미래 시뮬레이션: 월별 V 곡선 생성
        """
        trajectory = []
        
        current_M = initial_M
        current_T = initial_T
        
        for month in range(periods + 1):
            decision = Decision(M=current_M, T=current_T, t=month)
            pred = self.summon([decision])[0]
            
            trajectory.append({
                "month": month,
                "M": round(current_M, 2),
                "T": round(current_T, 2),
                "V": round(pred.V, 2),
                "V_lower": round(pred.V_lower, 2),
                "V_upper": round(pred.V_upper, 2)
            })
            
            # 다음 달 값 업데이트
            current_M *= (1 + M_growth)
            current_T *= (1 + T_growth)
        
        return trajectory
    
    def what_if_synergy(
        self,
        decision: Decision,
        s_changes: List[float] = [-0.1, -0.05, 0, 0.05, 0.1, 0.2]
    ) -> List[Dict[str, float]]:
        """
        Synergy 변화에 따른 What-If 분석
        """
        results = []
        base_s = self._network_synergy
        
        for delta_s in s_changes:
            # 임시 Synergy 조정
            temp_s = max(0, min(1, base_s + delta_s))
            adjusted_s = self.exponential.apply_to_synergy(temp_s)
            
            base_value = decision.M - decision.T
            compound = (1 + adjusted_s) ** decision.t
            V = base_value * compound * self._type_factor * self._constant_adj
            
            results.append({
                "delta_s": delta_s,
                "synergy": round(adjusted_s, 4),
                "V": round(V, 2),
                "label": f"s{'+' if delta_s >= 0 else ''}{delta_s}"
            })
        
        return results


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

def summon_demon(
    user_type: str = "balanced",
    age: int = 30,
    location_factor: float = 0.8,
    growth_rate: float = 0.05,
    core_12: int = 5,
    extended_144: int = 20,
    decisions: List[Dict] = None,
    uncertainty: float = 0.15
) -> Dict[str, Any]:
    """
    라플라스 악마 소환 (편의 함수)
    
    Example:
        result = summon_demon(
            user_type="ambitious",
            age=30,
            core_12=5,
            decisions=[
                {"M": 100, "T": 40, "t": 12, "label": "결정 A"},
                {"M": 150, "T": 60, "t": 6, "label": "결정 B"}
            ]
        )
    """
    # 타입 변환
    try:
        user_type_enum = UserType(user_type)
    except ValueError:
        user_type_enum = UserType.BALANCED
    
    # 악마 생성
    demon = LaplaceDemon(
        user_type=user_type_enum,
        constants=Constants(age=age, location_factor=location_factor),
        exponential=ExponentialGrowth(growth_rate=growth_rate),
        network=Network1_12_144(core_12=core_12, extended_144=extended_144),
        uncertainty=uncertainty
    )
    
    # 결정 변환
    decision_list = [
        Decision(
            M=d.get("M", 0),
            T=d.get("T", 0),
            t=d.get("t", 12),
            label=d.get("label", f"Decision {i+1}")
        )
        for i, d in enumerate(decisions or [])
    ]
    
    if not decision_list:
        decision_list = [Decision(M=100, T=40, t=12, label="기본 결정")]
    
    # 예측
    predictions = demon.summon(decision_list)
    
    return {
        "demon": "Laplace's Demon v2.0",
        "config": {
            "user_type": user_type,
            "age": age,
            "location_factor": location_factor,
            "growth_rate": growth_rate,
            "network": f"1-{core_12}-{extended_144}"
        },
        "predictions": [p.to_dict() for p in predictions],
        "recommendation": demon.compare_decisions(decision_list) if len(decision_list) > 1 else None
    }


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    print("═" * 70)
    print("  😈 AUTUS Laplace's Demon Test")
    print("═" * 70)
    print(f"  NumPy: {'✅' if NUMPY_AVAILABLE else '❌'}")
    print(f"  NetworkX: {'✅' if NETWORKX_AVAILABLE else '❌'}")
    print("─" * 70)
    
    # 악마 소환
    result = summon_demon(
        user_type="ambitious",
        age=30,
        location_factor=0.8,
        growth_rate=0.05,
        core_12=5,
        extended_144=20,
        decisions=[
            {"M": 100, "T": 40, "t": 12, "label": "결정1: 안정적 투자"},
            {"M": 150, "T": 60, "t": 6, "label": "결정2: 공격적 투자"}
        ]
    )
    
    print("\n📊 예측 결과:")
    for pred in result["predictions"]:
        print(f"\n  [{pred['decision']['label']}]")
        print(f"    V = {pred['V']} ({pred['uncertainty']})")
        print(f"    범위: {pred['V_range'][0]} ~ {pred['V_range'][1]}")
        print(f"    Synergy: {pred['adjusted_s']}")
    
    if result["recommendation"]:
        print(f"\n🎯 추천: {result['recommendation']['recommended']}")
        print(f"   이유: {result['recommendation']['reason']}")
    
    print("\n" + "═" * 70)
    
    # 미래 시뮬레이션
    demon = LaplaceDemon(
        user_type=UserType.AMBITIOUS,
        constants=Constants(age=30, location_factor=0.8),
        network=Network1_12_144(core_12=5, extended_144=20)
    )
    
    trajectory = demon.simulate_future(
        initial_M=100,
        initial_T=40,
        periods=12
    )
    
    print("\n📈 12개월 미래 시뮬레이션:")
    for point in trajectory[::3]:  # 3개월 단위
        print(f"  Month {point['month']:2d}: V = {point['V']:8.2f} ({point['V_lower']:.2f} ~ {point['V_upper']:.2f})")
