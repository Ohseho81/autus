"""
Workflow Manager for orchestrating and executing workflows.

This module provides the core workflow management functionality including
workflow execution, state management, and coordination between workflow steps.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Callable, Union
from uuid import uuid4, UUID
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

from .exceptions import (
    WorkflowExecutionError,
    WorkflowNotFoundError,
    WorkflowStateError,
    StepExecutionError,
)
from .models import Workflow, WorkflowStep, WorkflowExecution, ExecutionContext
from .storage import WorkflowStorage


class ExecutionStatus(Enum):
    """Workflow execution status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


@dataclass
class ExecutionResult:
    """Result of workflow execution."""
    execution_id: UUID
    status: ExecutionStatus
    start_time: datetime
    end_time: Optional[datetime] = None
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    step_results: Dict[str, Any] = field(default_factory=dict)


class WorkflowManager:
    """
    Manages workflow execution and lifecycle.
    
    Provides functionality for executing workflows, managing execution state,
    and coordinating between workflow steps.
    """
    
    def __init__(
        self,
        storage: WorkflowStorage,
        max_concurrent_executions: int = 10,
        execution_timeout: int = 3600,
    ) -> None:
        """
        Initialize workflow manager.
        
        Args:
            storage: Workflow storage backend
            max_concurrent_executions: Maximum number of concurrent workflow executions
            execution_timeout: Default execution timeout in seconds
        """
        self._storage = storage
        self._max_concurrent_executions = max_concurrent_executions
        self._execution_timeout = execution_timeout
        self._logger = logging.getLogger(__name__)
        
        # Track active executions
        self._active_executions: Dict[UUID, WorkflowExecution] = {}
        self._execution_tasks: Dict[UUID, asyncio.Task] = {}
        self._execution_lock = asyncio.Lock()
        
        # Event handlers
        self._event_handlers: Dict[str, List[Callable]] = {
            "execution_started": [],
            "execution_completed": [],
            "execution_failed": [],
            "step_started": [],
            "step_completed": [],
            "step_failed": [],
        }

    async def execute_workflow(
        self,
        workflow_id: UUID,
        input_data: Optional[Dict[str, Any]] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> ExecutionResult:
        """
        Execute a workflow.
        
        Args:
            workflow_id: ID of workflow to execute
            input_data: Input data for workflow execution
            context: Additional execution context
            
        Returns:
            ExecutionResult: Result of workflow execution
            
        Raises:
            WorkflowNotFoundError: If workflow doesn't exist
            WorkflowExecutionError: If execution fails
        """
        try:
            # Load workflow definition
            workflow = await self._storage.get_workflow(workflow_id)
            if not workflow:
                raise WorkflowNotFoundError(f"Workflow {workflow_id} not found")
            
            # Check execution limits
            async with self._execution_lock:
                if len(self._active_executions) >= self._max_concurrent_executions:
                    raise WorkflowExecutionError("Maximum concurrent executions reached")
            
            # Create execution
            execution_id = uuid4()
            execution = WorkflowExecution(
                id=execution_id,
                workflow_id=workflow_id,
                status=ExecutionStatus.PENDING,
                input_data=input_data or {},
                context=context or {},
                created_at=datetime.now(timezone.utc),
            )
            
            # Store execution
            await self._storage.save_execution(execution)
            
            # Start execution task
            task = asyncio.create_task(
                self._execute_workflow_internal(workflow, execution)
            )
            
            async with self._execution_lock:
                self._active_executions[execution_id] = execution
                self._execution_tasks[execution_id] = task
            
            # Wait for completion
            result = await task
            
            return result
            
        except Exception as e:
            self._logger.error(f"Failed to execute workflow {workflow_id}: {e}")
            if isinstance(e, (WorkflowNotFoundError, WorkflowExecutionError)):
                raise
            raise WorkflowExecutionError(f"Workflow execution failed: {e}") from e

    async def _execute_workflow_internal(
        self,
        workflow: Workflow,
        execution: WorkflowExecution,
    ) -> ExecutionResult:
        """
        Internal workflow execution logic.
        
        Args:
            workflow: Workflow definition
            execution: Execution instance
            
        Returns:
            ExecutionResult: Execution result
        """
        execution_id = execution.id
        start_time = datetime.now(timezone.utc)
        
        try:
            # Update execution status
            execution.status = ExecutionStatus.RUNNING
            execution.started_at = start_time
            await self._storage.update_execution(execution)
            
            # Emit execution started event
            await self._emit_event("execution_started", execution)
            
            # Create execution context
            exec_context = ExecutionContext(
                execution_id=execution_id,
                workflow_id=workflow.id,
                input_data=execution.input_data,
                context=execution.context,
                variables={},
            )
            
            # Execute workflow steps
            step_results = {}
            for step in workflow.steps:
                try:
                    await self._emit_event("step_started", step, exec_context)
                    
                    step_result = await self._execute_step(step, exec_context)
                    step_results[step.id] = step_result
                    
                    # Update context with step output
                    if step_result and isinstance(step_result, dict):
                        exec_context.variables.update(step_result)
                    
                    await self._emit_event("step_completed", step, exec_context, step_result)
                    
                except Exception as e:
                    await self._emit_event("step_failed", step, exec_context, str(e))
                    raise StepExecutionError(f"Step {step.id} failed: {e}") from e
            
            # Create successful result
            end_time = datetime.now(timezone.utc)
            result = ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.COMPLETED,
                start_time=start_time,
                end_time=end_time,
                output=exec_context.variables,
                step_results=step_results,
            )
            
            # Update execution
            execution.status = ExecutionStatus.COMPLETED
            execution.completed_at = end_time
            execution.output = exec_context.variables
            await self._storage.update_execution(execution)
            
            await self._emit_event("execution_completed", execution, result)
            
            return result
            
        except Exception as e:
            # Handle execution failure
            end_time = datetime.now(timezone.utc)
            error_msg = str(e)
            
            result = ExecutionResult(
                execution_id=execution_id,
                status=ExecutionStatus.FAILED,
                start_time=start_time,
                end_time=end_time,
                error=error_msg,
            )
            
            # Update execution
            execution.status = ExecutionStatus.FAILED
            execution.completed_at = end_time
            execution.error = error_msg
            await self._storage.update_execution(execution)
            
            await self._emit_event("execution_failed", execution, result)
            
            return result
            
        finally:
            # Clean up active execution
            async with self._execution_lock:
                self._active_executions.pop(execution_id, None)
                self._execution_tasks.pop(execution_id, None)

    async def _execute_step(
        self,
        step: WorkflowStep,
        context: ExecutionContext,
    ) -> Any:
        """
        Execute a single workflow step.
        
        Args:
            step: Step to execute
            context: Execution context
            
        Returns:
            Any: Step execution result
            
        Raises:
            StepExecutionError: If step execution fails
        """
        try:
            self._logger.debug(f"Executing step {step.id} of type {step.type}")
            
            # Prepare step input
            step_input = self._prepare_step_input(step, context)
            
            # Execute based on step type
            if step.type == "script":
                return await self._execute_script_step(step, step_input, context)
            elif step.type == "http":
                return await self._execute_http_step(step, step_input, context)
            elif step.type == "condition":
                return await self._execute_condition_step(step, step_input, context)
            elif step.type == "parallel":
                return await self._execute_parallel_step(step, step_input, context)
            else:
                raise StepExecutionError(f"Unknown step type: {step.type}")
                
        except Exception as e:
            self._logger.error(f"Step {step.id} execution failed: {e}")
            raise StepExecutionError(f"Step execution failed: {e}") from e

    def _prepare_step_input(
        self,
        step: WorkflowStep,
        context: ExecutionContext,
    ) -> Dict[str, Any]:
        """
        Prepare input data for step execution.
        
        Args:
            step: Workflow step
            context: Execution context
            
        Returns:
            Dict[str, Any]: Prepared input data
        """
        step_input = {}
        
        # Add step configuration
        step_input.update(step.config)
        
        # Add context variables
        step_input["_context"] = {
            "execution_id": str(context.execution_id),
            "workflow_id": str(context.workflow_id),
            "variables": context.variables,
            "input_data": context.input_data,
        }
        
        return step_input

    async def _execute_script_step(
        self,
        step: WorkflowStep,
        step_input: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """Execute a script step."""
        # Implementation would depend on script execution framework
        # This is a placeholder
        script = step_input.get("script", "")
        if not script:
            raise StepExecutionError("No script provided")
        
        # Execute script safely (implementation needed)
        return {"result": "script_executed"}

    async def _execute_http_step(
        self,
        step: WorkflowStep,
        step_input: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """Execute an HTTP step."""
        # Implementation would use aiohttp or similar
        # This is a placeholder
        url = step_input.get("url")
        method = step_input.get("method", "GET")
        
        if not url:
            raise StepExecutionError("No URL provided for HTTP step")
        
        # Make HTTP request (implementation needed)
        return {"status_code": 200, "response": "success"}

    async def _execute_condition_step(
        self,
        step: WorkflowStep,
        step_input: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """Execute a condition step."""
        condition = step_input.get("condition")
        if not condition:
            raise StepExecutionError("No condition provided")
        
        # Evaluate condition (implementation needed)
        result = True  # Placeholder
        return {"condition_result": result}

    async def _execute_parallel_step(
        self,
        step: WorkflowStep,
        step_input: Dict[str, Any],
        context: ExecutionContext,
    ) -> Any:
        """Execute steps in parallel."""
        parallel_steps = step_input.get("steps", [])
        if not parallel_steps:
            return {}
        
        # Execute steps concurrently
        tasks = []
        for parallel_step in parallel_steps:
            task = asyncio.create_task(
                self._execute_step(parallel_step, context)
            )
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return {"parallel_results": results}

    async def cancel_execution(self, execution_id: UUID) -> bool:
        """
        Cancel a running workflow execution.
        
        Args:
            execution_id: ID of execution to cancel
            
        Returns:
            bool: True if cancellation was successful
        """
        try:
            async with self._execution_lock:
                execution = self._active_executions.get(execution_id)
                task = self._execution_tasks.get(execution_id)
                
                if not execution or not task:
                    return False
                
                # Cancel the task
                task.cancel()
                
                # Update execution status
                execution.status = ExecutionStatus.CANCELLED
                execution.completed_at = datetime.now(timezone.utc)
                await self._storage.update_execution(execution)
                
                # Clean up
                self._active_executions.pop(execution_id, None)
                self._execution_tasks.pop(execution_id, None)
                
                return True
                
        except Exception as e:
            self._logger.error(f"Failed to cancel execution {execution_id}: {e}")
            return False

    async def get_execution_status(self, execution_id: UUID) -> Optional[ExecutionStatus]:
        """
        Get the status of a workflow execution.
        
        Args:
            execution_id: ID of execution
            
        Returns:
            Optional[ExecutionStatus]: Execution status or None if not found
        """
        try:
            # Check active executions first
            async with self._execution_lock:
                if execution_id in self._active_executions:
                    return self._active_executions[execution_id].status
            
            # Check storage
            execution = await self._storage.get_execution(execution_id)
            return execution.status if execution else None
            
        except Exception as e:
            self._logger.error(f"Failed to get execution status {execution_id}: {e}")
            return None

    def add_event_handler(self, event_type: str, handler: Callable) -> None:
        """
        Add an event handler.
        
        Args:
            event_type: Type of event to handle
            handler: Handler function
        """
        if event_type in self._event_handlers:
            self._event_handlers[event_type].append(handler)

    def remove_event_handler(self, event_type: str, handler: Callable) -> None:
        """
        Remove an event handler.
        
        Args:
            event_type: Type of event
            handler: Handler function to remove
        """
        if event_type in self._event_handlers:
            try:
                self._event_handlers[event_type].remove(handler)
            except ValueError:
                pass

    async def _emit_event(self, event_type: str, *args, **kwargs) -> None:
        """
        Emit an event to registered handlers.
        
        Args:
            event_type: Type of event to emit
            *args: Event arguments
            **kwargs: Event keyword arguments
        """
        try:
            handlers = self._event_handlers.get(event_type, [])
            for handler in handlers:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(*args, **kwargs)
                    else:
                        handler(*args, **kwargs)
                except Exception as e:
                    self._logger.error(f"Event handler error for {event_type}: {e}")
                    
        except Exception as e:
            self._logger.error(f"Failed to emit event {event_type}: {e}")

    async def get_active_executions(self) -> List[WorkflowExecution]:
        """
        Get list of currently active executions.
        
        Returns:
            List[WorkflowExecution]: Active executions
        """
        async with self._execution_lock:
            return list(self._active_executions.values())

    @asynccontextmanager
    async def execution_context(self, execution_id: UUID):
        """
        Context manager for workflow execution.
        
        Args:
            execution_id: ID of execution
            
        Yields:
            WorkflowExecution: Execution instance
        """
        async with self._execution_lock:
            execution = self._active_executions.get(execution_id)
            if not execution:
                raise WorkflowNotFoundError(f"Active execution {execution_id} not found")
        
        try:
            yield execution
        finally:
            # Cleanup if needed
            pass

    async def shutdown(self) -> None:
        """Shutdown the workflow manager and cancel active executions."""
        try:
            self._logger.info("Shutting down workflow manager")
            
            async with self._execution_lock:
                # Cancel all active tasks
                for task in self._execution_tasks.values():
                    if not task.done():
                        task.cancel()
                
                # Wait for tasks to complete
                if self._execution_tasks:
                    await asyncio.gather(
                        *self._execution_tasks.values(),
                        return_exceptions=True
                    )
                
                self._active_executions.clear()
                self._execution_tasks.clear()
                
            self._logger.info("Workflow manager shutdown complete")
            
        except Exception as e:
            self._logger.error(f"Error during workflow manager shutdown: {e}")
