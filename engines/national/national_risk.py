"""
National Meaning Layer OS v1
Risk & Success 계산
"""
from .national_vector import NationalVector


def compute_risk(v: NationalVector) -> float:
    """
    국가 관점 리스크 점수 (0~1)
    Risk = 0.3×GAP + 0.4×UNC + 0.3×(1-INT)
    """
    return (v.gap * 0.3) + (v.unc * 0.4) + ((1.0 - v.integ) * 0.3)


def compute_success_probability(v: NationalVector) -> float:
    """
    성공 확률 (0~1)
    Success = (DIR + FOR + (1-GAP) + (1-UNC)) / 4
    """
    return (v.dir + v.force + (1.0 - v.gap) + (1.0 - v.unc)) / 4.0


def compute_j_score(v: NationalVector) -> int:
    """J-Score (0-100)"""
    raw = (v.dir + v.force + (1-v.gap) + (1-v.unc) + (1-v.tem) + v.integ) / 6.0
    return round(raw * 100)


if __name__ == "__main__":
    v = NationalVector(dir=0.7, force=0.6, gap=0.4, unc=0.3, tem=0.3, integ=0.6)
    print(f"Risk: {compute_risk(v):.2f}")
    print(f"Success: {compute_success_probability(v):.2f}")
    print(f"J-Score: {compute_j_score(v)}")
