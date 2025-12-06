"""
Task scheduler for workflow engine.
Manages task execution timing, dependencies, and resource allocation.
"""

import asyncio
import heapq
import logging
import threading
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Callable, Union
from dataclasses import dataclass, field
from concurrent.futures import ThreadPoolExecutor, Future
import uuid


logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Task execution status."""
    PENDING = "pending"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class TaskPriority(Enum):
    """Task priority levels."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class TaskResult:
    """Result of task execution."""
    task_id: str
    status: TaskStatus
    result: Any = None
    error: Optional[Exception] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    execution_time: Optional[float] = None


@dataclass
class Task:
    """Represents a schedulable task."""
    id: str
    name: str
    function: Callable
    args: tuple = field(default_factory=tuple)
    kwargs: Dict[str, Any] = field(default_factory=dict)
    priority: TaskPriority = TaskPriority.NORMAL
    dependencies: Set[str] = field(default_factory=set)
    scheduled_time: Optional[datetime] = None
    timeout: Optional[float] = None
    max_retries: int = 0
    retry_count: int = 0
    retry_delay: float = 1.0
    status: TaskStatus = TaskStatus.PENDING
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __lt__(self, other: 'Task') -> bool:
        """Compare tasks for priority queue ordering."""
        if self.scheduled_time and other.scheduled_time:
            if self.scheduled_time != other.scheduled_time:
                return self.scheduled_time < other.scheduled_time
        return self.priority.value > other.priority.value


class TaskSchedulerError(Exception):
    """Base exception for task scheduler errors."""
    pass


class DependencyError(TaskSchedulerError):
    """Raised when task dependencies cannot be resolved."""
    pass


class TaskTimeoutError(TaskSchedulerError):
    """Raised when task execution times out."""
    pass


class TaskScheduler:
    """
    Advanced task scheduler with dependency resolution, priority queuing,
    and resource management.
    """
    
    def __init__(
        self,
        max_workers: int = 4,
        max_concurrent_tasks: int = 10,
        default_timeout: float = 300.0
    ):
        """
        Initialize task scheduler.
        
        Args:
            max_workers: Maximum number of worker threads
            max_concurrent_tasks: Maximum concurrent running tasks
            default_timeout: Default task timeout in seconds
        """
        self.max_workers = max_workers
        self.max_concurrent_tasks = max_concurrent_tasks
        self.default_timeout = default_timeout
        
        self._tasks: Dict[str, Task] = {}
        self._task_queue: List[Task] = []
        self._running_tasks: Dict[str, Future] = {}
        self._completed_tasks: Dict[str, TaskResult] = {}
        self._task_callbacks: Dict[str, List[Callable]] = {}
        
        self._executor = ThreadPoolExecutor(max_workers=max_workers)
        self._scheduler_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.RLock()
        
        self._running = False
        
    def start(self) -> None:
        """Start the task scheduler."""
        with self._lock:
            if self._running:
                logger.warning("Task scheduler is already running")
                return
                
            self._running = True
            self._stop_event.clear()
            
            self._scheduler_thread = threading.Thread(
                target=self._scheduler_loop,
                daemon=True
            )
            self._scheduler_thread.start()
            
        logger.info("Task scheduler started")
    
    def stop(self, timeout: Optional[float] = None) -> None:
        """
        Stop the task scheduler.
        
        Args:
            timeout: Maximum time to wait for shutdown
        """
        with self._lock:
            if not self._running:
                return
                
            self._running = False
            self._stop_event.set()
        
        if self._scheduler_thread and self._scheduler_thread.is_alive():
            self._scheduler_thread.join(timeout=timeout)
            
        # Cancel running tasks
        for future in self._running_tasks.values():
            future.cancel()
            
        self._executor.shutdown(wait=True, timeout=timeout)
        logger.info("Task scheduler stopped")
    
    def schedule_task(
        self,
        name: str,
        function: Callable,
        args: tuple = (),
        kwargs: Optional[Dict[str, Any]] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
        dependencies: Optional[Set[str]] = None,
        scheduled_time: Optional[datetime] = None,
        timeout: Optional[float] = None,
        max_retries: int = 0,
        retry_delay: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None,
        task_id: Optional[str] = None
    ) -> str:
        """
        Schedule a task for execution.
        
        Args:
            name: Task name
            function: Function to execute
            args: Function arguments
            kwargs: Function keyword arguments
            priority: Task priority
            dependencies: Set of task IDs this task depends on
            scheduled_time: When to execute the task
            timeout: Task timeout in seconds
            max_retries: Maximum retry attempts
            retry_delay: Delay between retries
            metadata: Additional task metadata
            task_id: Optional custom task ID
            
        Returns:
            Task ID
            
        Raises:
            TaskSchedulerError: If scheduler is not running
            DependencyError: If dependencies are invalid
        """
        if not self._running:
            raise TaskSchedulerError("Task scheduler is not running")
            
        if kwargs is None:
            kwargs = {}
        if dependencies is None:
            dependencies = set()
        if metadata is None:
            metadata = {}
        if task_id is None:
            task_id = str(uuid.uuid4())
            
        # Validate dependencies
        for dep_id in dependencies:
            if dep_id not in self._tasks and dep_id not in self._completed_tasks:
                raise DependencyError(f"Dependency task '{dep_id}' not found")
        
        task = Task(
            id=task_id,
            name=name,
            function=function,
            args=args,
            kwargs=kwargs,
            priority=priority,
            dependencies=dependencies,
            scheduled_time=scheduled_time,
            timeout=timeout or self.default_timeout,
            max_retries=max_retries,
            retry_delay=retry_delay,
            metadata=metadata
        )
        
        with self._lock:
            self._tasks[task_id] = task
            self._add_to_queue(task)
            
        logger.info(f"Scheduled task '{name}' with ID {task_id}")
        return task_id
    
    def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a scheduled or running task.
        
        Args:
            task_id: Task ID to cancel
            
        Returns:
            True if task was cancelled, False if not found or already completed
        """
        with self._lock:
            # Cancel running task
            if task_id in self._running_tasks:
                future = self._running_tasks[task_id]
                if future.cancel():
                    del self._running_tasks[task_id]
                    if task_id in self._tasks:
                        self._tasks[task_id].status = TaskStatus.CANCELLED
                    logger.info(f"Cancelled running task {task_id}")
                    return True
            
            # Cancel queued task
            if task_id in self._tasks:
                task = self._tasks[task_id]
                if task.status in (TaskStatus.PENDING, TaskStatus.SCHEDULED):
                    task.status = TaskStatus.CANCELLED
                    self._remove_from_queue(task_id)
                    logger.info(f"Cancelled queued task {task_id}")
                    return True
                    
        return False
    
    def get_task_status(self, task_id: str) -> Optional[TaskStatus]:
        """
        Get the status of a task.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task status or None if not found
        """
        with self._lock:
            if task_id in self._tasks:
                return self._tasks[task_id].status
            elif task_id in self._completed_tasks:
                return self._completed_tasks[task_id].status
        return None
    
    def get_task_result(self, task_id: str) -> Optional[TaskResult]:
        """
        Get the result of a completed task.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task result or None if not found or not completed
        """
        with self._lock:
            return self._completed_tasks.get(task_id)
    
    def add_task_callback(
        self,
        task_id: str,
        callback: Callable[[TaskResult], None]
    ) -> None:
        """
        Add a callback to be executed when a task completes.
        
        Args:
            task_id: Task ID
            callback: Callback function
        """
        with self._lock:
            if task_id not in self._task_callbacks:
                self._task_callbacks[task_id] = []
            self._task_callbacks[task_id].append(callback)
    
    def get_queue_size(self) -> int:
        """Get the number of queued tasks."""
        with self._lock:
            return len(self._task_queue)
    
    def get_running_count(self) -> int:
        """Get the number of currently running tasks."""
        with self._lock:
            return len(self._running_tasks)
    
    def _add_to_queue(self, task: Task) -> None:
        """Add task to priority queue."""
        task.status = TaskStatus.SCHEDULED
        heapq.heappush(self._task_queue, task)
    
    def _remove_from_queue(self, task_id: str) -> None:
        """Remove task from queue."""
        self._task_queue = [t for t in self._task_queue if t.id != task_id]
        heapq.heapify(self._task_queue)
    
    def _scheduler_loop(self) -> None:
        """Main scheduler loop."""
        while not self._stop_event.is_set():
            try:
                self._process_queue()
                self._check_completed_tasks()
                self._stop_event.wait(0.1)  # Short sleep
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}", exc_info=True)
    
    def _process_queue(self) -> None:
        """Process the task queue and start eligible tasks."""
        with self._lock:
            if len(self._running_tasks) >= self.max_concurrent_tasks:
                return
                
            current_time = datetime.now()
            
            while (self._task_queue and 
                   len(self._running_tasks) < self.max_concurrent_tasks):
                
                task = self._task_queue[0]
                
                # Check if task is ready to run
                if not self._is_task_ready(task, current_time):
                    break
                    
                # Remove from queue and start execution
                heapq.heappop(self._task_queue)
                self._start_task(task)
    
    def _is_task_ready(self, task: Task, current_time: datetime) -> bool:
        """Check if a task is ready to execute."""
        # Check scheduled time
        if task.scheduled_time and current_time < task.scheduled_time:
            return False
            
        # Check dependencies
        for dep_id in task.dependencies:
            if dep_id not in self._completed_tasks:
                return False
            dep_result = self._completed_tasks[dep_id]
            if dep_result.status != TaskStatus.COMPLETED:
                return False
                
        return True
    
    def _start_task(self, task: Task) -> None:
        """Start executing a task."""
        task.status = TaskStatus.RUNNING
        future = self._executor.submit(self._execute_task, task)
        self._running_tasks[task.id] = future
        
        logger.info(f"Started executing task '{task.name}' ({task.id})")
    
    def _execute_task(self, task: Task) -> TaskResult:
        """Execute a single task."""
        start_time = datetime.now()
        result = TaskResult(
            task_id=task.id,
            status=TaskStatus.RUNNING,
            start_time=start_time
        )
        
        try:
            # Execute the task function with optional timeout
            if task.timeout:
                # IMPLEMENTED: Proper timeout handling using asyncio.wait_for
                import asyncio
                import functools
                
                if asyncio.iscoroutinefunction(task.function):
                    task_result = await asyncio.wait_for(
                        task.function(*task.args, **task.kwargs),
                        timeout=task.timeout
                    )
                else:
                    loop = asyncio.get_event_loop()
                    task_result = await asyncio.wait_for(
                        loop.run_in_executor(
                            None,
                            functools.partial(task.function, *task.args, **task.kwargs)
                        ),
                        timeout=task.timeout
                    )
            else:
                if asyncio.iscoroutinefunction(task.function):
                    task_result = await task.function(*task.args, **task.kwargs)
                else:
                    task_result = task.function(*task.args, **task.kwargs)
                
            end_time = datetime.now()
            result.status = TaskStatus.COMPLETED
            result.result = task_result
            result.end_time = end_time
            result.execution_time = (end_time - start_time).total_seconds()
            
            logger.info(f"Task '{task.name}' completed successfully")
            
        except Exception as e:
            end_time = datetime.now()
            result.status = TaskStatus.FAILED
            result.error = e
            result.end_time = end_time
            result.execution_time = (end_time - start_time).total_seconds()
            
            logger.error(f"Task '{task.name}' failed: {e}", exc_info=True)
            
            # Handle retries
            if task.retry_count < task.max_retries:
                return self._retry_task(task, result)
        
        return result
    
    def _retry_task(self, task: Task, failed_result: TaskResult) -> TaskResult:
        """Retry a failed task."""
        task.retry_count += 1
        task.status = TaskStatus.RETRYING
        
        logger.info(
            f"Retrying task '{task.name}' (attempt {task.retry_count}/{task.max_retries})"
        )
        
        # Add delay before retry
        if task.retry_delay > 0:
            import time
            time.sleep(task.retry_delay)
        
        # Schedule for retry
        task.scheduled_time = datetime.now() + timedelta(seconds=task.retry_delay)
        
        with self._lock:
            self._add_to_queue(task)
            
        return failed_result
    
    def _check_completed_tasks(self) -> None:
        """Check for completed tasks and handle results."""
        completed_futures = []
        
        with self._lock:
            for task_id, future in self._running_tasks.items():
                if future.done():
                    completed_futures.append((task_id, future))
        
        for task_id, future in completed_futures:
            try:
                result = future.result()
                self._handle_task_completion(task_id, result)
            except Exception as e:
                logger.error(f"Error getting task result for {task_id}: {e}")
                
                # Create error result
                error_result = TaskResult(
                    task_id=task_id,
                    status=TaskStatus.FAILED,
                    error=e,
                    end_time=datetime.now()
                )
                self._handle_task_completion(task_id, error_result)
    
    def _handle_task_completion(self, task_id: str, result: TaskResult) -> None:
        """Handle completion of a task."""
        with self._lock:
            # Remove from running tasks
            self._running_tasks.pop(task_id, None)
            
            # Store result
            self._completed_tasks[task_id] = result
            
            # Update task status
            if task_id in self._tasks:
                self._tasks[task_id].status = result.status
            
            # Execute callbacks
            callbacks = self._task_callbacks.get(task_id, [])
            
        # Execute callbacks outside lock
        for callback in callbacks:
            try:
                callback(result)
            except Exception as e:
                logger.error(f"Error in task callback for {task_id}: {e}")
        
        # Clean up callbacks
        with self._lock:
            self._task_callbacks.pop(task_id, None)
    
    def __enter__(self):
        """Context manager entry."""
        self.start()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop()
