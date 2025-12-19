"""Task Runner - Execute and track tasks"""

from typing import Dict, List, Any, Optional, Callable
from datetime import datetime
from enum import Enum
from .loader import TaskGraph, Task


class TaskStatus(Enum):
    """Task status enumeration"""
    COMPLETED = "completed"
    READY = "ready"
    IN_PROGRESS = "in_progress"
    BLOCKED = "blocked"
    FAILED = "failed"


class TaskRunner:
    """Execute and track task execution"""

    def __init__(self, graph: TaskGraph):
        self.graph = graph
        self.execution_log: List[Dict[str, Any]] = []
        self.callbacks: Dict[str, List[Callable]] = {
            "on_start": [],
            "on_complete": [],
            "on_block": [],
            "on_fail": []
        }

    def register_callback(self, event: str, callback: Callable) -> None:
        """Register callback for events"""
        if event in self.callbacks:
            self.callbacks[event].append(callback)

    def start_task(self, task_id: str) -> bool:
        """Start a task"""
        if task_id not in self.graph.tasks:
            return False

        task = self.graph.tasks[task_id]
        blockers = self.graph.get_blockers(task_id)

        if blockers:
            self._execute_callbacks("on_block", task_id, blockers)
            return False

        task.status = "in_progress"
        task.progress = 10

        self.execution_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "start",
            "task_id": task_id,
            "status": "in_progress"
        })

        self._execute_callbacks("on_start", task_id)
        return True

    def complete_task(self, task_id: str, progress: int = 100) -> bool:
        """Mark task as completed"""
        if task_id not in self.graph.tasks:
            return False

        task = self.graph.tasks[task_id]
        task.status = "completed"
        task.progress = progress
        task.completed_date = datetime.now().strftime("%Y-%m-%d")

        self.execution_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "complete",
            "task_id": task_id,
            "status": "completed"
        })

        self._execute_callbacks("on_complete", task_id)
        return True

    def fail_task(self, task_id: str, reason: str = "") -> bool:
        """Mark task as failed"""
        if task_id not in self.graph.tasks:
            return False

        task = self.graph.tasks[task_id]
        task.status = "failed"

        self.execution_log.append({
            "timestamp": datetime.utcnow().isoformat(),
            "action": "fail",
            "task_id": task_id,
            "status": "failed",
            "reason": reason
        })

        self._execute_callbacks("on_fail", task_id)
        return True

    def update_progress(self, task_id: str, progress: int) -> bool:
        """Update task progress"""
        if task_id not in self.graph.tasks:
            return False

        if progress < 0 or progress > 100:
            return False

        task = self.graph.tasks[task_id]
        task.progress = progress
        return True

    def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """Get current task status"""
        if task_id not in self.graph.tasks:
            return {}

        task = self.graph.tasks[task_id]
        blockers = self.graph.get_blockers(task_id)

        return {
            "id": task.id,
            "title": task.title,
            "status": task.status,
            "progress": task.progress,
            "blockers": blockers,
            "dependencies": task.dependencies,
            "dependents": self.graph.get_dependents(task_id),
            "estimated_hours": task.estimated_hours,
            "completed_date": task.completed_date
        }

    def get_execution_timeline(self) -> List[Dict[str, Any]]:
        """Get execution timeline"""
        return sorted(self.execution_log, key=lambda x: x["timestamp"])

    def get_burndown_chart(self, domain: str = None) -> Dict[str, Any]:
        """Generate burndown chart data"""
        progress = self.graph.calculate_progress(domain)
        return {
            "total": progress["total"],
            "completed": progress["completed"],
            "remaining": progress["total"] - progress["completed"],
            "progress_percent": progress["progress"],
            "by_status": {
                "completed": progress.get("completed", 0),
                "in_progress": progress.get("in_progress", 0),
                "ready": progress.get("ready", 0),
                "blocked": progress.get("blocked", 0)
            }
        }

    def get_critical_path(self) -> List[str]:
        """Get critical path (longest dependency chain)"""
        def get_path_length(task_id: str) -> tuple:
            task = self.graph.tasks.get(task_id)
            if not task or not task.dependencies:
                return (task.estimated_hours if task else 0, [task_id] if task else [])

            max_hours = 0
            max_path = []

            for dep_id in task.dependencies:
                hours, path = get_path_length(dep_id)
                if hours > max_hours:
                    max_hours = hours
                    max_path = path

            return (max_hours + (task.estimated_hours if task else 0), 
                   max_path + [task_id])

        max_length = 0
        critical = []

        for task_id in self.graph.tasks:
            hours, path = get_path_length(task_id)
            if hours > max_length:
                max_length = hours
                critical = path

        return critical

    def _execute_callbacks(self, event: str, *args) -> None:
        """Execute callbacks for an event"""
        for callback in self.callbacks.get(event, []):
            try:
                callback(*args)
            except Exception as e:
                print(f"Error executing callback for {event}: {e}")
