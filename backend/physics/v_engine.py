"""
═══════════════════════════════════════════════════════════════════════════════
🧮 AUTUS V Engine v1.0 — 가치 계산 핵심 엔진
═══════════════════════════════════════════════════════════════════════════════

V = (M - T) × (1 + s)^t

- V: 자산 (Value)
- M: Mint (생성된 가치)
- T: Tax (소모된 비용)
- s: Synergy (협업 계수, 0 ≤ s ≤ 1)
- t: Time (시간)

통합 요소:
- 타입 계수 (MBTI/성향 기반)
- 상수 조정 (나이, 위치)
- 지수 가속 (네트워크 밀도)
- 라플라스 예측 (미래 시뮬레이션)

═══════════════════════════════════════════════════════════════════════════════
"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
import math
import json
from datetime import datetime, timedelta


# ═══════════════════════════════════════════════════════════════════════════════
# 타입 정의
# ═══════════════════════════════════════════════════════════════════════════════

class UserType(Enum):
    """사용자 성향 타입"""
    AMBITIOUS = "ambitious"      # 야심형: 높은 위험, 높은 보상
    CAUTIOUS = "cautious"        # 신중형: 낮은 위험, 안정적 성장
    BALANCED = "balanced"        # 균형형: 중간
    AGGRESSIVE = "aggressive"    # 공격형: 최고 위험, 최고 보상
    CONSERVATIVE = "conservative" # 보수형: 최저 위험, 최저 변동


# 타입별 승수
TYPE_MULTIPLIERS: Dict[UserType, float] = {
    UserType.AMBITIOUS: 1.2,
    UserType.CAUTIOUS: 0.8,
    UserType.BALANCED: 1.0,
    UserType.AGGRESSIVE: 1.4,
    UserType.CONSERVATIVE: 0.6,
}


@dataclass
class UserConstants:
    """사용자 상수 (변하지 않는 요소)"""
    age: int = 30
    location_factor: float = 1.0  # 지역 경제 계수 (0.5~1.5)
    base_capital: float = 0.0     # 초기 자본
    risk_tolerance: float = 0.5   # 위험 허용도 (0~1)


@dataclass
class NetworkState:
    """네트워크 상태"""
    connections_12: int = 0       # 핵심 관계 (최대 12)
    connections_144: int = 0      # 확장 관계 (최대 144)
    growth_rate: float = 0.05     # 기본 성장률
    density: float = 0.0          # 계산된 밀도
    
    def calculate_density(self) -> float:
        """네트워크 밀도 계산: 연결 수 / 최대 연결"""
        max_connections = 144
        total = self.connections_12 + self.connections_144
        self.density = min(1.0, total / max_connections)
        return self.density


@dataclass
class VInput:
    """V 계산 입력"""
    M: float                      # Mint (생성 가치)
    T: float                      # Tax (비용)
    s: float                      # Synergy (협업 계수)
    t: int                        # Time (기간, 월 단위)
    user_type: UserType = UserType.BALANCED
    constants: UserConstants = field(default_factory=UserConstants)
    network: NetworkState = field(default_factory=NetworkState)


@dataclass
class VResult:
    """V 계산 결과"""
    V: float                      # 최종 가치
    base_value: float             # 순가치 (M - T)
    raw_V: float                  # 타입/상수 적용 전 V
    adjusted_s: float             # 조정된 Synergy
    type_factor: float            # 타입 승수
    constant_adj: float           # 상수 조정
    growth_contribution: float    # 지수 성장 기여분
    
    # 분석 데이터
    monthly_values: List[float] = field(default_factory=list)
    doubling_time: Optional[int] = None  # 2배 달성 기간 (월)
    
    def to_dict(self) -> dict:
        return {
            "V": round(self.V, 2),
            "base_value": round(self.base_value, 2),
            "raw_V": round(self.raw_V, 2),
            "adjusted_s": round(self.adjusted_s, 4),
            "type_factor": self.type_factor,
            "constant_adj": round(self.constant_adj, 4),
            "growth_contribution": round(self.growth_contribution, 2),
            "doubling_time": self.doubling_time,
            "monthly_values": [round(v, 2) for v in self.monthly_values[:12]]
        }


# ═══════════════════════════════════════════════════════════════════════════════
# V 엔진 코어
# ═══════════════════════════════════════════════════════════════════════════════

class VEngine:
    """
    V 공식 계산 엔진
    
    V = (M - T) × (1 + s)^t × type_factor × constant_adj
    
    여기서:
    - adjusted_s = s + (growth_rate × network_density)
    - type_factor = TYPE_MULTIPLIERS[user_type]
    - constant_adj = (1 - age/100) × location_factor
    """
    
    def __init__(self):
        self.history: List[Tuple[datetime, VInput, VResult]] = []
    
    def calculate(self, input: VInput) -> VResult:
        """V 계산 실행"""
        
        # 1. 타입 승수
        type_factor = TYPE_MULTIPLIERS.get(input.user_type, 1.0)
        
        # 2. 상수 조정 (나이, 위치)
        age_factor = 1 - (input.constants.age / 100)  # 나이가 많을수록 감소
        constant_adj = age_factor * input.constants.location_factor
        
        # 3. 네트워크 밀도 계산
        network_density = input.network.calculate_density()
        
        # 4. Synergy 조정 (지수 가속 적용)
        growth_contribution = input.network.growth_rate * network_density
        adjusted_s = min(1.0, input.s + growth_contribution)
        
        # 5. 기본 계산
        base_value = input.M - input.T
        
        # 6. 복리 계산 (월별 추적)
        monthly_values = []
        for month in range(input.t + 1):
            v_at_month = base_value * ((1 + adjusted_s) ** month)
            monthly_values.append(v_at_month)
        
        # 7. 원시 V (타입/상수 적용 전)
        raw_V = base_value * ((1 + adjusted_s) ** input.t)
        
        # 8. 최종 V
        V = raw_V * type_factor * constant_adj
        
        # 9. 2배 달성 기간 계산
        doubling_time = None
        if adjusted_s > 0:
            doubling_time = int(math.log(2) / math.log(1 + adjusted_s))
        
        result = VResult(
            V=V,
            base_value=base_value,
            raw_V=raw_V,
            adjusted_s=adjusted_s,
            type_factor=type_factor,
            constant_adj=constant_adj,
            growth_contribution=growth_contribution,
            monthly_values=monthly_values,
            doubling_time=doubling_time
        )
        
        # 히스토리 저장
        self.history.append((datetime.now(), input, result))
        
        return result
    
    def simulate_scenarios(
        self, 
        base_input: VInput,
        s_variations: List[float] = [-0.1, 0, 0.1, 0.2],
        t_variations: List[int] = [6, 12, 24, 36]
    ) -> Dict[str, List[dict]]:
        """시나리오 시뮬레이션"""
        
        results = {
            "by_synergy": [],
            "by_time": []
        }
        
        # Synergy 변화에 따른 시뮬레이션
        for delta_s in s_variations:
            modified_input = VInput(
                M=base_input.M,
                T=base_input.T,
                s=max(0, min(1, base_input.s + delta_s)),
                t=base_input.t,
                user_type=base_input.user_type,
                constants=base_input.constants,
                network=base_input.network
            )
            result = self.calculate(modified_input)
            results["by_synergy"].append({
                "s": modified_input.s,
                "delta": delta_s,
                "V": result.V,
                "label": f"s={modified_input.s:.2f}"
            })
        
        # 시간 변화에 따른 시뮬레이션
        for t in t_variations:
            modified_input = VInput(
                M=base_input.M,
                T=base_input.T,
                s=base_input.s,
                t=t,
                user_type=base_input.user_type,
                constants=base_input.constants,
                network=base_input.network
            )
            result = self.calculate(modified_input)
            results["by_time"].append({
                "t": t,
                "V": result.V,
                "label": f"{t}개월"
            })
        
        return results
    
    def predict_optimal_s(
        self, 
        input: VInput, 
        target_V: float
    ) -> Optional[float]:
        """목표 V 달성을 위한 최적 s 계산"""
        
        base_value = input.M - input.T
        if base_value <= 0:
            return None
        
        # V = base × (1+s)^t × type × const
        # (1+s)^t = V / (base × type × const)
        type_factor = TYPE_MULTIPLIERS.get(input.user_type, 1.0)
        age_factor = 1 - (input.constants.age / 100)
        constant_adj = age_factor * input.constants.location_factor
        
        denominator = base_value * type_factor * constant_adj
        if denominator <= 0:
            return None
        
        ratio = target_V / denominator
        if ratio <= 0:
            return None
        
        # (1+s)^t = ratio → s = ratio^(1/t) - 1
        required_s = (ratio ** (1 / input.t)) - 1
        
        # 네트워크 성장 기여분 제외
        network_density = input.network.calculate_density()
        growth_contribution = input.network.growth_rate * network_density
        actual_s_needed = required_s - growth_contribution
        
        return max(0, min(1, actual_s_needed))


# ═══════════════════════════════════════════════════════════════════════════════
# 라플라스 시뮬레이터 (미래 예측)
# ═══════════════════════════════════════════════════════════════════════════════

class LaplaceSimulator:
    """
    라플라스 악마 스타일 예측기
    
    "모든 초기 조건을 알면 미래를 예측할 수 있다"
    
    결정론적 예측 + 확률적 구간으로 불확실성 표현
    """
    
    def __init__(self, engine: VEngine):
        self.engine = engine
    
    def predict_future(
        self,
        input: VInput,
        periods: int = 12,
        uncertainty: float = 0.1
    ) -> Dict[str, any]:
        """
        미래 V 곡선 예측
        
        Args:
            input: 현재 상태
            periods: 예측 기간 (월)
            uncertainty: 불확실성 계수 (0~1)
        
        Returns:
            예측 결과 (중앙값 + 신뢰구간)
        """
        
        predictions = {
            "central": [],      # 중앙 예측값
            "upper_bound": [],  # 상한 (낙관)
            "lower_bound": [],  # 하한 (비관)
            "confidence": 1 - uncertainty
        }
        
        for month in range(periods + 1):
            # 중앙 예측
            central_input = VInput(
                M=input.M, T=input.T, s=input.s, t=month,
                user_type=input.user_type,
                constants=input.constants,
                network=input.network
            )
            central_result = self.engine.calculate(central_input)
            
            # 낙관 시나리오 (s + uncertainty)
            optimistic_input = VInput(
                M=input.M, T=input.T, 
                s=min(1, input.s + uncertainty),
                t=month,
                user_type=input.user_type,
                constants=input.constants,
                network=input.network
            )
            optimistic_result = self.engine.calculate(optimistic_input)
            
            # 비관 시나리오 (s - uncertainty)
            pessimistic_input = VInput(
                M=input.M, T=input.T,
                s=max(0, input.s - uncertainty),
                t=month,
                user_type=input.user_type,
                constants=input.constants,
                network=input.network
            )
            pessimistic_result = self.engine.calculate(pessimistic_input)
            
            predictions["central"].append({
                "month": month,
                "V": central_result.V
            })
            predictions["upper_bound"].append({
                "month": month,
                "V": optimistic_result.V
            })
            predictions["lower_bound"].append({
                "month": month,
                "V": pessimistic_result.V
            })
        
        # 핵심 인사이트
        final_central = predictions["central"][-1]["V"]
        final_upper = predictions["upper_bound"][-1]["V"]
        final_lower = predictions["lower_bound"][-1]["V"]
        
        predictions["insights"] = {
            "expected_V": round(final_central, 2),
            "best_case": round(final_upper, 2),
            "worst_case": round(final_lower, 2),
            "range": round(final_upper - final_lower, 2),
            "growth_factor": round(final_central / (input.M - input.T), 2) if input.M > input.T else 0
        }
        
        return predictions
    
    def what_if(
        self,
        input: VInput,
        decision_options: List[Dict[str, float]]
    ) -> List[Dict[str, any]]:
        """
        결정 시나리오 비교
        
        Args:
            input: 현재 상태
            decision_options: 결정 옵션 리스트
                [{"label": "A", "M": 100, "T": 30, "s_boost": 0.1}, ...]
        
        Returns:
            각 결정의 미래 V 비교
        """
        
        comparisons = []
        
        for option in decision_options:
            modified_input = VInput(
                M=input.M + option.get("M", 0),
                T=input.T + option.get("T", 0),
                s=min(1, input.s + option.get("s_boost", 0)),
                t=input.t,
                user_type=input.user_type,
                constants=input.constants,
                network=input.network
            )
            
            prediction = self.predict_future(modified_input, periods=input.t)
            
            comparisons.append({
                "label": option.get("label", "Option"),
                "input_changes": {
                    "delta_M": option.get("M", 0),
                    "delta_T": option.get("T", 0),
                    "s_boost": option.get("s_boost", 0)
                },
                "result": prediction["insights"]
            })
        
        # 최적 결정 선택
        best = max(comparisons, key=lambda x: x["result"]["expected_V"])
        
        return {
            "comparisons": comparisons,
            "recommended": best["label"],
            "reason": f"{best['label']}이(가) 예상 V {best['result']['expected_V']}로 가장 높음"
        }


# ═══════════════════════════════════════════════════════════════════════════════
# 싱글톤 인스턴스
# ═══════════════════════════════════════════════════════════════════════════════

_engine_instance: Optional[VEngine] = None
_simulator_instance: Optional[LaplaceSimulator] = None


def get_v_engine() -> VEngine:
    """V 엔진 싱글톤"""
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = VEngine()
    return _engine_instance


def get_laplace_simulator() -> LaplaceSimulator:
    """라플라스 시뮬레이터 싱글톤"""
    global _simulator_instance
    if _simulator_instance is None:
        _simulator_instance = LaplaceSimulator(get_v_engine())
    return _simulator_instance


# ═══════════════════════════════════════════════════════════════════════════════
# 편의 함수
# ═══════════════════════════════════════════════════════════════════════════════

def calculate_v(
    M: float,
    T: float,
    s: float,
    t: int,
    user_type: str = "balanced",
    age: int = 30,
    location_factor: float = 1.0,
    network_12: int = 0,
    network_144: int = 0
) -> dict:
    """
    간편 V 계산 함수
    
    Example:
        result = calculate_v(M=100, T=40, s=0.3, t=12, network_12=5)
        print(result["V"])
    """
    engine = get_v_engine()
    
    user_type_enum = UserType(user_type) if user_type in [t.value for t in UserType] else UserType.BALANCED
    
    input = VInput(
        M=M,
        T=T,
        s=s,
        t=t,
        user_type=user_type_enum,
        constants=UserConstants(age=age, location_factor=location_factor),
        network=NetworkState(connections_12=network_12, connections_144=network_144)
    )
    
    result = engine.calculate(input)
    return result.to_dict()


def predict_v(
    M: float,
    T: float,
    s: float,
    t: int = 12,
    uncertainty: float = 0.1
) -> dict:
    """
    간편 V 예측 함수
    
    Example:
        prediction = predict_v(M=100, T=40, s=0.3, t=12)
        print(prediction["insights"]["expected_V"])
    """
    simulator = get_laplace_simulator()
    
    input = VInput(M=M, T=T, s=s, t=t)
    
    return simulator.predict_future(input, periods=t, uncertainty=uncertainty)


# ═══════════════════════════════════════════════════════════════════════════════
# 테스트
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    # 기본 테스트
    result = calculate_v(
        M=100,
        T=40,
        s=0.3,
        t=12,
        user_type="ambitious",
        age=30,
        network_12=5,
        network_144=20
    )
    
    print("═" * 60)
    print("  AUTUS V Engine Test")
    print("═" * 60)
    print(f"  Input: M=100, T=40, s=0.3, t=12개월")
    print(f"  User Type: ambitious (×1.2)")
    print(f"  Network: 12명 핵심 + 20명 확장")
    print("─" * 60)
    print(f"  Base Value (M-T): {result['base_value']}")
    print(f"  Adjusted Synergy: {result['adjusted_s']}")
    print(f"  Raw V (타입 적용 전): {result['raw_V']}")
    print(f"  Final V: {result['V']}")
    print(f"  2배 달성 기간: {result['doubling_time']}개월")
    print("═" * 60)
    
    # 예측 테스트
    prediction = predict_v(M=100, T=40, s=0.3, t=12)
    print("\n라플라스 예측:")
    print(f"  Expected V: {prediction['insights']['expected_V']}")
    print(f"  Best Case: {prediction['insights']['best_case']}")
    print(f"  Worst Case: {prediction['insights']['worst_case']}")
    print(f"  Growth Factor: {prediction['insights']['growth_factor']}x")
