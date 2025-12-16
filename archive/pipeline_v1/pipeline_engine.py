"""
LimePass Pipeline Engine
========================
Unified engine that connects: Event → RulePack → Flow → ScoreCard

This is the main entry point for the LimePass OS automation.

Usage:
    engine = PipelineEngine(country="KR")
    result = await engine.process_event("EVT::LGO_DATA_SHARED", data)
"""

import asyncio
import json
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import os
import sys

# Setup path
kernel_path = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, kernel_path)

from kernel_loader import LimePassKernel
from flow_executor import FlowExecutor, FlowExecution, execution_to_dict, FlowStatus

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger("PipelineEngine")


class PipelineStage(Enum):
    EVENT_RECEIVED = "event_received"
    RULEPACK_EVALUATING = "rulepack_evaluating"
    RULEPACK_PASSED = "rulepack_passed"
    RULEPACK_FAILED = "rulepack_failed"
    FLOW_EXECUTING = "flow_executing"
    FLOW_COMPLETED = "flow_completed"
    FLOW_FAILED = "flow_failed"
    SCORECARD_UPDATING = "scorecard_updating"
    PIPELINE_COMPLETED = "pipeline_completed"
    PIPELINE_FAILED = "pipeline_failed"


@dataclass
class ScoreCardUpdate:
    scorecard_id: str
    entity_id: str
    entity_type: str
    previous_score: float
    new_score: float
    metrics_changed: Dict[str, Any]
    updated_at: str
    update_hash: str


@dataclass
class PipelineResult:
    """Complete result of a pipeline execution."""
    pipeline_id: str
    event_id: str
    event_data: Dict[str, Any]
    stage: PipelineStage
    
    # RulePack results
    rulepack_id: Optional[str] = None
    rulepack_passed: bool = False
    rulepack_score: float = 0.0
    
    # Flow results
    flow_id: Optional[str] = None
    flow_execution: Optional[FlowExecution] = None
    
    # ScoreCard results
    scorecard_updates: List[ScoreCardUpdate] = field(default_factory=list)
    
    # Timing
    started_at: str = ""
    completed_at: str = ""
    total_duration_ms: int = 0
    
    # Audit
    audit_hash: str = ""
    rekor_logged: bool = False
    
    # Cascade events (events emitted during flow)
    cascade_events: List[str] = field(default_factory=list)
    
    # Errors
    error: Optional[str] = None


class ScoreCardManager:
    """Manages ScoreCard calculations and updates."""
    
    def __init__(self, kernel: LimePassKernel):
        self.kernel = kernel
        self._entity_scores: Dict[str, Dict[str, float]] = {}  # entity_id -> {metric: value}
    
    def calculate_score(
        self,
        scorecard_id: str,
        entity_id: str,
        metrics_data: Dict[str, float]
    ) -> tuple[float, Dict[str, float]]:
        """
        Calculate score based on scorecard definition and metrics.
        Returns (total_score, per_metric_scores).
        """
        scorecard = self.kernel.get_scorecard_info(scorecard_id)
        if not scorecard:
            return 0.0, {}
        
        per_metric_scores = {}
        total_score = 0.0
        
        for metric in scorecard.metrics:
            metric_id = metric.metric_id
            if metric_id not in metrics_data:
                continue
            
            value = metrics_data[metric_id]
            thresholds = metric.thresholds
            
            # Calculate metric score based on thresholds
            if metric.calculation_type == "percentage":
                # Value is already a percentage (0-1)
                if value >= thresholds.get("excellent", 0.95):
                    score_pct = 1.0
                elif value >= thresholds.get("good", 0.85):
                    score_pct = 0.85
                elif value >= thresholds.get("fair", 0.70):
                    score_pct = 0.70
                elif value >= thresholds.get("poor", 0.50):
                    score_pct = 0.50
                else:
                    score_pct = 0.25
            else:
                # Default linear calculation
                score_pct = min(value / thresholds.get("excellent", 100), 1.0)
            
            metric_score = score_pct * metric.max_points
            per_metric_scores[metric_id] = metric_score
            total_score += metric_score
        
        return min(total_score, scorecard.max_score), per_metric_scores
    
    def update_score(
        self,
        scorecard_id: str,
        entity_id: str,
        entity_type: str,
        metrics_data: Dict[str, float]
    ) -> ScoreCardUpdate:
        """Update entity's scorecard."""
        # Get previous score
        prev_data = self._entity_scores.get(entity_id, {})
        prev_score = sum(prev_data.values()) if prev_data else 50.0  # Default starting score
        
        # Calculate new score
        new_score, per_metric = self.calculate_score(scorecard_id, entity_id, metrics_data)
        
        # Store updated scores
        self._entity_scores[entity_id] = per_metric
        
        # Create update record
        update = ScoreCardUpdate(
            scorecard_id=scorecard_id,
            entity_id=entity_id,
            entity_type=entity_type,
            previous_score=prev_score,
            new_score=new_score,
            metrics_changed=per_metric,
            updated_at=datetime.now(timezone.utc).isoformat(),
            update_hash=hashlib.sha256(
                f"{scorecard_id}:{entity_id}:{new_score}:{datetime.now().isoformat()}".encode()
            ).hexdigest()
        )
        
        logger.info(f"ScoreCard updated: {entity_type}:{entity_id} {prev_score:.1f} -> {new_score:.1f}")
        
        return update
    
    def get_tier(self, scorecard_id: str, score: float) -> Optional[str]:
        """Get tier name for a given score."""
        scorecard = self.kernel.get_scorecard_info(scorecard_id)
        if not scorecard:
            return None
        
        for tier in scorecard.tiers:
            min_score = tier.get("min_score", 0)
            max_score = tier.get("max_score", 100)
            if min_score <= score <= max_score:
                return tier.get("tier_name")
        
        return None


class RekorLogger:
    """Simulated Rekor transparency log for immutable audit records."""
    
    def __init__(self):
        self._entries: List[Dict[str, Any]] = []
    
    def log(self, data: Dict[str, Any]) -> str:
        """Log data to Rekor and return entry ID."""
        entry_id = hashlib.sha256(
            json.dumps(data, sort_keys=True, default=str).encode()
        ).hexdigest()[:16]
        
        entry = {
            "entry_id": entry_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data_hash": hashlib.sha256(
                json.dumps(data, sort_keys=True, default=str).encode()
            ).hexdigest(),
            "data": data
        }
        
        self._entries.append(entry)
        logger.debug(f"Rekor logged: {entry_id}")
        
        return entry_id
    
    def verify(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Verify and retrieve entry by ID."""
        for entry in self._entries:
            if entry["entry_id"] == entry_id:
                return entry
        return None
    
    def get_entries_for_entity(self, entity_id: str) -> List[Dict[str, Any]]:
        """Get all entries for an entity."""
        return [
            e for e in self._entries 
            if e.get("data", {}).get("entity_id") == entity_id
        ]


class PipelineEngine:
    """
    Main pipeline engine that orchestrates:
    Event → RulePack → Flow → ScoreCard
    """
    
    def __init__(self, country: str = "KR", kernel_path: Optional[str] = None):
        self.country = country
        kpath = kernel_path or os.path.dirname(os.path.abspath(__file__))
        
        self.kernel = LimePassKernel(kernel_path=kpath, country=country)
        self.executor = FlowExecutor(self.kernel)
        self.scorecard_manager = ScoreCardManager(self.kernel)
        self.rekor = RekorLogger()
        
        self._pipeline_history: List[PipelineResult] = []
        
        logger.info(f"PipelineEngine initialized for country: {country}")
    
    def _generate_pipeline_id(self) -> str:
        """Generate unique pipeline ID."""
        return f"pipe_{hashlib.md5(datetime.now().isoformat().encode()).hexdigest()[:12]}"
    
    def _generate_audit_hash(self, result: PipelineResult) -> str:
        """Generate audit hash for pipeline result."""
        audit_data = {
            "pipeline_id": result.pipeline_id,
            "event_id": result.event_id,
            "stage": result.stage.value,
            "rulepack_id": result.rulepack_id,
            "rulepack_passed": result.rulepack_passed,
            "flow_id": result.flow_id,
            "started_at": result.started_at,
            "completed_at": result.completed_at
        }
        return hashlib.sha256(
            json.dumps(audit_data, sort_keys=True).encode()
        ).hexdigest()
    
    async def process_event(
        self,
        event_id: str,
        data: Dict[str, Any],
        auto_scorecard: bool = True
    ) -> PipelineResult:
        """
        Process an event through the complete pipeline.
        
        Args:
            event_id: Event identifier (e.g., "EVT::LGO_DATA_SHARED")
            data: Event data/payload
            auto_scorecard: Whether to auto-update scorecards
        
        Returns:
            PipelineResult with complete execution details
        """
        start_time = datetime.now()
        
        result = PipelineResult(
            pipeline_id=self._generate_pipeline_id(),
            event_id=event_id,
            event_data=data.copy(),
            stage=PipelineStage.EVENT_RECEIVED,
            started_at=start_time.astimezone(timezone.utc).isoformat()
        )
        
        logger.info(f"Pipeline started: {result.pipeline_id} for event {event_id}")
        
        try:
            # 1. Validate event exists
            event_def = self.kernel.get_event_info(event_id)
            if not event_def:
                raise ValueError(f"Unknown event: {event_id}")
            
            # 2. Evaluate RulePack
            result.stage = PipelineStage.RULEPACK_EVALUATING
            target_rulepack = event_def.get("emits_to")
            
            if target_rulepack:
                result.rulepack_id = target_rulepack
                passed, score = self.kernel.evaluate_rulepack(target_rulepack, data)
                result.rulepack_passed = passed
                result.rulepack_score = score
                
                if passed:
                    result.stage = PipelineStage.RULEPACK_PASSED
                    logger.info(f"RulePack {target_rulepack} PASSED (score: {score:.2f})")
                else:
                    result.stage = PipelineStage.RULEPACK_FAILED
                    logger.info(f"RulePack {target_rulepack} FAILED (score: {score:.2f})")
            
            # 3. Execute Flow (if RulePack passed)
            if result.rulepack_passed and result.rulepack_id:
                rulepack = self.kernel.get_rulepack_info(result.rulepack_id)
                if rulepack and "trigger_flow" in rulepack.on_pass:
                    flow_id = rulepack.on_pass["trigger_flow"]
                    result.flow_id = flow_id
                    result.stage = PipelineStage.FLOW_EXECUTING
                    
                    logger.info(f"Executing flow: {flow_id}")
                    
                    # Execute the flow
                    flow_execution = await self.executor.execute(flow_id, data)
                    result.flow_execution = flow_execution
                    
                    if flow_execution.status == FlowStatus.COMPLETED:
                        result.stage = PipelineStage.FLOW_COMPLETED
                        result.cascade_events = flow_execution.emitted_events
                        logger.info(f"Flow {flow_id} completed successfully")
                    else:
                        result.stage = PipelineStage.FLOW_FAILED
                        logger.warning(f"Flow {flow_id} failed: {flow_execution.status.value}")
            
            # 4. Update ScoreCard (if flow completed and auto_scorecard enabled)
            if auto_scorecard and result.stage == PipelineStage.FLOW_COMPLETED:
                result.stage = PipelineStage.SCORECARD_UPDATING
                
                # Determine entity type and scorecard from event
                entity_type = self._infer_entity_type(event_id)
                entity_id = data.get(f"{entity_type}_id") or data.get("entity_id")
                
                if entity_type and entity_id:
                    scorecard_id = f"ScoreCard::{entity_type.title()}"
                    if entity_type == "lgo":
                        scorecard_id = "ScoreCard::LocalGov"
                    
                    # Extract metrics from data
                    metrics_data = self._extract_metrics(data, entity_type)
                    
                    if metrics_data:
                        update = self.scorecard_manager.update_score(
                            scorecard_id=scorecard_id,
                            entity_id=entity_id,
                            entity_type=entity_type,
                            metrics_data=metrics_data
                        )
                        result.scorecard_updates.append(update)
            
            # 5. Finalize
            if result.stage in [PipelineStage.FLOW_COMPLETED, PipelineStage.SCORECARD_UPDATING]:
                result.stage = PipelineStage.PIPELINE_COMPLETED
            elif result.stage == PipelineStage.RULEPACK_FAILED:
                pass  # Keep as RULEPACK_FAILED
            else:
                result.stage = PipelineStage.PIPELINE_FAILED
        
        except Exception as e:
            result.stage = PipelineStage.PIPELINE_FAILED
            result.error = str(e)
            logger.error(f"Pipeline failed: {e}")
        
        finally:
            result.completed_at = datetime.now(timezone.utc).isoformat()
            result.total_duration_ms = int(
                (datetime.now() - start_time).total_seconds() * 1000
            )
            result.audit_hash = self._generate_audit_hash(result)
            
            # Log to Rekor
            rekor_entry = self.rekor.log({
                "pipeline_id": result.pipeline_id,
                "event_id": result.event_id,
                "stage": result.stage.value,
                "audit_hash": result.audit_hash,
                "entity_id": data.get("entity_id") or data.get("lgo_id") or data.get("uni_id") or data.get("emp_id")
            })
            result.rekor_logged = True
            
            self._pipeline_history.append(result)
        
        return result
    
    def _infer_entity_type(self, event_id: str) -> Optional[str]:
        """Infer entity type from event ID."""
        if "LGO" in event_id:
            return "lgo"
        elif "UNI" in event_id:
            return "university"
        elif "EMP" in event_id:
            return "employer"
        elif "PHGOV" in event_id:
            return "phgov"
        elif "GOV" in event_id:
            return "gov"
        return None
    
    def _extract_metrics(self, data: Dict[str, Any], entity_type: str) -> Dict[str, float]:
        """Extract scorecard metrics from event data."""
        metrics = {}
        
        # Map common fields to metrics
        field_mappings = {
            "lgo": {
                "data_submission_rate": "data_submission",
                "pr_activities_count": "pr_engagement",
                "approval_hours": "approval_speed",
                "economic_impact_score": "economic_impact"
            },
            "university": {
                "attendance_feed_rate": "attendance_feed",
                "gpa_feed_rate": "gpa_feed",
                "department_count": "department_participation",
                "tuition_data_rate": "tuition_data_quality"
            },
            "employer": {
                "worklog_accuracy_rate": "worklog_accuracy",
                "payroll_pass_rate": "payroll_quality",
                "evaluation_response_rate": "evaluation_response",
                "retention_rate": "retention_improvement",
                "satisfaction_score": "satisfaction_score"
            }
        }
        
        mappings = field_mappings.get(entity_type, {})
        for data_field, metric_id in mappings.items():
            if data_field in data:
                metrics[metric_id] = float(data[data_field])
        
        return metrics
    
    def get_pipeline_history(
        self,
        entity_id: Optional[str] = None,
        limit: int = 100
    ) -> List[PipelineResult]:
        """Get pipeline execution history."""
        history = self._pipeline_history
        
        if entity_id:
            history = [
                p for p in history
                if entity_id in str(p.event_data)
            ]
        
        return history[-limit:]
    
    def get_entity_score(
        self,
        scorecard_id: str,
        entity_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get current score for an entity."""
        scores = self.scorecard_manager._entity_scores.get(entity_id)
        if not scores:
            return None
        
        total = sum(scores.values())
        tier = self.scorecard_manager.get_tier(scorecard_id, total)
        
        return {
            "scorecard_id": scorecard_id,
            "entity_id": entity_id,
            "total_score": total,
            "tier": tier,
            "metrics": scores
        }


def pipeline_result_to_dict(result: PipelineResult) -> Dict[str, Any]:
    """Convert PipelineResult to dictionary."""
    return {
        "pipeline_id": result.pipeline_id,
        "event_id": result.event_id,
        "event_data": result.event_data,
        "stage": result.stage.value,
        "rulepack": {
            "id": result.rulepack_id,
            "passed": result.rulepack_passed,
            "score": result.rulepack_score
        } if result.rulepack_id else None,
        "flow": {
            "id": result.flow_id,
            "status": result.flow_execution.status.value if result.flow_execution else None,
            "steps_completed": len([
                s for s in result.flow_execution.step_results
                if s.status.value == "success"
            ]) if result.flow_execution else 0
        } if result.flow_id else None,
        "scorecard_updates": [
            {
                "scorecard_id": u.scorecard_id,
                "entity_id": u.entity_id,
                "previous_score": u.previous_score,
                "new_score": u.new_score,
                "update_hash": u.update_hash
            }
            for u in result.scorecard_updates
        ],
        "cascade_events": result.cascade_events,
        "timing": {
            "started_at": result.started_at,
            "completed_at": result.completed_at,
            "duration_ms": result.total_duration_ms
        },
        "audit": {
            "hash": result.audit_hash,
            "rekor_logged": result.rekor_logged
        },
        "error": result.error
    }


# ============ Test ============

async def main():
    """Test the complete pipeline."""
    print("\n" + "="*70)
    print("LIMEPASS PIPELINE ENGINE TEST")
    print("="*70)
    
    # Initialize engine
    engine = PipelineEngine(country="KR")
    
    # Test 1: LGO Data Shared (should pass and trigger flow)
    print("\n[TEST 1] EVT::LGO_DATA_SHARED - Expected: RulePack PASS → Flow Execute")
    print("-"*70)
    
    result1 = await engine.process_event("EVT::LGO_DATA_SHARED", {
        "lgo_id": "LGO_GANGNAM_001",
        "lgo_name": "서울특별시 강남구",
        "data_type": "student_registry",
        "data_submission_rate": 0.85,  # 85% - above KR threshold of 75%
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "contact_person": "김담당",
        "contact_email": "kim@gangnam.go.kr",
        "contact_verified": True,
        "economic_report_generated": True
    })
    
    print(f"Pipeline ID: {result1.pipeline_id}")
    print(f"Stage: {result1.stage.value}")
    print(f"RulePack: {result1.rulepack_id} - {'✓ PASSED' if result1.rulepack_passed else '✗ FAILED'} (score: {result1.rulepack_score:.2f})")
    if result1.flow_id:
        print(f"Flow: {result1.flow_id} - {result1.flow_execution.status.value if result1.flow_execution else 'N/A'}")
    print(f"Cascade Events: {result1.cascade_events}")
    print(f"Duration: {result1.total_duration_ms}ms")
    
    # Test 2: LGO Data Shared with low submission rate (should fail RulePack)
    print("\n[TEST 2] EVT::LGO_DATA_SHARED - Expected: RulePack FAIL (low submission rate)")
    print("-"*70)
    
    result2 = await engine.process_event("EVT::LGO_DATA_SHARED", {
        "lgo_id": "LGO_RURAL_001",
        "lgo_name": "전남 신안군",
        "data_type": "student_registry",
        "data_submission_rate": 0.55,  # 55% - below threshold
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "contact_verified": False
    })
    
    print(f"Pipeline ID: {result2.pipeline_id}")
    print(f"Stage: {result2.stage.value}")
    print(f"RulePack: {result2.rulepack_id} - {'✓ PASSED' if result2.rulepack_passed else '✗ FAILED'} (score: {result2.rulepack_score:.2f})")
    print(f"Duration: {result2.total_duration_ms}ms")
    
    # Test 3: University Event
    print("\n[TEST 3] EVT::UNI_ADMISSION_API_READY - Expected: RulePack PASS")
    print("-"*70)
    
    result3 = await engine.process_event("EVT::UNI_ADMISSION_API_READY", {
        "uni_id": "UNI_YONSEI_001",
        "uni_name": "연세대학교",
        "api_endpoint": "https://api.yonsei.ac.kr/admission",
        "api_key_hash": "abc123hash",
        "test_success_rate": 0.92,  # 92% - above threshold
        "tested_at": datetime.now(timezone.utc).isoformat(),
        "department_count": 5,
        "mou_status": "signed"
    })
    
    print(f"Pipeline ID: {result3.pipeline_id}")
    print(f"Stage: {result3.stage.value}")
    print(f"RulePack: {result3.rulepack_id} - {'✓ PASSED' if result3.rulepack_passed else '✗ FAILED'} (score: {result3.rulepack_score:.2f})")
    if result3.flow_id:
        print(f"Flow: {result3.flow_id}")
    print(f"Duration: {result3.total_duration_ms}ms")
    
    # Test 4: Employer Event
    print("\n[TEST 4] EVT::EMP_PAYROLL_VALIDATED - Expected: RulePack PASS")
    print("-"*70)
    
    result4 = await engine.process_event("EVT::EMP_PAYROLL_VALIDATED", {
        "emp_id": "EMP_KAKAO_001",
        "emp_name": "카카오",
        "validation_id": "VAL_001",
        "pass_rate": 0.96,
        "validated_at": datetime.now(timezone.utc).isoformat(),
        "records_checked": 150,
        "payroll_validation_pass_rate": 0.96,
        "worklog_upload_rate": 0.88,
        "evaluation_response_rate": 0.75
    })
    
    print(f"Pipeline ID: {result4.pipeline_id}")
    print(f"Stage: {result4.stage.value}")
    print(f"RulePack: {result4.rulepack_id} - {'✓ PASSED' if result4.rulepack_passed else '✗ FAILED'}")
    if result4.flow_id:
        print(f"Flow: {result4.flow_id}")
    print(f"Duration: {result4.total_duration_ms}ms")
    
    # Summary
    print("\n" + "="*70)
    print("PIPELINE EXECUTION SUMMARY")
    print("="*70)
    
    history = engine.get_pipeline_history()
    completed = sum(1 for r in history if r.stage == PipelineStage.PIPELINE_COMPLETED)
    failed_rulepack = sum(1 for r in history if r.stage == PipelineStage.RULEPACK_FAILED)
    
    print(f"Total Pipelines: {len(history)}")
    print(f"  ✓ Completed: {completed}")
    print(f"  ✗ RulePack Failed: {failed_rulepack}")
    print(f"  ✗ Other Failures: {len(history) - completed - failed_rulepack}")
    
    # Export one result as JSON
    print("\n" + "="*70)
    print("SAMPLE PIPELINE RESULT (JSON)")
    print("="*70)
    print(json.dumps(pipeline_result_to_dict(result1), indent=2, ensure_ascii=False)[:2000])
    
    print("\n✅ Pipeline Engine Test Complete!")


if __name__ == "__main__":
    asyncio.run(main())
