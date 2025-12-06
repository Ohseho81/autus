"""
Queue module for the Pack Scheduler system.

This module provides queue management functionality for scheduling packs
to run at specific times.
"""

import heapq
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Set
from uuid import uuid4


class TaskStatus(Enum):
    """Enumeration of possible task statuses."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class Priority(Enum):
    """Enumeration of task priorities."""
    LOW = 3
    NORMAL = 2
    HIGH = 1
    CRITICAL = 0


@dataclass
class Task:
    """Represents a scheduled task in the queue."""
    
    id: str = field(default_factory=lambda: str(uuid4()))
    pack_id: str = ""
    scheduled_time: datetime = field(default_factory=datetime.now)
    priority: Priority = Priority.NORMAL
    max_retries: int = 3
    retry_delay: int = 60  # seconds
    timeout: int = 3600  # seconds
    callback: Optional[Callable] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    # Runtime fields
    status: TaskStatus = TaskStatus.PENDING
    current_retry: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    def __lt__(self, other: 'Task') -> bool:
        """Compare tasks for priority queue ordering."""
        if self.priority.value != other.priority.value:
            return self.priority.value < other.priority.value
        return self.scheduled_time < other.scheduled_time
    
    def should_run_now(self) -> bool:
        """Check if the task should run now."""
        return (
            self.status == TaskStatus.PENDING and
            datetime.now() >= self.scheduled_time
        )
    
    def can_retry(self) -> bool:
        """Check if the task can be retried."""
        return (
            self.status == TaskStatus.FAILED and
            self.current_retry < self.max_retries
        )
    
    def next_retry_time(self) -> datetime:
        """Calculate the next retry time."""
        delay = self.retry_delay * (2 ** self.current_retry)  # Exponential backoff
        return datetime.now() + timedelta(seconds=delay)
    
    def mark_running(self) -> None:
        """Mark the task as running."""
        self.status = TaskStatus.RUNNING
        self.started_at = datetime.now()
    
    def mark_completed(self) -> None:
        """Mark the task as completed."""
        self.status = TaskStatus.COMPLETED
        self.completed_at = datetime.now()
    
    def mark_failed(self, error_message: str) -> None:
        """Mark the task as failed."""
        self.status = TaskStatus.FAILED
        self.completed_at = datetime.now()
        self.error_message = error_message
        self.current_retry += 1
    
    def mark_cancelled(self) -> None:
        """Mark the task as cancelled."""
        self.status = TaskStatus.CANCELLED
        self.completed_at = datetime.now()
    
    def is_expired(self) -> bool:
        """Check if the task has exceeded its timeout."""
        if self.started_at is None:
            return False
        elapsed = datetime.now() - self.started_at
        return elapsed.total_seconds() > self.timeout


class SchedulerQueue:
    """Priority queue for managing scheduled tasks."""
    
    def __init__(self, max_concurrent_tasks: int = 10):
        """
        Initialize the scheduler queue.
        
        Args:
            max_concurrent_tasks: Maximum number of concurrent tasks to run
        """
        self._queue: List[Task] = []
        self._tasks: Dict[str, Task] = {}
        self._running_tasks: Set[str] = set()
        self._max_concurrent_tasks = max_concurrent_tasks
        self._lock = threading.RLock()
        self._shutdown = False
    
    def add_task(self, task: Task) -> None:
        """
        Add a task to the queue.
        
        Args:
            task: The task to add
            
        Raises:
            ValueError: If task ID already exists
        """
        with self._lock:
            if task.id in self._tasks:
                raise ValueError(f"Task with ID {task.id} already exists")
            
            heapq.heappush(self._queue, task)
            self._tasks[task.id] = task
    
    def get_next_task(self) -> Optional[Task]:
        """
        Get the next task that should run.
        
        Returns:
            The next task to run, or None if no tasks are ready
        """
        with self._lock:
            if (
                self._shutdown or
                len(self._running_tasks) >= self._max_concurrent_tasks or
                not self._queue
            ):
                return None
            
            # Find the next ready task
            temp_queue = []
            next_task = None
            
            while self._queue:
                task = heapq.heappop(self._queue)
                
                # Skip removed tasks
                if task.id not in self._tasks:
                    continue
                
                if task.should_run_now():
                    next_task = task
                    break
                else:
                    temp_queue.append(task)
            
            # Restore the queue
            for task in temp_queue:
                heapq.heappush(self._queue, task)
            
            if next_task:
                next_task.mark_running()
                self._running_tasks.add(next_task.id)
            
            return next_task
    
    def complete_task(self, task_id: str, success: bool = True, 
                     error_message: Optional[str] = None) -> None:
        """
        Mark a task as completed.
        
        Args:
            task_id: ID of the task to complete
            success: Whether the task completed successfully
            error_message: Error message if task failed
            
        Raises:
            KeyError: If task ID not found
        """
        with self._lock:
            if task_id not in self._tasks:
                raise KeyError(f"Task {task_id} not found")
            
            task = self._tasks[task_id]
            self._running_tasks.discard(task_id)
            
            if success:
                task.mark_completed()
                if task.callback:
                    try:
                        task.callback(task)
                    except Exception:
                        pass  # Don't let callback errors affect the task
            else:
                task.mark_failed(error_message or "Unknown error")
                
                # Schedule retry if possible
                if task.can_retry():
                    task.scheduled_time = task.next_retry_time()
                    task.status = TaskStatus.PENDING
                    heapq.heappush(self._queue, task)
    
    def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a task.
        
        Args:
            task_id: ID of the task to cancel
            
        Returns:
            True if task was cancelled, False if not found
        """
        with self._lock:
            if task_id not in self._tasks:
                return False
            
            task = self._tasks[task_id]
            task.mark_cancelled()
            self._running_tasks.discard(task_id)
            return True
    
    def remove_task(self, task_id: str) -> bool:
        """
        Remove a task from the queue.
        
        Args:
            task_id: ID of the task to remove
            
        Returns:
            True if task was removed, False if not found
        """
        with self._lock:
            if task_id not in self._tasks:
                return False
            
            task = self._tasks[task_id]
            if task.status == TaskStatus.RUNNING:
                return False  # Cannot remove running tasks
            
            del self._tasks[task_id]
            self._running_tasks.discard(task_id)
            return True
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """
        Get a task by ID.
        
        Args:
            task_id: ID of the task to retrieve
            
        Returns:
            The task if found, None otherwise
        """
        with self._lock:
            return self._tasks.get(task_id)
    
    def list_tasks(self, status_filter: Optional[TaskStatus] = None,
                   pack_id_filter: Optional[str] = None) -> List[Task]:
        """
        List tasks with optional filtering.
        
        Args:
            status_filter: Filter by task status
            pack_id_filter: Filter by pack ID
            
        Returns:
            List of matching tasks
        """
        with self._lock:
            tasks = list(self._tasks.values())
            
            if status_filter:
                tasks = [t for t in tasks if t.status == status_filter]
            
            if pack_id_filter:
                tasks = [t for t in tasks if t.pack_id == pack_id_filter]
            
            return sorted(tasks, key=lambda t: t.scheduled_time)
    
    def get_queue_stats(self) -> Dict[str, int]:
        """
        Get queue statistics.
        
        Returns:
            Dictionary containing queue statistics
        """
        with self._lock:
            stats = {
                "total_tasks": len(self._tasks),
                "pending_tasks": 0,
                "running_tasks": len(self._running_tasks),
                "completed_tasks": 0,
                "failed_tasks": 0,
                "cancelled_tasks": 0,
            }
            
            for task in self._tasks.values():
                if task.status == TaskStatus.PENDING:
                    stats["pending_tasks"] += 1
                elif task.status == TaskStatus.COMPLETED:
                    stats["completed_tasks"] += 1
                elif task.status == TaskStatus.FAILED:
                    stats["failed_tasks"] += 1
                elif task.status == TaskStatus.CANCELLED:
                    stats["cancelled_tasks"] += 1
            
            return stats
    
    def cleanup_completed_tasks(self, max_age_hours: int = 24) -> int:
        """
        Remove completed tasks older than specified age.
        
        Args:
            max_age_hours: Maximum age of completed tasks to keep
            
        Returns:
            Number of tasks removed
        """
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        removed_count = 0
        
        with self._lock:
            tasks_to_remove = []
            
            for task_id, task in self._tasks.items():
                if (
                    task.status in [TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED] and
                    task.completed_at and
                    task.completed_at < cutoff_time
                ):
                    tasks_to_remove.append(task_id)
            
            for task_id in tasks_to_remove:
                del self._tasks[task_id]
                removed_count += 1
        
        return removed_count
    
    def check_expired_tasks(self) -> List[str]:
        """
        Check for and handle expired running tasks.
        
        Returns:
            List of expired task IDs
        """
        expired_task_ids = []
        
        with self._lock:
            for task_id in list(self._running_tasks):
                task = self._tasks.get(task_id)
                if task and task.is_expired():
                    task.mark_failed("Task timeout exceeded")
                    self._running_tasks.discard(task_id)
                    expired_task_ids.append(task_id)
        
        return expired_task_ids
    
    def pause_queue(self) -> None:
        """Pause the queue from processing new tasks."""
        with self._lock:
            self._shutdown = True
    
    def resume_queue(self) -> None:
        """Resume queue processing."""
        with self._lock:
            self._shutdown = False
    
    def is_paused(self) -> bool:
        """Check if the queue is paused."""
        with self._lock:
            return self._shutdown
    
    def clear_queue(self) -> None:
        """Clear all tasks from the queue."""
        with self._lock:
            self._queue.clear()
            self._tasks.clear()
            self._running_tasks.clear()
    
    def size(self) -> int:
        """Get the total number of tasks in the queue."""
        with self._lock:
            return len(self._tasks)
    
    def is_empty(self) -> bool:
        """Check if the queue is empty."""
        with self._lock:
            return len(self._tasks) == 0
