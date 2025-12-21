"""
Shadow Vector 32f - Structure of Arrays (비가역)
"""
import hashlib
from typing import List
from dataclasses import dataclass
import struct

@dataclass
class ShadowVector32f:
    """32차원 float32 Shadow 벡터"""
    values: List[float]  # 32개 float
    
    def __post_init__(self):
        if len(self.values) != 32:
            # 패딩 또는 트림
            if len(self.values) < 32:
                self.values.extend([0.0] * (32 - len(self.values)))
            else:
                self.values = self.values[:32]
    
    def to_bytes(self) -> bytes:
        """바이트로 변환 (비가역)"""
        return struct.pack('32f', *self.values)
    
    def hash(self) -> str:
        """Shadow 해시"""
        return hashlib.sha256(self.to_bytes()).hexdigest()[:16]
    
    @classmethod
    def from_features(cls, features: List[dict]) -> "ShadowVector32f":
        """FeatureEvent 리스트 → Shadow 변환 (비가역)"""
        values = [0.0] * 32
        for f in features[:32]:
            idx = f.get("id", 0) % 32
            val = f.get("value", 0) * f.get("conf", 1)
            values[idx] = max(values[idx], min(1.0, val))
        return cls(values=values)

def irreversible_transform(raw_value: float, salt: str = "") -> float:
    """비가역 변환"""
    h = hashlib.sha256(f"{raw_value}{salt}".encode()).digest()
    return (h[0] + h[1] * 256) / 65535.0
