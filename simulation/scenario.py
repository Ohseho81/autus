"""시나리오 정의 - 가상 세계의 이벤트 시퀀스"""
from dataclasses import dataclass, field
from typing import List, Dict, Any

@dataclass
class SimEvent:
    """시뮬레이션 이벤트"""
    event_code: str
    delay_seconds: int = 0
    probability: float = 1.0
    conditions: Dict[str, Any] = field(default_factory=dict)

@dataclass  
class Scenario:
    """시나리오 - 이벤트 시퀀스"""
    id: str
    name: str
    description: str
    route_code: str
    events: List[SimEvent]
    expected_outcome: Dict[str, Any] = field(default_factory=dict)

# 사전 정의 시나리오
SCENARIOS = {
    "ph_kr_success": Scenario(
        id="ph_kr_success",
        name="PH-KR 성공 경로",
        description="필리핀 → 한국 취업 성공 시나리오",
        route_code="PH-KR",
        events=[
            SimEvent("HUM.APPLY.SUBMITTED", delay_seconds=0),
            SimEvent("HUM.DOC.UPLOADED", delay_seconds=86400),
            SimEvent("HUM.DOC.APPROVED", delay_seconds=172800),
            SimEvent("HUM.MEDICAL.PASSED", delay_seconds=259200),
            SimEvent("HUM.SCHOOL.ASSIGNED", delay_seconds=345600),
            SimEvent("HUM.TRAINING.COMPLETED", delay_seconds=2592000),
            SimEvent("HUM.VISA.APPROVED", delay_seconds=3456000),
            SimEvent("HUM.EMPLOYMENT.MATCHED", delay_seconds=3888000),
            SimEvent("HUM.EMPLOYMENT.STARTED", delay_seconds=4320000),
            SimEvent("HUM.SETTLEMENT.COMPLETE", delay_seconds=5184000),
        ],
        expected_outcome={"phase": "CITY", "success_min": 0.85, "risk_max": 0.15}
    ),
    "ph_kr_visa_fail": Scenario(
        id="ph_kr_visa_fail",
        name="PH-KR 비자 거절",
        description="비자 거절 후 재신청 시나리오",
        route_code="PH-KR",
        events=[
            SimEvent("HUM.APPLY.SUBMITTED"),
            SimEvent("HUM.DOC.APPROVED"),
            SimEvent("HUM.MEDICAL.PASSED"),
            SimEvent("HUM.SCHOOL.ASSIGNED"),
            SimEvent("HUM.TRAINING.COMPLETED"),
            SimEvent("HUM.VISA.REJECTED"),
            SimEvent("HUM.DOC.UPLOADED"),
            SimEvent("HUM.VISA.APPROVED", probability=0.7),
        ],
        expected_outcome={"phase": "GOV", "success_min": 0.5, "risk_max": 0.4}
    ),
    "ph_kr_dropout": Scenario(
        id="ph_kr_dropout",
        name="PH-KR 중도 포기",
        description="훈련 중 포기 시나리오",
        route_code="PH-KR",
        events=[
            SimEvent("HUM.APPLY.SUBMITTED"),
            SimEvent("HUM.DOC.APPROVED"),
            SimEvent("HUM.SCHOOL.ASSIGNED"),
            SimEvent("HUM.DOC.REJECTED"),
        ],
        expected_outcome={"phase": "LIME", "success_min": 0.3, "risk_max": 0.6}
    ),
    "random_walk": Scenario(
        id="random_walk",
        name="무작위 경로",
        description="랜덤 이벤트 시퀀스",
        route_code="PH-KR",
        events=[],  # 동적 생성
        expected_outcome={}
    ),
}

def get_scenario(scenario_id: str) -> Scenario:
    return SCENARIOS.get(scenario_id)

def list_scenarios() -> List[str]:
    return list(SCENARIOS.keys())
