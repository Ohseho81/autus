"""
Workflow Engine for executing and managing workflows.
"""

from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import asyncio
import logging
from datetime import datetime
import uuid


class WorkflowStatus(Enum):
    """Workflow execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class StepStatus(Enum):
    """Individual step execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class WorkflowContext:
    """Context passed between workflow steps."""
    data: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    variables: Dict[str, Any] = field(default_factory=dict)


class WorkflowStep(ABC):
    """Abstract base class for workflow steps."""
    
    def __init__(self, name: str, description: str = ""):
        self.name = name
        self.description = description
        self.status = StepStatus.PENDING
        self.error: Optional[Exception] = None
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
    
    @abstractmethod
    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        """Execute the workflow step."""
        pass
    
    async def validate(self, context: WorkflowContext) -> bool:
        """Validate if step can be executed with given context."""
        return True
    
    async def rollback(self, context: WorkflowContext) -> None:
        """Rollback changes made by this step."""
        pass


class ConditionalStep(WorkflowStep):
    """Step that executes based on a condition."""
    
    def __init__(
        self,
        name: str,
        condition: Callable[[WorkflowContext], bool],
        true_step: Optional[WorkflowStep] = None,
        false_step: Optional[WorkflowStep] = None,
        description: str = ""
    ):
        super().__init__(name, description)
        self.condition = condition
        self.true_step = true_step
        self.false_step = false_step
    
    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        """Execute conditional logic."""
        try:
            self.status = StepStatus.RUNNING
            self.start_time = datetime.now()
            
            if self.condition(context):
                if self.true_step:
                    context = await self.true_step.execute(context)
            else:
                if self.false_step:
                    context = await self.false_step.execute(context)
            
            self.status = StepStatus.COMPLETED
            return context
        except Exception as e:
            self.status = StepStatus.FAILED
            self.error = e
            raise
        finally:
            self.end_time = datetime.now()


class ParallelStep(WorkflowStep):
    """Step that executes multiple sub-steps in parallel."""
    
    def __init__(self, name: str, steps: List[WorkflowStep], description: str = ""):
        super().__init__(name, description)
        self.steps = steps
    
    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        """Execute all sub-steps in parallel."""
        try:
            self.status = StepStatus.RUNNING
            self.start_time = datetime.now()
            
            # Create tasks for all steps
            tasks = []
            for step in self.steps:
                # Create a copy of context for each parallel step
                step_context = WorkflowContext(
                    data=context.data.copy(),
                    metadata=context.metadata.copy(),
                    variables=context.variables.copy()
                )
                tasks.append(step.execute(step_context))
            
            # Wait for all tasks to complete
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Merge results back into main context
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    self.status = StepStatus.FAILED
                    self.error = result
                    raise result
                else:
                    # Merge result context back
                    context.data.update(result.data)
                    context.metadata.update(result.metadata)
                    context.variables.update(result.variables)
            
            self.status = StepStatus.COMPLETED
            return context
        except Exception as e:
            self.status = StepStatus.FAILED
            self.error = e
            raise
        finally:
            self.end_time = datetime.now()


@dataclass
class WorkflowDefinition:
    """Workflow definition containing steps and configuration."""
    name: str
    description: str
    steps: List[WorkflowStep]
    variables: Dict[str, Any] = field(default_factory=dict)
    timeout: Optional[int] = None
    retry_count: int = 0
    rollback_on_failure: bool = False


class WorkflowExecution:
    """Represents a single workflow execution instance."""
    
    def __init__(self, workflow_definition: WorkflowDefinition):
        self.id = str(uuid.uuid4())
        self.definition = workflow_definition
        self.status = WorkflowStatus.PENDING
        self.context = WorkflowContext(variables=workflow_definition.variables.copy())
        self.current_step_index = 0
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.error: Optional[Exception] = None
        self.completed_steps: List[str] = []


class WorkflowEngine:
    """Main workflow engine for executing workflows."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.executions: Dict[str, WorkflowExecution] = {}
        self.event_handlers: Dict[str, List[Callable]] = {
            'workflow_started': [],
            'workflow_completed': [],
            'workflow_failed': [],
            'step_started': [],
            'step_completed': [],
            'step_failed': [],
        }
    
    def register_event_handler(self, event: str, handler: Callable) -> None:
        """Register an event handler."""
        if event in self.event_handlers:
            self.event_handlers[event].append(handler)
        else:
            raise ValueError(f"Unknown event type: {event}")
    
    async def _emit_event(self, event: str, **kwargs) -> None:
        """Emit an event to registered handlers."""
        for handler in self.event_handlers.get(event, []):
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(**kwargs)
                else:
                    handler(**kwargs)
            except Exception as e:
                self.logger.error(f"Error in event handler for {event}: {e}")
    
    async def execute_workflow(
        self,
        workflow_definition: WorkflowDefinition,
        initial_context: Optional[WorkflowContext] = None
    ) -> WorkflowExecution:
        """Execute a workflow definition."""
        execution = WorkflowExecution(workflow_definition)
        
        if initial_context:
            execution.context.data.update(initial_context.data)
            execution.context.metadata.update(initial_context.metadata)
            execution.context.variables.update(initial_context.variables)
        
        self.executions[execution.id] = execution
        
        try:
            execution.status = WorkflowStatus.RUNNING
            execution.start_time = datetime.now()
            
            await self._emit_event('workflow_started', execution=execution)
            
            # Execute steps sequentially
            for i, step in enumerate(workflow_definition.steps):
                execution.current_step_index = i
                
                try:
                    # Validate step before execution
                    if not await step.validate(execution.context):
                        step.status = StepStatus.SKIPPED
                        continue
                    
                    await self._emit_event('step_started', execution=execution, step=step)
                    
                    # Execute the step
                    execution.context = await step.execute(execution.context)
                    execution.completed_steps.append(step.name)
                    
                    await self._emit_event('step_completed', execution=execution, step=step)
                    
                except Exception as e:
                    self.logger.error(f"Step '{step.name}' failed: {e}")
                    await self._emit_event('step_failed', execution=execution, step=step, error=e)
                    
                    if workflow_definition.rollback_on_failure:
                        await self._rollback_steps(execution, i)
                    
                    raise e
            
            execution.status = WorkflowStatus.COMPLETED
            await self._emit_event('workflow_completed', execution=execution)
            
        except Exception as e:
            execution.status = WorkflowStatus.FAILED
            execution.error = e
            await self._emit_event('workflow_failed', execution=execution, error=e)
            raise
        finally:
            execution.end_time = datetime.now()
        
        return execution
    
    async def _rollback_steps(self, execution: WorkflowExecution, failed_step_index: int) -> None:
        """Rollback completed steps in reverse order."""
        self.logger.info(f"Rolling back workflow {execution.id}")
        
        for i in range(failed_step_index - 1, -1, -1):
            step = execution.definition.steps[i]
            if step.status == StepStatus.COMPLETED:
                try:
                    await step.rollback(execution.context)
                    self.logger.info(f"Rolled back step: {step.name}")
                except Exception as e:
                    self.logger.error(f"Failed to rollback step '{step.name}': {e}")
    
    async def pause_workflow(self, execution_id: str) -> bool:
        """Pause a running workflow."""
        execution = self.executions.get(execution_id)
        if execution and execution.status == WorkflowStatus.RUNNING:
            execution.status = WorkflowStatus.PAUSED
            return True
        return False
    
    async def resume_workflow(self, execution_id: str) -> bool:
        """Resume a paused workflow."""
        execution = self.executions.get(execution_id)
        if execution and execution.status == WorkflowStatus.PAUSED:
            execution.status = WorkflowStatus.RUNNING
            # Continue execution from current step
            return True
        return False
    
    async def cancel_workflow(self, execution_id: str) -> bool:
        """Cancel a workflow execution."""
        execution = self.executions.get(execution_id)
        if execution and execution.status in [WorkflowStatus.RUNNING, WorkflowStatus.PAUSED]:
            execution.status = WorkflowStatus.CANCELLED
            execution.end_time = datetime.now()
            return True
        return False
    
    def get_execution(self, execution_id: str) -> Optional[WorkflowExecution]:
        """Get workflow execution by ID."""
        return self.executions.get(execution_id)
    
    def get_executions_by_status(self, status: WorkflowStatus) -> List[WorkflowExecution]:
        """Get all executions with specified status."""
        return [ex for ex in self.executions.values() if ex.status == status]
    
    def cleanup_completed_executions(self, max_age_hours: int = 24) -> int:
        """Clean up old completed executions."""
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        removed_count = 0
        
        execution_ids_to_remove = []
        for execution_id, execution in self.executions.items():
            if (execution.status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.CANCELLED] and
                execution.end_time and execution.end_time.timestamp() < cutoff_time):
                execution_ids_to_remove.append(execution_id)
        
        for execution_id in execution_ids_to_remove:
            del self.executions[execution_id]
            removed_count += 1
        
        return removed_count


class SimpleWorkflowStep(WorkflowStep):
    """A simple workflow step that executes a function."""
    
    def __init__(
        self,
        name: str,
        func: Callable[[WorkflowContext], Union[WorkflowContext, Any]],
        description: str = ""
    ):
        super().__init__(name, description)
        self.func = func
    
    async def execute(self, context: WorkflowContext) -> WorkflowContext:
        """Execute the function."""
        try:
            self.status = StepStatus.RUNNING
            self.start_time = datetime.now()
            
            if asyncio.iscoroutinefunction(self.func):
                result = await self.func(context)
            else:
                result = self.func(context)
            
            if isinstance(result, WorkflowContext):
                context = result
            else:
                # Store result in context if function returns other types
                context.data[f"{self.name}_result"] = result
            
            self.status = StepStatus.COMPLETED
            return context
        except Exception as e:
            self.status = StepStatus.FAILED
            self.error = e
            raise
        finally:
            self.end_time = datetime.now()
