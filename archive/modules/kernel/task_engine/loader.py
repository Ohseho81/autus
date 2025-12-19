"""Task Loader and Graph Builder"""

import json
from typing import Dict, List, Set, Any, Optional
from dataclasses import dataclass, asdict
from pathlib import Path
from datetime import datetime


@dataclass
class Task:
    """Task representation"""
    id: str
    domain: str
    title: str
    description: str
    status: str  # completed, ready, blocked, in_progress
    priority: str  # CRITICAL, HIGH, MEDIUM, LOW
    category: str
    dependencies: List[str]
    owner: str
    estimated_hours: int
    deliverables: List[str]
    created_date: str
    completed_date: Optional[str] = None
    progress: int = 0
    subtasks: List[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in asdict(self).items() if v is not None}


@dataclass
class Domain:
    """Domain representation"""
    name: str
    description: str
    progress: float
    tasks: int
    completed: int

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class TaskGraph:
    """Dependency graph for tasks"""

    def __init__(self):
        self.tasks: Dict[str, Task] = {}
        self.graph: Dict[str, Set[str]] = {}  # id -> dependencies
        self.reverse_graph: Dict[str, Set[str]] = {}  # id -> dependents

    def add_task(self, task: Task) -> None:
        """Add task to graph"""
        self.tasks[task.id] = task
        self.graph[task.id] = set(task.dependencies)
        
        if task.id not in self.reverse_graph:
            self.reverse_graph[task.id] = set()
        
        for dep in task.dependencies:
            if dep not in self.reverse_graph:
                self.reverse_graph[dep] = set()
            self.reverse_graph[dep].add(task.id)

    def get_blockers(self, task_id: str) -> List[str]:
        """Get blocking dependencies"""
        if task_id not in self.tasks:
            return []
        
        task = self.tasks[task_id]
        blockers = []
        
        for dep_id in task.dependencies:
            if dep_id in self.tasks:
                dep = self.tasks[dep_id]
                if dep.status != "completed":
                    blockers.append(dep_id)
        
        return blockers

    def get_ready_tasks(self) -> List[str]:
        """Get tasks that can be started"""
        ready = []
        
        for task_id, task in self.tasks.items():
            if task.status == "ready" and not self.get_blockers(task_id):
                ready.append(task_id)
        
        return ready

    def get_blocked_tasks(self) -> List[str]:
        """Get tasks blocked by dependencies"""
        blocked = []
        
        for task_id, task in self.tasks.items():
            if task.status not in ["completed", "ready"]:
                if self.get_blockers(task_id):
                    blocked.append(task_id)
        
        return blocked

    def get_dependents(self, task_id: str) -> List[str]:
        """Get tasks that depend on this task"""
        return list(self.reverse_graph.get(task_id, []))

    def topological_sort(self) -> List[str]:
        """Topological sort of tasks"""
        visited = set()
        result = []

        def visit(node: str):
            if node in visited:
                return
            visited.add(node)
            
            for dep in self.graph.get(node, []):
                visit(dep)
            
            result.append(node)

        for task_id in self.tasks:
            visit(task_id)

        return result

    def calculate_progress(self, domain: str = None) -> Dict[str, Any]:
        """Calculate overall progress"""
        if domain:
            tasks = [t for t in self.tasks.values() if t.domain == domain]
        else:
            tasks = list(self.tasks.values())

        if not tasks:
            return {"total": 0, "completed": 0, "progress": 0.0}

        completed = sum(1 for t in tasks if t.status == "completed")
        total = len(tasks)
        progress = (completed / total * 100) if total > 0 else 0

        return {
            "total": total,
            "completed": completed,
            "ready": sum(1 for t in tasks if t.status == "ready"),
            "in_progress": sum(1 for t in tasks if t.status == "in_progress"),
            "blocked": sum(1 for t in tasks if t.status == "blocked"),
            "progress": round(progress, 1)
        }


class TaskLoader:
    """Load tasks from JSON DSL"""

    def __init__(self, config_path: str):
        self.config_path = Path(config_path)
        self.metadata: Dict[str, Any] = {}
        self.domains: Dict[str, Domain] = {}
        self.graph = TaskGraph()

    def load(self) -> TaskGraph:
        """Load tasks from JSON file"""
        if not self.config_path.exists():
            raise FileNotFoundError(f"Config file not found: {self.config_path}")

        with open(self.config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)

        # Load metadata
        self.metadata = config.get("metadata", {})

        # Load domains
        for domain_key, domain_data in config.get("domains", {}).items():
            self.domains[domain_key] = Domain(**domain_data)

        # Load tasks
        for task_data in config.get("tasks", []):
            task = Task(**task_data)
            self.graph.add_task(task)

        return self.graph

    def get_domain_summary(self) -> Dict[str, Dict[str, Any]]:
        """Get summary by domain"""
        summary = {}
        
        for domain_key, domain in self.domains.items():
            # Filter tasks by domain ID (D1, D2, D3, etc.)
            domain_tasks = [t for t in self.graph.tasks.values() if t.domain == domain_key]
            
            if domain_tasks:
                completed = sum(1 for t in domain_tasks if t.status == "completed")
                total = len(domain_tasks)
                progress = (completed / total * 100) if total > 0 else 0
                
                summary[domain_key] = {
                    "name": domain.name,
                    "description": domain.description,
                    "total": total,
                    "completed": completed,
                    "ready": sum(1 for t in domain_tasks if t.status == "ready"),
                    "in_progress": sum(1 for t in domain_tasks if t.status == "in_progress"),
                    "blocked": sum(1 for t in domain_tasks if t.status == "blocked"),
                    "progress": round(progress, 1)
                }
            else:
                summary[domain_key] = {
                    "name": domain.name,
                    "description": domain.description,
                    "total": 0,
                    "completed": 0,
                    "progress": 0.0
                }
        
        return summary

    def get_overall_progress(self) -> Dict[str, Any]:
        """Get overall progress across all domains"""
        return self.graph.calculate_progress()

    def save_progress(self, output_path: str = None) -> None:
        """Save current progress to file"""
        if output_path is None:
            output_path = str(self.config_path)

        config = {
            "metadata": self.metadata,
            "domains": {k: v.to_dict() for k, v in self.domains.items()},
            "tasks": [t.to_dict() for t in self.graph.tasks.values()],
            "summary": self.get_overall_progress()
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
