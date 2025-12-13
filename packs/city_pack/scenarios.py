"""
City Pack v1.1 시나리오
"""
from .schema import CityEvent, InfraEvent

# 기본 시나리오
DEFAULT_SCENARIO = [
    CityEvent(kind="investment", intensity=0.6, duration="mid"),
    CityEvent(kind="incident", intensity=0.7, duration="short"),
    CityEvent(kind="policy", intensity=0.5, duration="long"),
]

# 재난 시나리오
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

# v1.1 시나리오: 폭우 + 퇴근시간
STORM_RUSH_SCENARIO = [
    InfraEvent(domain="traffic", kind="load", intensity=0.8, duration="mid"),
    InfraEvent(domain="safety", kind="incident", intensity=0.6, duration="short"),
    InfraEvent(domain="energy", kind="load", intensity=0.7, duration="mid"),
]

# v1.1 시나리오: 에너지 투자 후 동일 폭우
STORM_AFTER_INVEST_SCENARIO = [
    InfraEvent(domain="energy", kind="investment", intensity=0.8, duration="long"),
    InfraEvent(domain="traffic", kind="load", intensity=0.8, duration="mid"),
    InfraEvent(domain="safety", kind="incident", intensity=0.6, duration="short"),
    InfraEvent(domain="energy", kind="load", intensity=0.7, duration="mid"),
]

# v1.1 시나리오: 연쇄 정전
BLACKOUT_SCENARIO = [
    InfraEvent(domain="energy", kind="incident", intensity=0.9, duration="long"),
    InfraEvent(domain="traffic", kind="incident", intensity=0.7, duration="mid"),
    InfraEvent(domain="safety", kind="load", intensity=0.8, duration="long"),
]

SCENARIOS = {
    "default": DEFAULT_SCENARIO,
    "crisis": CRISIS_SCENARIO,
    "growth": GROWTH_SCENARIO,
}

INFRA_SCENARIOS = {
    "storm_rush": STORM_RUSH_SCENARIO,
    "storm_after_invest": STORM_AFTER_INVEST_SCENARIO,
    "blackout": BLACKOUT_SCENARIO,
}
