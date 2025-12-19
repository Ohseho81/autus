"""Simulator - 시나리오 실행 엔진"""
from typing import Dict, List, Any
import random
from .scenario import Scenario, SimEvent, get_scenario, list_scenarios
from .twin_world import TwinWorld, TwinEntity

class Simulator:
    """시뮬레이션 엔진"""
    
    def __init__(self):
        self.world = TwinWorld()
        self.results = []
    
    def run_scenario(self, scenario_id: str, entity_id: str = None) -> Dict[str, Any]:
        """시나리오 실행"""
        scenario = get_scenario(scenario_id)
        if not scenario:
            return {"error": f"Scenario {scenario_id} not found"}
        
        # 새 월드 생성
        self.world = TwinWorld()
        entity_id = entity_id or f"SIM-{self.world.world_id}"
        self.world.create_entity(entity_id, "people")
        
        # 이벤트 실행
        processed = []
        for event in scenario.events:
            # 확률 체크
            if random.random() > event.probability:
                processed.append({"event": event.event_code, "skipped": True, "reason": "probability"})
                continue
            
            result = self.world.process_event(entity_id, event.event_code)
            processed.append({
                "event": event.event_code,
                "result": result
            })
        
        # 최종 상태
        entity = self.world.get_entity(entity_id)
        final_state = {
            "phase": entity.phase,
            "risk": entity.risk,
            "success": entity.success,
            "vector": entity.vector
        }
        
        # 결과 검증
        validation = self._validate_outcome(final_state, scenario.expected_outcome)
        
        result = {
            "scenario_id": scenario_id,
            "scenario_name": scenario.name,
            "entity_id": entity_id,
            "events_processed": len([p for p in processed if not p.get("skipped")]),
            "events_skipped": len([p for p in processed if p.get("skipped")]),
            "final_state": final_state,
            "expected_outcome": scenario.expected_outcome,
            "validation": validation,
            "history": processed
        }
        
        self.results.append(result)
        return result
    
    def _validate_outcome(self, actual: Dict, expected: Dict) -> Dict[str, Any]:
        """결과 검증"""
        if not expected:
            return {"status": "no_expectation"}
        
        checks = []
        passed = True
        
        if "phase" in expected:
            phase_ok = actual["phase"] == expected["phase"]
            checks.append({"check": "phase", "expected": expected["phase"], "actual": actual["phase"], "passed": phase_ok})
            passed = passed and phase_ok
        
        if "success_min" in expected:
            success_ok = actual["success"] >= expected["success_min"]
            checks.append({"check": "success_min", "expected": expected["success_min"], "actual": actual["success"], "passed": success_ok})
            passed = passed and success_ok
        
        if "risk_max" in expected:
            risk_ok = actual["risk"] <= expected["risk_max"]
            checks.append({"check": "risk_max", "expected": expected["risk_max"], "actual": actual["risk"], "passed": risk_ok})
            passed = passed and risk_ok
        
        return {"passed": passed, "checks": checks}
    
    def run_batch(self, scenario_ids: List[str], runs_per_scenario: int = 10) -> Dict[str, Any]:
        """배치 시뮬레이션"""
        batch_results = []
        
        for scenario_id in scenario_ids:
            scenario_results = []
            for i in range(runs_per_scenario):
                result = self.run_scenario(scenario_id, f"BATCH-{scenario_id}-{i}")
                scenario_results.append(result)
            
            # 통계
            successes = [r["final_state"]["success"] for r in scenario_results]
            risks = [r["final_state"]["risk"] for r in scenario_results]
            validations = [r["validation"]["passed"] for r in scenario_results if r["validation"].get("passed") is not None]
            
            batch_results.append({
                "scenario_id": scenario_id,
                "runs": runs_per_scenario,
                "avg_success": sum(successes) / len(successes),
                "avg_risk": sum(risks) / len(risks),
                "validation_rate": sum(validations) / len(validations) if validations else None
            })
        
        return {"batch_results": batch_results}
    
    def get_training_data(self) -> List[Dict]:
        """학습 데이터 추출"""
        training_data = []
        for result in self.results:
            for i, event in enumerate(result.get("history", [])):
                if event.get("skipped"):
                    continue
                training_data.append({
                    "scenario_id": result["scenario_id"],
                    "entity_id": result["entity_id"],
                    "step": i,
                    "event_code": event["event"],
                    "result": event.get("result", {})
                })
        return training_data
