"""
National Meaning Layer OS v1
NationalVector - 6D 국가 해석 벡터
"""
from dataclasses import dataclass
from typing import Dict


@dataclass
class NationalVector:
    """6D 국가 해석 벡터"""
    dir: float = 0.5    # Direction: 방향성
    force: float = 0.5  # Force: 추진력
    gap: float = 0.5    # Gap: 목표까지 거리
    unc: float = 0.5    # Uncertainty: 불확실성
    tem: float = 0.5    # Temporal: 시간 압박
    integ: float = 0.5  # Integration: 통합도

    def to_dict(self) -> Dict[str, float]:
        return {
            "DIR": self.dir,
            "FOR": self.force,
            "GAP": self.gap,
            "UNC": self.unc,
            "TEM": self.tem,
            "INT": self.integ,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, float]) -> "NationalVector":
        return cls(
            dir=data.get("DIR", 0.5),
            force=data.get("FOR", 0.5),
            gap=data.get("GAP", 0.5),
            unc=data.get("UNC", 0.5),
            tem=data.get("TEM", 0.5),
            integ=data.get("INT", 0.5),
        )

    def clamp(self) -> "NationalVector":
        """0.0 ~ 1.0 범위로 클램핑"""
        def c(v: float) -> float:
            return max(0.0, min(1.0, v))
        self.dir = c(self.dir)
        self.force = c(self.force)
        self.gap = c(self.gap)
        self.unc = c(self.unc)
        self.tem = c(self.tem)
        self.integ = c(self.integ)
        return self

    def copy(self) -> "NationalVector":
        return NationalVector(self.dir, self.force, self.gap, self.unc, self.tem, self.integ)


if __name__ == "__main__":
    v = NationalVector()
    print(f"기본 벡터: {v.to_dict()}")
    v2 = NationalVector.from_dict({"DIR": 0.8, "GAP": 0.3})
    print(f"커스텀 벡터: {v2.to_dict()}")
