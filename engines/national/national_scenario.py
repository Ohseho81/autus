"""
National Meaning Layer OS v1
NationalScenarioEngine - 시나리오 비교 엔진
"""
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from .national_vector import NationalVector
from .national_service import NationalKernelService


@dataclass
class NationalScenario:
    """국가 시나리오 정의"""
    id: str
    name: str
    route_code: str
    events: List[str]
    description: str = ""


# === 사전 정의 시나리오 ===
SCENARIOS = {
    "ph_kr_success": NationalScenario(
        id="ph_kr_success",
        name="PH→KR 성공 케이스",
        route_code="PH-KR",
        events=[
            "HUM.APPLY.SUBMITTED",
            "HUM.DOC.UPLOADED",
            "HUM.DOC.APPROVED",
            "HUM.MEDICAL.PASSED",
            "EDU.LANGUAGE.PASSED",
            "HUM.TRAINING.COMPLETED",
            "GOV.VISA.SUBMITTED",
            "GOV.VISA.APPROVED",
            "EMP.OFFER.RECEIVED",
            "EMP.OFFER.ACCEPTED",
            "EMP.CONTRACT.SIGNED",
            "CITY.ARRIVAL.CONFIRMED",
            "CITY.HOUSING.SECURED",
            "CITY.BANK.OPENED",
            "CITY.SETTLEMENT.COMPLETE",
        ],
        description="순조로운 PH→KR 이주 과정",
    ),
    "ph_kr_delayed": NationalScenario(
        id="ph_kr_delayed",
        name="PH→KR 지연 케이스",
        route_code="PH-KR",
        events=[
            "HUM.APPLY.SUBMITTED",
            "HUM.DOC.UPLOADED",
            "HUM.DOC.REJECTED",       # 서류 거절
            "HUM.DOC.UPLOADED",        # 재제출
            "HUM.DOC.APPROVED",
            "HUM.MEDICAL.PASSED",
            "EDU.LANGUAGE.PASSED",
            "HUM.TRAINING.COMPLETED",
            "GOV.VISA.SUBMITTED",
            "GOV.VISA.APPROVED",
            "EMP.OFFER.RECEIVED",
            "EMP.OFFER.ACCEPTED",
            "CITY.ARRIVAL.CONFIRMED",
            "CITY.SETTLEMENT.COMPLETE",
        ],
        description="서류 거절 후 재제출하여 성공",
    ),
    "ph_kr_fail": NationalScenario(
        id="ph_kr_fail",
        name="PH→KR 실패 케이스",
        route_code="PH-KR",
        events=[
            "HUM.APPLY.SUBMITTED",
            "HUM.DOC.UPLOADED",
            "HUM.DOC.REJECTED",
            "HUM.DOC.UPLOADED",
            "HUM.DOC.REJECTED",        # 두 번째 거절
            "EDU.ADMISSION.REJECTED",
            "GOV.VISA.REJECTED",
            "CITY.SETTLEMENT.FAIL",
        ],
        description="다중 거절로 인한 실패",
    ),
    "vn_kr_success": NationalScenario(
        id="vn_kr_success",
        name="VN→KR 성공 케이스",
        route_code="VN-KR",
        events=[
            "HUM.APPLY.SUBMITTED",
            "HUM.DOC.APPROVED",
            "HUM.MEDICAL.PASSED",
            "HUM.TRAINING.COMPLETED",
            "GOV.VISA.APPROVED",
            "EMP.OFFER.ACCEPTED",
            "CITY.SETTLEMENT.COMPLETE",
        ],
        description="순조로운 VN→KR 이주 과정",
    ),
}


class NationalScenarioEngine:
    """국가 시나리오 비교 엔진"""

    def run(self, scenario: NationalScenario, 
            initial_vector: Optional[NationalVector] = None) -> Dict[str, Any]:
        """단일 시나리오 실행"""
        if initial_vector is None:
            initial_vector = NationalVector()
        
        kernel = NationalKernelService(route_code=scenario.route_code)
        result = kernel.apply_events(initial_vector, scenario.events)
        
        result["scenario_id"] = scenario.id
        result["scenario_name"] = scenario.name
        result["description"] = scenario.description
        
        return result

    def compare(self, scenarios: List[NationalScenario],
                initial_vector: Optional[NationalVector] = None) -> Dict[str, Any]:
        """여러 시나리오 비교"""
        results = [self.run(s, initial_vector) for s in scenarios]
        
        best_success = max(results, key=lambda x: x["final_success"])
        best_risk = min(results, key=lambda x: x["final_risk"])
        best_j = max(results, key=lambda x: x["final_j_score"])
        
        return {
            "scenarios_count": len(results),
            "results": results,
            "best_by_success": {
                "scenario_id": best_success["scenario_id"],
                "success": best_success["final_success"],
            },
            "best_by_risk": {
                "scenario_id": best_risk["scenario_id"],
                "risk": best_risk["final_risk"],
            },
            "best_by_j_score": {
                "scenario_id": best_j["scenario_id"],
                "j_score": best_j["final_j_score"],
            },
            "summary": [
                {
                    "id": r["scenario_id"],
                    "name": r["scenario_name"],
                    "j_score": r["final_j_score"],
                    "risk": r["final_risk"],
                    "success": r["final_success"],
                }
                for r in results
            ],
        }

    def run_preset(self, scenario_id: str,
                   initial_vector: Optional[NationalVector] = None) -> Dict[str, Any]:
        """사전 정의 시나리오 실행"""
        if scenario_id not in SCENARIOS:
            return {"error": f"Unknown scenario: {scenario_id}"}
        return self.run(SCENARIOS[scenario_id], initial_vector)

    def compare_presets(self, scenario_ids: List[str],
                        initial_vector: Optional[NationalVector] = None) -> Dict[str, Any]:
        """사전 정의 시나리오 비교"""
        scenarios = [SCENARIOS[sid] for sid in scenario_ids if sid in SCENARIOS]
        if not scenarios:
            return {"error": "No valid scenarios found"}
        return self.compare(scenarios, initial_vector)

    @staticmethod
    def list_presets() -> List[Dict[str, str]]:
        """사전 정의 시나리오 목록"""
        return [
            {"id": s.id, "name": s.name, "route": s.route_code, "description": s.description}
            for s in SCENARIOS.values()
        ]


if __name__ == "__main__":
    print("=== NationalScenarioEngine 테스트 ===\n")
    
    engine = NationalScenarioEngine()
    
    # 사전 정의 시나리오 목록
    print("📋 사전 정의 시나리오:")
    for s in engine.list_presets():
        print(f"  - {s['id']}: {s['name']} ({s['route']})")
    print()
    
    # PH-KR 3개 시나리오 비교
    result = engine.compare_presets(["ph_kr_success", "ph_kr_delayed", "ph_kr_fail"])
    
    print("📊 시나리오 비교 결과:")
    for s in result["summary"]:
        print(f"  {s['id']}: J={s['j_score']}, Risk={s['risk']}, Success={s['success']}")
    
    print(f"\n🏆 Best by J-Score: {result['best_by_j_score']['scenario_id']}")
    print(f"🏆 Best by Risk: {result['best_by_risk']['scenario_id']}")
