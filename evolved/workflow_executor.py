"""
Workflow executor for processing and executing workflow definitions.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple, Union
from uuid import uuid4

from .exceptions import (
    WorkflowExecutionError,
    WorkflowValidationError,
    TaskExecutionError,
    DependencyError
)
from .models import (
    Workflow,
    WorkflowTask,
    WorkflowExecution,
    TaskExecution,
    ExecutionStatus,
    TaskResult
)
from .task_registry import TaskRegistry


logger = logging.getLogger(__name__)


class WorkflowExecutor:
    """
    Executes workflows by managing task dependencies and parallel execution.
    """

    def __init__(self, task_registry: TaskRegistry) -> None:
        """
        Initialize the workflow executor.

        Args:
            task_registry: Registry containing available task implementations
        """
        self.task_registry = task_registry
        self._active_executions: Dict[str, WorkflowExecution] = {}

    async def execute_workflow(
        self,
        workflow: Workflow,
        inputs: Optional[Dict[str, Any]] = None,
        execution_id: Optional[str] = None
    ) -> WorkflowExecution:
        """
        Execute a workflow with the given inputs.

        Args:
            workflow: Workflow definition to execute
            inputs: Input parameters for the workflow
            execution_id: Optional execution ID, generated if not provided

        Returns:
            WorkflowExecution object containing results and status

        Raises:
            WorkflowValidationError: If workflow validation fails
            WorkflowExecutionError: If execution fails
        """
        if execution_id is None:
            execution_id = str(uuid4())

        inputs = inputs or {}

        try:
            # Validate workflow before execution
            self._validate_workflow(workflow)

            # Create execution context
            execution = WorkflowExecution(
                id=execution_id,
                workflow_id=workflow.id,
                status=ExecutionStatus.RUNNING,
                inputs=inputs,
                started_at=datetime.now(timezone.utc),
                task_executions={}
            )

            self._active_executions[execution_id] = execution

            logger.info(f"Starting workflow execution {execution_id} for workflow {workflow.id}")

            # Execute workflow tasks
            await self._execute_workflow_tasks(workflow, execution)

            # Update final status
            execution.completed_at = datetime.now(timezone.utc)
            if all(task_exec.status == ExecutionStatus.COMPLETED 
                   for task_exec in execution.task_executions.values()):
                execution.status = ExecutionStatus.COMPLETED
            else:
                execution.status = ExecutionStatus.FAILED

            logger.info(f"Workflow execution {execution_id} completed with status: {execution.status}")

            return execution

        except Exception as e:
            logger.error(f"Workflow execution {execution_id} failed: {str(e)}")
            if execution_id in self._active_executions:
                execution = self._active_executions[execution_id]
                execution.status = ExecutionStatus.FAILED
                execution.error = str(e)
                execution.completed_at = datetime.now(timezone.utc)
            raise WorkflowExecutionError(f"Workflow execution failed: {str(e)}") from e

        finally:
            if execution_id in self._active_executions:
                del self._active_executions[execution_id]

    async def _execute_workflow_tasks(
        self,
        workflow: Workflow,
        execution: WorkflowExecution
    ) -> None:
        """
        Execute all tasks in the workflow respecting dependencies.

        Args:
            workflow: Workflow definition
            execution: Execution context
        """
        # Build dependency graph
        dependency_graph = self._build_dependency_graph(workflow.tasks)
        
        # Track completed tasks
        completed_tasks: Set[str] = set()
        running_tasks: Set[str] = set()
        
        # Continue until all tasks are completed or failed
        while len(completed_tasks) < len(workflow.tasks):
            # Find tasks ready to execute
            ready_tasks = self._get_ready_tasks(
                workflow.tasks,
                dependency_graph,
                completed_tasks,
                running_tasks
            )

            if not ready_tasks and not running_tasks:
                # No tasks ready and none running - dependency deadlock
                remaining_tasks = [task.id for task in workflow.tasks 
                                 if task.id not in completed_tasks]
                raise DependencyError(
                    f"Dependency deadlock detected. Remaining tasks: {remaining_tasks}"
                )

            # Start execution of ready tasks
            task_futures = []
            for task in ready_tasks:
                future = asyncio.create_task(
                    self._execute_task(task, execution, workflow.tasks)
                )
                task_futures.append((task.id, future))
                running_tasks.add(task.id)

            # Wait for at least one task to complete
            if task_futures:
                done, _ = await asyncio.wait(
                    [future for _, future in task_futures],
                    return_when=asyncio.FIRST_COMPLETED
                )

                # Process completed tasks
                for task_id, future in task_futures:
                    if future in done:
                        try:
                            await future
                            completed_tasks.add(task_id)
                        except Exception as e:
                            logger.error(f"Task {task_id} failed: {str(e)}")
                            execution.task_executions[task_id].status = ExecutionStatus.FAILED
                            execution.task_executions[task_id].error = str(e)
                            completed_tasks.add(task_id)  # Mark as completed (failed)
                        finally:
                            running_tasks.discard(task_id)

            # Small delay to prevent tight loop
            if not ready_tasks:
                await asyncio.sleep(0.1)

    async def _execute_task(
        self,
        task: WorkflowTask,
        execution: WorkflowExecution,
        all_tasks: List[WorkflowTask]
    ) -> None:
        """
        Execute a single task.

        Args:
            task: Task to execute
            execution: Execution context
            all_tasks: All tasks in the workflow for context

        Raises:
            TaskExecutionError: If task execution fails
        """
        task_execution = TaskExecution(
            task_id=task.id,
            status=ExecutionStatus.RUNNING,
            started_at=datetime.now(timezone.utc)
        )
        execution.task_executions[task.id] = task_execution

        logger.debug(f"Starting task execution: {task.id}")

        try:
            # Get task implementation
            task_impl = self.task_registry.get_task(task.type)
            if not task_impl:
                raise TaskExecutionError(f"Task type '{task.type}' not found in registry")

            # Prepare task inputs
            task_inputs = await self._prepare_task_inputs(task, execution, all_tasks)

            # Execute task
            result = await task_impl.execute(task_inputs, task.config)

            # Store result
            task_execution.result = TaskResult(
                data=result,
                metadata={}
            )
            task_execution.status = ExecutionStatus.COMPLETED
            task_execution.completed_at = datetime.now(timezone.utc)

            logger.debug(f"Task execution completed: {task.id}")

        except Exception as e:
            logger.error(f"Task execution failed: {task.id} - {str(e)}")
            task_execution.status = ExecutionStatus.FAILED
            task_execution.error = str(e)
            task_execution.completed_at = datetime.now(timezone.utc)
            raise TaskExecutionError(f"Task '{task.id}' execution failed: {str(e)}") from e

    async def _prepare_task_inputs(
        self,
        task: WorkflowTask,
        execution: WorkflowExecution,
        all_tasks: List[WorkflowTask]
    ) -> Dict[str, Any]:
        """
        Prepare inputs for task execution by resolving dependencies.

        Args:
            task: Task to prepare inputs for
            execution: Execution context
            all_tasks: All tasks in the workflow

        Returns:
            Dictionary of resolved inputs
        """
        inputs = {}

        # Add workflow-level inputs
        inputs.update(execution.inputs)

        # Add task-specific inputs
        if task.inputs:
            inputs.update(task.inputs)

        # Resolve dependency outputs
        for dependency_id in task.dependencies:
            if dependency_id in execution.task_executions:
                dep_execution = execution.task_executions[dependency_id]
                if dep_execution.status == ExecutionStatus.COMPLETED and dep_execution.result:
                    # Use dependency ID as prefix for outputs
                    dep_data = dep_execution.result.data
                    if isinstance(dep_data, dict):
                        for key, value in dep_data.items():
                            inputs[f"{dependency_id}.{key}"] = value
                    else:
                        inputs[dependency_id] = dep_data

        return inputs

    def _validate_workflow(self, workflow: Workflow) -> None:
        """
        Validate workflow definition.

        Args:
            workflow: Workflow to validate

        Raises:
            WorkflowValidationError: If validation fails
        """
        if not workflow.tasks:
            raise WorkflowValidationError("Workflow must contain at least one task")

        task_ids = {task.id for task in workflow.tasks}

        # Validate task dependencies
        for task in workflow.tasks:
            for dep_id in task.dependencies:
                if dep_id not in task_ids:
                    raise WorkflowValidationError(
                        f"Task '{task.id}' depends on non-existent task '{dep_id}'"
                    )

            # Validate task type exists in registry
            if not self.task_registry.has_task(task.type):
                raise WorkflowValidationError(
                    f"Task '{task.id}' uses unknown task type '{task.type}'"
                )

        # Check for circular dependencies
        self._check_circular_dependencies(workflow.tasks)

    def _check_circular_dependencies(self, tasks: List[WorkflowTask]) -> None:
        """
        Check for circular dependencies in the task graph.

        Args:
            tasks: List of tasks to check

        Raises:
            WorkflowValidationError: If circular dependencies are found
        """
        task_map = {task.id: task for task in tasks}
        visited = set()
        rec_stack = set()

        def has_cycle(task_id: str) -> bool:
            if task_id in rec_stack:
                return True
            if task_id in visited:
                return False

            visited.add(task_id)
            rec_stack.add(task_id)

            task = task_map.get(task_id)
            if task:
                for dep_id in task.dependencies:
                    if has_cycle(dep_id):
                        return True

            rec_stack.remove(task_id)
            return False

        for task in tasks:
            if task.id not in visited:
                if has_cycle(task.id):
                    raise WorkflowValidationError("Circular dependency detected in workflow")

    def _build_dependency_graph(self, tasks: List[WorkflowTask]) -> Dict[str, Set[str]]:
        """
        Build dependency graph from tasks.

        Args:
            tasks: List of workflow tasks

        Returns:
            Dictionary mapping task IDs to their dependencies
        """
        return {task.id: set(task.dependencies) for task in tasks}

    def _get_ready_tasks(
        self,
        tasks: List[WorkflowTask],
        dependency_graph: Dict[str, Set[str]],
        completed_tasks: Set[str],
        running_tasks: Set[str]
    ) -> List[WorkflowTask]:
        """
        Get tasks that are ready to execute.

        Args:
            tasks: All workflow tasks
            dependency_graph: Task dependency mapping
            completed_tasks: Set of completed task IDs
            running_tasks: Set of currently running task IDs

        Returns:
            List of tasks ready for execution
        """
        ready_tasks = []

        for task in tasks:
            if (task.id not in completed_tasks and 
                task.id not in running_tasks and
                dependency_graph[task.id].issubset(completed_tasks)):
                ready_tasks.append(task)

        return ready_tasks

    def get_execution_status(self, execution_id: str) -> Optional[ExecutionStatus]:
        """
        Get the current status of a workflow execution.

        Args:
            execution_id: ID of the execution to check

        Returns:
            Current execution status or None if not found
        """
        execution = self._active_executions.get(execution_id)
        return execution.status if execution else None

    async def cancel_execution(self, execution_id: str) -> bool:
        """
        Cancel a running workflow execution.

        Args:
            execution_id: ID of the execution to cancel

        Returns:
            True if execution was cancelled, False if not found
        """
        execution = self._active_executions.get(execution_id)
        if execution and execution.status == ExecutionStatus.RUNNING:
            execution.status = ExecutionStatus.CANCELLED
            execution.completed_at = datetime.now(timezone.utc)
            logger.info(f"Cancelled workflow execution: {execution_id}")
            return True
        return False

    def get_active_executions(self) -> List[str]:
        """
        Get list of currently active execution IDs.

        Returns:
            List of active execution IDs
        """
        return list(self._active_executions.keys())
