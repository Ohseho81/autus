"""
AUTUS Sovereign Parameters - 물리 상수 및 가중치

S_Person = [(Σ W_k × Ψ_k) + (Σ χ_ij × S_i × S_j)] × ν × e^(-λt) / (I + ε)
"""

from dataclasses import dataclass, field
from typing import Dict
import json
import os


@dataclass
class PsiWeights:
    """
    6차원 Ψ 가중치 (W)
    
    합계 = 1.0 (E는 음수이므로 실제 합 = 0.85 + 0.15 = 1.0)
    """
    G: float = 0.25   # Governance (거버넌스) - 가장 중요
    R: float = 0.20   # Reputation (평판)
    E: float = -0.15  # Exposure (위험 노출) - 음수! (높을수록 감점)
    T: float = 0.15   # Throughput (처리량)
    N: float = 0.15   # Network (네트워크)
    L: float = 0.10   # Liquidity (유동성)
    
    def to_dict(self) -> Dict[str, float]:
        return {
            "G": self.G,
            "R": self.R,
            "E": self.E,
            "T": self.T,
            "N": self.N,
            "L": self.L,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> "PsiWeights":
        return cls(
            G=data.get("G", 0.25),
            R=data.get("R", 0.20),
            E=data.get("E", -0.15),
            T=data.get("T", 0.15),
            N=data.get("N", 0.15),
            L=data.get("L", 0.10),
        )


@dataclass
class RankThresholds:
    """
    계급 백분위 기준
    """
    sovereign_percentile: float = 0.01    # Top 0.01%
    archon_percentile: float = 1.0        # Top 1%
    validator_percentile: float = 10.0    # Top 10%
    operator_percentile: float = 30.0     # Top 30%
    # Terminal: 나머지 70%
    
    # 추가 조건
    archon_min_centrality: float = 0.7    # ν > 0.7
    validator_max_exposure: float = 0.3   # E < 0.3
    operator_min_liquidity: float = 0.5   # L > 0.5


@dataclass
class SovereignParams:
    """
    AUTUS Sovereign 물리 파라미터
    """
    
    # Ψ 가중치
    weights: PsiWeights = field(default_factory=PsiWeights)
    
    # 시간 감쇠율 (연간)
    # λ = 0.018 → 반감기 약 38.5년
    lambda_decay: float = 0.018
    
    # Zero Division 방지
    epsilon: float = 1e-9
    
    # 계급 기준
    rank_thresholds: RankThresholds = field(default_factory=RankThresholds)
    
    # 간섭항 스케일링
    interference_scale: float = 0.1
    
    # 최대 점수 (정규화용)
    max_score: float = 100.0
    
    # 중심성 부스트 (ν 영향력)
    centrality_boost: float = 1.5
    
    def to_dict(self) -> Dict:
        return {
            "weights": self.weights.to_dict(),
            "lambda_decay": self.lambda_decay,
            "epsilon": self.epsilon,
            "rank_thresholds": {
                "sovereign_percentile": self.rank_thresholds.sovereign_percentile,
                "archon_percentile": self.rank_thresholds.archon_percentile,
                "validator_percentile": self.rank_thresholds.validator_percentile,
                "operator_percentile": self.rank_thresholds.operator_percentile,
                "archon_min_centrality": self.rank_thresholds.archon_min_centrality,
                "validator_max_exposure": self.rank_thresholds.validator_max_exposure,
                "operator_min_liquidity": self.rank_thresholds.operator_min_liquidity,
            },
            "interference_scale": self.interference_scale,
            "max_score": self.max_score,
            "centrality_boost": self.centrality_boost,
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> "SovereignParams":
        weights = PsiWeights.from_dict(data.get("weights", {}))
        
        rank_data = data.get("rank_thresholds", {})
        rank_thresholds = RankThresholds(
            sovereign_percentile=rank_data.get("sovereign_percentile", 0.01),
            archon_percentile=rank_data.get("archon_percentile", 1.0),
            validator_percentile=rank_data.get("validator_percentile", 10.0),
            operator_percentile=rank_data.get("operator_percentile", 30.0),
            archon_min_centrality=rank_data.get("archon_min_centrality", 0.7),
            validator_max_exposure=rank_data.get("validator_max_exposure", 0.3),
            operator_min_liquidity=rank_data.get("operator_min_liquidity", 0.5),
        )
        
        return cls(
            weights=weights,
            lambda_decay=data.get("lambda_decay", 0.018),
            epsilon=data.get("epsilon", 1e-9),
            rank_thresholds=rank_thresholds,
            interference_scale=data.get("interference_scale", 0.1),
            max_score=data.get("max_score", 100.0),
            centrality_boost=data.get("centrality_boost", 1.5),
        )
    
    @classmethod
    def load(cls, path: str = None) -> "SovereignParams":
        """
        파일에서 로드 (없으면 기본값)
        """
        if path and os.path.exists(path):
            with open(path, "r") as f:
                data = json.load(f)
            return cls.from_dict(data)
        return cls()
    
    def save(self, path: str) -> None:
        """파일로 저장"""
        with open(path, "w") as f:
            json.dump(self.to_dict(), f, indent=2)
    
    def get_formula_latex(self) -> str:
        """LaTeX 수식 반환"""
        return r"""
S_{Person} = \frac{[\sum_{k} W_k \times \Psi_k + \sum_{i,j} \chi_{ij} \times S_i \times S_j] \times \nu \times e^{-\lambda t}}{I + \varepsilon}

Where:
- \Psi = \{G, R, E, T, N, L\} (6-dimensional vector)
- W = \{0.25, 0.20, -0.15, 0.15, 0.15, 0.10\} (weights)
- \chi_{ij} \in [-1, 1] (coupling coefficient)
- \nu = Eigenvector Centrality
- \lambda = 0.018 (decay rate)
- I = \frac{G}{L + 1} (liquidity inertia)
- \varepsilon = 10^{-9} (stability term)
"""
    
    def get_formula_text(self) -> str:
        """텍스트 수식 반환"""
        return """
S_Person = [(Σ W_k × Ψ_k) + (Σ χ_ij × S_i × S_j)] × ν × e^(-λt) / (I + ε)

변수 설명:
- Ψ: 6차원 벡터 {G, R, E, T, N, L}
  - G (Governance): 거버넌스 가치 - 가중치 0.25
  - R (Reputation): 평판 - 가중치 0.20
  - E (Exposure): 위험 노출 - 가중치 -0.15 (높을수록 감점)
  - T (Throughput): 처리량 - 가중치 0.15
  - N (Network): 네트워크 중심성 - 가중치 0.15
  - L (Liquidity): 유동성 - 가중치 0.10

- χ: 노드 간 결합계수 (-1.0 ~ 1.0)
  - 양수: 시너지 (협력 관계)
  - 음수: 마찰 (경쟁 관계)

- ν: Eigenvector Centrality (네트워크 중심성)
- λ: 시간 감쇠율 (0.018, 반감기 ~38.5년)
- I: 유동성 관성 = G / (L + 1)
- ε: 1e-9 (zero division 방지)

계급 기준:
- Sovereign: Top 0.01%
- Archon: Top 1% AND ν > 0.7
- Validator: Top 10% AND E < 0.3
- Operator: Top 30% AND L > 0.5
- Terminal: 나머지 70%
"""


# 기본 파라미터 인스턴스
DEFAULT_PARAMS = SovereignParams()

