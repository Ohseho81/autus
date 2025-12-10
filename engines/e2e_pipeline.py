"""
AUTUS E2E Pipeline
National Layer + CORE Packs 통합 파이프라인

사용자 여정 전체를 하나의 흐름으로 처리:
[지원] → [서류] → [심사] → [훈련] → [비자] → [취업] → [정착]
"""
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass

sys.path.insert(0, str(Path(__file__).parent.parent))

# National Layer
from engines.national import (
    NationalVector,
    NationalKernelService,
    NationalScenarioEngine,
    compute_risk,
    compute_success_probability,
    compute_j_score,
)

# CORE Packs
from packs.core.vector_pack import VectorPack
from packs.core.event_pack import EventPack
from packs.core.phase_pack import PhasePack


@dataclass
class JourneyState:
    """여정 상태"""
    entity_id: str
    route_code: str
    core_vector: Dict[str, float]
    national_vector: Dict[str, float]
    phase: str
    j_score: int
    risk: float
    success: float
    events_processed: int


class E2EPipeline:
    """End-to-End 파이프라인"""
    
    def __init__(self, route_code: str = "PH-KR"):
        self.route_code = route_code
        
        # CORE Packs
        self._vector_pack = VectorPack()
        self._event_pack = EventPack()
        self._phase_pack = PhasePack()
        
        # National Layer
        self._national_kernel = NationalKernelService(route_code)
        self._scenario_engine = NationalScenarioEngine()
        
        # State
        self._states: Dict[str, JourneyState] = {}
    
    def create_journey(self, entity_id: str, entity_type: str = "HUM") -> JourneyState:
        """새 여정 생성"""
        # CORE Vector 초기화
        self._vector_pack.execute({
            "action": "create",
            "entity_id": entity_id,
            "entity_type": entity_type,
            "domain": "LIME",
        })
        
        # Phase 초기화
        self._phase_pack.execute({
            "action": "initialize",
            "entity_id": entity_id,
        })
        
        # National Vector 초기화
        national_v = NationalVector()
        
        state = JourneyState(
            entity_id=entity_id,
            route_code=self.route_code,
            core_vector={"DIR": 0.5, "FOR": 0.5, "GAP": 0.5, "UNC": 0.5, "TEM": 0.5, "INT": 0.5},
            national_vector=national_v.to_dict(),
            phase="INIT",
            j_score=50,
            risk=compute_risk(national_v),
            success=compute_success_probability(national_v),
            events_processed=0,
        )
        
        self._states[entity_id] = state
        return state
    
    def process_event(self, entity_id: str, event_code: str) -> Dict[str, Any]:
        """이벤트 처리 (CORE + National 동시 적용)"""
        if entity_id not in self._states:
            return {"error": f"Journey not found: {entity_id}"}
        
        state = self._states[entity_id]
        
        # === CORE Pack 처리 ===
        # 1. Event → Delta
        event_result = self._event_pack.execute({
            "action": "process",
            "event_code": event_code,
            "entity_id": entity_id,
        })
        core_delta = event_result.get("delta", {})
        
        # 2. Delta → Vector
        vector_result = self._vector_pack.execute({
            "action": "apply_delta",
            "entity_id": entity_id,
            "delta": core_delta,
        })
        
        # 3. Phase 업데이트
        phase_result = self._phase_pack.execute({
            "action": "record_event",
            "entity_id": entity_id,
            "event_code": event_code,
        })
        
        # === National Layer 처리 ===
        national_v = NationalVector.from_dict(state.national_vector)
        
        # National 이벤트 코드 변환 (HUM.DOCUMENT.APPROVED → HUM.DOC.APPROVED)
        national_event = self._convert_event_code(event_code)
        national_v = self._national_kernel.apply_event(national_v, national_event)
        
        # === 상태 업데이트 ===
        new_j = vector_result.get("new_j", state.j_score)
        
        state.core_vector = vector_result.get("state", {}).get("vector", state.core_vector)
        state.national_vector = national_v.to_dict()
        state.j_score = new_j
        state.risk = compute_risk(national_v)
        state.success = compute_success_probability(national_v)
        state.events_processed += 1
        
        # Phase 전이 체크
        if phase_result.get("can_transition"):
            state.phase = phase_result.get("next", state.phase)
        
        return {
            "entity_id": entity_id,
            "event": event_code,
            "core": {
                "delta": core_delta,
                "j_score": new_j,
            },
            "national": {
                "vector": national_v.to_dict(),
                "risk": round(state.risk, 3),
                "success": round(state.success, 3),
            },
            "phase": {
                "current": state.phase,
                "can_transition": phase_result.get("can_transition"),
                "next": phase_result.get("next"),
            },
        }
    
    def process_journey(self, entity_id: str, events: List[str]) -> Dict[str, Any]:
        """전체 여정 시뮬레이션"""
        if entity_id not in self._states:
            self.create_journey(entity_id)
        
        history = []
        for event in events:
            result = self.process_event(entity_id, event)
            history.append({
                "event": event,
                "j_score": result["core"]["j_score"],
                "risk": result["national"]["risk"],
                "phase": result["phase"]["current"],
            })
        
        state = self._states[entity_id]
        
        return {
            "entity_id": entity_id,
            "route_code": self.route_code,
            "events_processed": len(history),
            "final_state": {
                "j_score": state.j_score,
                "risk": round(state.risk, 3),
                "success": round(state.success, 3),
                "phase": state.phase,
            },
            "history": history,
        }
    
    def compare_scenarios(self, entity_id: str, scenarios: Dict[str, List[str]]) -> Dict[str, Any]:
        """여러 시나리오 비교"""
        results = {}
        
        for name, events in scenarios.items():
            # 새 여정으로 시뮬레이션
            temp_id = f"{entity_id}_{name}"
            self.create_journey(temp_id)
            result = self.process_journey(temp_id, events)
            results[name] = result["final_state"]
            
            # 임시 상태 삭제
            del self._states[temp_id]
        
        # 최고/최저 찾기
        best = max(results.items(), key=lambda x: x[1]["j_score"])
        worst = min(results.items(), key=lambda x: x[1]["j_score"])
        
        return {
            "scenarios": results,
            "best": {"name": best[0], **best[1]},
            "worst": {"name": worst[0], **worst[1]},
        }
    
    def get_state(self, entity_id: str) -> Optional[JourneyState]:
        """현재 상태 조회"""
        return self._states.get(entity_id)
    
    def _convert_event_code(self, core_event: str) -> str:
        """CORE 이벤트 코드 → National 이벤트 코드 변환"""
        mapping = {
            "HUM.APPLICATION.SUBMITTED": "HUM.APPLY.SUBMITTED",
            "HUM.DOCUMENT.SUBMITTED": "HUM.DOC.UPLOADED",
            "HUM.DOCUMENT.APPROVED": "HUM.DOC.APPROVED",
            "HUM.DOCUMENT.REJECTED": "HUM.DOC.REJECTED",
            "HUM.VISA.APPROVED": "GOV.VISA.APPROVED",
            "HUM.VISA.REJECTED": "GOV.VISA.REJECTED",
            "HUM.EMPLOYMENT.MATCHED": "EMP.OFFER.RECEIVED",
            "HUM.EMPLOYMENT.STARTED": "EMP.CONTRACT.SIGNED",
            "HUM.SETTLEMENT.COMPLETE": "CITY.SETTLEMENT.COMPLETE",
            "HUM.TRAINING.COMPLETED": "HUM.TRAINING.COMPLETED",
            "HUM.SCREENING.PASSED": "HUM.MEDICAL.PASSED",
            "HUM.MEDICAL.CLEARED": "HUM.MEDICAL.PASSED",
        }
        return mapping.get(core_event, core_event)


# === 사전 정의 여정 ===
JOURNEY_TEMPLATES = {
    "success": [
        "HUM.APPLICATION.SUBMITTED",
        "HUM.DOCUMENT.SUBMITTED",
        "HUM.DOCUMENT.APPROVED",
        "HUM.SCREENING.PASSED",
        "HUM.MEDICAL.CLEARED",
        "HUM.TRAINING.COMPLETED",
        "HUM.VISA.APPROVED",
        "HUM.EMPLOYMENT.MATCHED",
        "HUM.EMPLOYMENT.STARTED",
        "HUM.SETTLEMENT.COMPLETE",
    ],
    "delayed": [
        "HUM.APPLICATION.SUBMITTED",
        "HUM.DOCUMENT.SUBMITTED",
        "HUM.DOCUMENT.REJECTED",
        "HUM.DOCUMENT.SUBMITTED",
        "HUM.DOCUMENT.APPROVED",
        "HUM.SCREENING.PASSED",
        "HUM.TRAINING.COMPLETED",
        "HUM.VISA.APPROVED",
        "HUM.EMPLOYMENT.STARTED",
        "HUM.SETTLEMENT.COMPLETE",
    ],
    "fail": [
        "HUM.APPLICATION.SUBMITTED",
        "HUM.DOCUMENT.SUBMITTED",
        "HUM.DOCUMENT.REJECTED",
        "HUM.DOCUMENT.REJECTED",
        "HUM.VISA.REJECTED",
    ],
}


if __name__ == "__main__":
    print("=" * 60)
    print("  AUTUS E2E Pipeline Test")
    print("=" * 60)
    print()
    
    pipeline = E2EPipeline("PH-KR")
    
    # 시나리오 비교
    print("📊 시나리오 비교:")
    comparison = pipeline.compare_scenarios("TEST", JOURNEY_TEMPLATES)
    
    for name, state in comparison["scenarios"].items():
        print(f"  {name}: J={state['j_score']}, Risk={state['risk']}, Success={state['success']}")
    
    print()
    print(f"🏆 Best: {comparison['best']['name']} (J={comparison['best']['j_score']})")
    print(f"⚠️ Worst: {comparison['worst']['name']} (J={comparison['worst']['j_score']})")
    print()
    
    # 단일 여정 상세
    print("📋 Success 여정 상세:")
    pipeline.create_journey("HUM-001")
    result = pipeline.process_journey("HUM-001", JOURNEY_TEMPLATES["success"])
    
    for h in result["history"]:
        print(f"  {h['event']}: J={h['j_score']}, Risk={h['risk']}, Phase={h['phase']}")
    
    print()
    print(f"최종: J={result['final_state']['j_score']}, Risk={result['final_state']['risk']}")
