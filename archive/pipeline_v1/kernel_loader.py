"""
LimePass Kernel Loader
======================
Runtime loader for Event → RulePack → Flow → ScoreCard pipeline.

Usage:
    kernel = LimePassKernel(country="KR")
    kernel.emit("EVT::LGO_DATA_SHARED", {"lgo_id": "001", "data_submission_rate": 0.82})
"""

import json
import yaml
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class EvaluationMode(Enum):
    ALL = "all"
    ANY = "any"
    WEIGHTED = "weighted"


class ExecutionMode(Enum):
    SYNC = "sync"
    ASYNC = "async"
    HYBRID = "hybrid"


@dataclass
class Condition:
    id: str
    field: str
    op: str
    value: Any
    weight: float = 1.0
    required: bool = True


@dataclass
class RulePack:
    pack_id: str
    version: str
    conditions: List[Condition]
    evaluation_mode: EvaluationMode
    threshold: float
    on_pass: Dict[str, Any]
    on_fail: Dict[str, Any]
    listens_to: List[str] = field(default_factory=list)


@dataclass 
class FlowStep:
    step_id: str
    order: int
    name: str
    action_type: str
    action_config: Dict[str, Any]
    execution_mode: ExecutionMode = ExecutionMode.ASYNC
    on_success: Optional[Dict[str, Any]] = None
    on_failure: Optional[Dict[str, Any]] = None


@dataclass
class Flow:
    flow_id: str
    version: str
    steps: List[FlowStep]
    execution_mode: ExecutionMode
    timeout_seconds: int
    on_complete: Dict[str, Any]


@dataclass
class ScoreCardMetric:
    metric_id: str
    name: str
    weight: float
    max_points: int
    calculation_type: str
    thresholds: Dict[str, float]


@dataclass
class ScoreCard:
    scorecard_id: str
    version: str
    entity_type: str
    max_score: int
    metrics: List[ScoreCardMetric]
    tiers: List[Dict[str, Any]]
    decay_rules: Dict[str, Any]


class LimePassKernel:
    """Main kernel class that loads and executes the pipeline."""
    
    def __init__(self, kernel_path: str = "./limepass-kernel", country: str = "KR"):
        self.kernel_path = Path(kernel_path)
        self.country = country
        
        self.events: Dict[str, Dict] = {}
        self.rulepacks: Dict[str, RulePack] = {}
        self.flows: Dict[str, Flow] = {}
        self.scorecards: Dict[str, ScoreCard] = {}
        self.delta: Dict[str, Any] = {}
        
        self._load_all()
        
    def _load_yaml(self, path: Path) -> Dict:
        """Load YAML file."""
        with open(path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    
    def _load_json(self, path: Path) -> Dict:
        """Load JSON file."""
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _apply_delta(self, base: Dict, delta_key: str) -> Dict:
        """Apply country-specific delta overrides."""
        if not self.delta:
            return base
            
        overrides = self.delta.get(delta_key, {})
        if not overrides:
            return base
            
        # Deep merge
        def merge(a: Dict, b: Dict) -> Dict:
            result = a.copy()
            for key, value in b.items():
                if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                    result[key] = merge(result[key], value)
                else:
                    result[key] = value
            return result
        
        return merge(base, overrides)
    
    def _load_events(self):
        """Load all event definitions."""
        events_path = self.kernel_path / "events"
        for yaml_file in events_path.glob("*.yaml"):
            events = self._load_yaml(yaml_file)
            for event_id, event_def in events.items():
                if event_id.startswith("EVT::"):
                    self.events[event_id] = event_def
        print(f"Loaded {len(self.events)} events")
    
    def _load_rulepacks(self):
        """Load all RulePack definitions."""
        rulepacks_path = self.kernel_path / "rulepacks"
        for json_file in rulepacks_path.glob("*.json"):
            if json_file.name == "schema.json":
                continue
            data = self._load_json(json_file)
            
            # Apply delta
            pack_name = data["pack_id"].replace("RulePack::", "")
            if self.delta and "rulepacks" in self.delta:
                if pack_name in self.delta["rulepacks"]:
                    data = self._apply_delta(data, f"rulepacks.{pack_name}")
            
            conditions = [
                Condition(
                    id=c["id"],
                    field=c["field"],
                    op=c["op"],
                    value=c["value"],
                    weight=c.get("weight", 1.0),
                    required=c.get("required", True)
                )
                for c in data["conditions"]
            ]
            
            self.rulepacks[data["pack_id"]] = RulePack(
                pack_id=data["pack_id"],
                version=data["version"],
                conditions=conditions,
                evaluation_mode=EvaluationMode(data.get("evaluation_mode", "all")),
                threshold=data.get("threshold", 1.0),
                on_pass=data["on_pass"],
                on_fail=data.get("on_fail", {}),
                listens_to=data.get("listens_to", [])
            )
        print(f"Loaded {len(self.rulepacks)} rulepacks")
    
    def _load_flows(self):
        """Load all Flow definitions."""
        flows_path = self.kernel_path / "flows"
        for json_file in flows_path.glob("*.json"):
            if json_file.name == "schema.json":
                continue
            data = self._load_json(json_file)
            
            steps = [
                FlowStep(
                    step_id=s["step_id"],
                    order=s["order"],
                    name=s["name"],
                    action_type=s["action_type"],
                    action_config=s.get("action_config", {}),
                    execution_mode=ExecutionMode(s.get("execution_mode", "async")),
                    on_success=s.get("on_success"),
                    on_failure=s.get("on_failure")
                )
                for s in data["steps"]
            ]
            
            self.flows[data["flow_id"]] = Flow(
                flow_id=data["flow_id"],
                version=data["version"],
                steps=sorted(steps, key=lambda x: x.order),
                execution_mode=ExecutionMode(data.get("execution_mode", "async")),
                timeout_seconds=data.get("timeout_seconds", 300),
                on_complete=data["on_complete"]
            )
        print(f"Loaded {len(self.flows)} flows")
    
    def _load_scorecards(self):
        """Load all ScoreCard definitions."""
        scorecards_path = self.kernel_path / "scorecards"
        for json_file in scorecards_path.glob("*.json"):
            if json_file.name == "schema.json":
                continue
            data = self._load_json(json_file)
            
            metrics = [
                ScoreCardMetric(
                    metric_id=m["metric_id"],
                    name=m["name"],
                    weight=m["weight"],
                    max_points=m["max_points"],
                    calculation_type=m["calculation_type"],
                    thresholds=m.get("thresholds", {})
                )
                for m in data["metrics"]
            ]
            
            self.scorecards[data["scorecard_id"]] = ScoreCard(
                scorecard_id=data["scorecard_id"],
                version=data["version"],
                entity_type=data["entity_type"],
                max_score=data.get("max_score", 100),
                metrics=metrics,
                tiers=data.get("tiers", []),
                decay_rules=data.get("decay_rules", {})
            )
        print(f"Loaded {len(self.scorecards)} scorecards")
    
    def _load_delta(self):
        """Load country-specific delta."""
        delta_file = self.kernel_path / "deltas" / f"{self.country.lower()}.yaml"
        if delta_file.exists():
            self.delta = self._load_yaml(delta_file)
            print(f"Loaded delta for {self.country}")
        else:
            print(f"No delta found for {self.country}, using defaults")
    
    def _load_all(self):
        """Load all kernel components."""
        self._load_delta()
        self._load_events()
        self._load_rulepacks()
        self._load_flows()
        self._load_scorecards()
    
    def _evaluate_condition(self, condition: Condition, data: Dict) -> bool:
        """Evaluate a single condition against data."""
        if condition.field not in data:
            return not condition.required
        
        value = data[condition.field]
        expected = condition.value
        
        ops = {
            "==": lambda a, b: a == b,
            "!=": lambda a, b: a != b,
            ">=": lambda a, b: a >= b,
            "<=": lambda a, b: a <= b,
            ">": lambda a, b: a > b,
            "<": lambda a, b: a < b,
            "in": lambda a, b: a in b,
            "not_in": lambda a, b: a not in b,
            "contains": lambda a, b: b in a,
            "exists": lambda a, b: a is not None,
        }
        
        return ops.get(condition.op, lambda a, b: False)(value, expected)
    
    def evaluate_rulepack(self, pack_id: str, data: Dict) -> tuple[bool, float]:
        """
        Evaluate a RulePack against provided data.
        Returns (passed, score).
        """
        if pack_id not in self.rulepacks:
            raise ValueError(f"Unknown RulePack: {pack_id}")
        
        pack = self.rulepacks[pack_id]
        
        if pack.evaluation_mode == EvaluationMode.ALL:
            passed = all(
                self._evaluate_condition(c, data)
                for c in pack.conditions
            )
            return passed, 1.0 if passed else 0.0
        
        elif pack.evaluation_mode == EvaluationMode.ANY:
            passed = any(
                self._evaluate_condition(c, data)
                for c in pack.conditions
            )
            return passed, 1.0 if passed else 0.0
        
        elif pack.evaluation_mode == EvaluationMode.WEIGHTED:
            total_weight = sum(c.weight for c in pack.conditions)
            score = sum(
                c.weight for c in pack.conditions
                if self._evaluate_condition(c, data)
            ) / total_weight if total_weight > 0 else 0
            return score >= pack.threshold, score
        
        return False, 0.0
    
    def emit(self, event_id: str, data: Dict) -> Dict[str, Any]:
        """
        Emit an event and process through the pipeline.
        Returns execution result.
        """
        if event_id not in self.events:
            raise ValueError(f"Unknown event: {event_id}")
        
        event_def = self.events[event_id]
        result = {
            "event_id": event_id,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
            "rulepacks_evaluated": [],
            "flows_triggered": [],
            "scorecards_updated": []
        }
        
        # Find RulePacks that listen to this event
        target_pack_id = event_def.get("emits_to")
        if target_pack_id and target_pack_id in self.rulepacks:
            passed, score = self.evaluate_rulepack(target_pack_id, data)
            
            result["rulepacks_evaluated"].append({
                "pack_id": target_pack_id,
                "passed": passed,
                "score": score
            })
            
            if passed:
                pack = self.rulepacks[target_pack_id]
                if "trigger_flow" in pack.on_pass:
                    flow_id = pack.on_pass["trigger_flow"]
                    result["flows_triggered"].append(flow_id)
                    # In real implementation, would trigger async flow execution
        
        # Generate audit hash
        result["audit_hash"] = hashlib.sha256(
            json.dumps(result, sort_keys=True, default=str).encode()
        ).hexdigest()
        
        return result
    
    def get_event_info(self, event_id: str) -> Optional[Dict]:
        """Get event definition."""
        return self.events.get(event_id)
    
    def get_rulepack_info(self, pack_id: str) -> Optional[RulePack]:
        """Get RulePack definition."""
        return self.rulepacks.get(pack_id)
    
    def get_flow_info(self, flow_id: str) -> Optional[Flow]:
        """Get Flow definition."""
        return self.flows.get(flow_id)
    
    def get_scorecard_info(self, scorecard_id: str) -> Optional[ScoreCard]:
        """Get ScoreCard definition."""
        return self.scorecards.get(scorecard_id)
    
    def list_events(self) -> List[str]:
        """List all event IDs."""
        return list(self.events.keys())
    
    def list_rulepacks(self) -> List[str]:
        """List all RulePack IDs."""
        return list(self.rulepacks.keys())
    
    def list_flows(self) -> List[str]:
        """List all Flow IDs."""
        return list(self.flows.keys())
    
    def list_scorecards(self) -> List[str]:
        """List all ScoreCard IDs."""
        return list(self.scorecards.keys())


# Example usage
if __name__ == "__main__":
    import os
    # Initialize kernel with Korea settings
    kernel_path = os.path.dirname(os.path.abspath(__file__))
    kernel = LimePassKernel(kernel_path=kernel_path, country="KR")
    
    print("\n=== Events ===")
    for event_id in kernel.list_events()[:5]:
        print(f"  {event_id}")
    print(f"  ... and {len(kernel.list_events()) - 5} more")
    
    print("\n=== RulePacks ===")
    for pack_id in kernel.list_rulepacks():
        print(f"  {pack_id}")
    
    print("\n=== Flows ===")
    for flow_id in kernel.list_flows():
        print(f"  {flow_id}")
    
    print("\n=== ScoreCards ===")
    for sc_id in kernel.list_scorecards():
        print(f"  {sc_id}")
    
    # Test event emission
    print("\n=== Test Event Emission ===")
    result = kernel.emit("EVT::LGO_DATA_SHARED", {
        "lgo_id": "LGO_001",
        "data_type": "student_data",
        "data_submission_rate": 0.82,
        "submitted_at": "2024-12-08T10:00:00Z",
        "contact_verified": True
    })
    
    print(f"Event: {result['event_id']}")
    print(f"RulePacks evaluated: {result['rulepacks_evaluated']}")
    print(f"Flows triggered: {result['flows_triggered']}")
    print(f"Audit hash: {result['audit_hash'][:16]}...")
