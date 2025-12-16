"""
LimePass Flow Executor
======================
Executes Flow steps with async support, retry logic, and state management.

Usage:
    executor = FlowExecutor(kernel)
    result = await executor.execute("Flow::LGO_MOU", context)
"""

import asyncio
import json
import hashlib
import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Callable, Awaitable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("FlowExecutor")


class StepStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    SUCCESS = "success"
    FAILED = "failed"
    SKIPPED = "skipped"
    RETRYING = "retrying"


class FlowStatus(Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


@dataclass
class StepResult:
    step_id: str
    status: StepStatus
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    retry_count: int = 0
    duration_ms: int = 0


@dataclass
class FlowExecution:
    flow_id: str
    execution_id: str
    status: FlowStatus
    context: Dict[str, Any]
    step_results: List[StepResult] = field(default_factory=list)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    total_duration_ms: int = 0
    audit_hash: Optional[str] = None
    emitted_events: List[str] = field(default_factory=list)
    scorecard_updates: List[Dict[str, Any]] = field(default_factory=list)


# Type alias for action handlers
ActionHandler = Callable[[Dict[str, Any], Dict[str, Any]], Awaitable[Dict[str, Any]]]


class ActionRegistry:
    """Registry for action type handlers."""
    
    def __init__(self):
        self._handlers: Dict[str, ActionHandler] = {}
        self._register_default_handlers()
    
    def _register_default_handlers(self):
        """Register built-in action handlers."""
        self.register("generate_document", self._handle_generate_document)
        self.register("send_notification", self._handle_send_notification)
        self.register("api_call", self._handle_api_call)
        self.register("create_record", self._handle_create_record)
        self.register("update_scorecard", self._handle_update_scorecard)
        self.register("human_approval", self._handle_human_approval)
        self.register("data_validation", self._handle_data_validation)
        self.register("report_generation", self._handle_report_generation)
    
    def register(self, action_type: str, handler: ActionHandler):
        """Register a custom action handler."""
        self._handlers[action_type] = handler
        logger.debug(f"Registered handler for action type: {action_type}")
    
    def get(self, action_type: str) -> Optional[ActionHandler]:
        """Get handler for action type."""
        return self._handlers.get(action_type)
    
    # ========== Default Action Handlers ==========
    
    async def _handle_generate_document(
        self, config: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate document from template."""
        template_id = config.get("template_id")
        output_format = config.get("output_format", "pdf")
        variables = config.get("variables", [])
        storage_path = config.get("storage_path", "/documents/")
        
        # Resolve variables from context
        resolved_vars = {}
        for var in variables:
            if var in context:
                resolved_vars[var] = context[var]
        
        # Simulate document generation
        doc_id = hashlib.md5(
            f"{template_id}:{json.dumps(resolved_vars)}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]
        
        doc_path = f"{storage_path}{doc_id}.{output_format}"
        
        logger.info(f"Generated document: {doc_path} from template {template_id}")
        
        return {
            "document_id": doc_id,
            "document_path": doc_path,
            "template_id": template_id,
            "format": output_format,
            "variables_used": resolved_vars,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _handle_send_notification(
        self, config: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send notification via configured channels."""
        notification_type = config.get("notification_type")
        channels = config.get("channels", ["email"])
        template_id = config.get("template_id")
        recipients = config.get("recipients", [])
        
        # If recipients not in config, check context
        if not recipients and "notify" in context:
            recipients = context["notify"]
        
        notifications_sent = []
        for channel in channels:
            for recipient in recipients:
                notif_id = hashlib.md5(
                    f"{channel}:{recipient}:{datetime.now().isoformat()}".encode()
                ).hexdigest()[:8]
                notifications_sent.append({
                    "id": notif_id,
                    "channel": channel,
                    "recipient": recipient,
                    "status": "sent"
                })
                logger.info(f"Notification sent: {channel} -> {recipient}")
        
        return {
            "notification_type": notification_type,
            "template_id": template_id,
            "notifications": notifications_sent,
            "sent_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _handle_api_call(
        self, config: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make API call (simulated)."""
        endpoint = config.get("endpoint")
        method = config.get("method", "GET")
        payload_template = config.get("payload_template", {})
        
        # Resolve payload variables
        payload = {}
        for key, value in payload_template.items():
            if isinstance(value, str) and value.startswith("{{") and value.endswith("}}"):
                var_name = value[2:-2]
                payload[key] = context.get(var_name, value)
            else:
                payload[key] = value
        
        # Simulate API response
        response_id = hashlib.md5(
            f"{endpoint}:{method}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:8]
        
        logger.info(f"API Call: {method} {endpoint}")
        
        return {
            "request_id": response_id,
            "endpoint": endpoint,
            "method": method,
            "payload": payload,
            "response_code": 200,
            "response_body": {"success": True, "id": response_id},
            "called_at": datetime.now(timezone.utc).isoformat()
        }
    
    async def _handle_create_record(
        self, config: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create database record."""
        record_type = config.get("record_type")
        entity_type = config.get("entity_type")
        initial_data = config.get("initial_data", {})
        
        # Generate record ID
        record_id = hashlib.md5(
            f"{record_type}:{entity_type}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:12]
        
        entity_id = context.get(f"{entity_type}_id", context.get("entity_id"))
        
        record = {
            "record_id": record_id,
            "record_type": record_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            **initial_data,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Created record: {record_type} for {entity_type}:{entity_id}")
        
        return record
    
    async def _handle_update_scorecard(
        self, config: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update entity scorecard."""
        scorecard_id = config.get("scorecard_id")
        entity_id = context.get("entity_id")
        score_delta = config.get("score_delta", 0)
        metrics = config.get("metrics", {})
        
        # Simulate scorecard update
        new_score = context.get("current_score", 50) + score_delta
        
        update_record = {
            "scorecard_id": scorecard_id,
            "entity_id": entity_id,
            "previous_score": context.get("current_score", 50),
            "score_delta": score_delta,
            "new_score": new_score,
            "metrics_updated": metrics,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "update_hash": hashlib.sha256(
                f"{scorecard_id}:{entity_id}:{new_score}:{datetime.now().isoformat()}".encode()
            ).hexdigest()
        }
        
        logger.info(f"ScoreCard updated: {entity_id} -> {new_score}")
        
        return update_record
    
    async def _handle_human_approval(
        self, config: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Request human approval (creates approval request)."""
        approval_type = config.get("approval_type")
        required_roles = config.get("required_roles", [])
        deadline_hours = config.get("deadline_hours", 72)
        
        approval_id = hashlib.md5(
            f"{approval_type}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:10]
        
        approval_request = {
            "approval_id": approval_id,
            "approval_type": approval_type,
            "required_roles": required_roles,
            "deadline_hours": deadline_hours,
            "status": "pending",
            "requested_at": datetime.now(timezone.utc).isoformat(),
            "context_snapshot": {k: v for k, v in context.items() if k not in ["_internal"]}
        }
        
        # In real implementation, this would create an approval request
        # and the step would wait. For now, we simulate auto-approval.
        approval_request["status"] = "approved"
        approval_request["approved_at"] = datetime.now(timezone.utc).isoformat()
        approval_request["approved_by"] = "system_auto_approve"
        
        logger.info(f"Approval requested: {approval_id} ({approval_type})")
        
        return approval_request
    
    async def _handle_data_validation(
        self, config: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate data against rules."""
        validation_type = config.get("validation_type", "standard")
        validation_rules = config.get("validation_rules", [])
        source_format = config.get("source_format")
        target_format = config.get("target_format")
        success_threshold = config.get("success_threshold", 0.80)
        
        # Simulate validation
        validation_results = []
        passed_count = 0
        
        for rule in validation_rules:
            # Simulate 90% pass rate
            passed = hash(f"{rule}:{datetime.now().microsecond}") % 10 < 9
            if passed:
                passed_count += 1
            validation_results.append({
                "rule": rule,
                "passed": passed,
                "details": "Validation passed" if passed else "Validation failed"
            })
        
        total_rules = len(validation_rules) if validation_rules else 1
        pass_rate = passed_count / total_rules
        overall_passed = pass_rate >= success_threshold
        
        result = {
            "validation_type": validation_type,
            "source_format": source_format,
            "target_format": target_format,
            "results": validation_results,
            "pass_rate": pass_rate,
            "threshold": success_threshold,
            "passed": overall_passed,
            "validated_at": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Data validation: {pass_rate:.1%} pass rate, overall: {'PASS' if overall_passed else 'FAIL'}")
        
        return result
    
    async def _handle_report_generation(
        self, config: Dict[str, Any], context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate analytical report."""
        report_type = config.get("report_type")
        data_sources = config.get("data_sources", [])
        metrics = config.get("metrics", [])
        output_formats = config.get("output_formats", ["pdf"])
        storage_path = config.get("storage_path", "/reports/")
        
        report_id = hashlib.md5(
            f"{report_type}:{datetime.now().isoformat()}".encode()
        ).hexdigest()[:10]
        
        generated_files = []
        for fmt in output_formats:
            file_path = f"{storage_path}{report_id}.{fmt}"
            generated_files.append({
                "format": fmt,
                "path": file_path,
                "size_bytes": 1024 * (hash(file_path) % 100 + 50)  # Simulated size
            })
        
        result = {
            "report_id": report_id,
            "report_type": report_type,
            "data_sources_used": data_sources,
            "metrics_included": metrics,
            "generated_files": generated_files,
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        logger.info(f"Report generated: {report_id} ({report_type})")
        
        return result


class FlowExecutor:
    """Main executor for Flow pipelines."""
    
    def __init__(self, kernel, action_registry: Optional[ActionRegistry] = None):
        self.kernel = kernel
        self.registry = action_registry or ActionRegistry()
        self._executions: Dict[str, FlowExecution] = {}
    
    def _generate_execution_id(self) -> str:
        """Generate unique execution ID."""
        return hashlib.md5(
            f"exec:{datetime.now().isoformat()}:{id(self)}".encode()
        ).hexdigest()[:16]
    
    def _generate_audit_hash(self, execution: FlowExecution) -> str:
        """Generate immutable audit hash for execution."""
        audit_data = {
            "flow_id": execution.flow_id,
            "execution_id": execution.execution_id,
            "status": execution.status.value,
            "started_at": execution.started_at,
            "completed_at": execution.completed_at,
            "step_results": [
                {
                    "step_id": r.step_id,
                    "status": r.status.value,
                    "output_hash": hashlib.md5(
                        json.dumps(r.output or {}, sort_keys=True).encode()
                    ).hexdigest() if r.output else None
                }
                for r in execution.step_results
            ]
        }
        return hashlib.sha256(
            json.dumps(audit_data, sort_keys=True).encode()
        ).hexdigest()
    
    async def _execute_step(
        self,
        step: Any,  # FlowStep from kernel
        context: Dict[str, Any],
        retry_policy: Dict[str, Any]
    ) -> StepResult:
        """Execute a single flow step."""
        result = StepResult(
            step_id=step.step_id,
            status=StepStatus.RUNNING,
            started_at=datetime.now(timezone.utc).isoformat()
        )
        
        start_time = datetime.now()
        max_retries = retry_policy.get("max_retries", 3)
        backoff_multiplier = retry_policy.get("backoff_multiplier", 2)
        initial_delay = retry_policy.get("initial_delay_seconds", 10)
        
        handler = self.registry.get(step.action_type)
        if not handler:
            result.status = StepStatus.FAILED
            result.error = f"No handler for action type: {step.action_type}"
            result.completed_at = datetime.now(timezone.utc).isoformat()
            return result
        
        last_error = None
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    result.status = StepStatus.RETRYING
                    result.retry_count = attempt
                    delay = initial_delay * (backoff_multiplier ** (attempt - 1))
                    logger.info(f"Retrying step {step.step_id} (attempt {attempt + 1}) after {delay}s")
                    await asyncio.sleep(min(delay, 5))  # Cap delay for demo
                
                output = await handler(step.action_config, context)
                
                result.status = StepStatus.SUCCESS
                result.output = output
                result.completed_at = datetime.now(timezone.utc).isoformat()
                result.duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                
                logger.info(f"Step {step.step_id} completed successfully")
                return result
                
            except Exception as e:
                last_error = str(e)
                logger.warning(f"Step {step.step_id} failed (attempt {attempt + 1}): {e}")
                
                if attempt == max_retries:
                    result.status = StepStatus.FAILED
                    result.error = last_error
                    result.completed_at = datetime.now(timezone.utc).isoformat()
                    result.duration_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        return result
    
    async def execute(
        self,
        flow_id: str,
        context: Dict[str, Any],
        timeout_override: Optional[int] = None
    ) -> FlowExecution:
        """
        Execute a complete flow.
        
        Args:
            flow_id: Flow ID to execute
            context: Execution context with variables
            timeout_override: Optional timeout override in seconds
        
        Returns:
            FlowExecution with results
        """
        flow = self.kernel.get_flow_info(flow_id)
        if not flow:
            raise ValueError(f"Unknown flow: {flow_id}")
        
        execution_id = self._generate_execution_id()
        execution = FlowExecution(
            flow_id=flow_id,
            execution_id=execution_id,
            status=FlowStatus.RUNNING,
            context=context.copy(),
            started_at=datetime.now(timezone.utc).isoformat()
        )
        
        self._executions[execution_id] = execution
        
        logger.info(f"Starting flow execution: {flow_id} ({execution_id})")
        
        timeout = timeout_override or flow.timeout_seconds
        start_time = datetime.now()
        
        # Get retry policy from flow
        retry_policy = {
            "max_retries": 3,
            "backoff_multiplier": 2,
            "initial_delay_seconds": 1
        }
        if hasattr(flow, 'retry_policy') and flow.retry_policy:
            retry_policy.update(flow.retry_policy)
        
        try:
            # Execute steps in order
            running_context = context.copy()
            
            for step in flow.steps:
                # Check timeout
                elapsed = (datetime.now() - start_time).total_seconds()
                if elapsed > timeout:
                    execution.status = FlowStatus.TIMEOUT
                    logger.warning(f"Flow {flow_id} timed out after {elapsed:.1f}s")
                    break
                
                logger.info(f"Executing step: {step.step_id} ({step.name})")
                
                step_result = await self._execute_step(step, running_context, retry_policy)
                execution.step_results.append(step_result)
                
                if step_result.status == StepStatus.SUCCESS:
                    # Update running context with step output
                    if step_result.output:
                        running_context.update(step_result.output)
                    
                    # Handle on_success
                    if step.on_success:
                        if "emit_event" in step.on_success:
                            execution.emitted_events.append(step.on_success["emit_event"])
                else:
                    # Step failed
                    if step.on_failure:
                        # Check for fallback
                        if step.on_failure.get("fallback_step"):
                            logger.info(f"Falling back to: {step.on_failure['fallback_step']}")
                            # In full implementation, would jump to fallback step
                    
                    # For required steps, fail the flow
                    execution.status = FlowStatus.FAILED
                    logger.error(f"Flow {flow_id} failed at step {step.step_id}")
                    break
            
            # If we completed all steps successfully
            if execution.status == FlowStatus.RUNNING:
                execution.status = FlowStatus.COMPLETED
                
                # Process on_complete
                on_complete = flow.on_complete
                if on_complete.get("emit_event"):
                    execution.emitted_events.append(on_complete["emit_event"])
                
                if on_complete.get("update_scorecard"):
                    execution.scorecard_updates.append({
                        "triggered_by": flow_id,
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    })
                
                logger.info(f"Flow {flow_id} completed successfully")
        
        except asyncio.CancelledError:
            execution.status = FlowStatus.CANCELLED
            logger.warning(f"Flow {flow_id} was cancelled")
        
        except Exception as e:
            execution.status = FlowStatus.FAILED
            logger.error(f"Flow {flow_id} failed with error: {e}")
            traceback.print_exc()
        
        finally:
            execution.completed_at = datetime.now(timezone.utc).isoformat()
            execution.total_duration_ms = int(
                (datetime.now() - start_time).total_seconds() * 1000
            )
            execution.audit_hash = self._generate_audit_hash(execution)
        
        return execution
    
    def get_execution(self, execution_id: str) -> Optional[FlowExecution]:
        """Get execution by ID."""
        return self._executions.get(execution_id)
    
    def list_executions(self) -> List[str]:
        """List all execution IDs."""
        return list(self._executions.keys())


def execution_to_dict(execution: FlowExecution) -> Dict[str, Any]:
    """Convert FlowExecution to dictionary for JSON serialization."""
    return {
        "flow_id": execution.flow_id,
        "execution_id": execution.execution_id,
        "status": execution.status.value,
        "started_at": execution.started_at,
        "completed_at": execution.completed_at,
        "total_duration_ms": execution.total_duration_ms,
        "step_results": [
            {
                "step_id": r.step_id,
                "status": r.status.value,
                "started_at": r.started_at,
                "completed_at": r.completed_at,
                "duration_ms": r.duration_ms,
                "retry_count": r.retry_count,
                "output": r.output,
                "error": r.error
            }
            for r in execution.step_results
        ],
        "emitted_events": execution.emitted_events,
        "scorecard_updates": execution.scorecard_updates,
        "audit_hash": execution.audit_hash
    }


# ============ Main Test ============

async def main():
    """Test the Flow Executor."""
    import os
    import sys
    
    # Add kernel path
    kernel_path = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, kernel_path)
    
    from kernel_loader import LimePassKernel
    
    # Initialize kernel and executor
    kernel = LimePassKernel(kernel_path=kernel_path, country="KR")
    executor = FlowExecutor(kernel)
    
    print("\n" + "="*60)
    print("FLOW EXECUTOR TEST")
    print("="*60)
    
    # Test context (simulating data after event emission)
    context = {
        "lgo_id": "LGO_SEOUL_001",
        "lgo_name": "서울특별시 강남구",
        "contact_person": "김담당",
        "contact_email": "kim@gangnam.go.kr",
        "effective_date": "2024-12-15",
        "terms": "standard_mou_terms_v1",
        "expected_students": 150,
        "economic_impact": 2500000000,
        "signing_date": "2024-12-14"
    }
    
    # Execute LGO MOU Flow
    print(f"\nExecuting Flow::LGO_MOU with context:")
    print(f"  lgo_id: {context['lgo_id']}")
    print(f"  lgo_name: {context['lgo_name']}")
    
    execution = await executor.execute("Flow::LGO_MOU", context)
    
    # Print results
    print(f"\n{'='*60}")
    print("EXECUTION RESULTS")
    print("="*60)
    print(f"Flow ID: {execution.flow_id}")
    print(f"Execution ID: {execution.execution_id}")
    print(f"Status: {execution.status.value}")
    print(f"Duration: {execution.total_duration_ms}ms")
    
    print(f"\nStep Results:")
    for step in execution.step_results:
        status_icon = "✓" if step.status == StepStatus.SUCCESS else "✗"
        print(f"  {status_icon} {step.step_id}: {step.status.value} ({step.duration_ms}ms)")
        if step.output and "document_id" in step.output:
            print(f"      → Document: {step.output.get('document_path', 'N/A')}")
        if step.output and "approval_id" in step.output:
            print(f"      → Approval: {step.output.get('approval_id')} ({step.output.get('status')})")
    
    print(f"\nEmitted Events: {execution.emitted_events}")
    print(f"ScoreCard Updates: {len(execution.scorecard_updates)}")
    print(f"Audit Hash: {execution.audit_hash[:32]}...")
    
    # Test another flow
    print(f"\n{'='*60}")
    print("EXECUTING Flow::EMP_ONBOARD")
    print("="*60)
    
    emp_context = {
        "emp_id": "EMP_SAMSUNG_001",
        "emp_name": "삼성전자",
        "entity_id": "EMP_SAMSUNG_001",
        "job_title": "Software Engineer Intern",
        "salary_range": "3000000-4000000",
        "work_hours": "09:00-18:00"
    }
    
    execution2 = await executor.execute("Flow::EMP_ONBOARD", emp_context)
    
    print(f"Status: {execution2.status.value}")
    print(f"Duration: {execution2.total_duration_ms}ms")
    print(f"Steps completed: {sum(1 for s in execution2.step_results if s.status == StepStatus.SUCCESS)}/{len(execution2.step_results)}")
    
    # Export execution result
    result_dict = execution_to_dict(execution)
    print(f"\n{'='*60}")
    print("EXPORTED EXECUTION (JSON)")
    print("="*60)
    print(json.dumps(result_dict, indent=2, ensure_ascii=False)[:1500] + "...")


if __name__ == "__main__":
    asyncio.run(main())
