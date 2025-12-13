"""
PoC 시나리오: 3단계 이벤트
"""
from .schema import CityEvent

# 기본 시나리오
DEFAULT_SCENARIO = [
    CityEvent(kind="investment", intensity=0.6, duration="mid"),
    CityEvent(kind="incident", intensity=0.7, duration="short"),
    CityEvent(kind="policy", intensity=0.5, duration="long"),
]

# 재난 집중 시나리오
CRISIS_SCENARIO = [
    CityEvent(kind="incident", intensity=0.9, duration="long"),
    CityEvent(kind="incident", intensity=0.6, duration="mid"),
    CityEvent(kind="policy", intensity=0.8, duration="short"),
]

# 성장 시나리오
GROWTH_SCENARIO = [
    CityEvent(kind="investment", intensity=0.8, duration="long"),
    CityEvent(kind="investment", intensity=0.6, duration="mid"),
    CityEvent(kind="policy", intensity=0.3, duration="short"),
]

SCENARIOS = {
    "default": DEFAULT_SCENARIO,
    "crisis": CRISIS_SCENARIO,
    "growth": GROWTH_SCENARIO,
}
