"""Task Management API Routes"""

from fastapi import APIRouter, HTTPException
from typing import Dict, List, Any
from kernel.task_engine.loader import TaskLoader
from kernel.task_engine.runner import TaskRunner

router = APIRouter(prefix="/api/v1/tasks", tags=["tasks"])

# Initialize task engine
task_loader = TaskLoader("/Users/oseho/Desktop/autus/config/tasks/limepass_os_tasks.json")
task_graph = task_loader.load()
task_runner = TaskRunner(task_graph)


@router.get("/")
async def get_tasks_summary() -> Dict[str, Any]:
    """Get overall tasks summary"""
    return {
        "metadata": task_loader.metadata,
        "overall_progress": task_loader.get_overall_progress(),
        "domains": task_loader.get_domain_summary(),
        "ready_tasks": [task_graph.tasks[tid].id for tid in task_graph.get_ready_tasks()],
        "blocked_tasks": [task_graph.tasks[tid].id for tid in task_graph.get_blocked_tasks()],
        "total_endpoints": 261  # 251 + 10 task endpoints
    }


@router.get("/domains")
async def get_domains_progress() -> Dict[str, Any]:
    """Get progress by domain"""
    return task_loader.get_domain_summary()


@router.get("/task/{task_id}")
async def get_task_detail(task_id: str) -> Dict[str, Any]:
    """Get detailed task information"""
    if task_id not in task_graph.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = task_graph.tasks[task_id]
    return {
        **task.to_dict(),
        "blockers": task_graph.get_blockers(task_id),
        "dependents": task_graph.get_dependents(task_id)
    }


@router.put("/task/{task_id}/status")
async def update_task_status(task_id: str, status: str) -> Dict[str, Any]:
    """Update task status"""
    if task_id not in task_graph.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    valid_statuses = ["completed", "ready", "in_progress", "blocked"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status: {status}")
    
    task = task_graph.tasks[task_id]
    task.status = status
    
    if status == "completed":
        task_runner.complete_task(task_id)
    elif status == "in_progress":
        task_runner.start_task(task_id)
    
    task_loader.save_progress()
    
    return {
        "task_id": task_id,
        "status": status,
        "progress": task_loader.get_overall_progress()
    }


@router.get("/ready")
async def get_ready_tasks() -> Dict[str, Any]:
    """Get tasks that can be started"""
    ready_ids = task_graph.get_ready_tasks()
    ready_tasks = [
        {
            "id": task_graph.tasks[tid].id,
            "title": task_graph.tasks[tid].title,
            "priority": task_graph.tasks[tid].priority,
            "estimated_hours": task_graph.tasks[tid].estimated_hours,
            "deliverables": task_graph.tasks[tid].deliverables
        }
        for tid in ready_ids
    ]
    return {
        "count": len(ready_tasks),
        "tasks": ready_tasks
    }


@router.get("/blocked")
async def get_blocked_tasks() -> Dict[str, Any]:
    """Get blocked tasks"""
    blocked_ids = task_graph.get_blocked_tasks()
    blocked_tasks = [
        {
            "id": task_graph.tasks[tid].id,
            "title": task_graph.tasks[tid].title,
            "blockers": task_graph.get_blockers(tid)
        }
        for tid in blocked_ids
    ]
    return {
        "count": len(blocked_tasks),
        "tasks": blocked_tasks
    }


@router.get("/progress")
async def get_progress_report() -> Dict[str, Any]:
    """Get comprehensive progress report"""
    overall = task_loader.get_overall_progress()
    domains = task_loader.get_domain_summary()
    
    return {
        "timestamp": "2025-12-07T11:00:00Z",
        "overall": overall,
        "by_domain": domains,
        "burndown": task_runner.get_burndown_chart(),
        "critical_path": task_runner.get_critical_path(),
        "execution_timeline": task_runner.get_execution_timeline()[-10:] if task_runner.execution_log else []
    }


@router.get("/dag")
async def get_dependency_graph() -> Dict[str, Any]:
    """Get dependency graph for visualization (D3.js format)"""
    nodes = []
    links = []
    
    for task_id, task in task_graph.tasks.items():
        nodes.append({
            "id": task.id,
            "label": task.title,
            "status": task.status,
            "progress": task.progress,
            "domain": task.domain,
            "priority": task.priority
        })
    
    for task_id, task in task_graph.tasks.items():
        for dep_id in task.dependencies:
            links.append({
                "source": dep_id,
                "target": task_id,
                "type": "dependency"
            })
    
    return {
        "nodes": nodes,
        "links": links,
        "total_nodes": len(nodes),
        "total_links": len(links)
    }


@router.post("/task/{task_id}/start")
async def start_task(task_id: str) -> Dict[str, Any]:
    """Start executing a task"""
    if task_id not in task_graph.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    success = task_runner.start_task(task_id)
    
    if not success:
        blockers = task_graph.get_blockers(task_id)
        raise HTTPException(
            status_code=409, 
            detail=f"Task blocked by: {blockers}"
        )
    
    task_loader.save_progress()
    return task_runner.get_task_status(task_id)


@router.post("/task/{task_id}/complete")
async def complete_task(task_id: str) -> Dict[str, Any]:
    """Complete a task"""
    if task_id not in task_graph.tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task_runner.complete_task(task_id)
    task_loader.save_progress()
    
    return {
        "task_id": task_id,
        "status": "completed",
        "progress": task_loader.get_overall_progress(),
        "newly_ready_tasks": [
            task_graph.tasks[tid].id 
            for tid in task_graph.get_ready_tasks()
            if tid != task_id
        ]
    }


@router.get("/health")
async def task_engine_health() -> Dict[str, Any]:
    """Health check for task engine"""
    progress = task_loader.get_overall_progress()
    return {
        "status": "healthy",
        "tasks_loaded": len(task_graph.tasks),
        "progress": f"{progress['progress']}%",
        "completion_target": "100%"
    }
