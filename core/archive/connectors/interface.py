"""
Connector Interface - 모든 커넥터가 구현해야 하는 표준
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class FeatureEvent:
    """특성 이벤트 (Shadow 입력)"""
    id: int
    value: float
    ts_norm: float  # 정규화된 타임스탬프 (0~1)
    conf: float     # 신뢰도 (0~1)

class Connector(ABC):
    """커넥터 인터페이스 (LOCKED)"""
    
    @abstractmethod
    def read(self, envelope: Dict[str, Any]) -> Dict[str, Any]:
        """외부 데이터 읽기 (Read-only)"""
        pass
    
    @abstractmethod
    def extract_features(self, raw: Dict[str, Any]) -> List[FeatureEvent]:
        """특성 추출 (비가역 변환)"""
        pass
    
    def validate(self, features: List[FeatureEvent]) -> bool:
        """특성 검증"""
        for f in features:
            if not (0 <= f.value <= 1):
                return False
            if not (0 <= f.conf <= 1):
                return False
        return True
