"""
Workflow state management for the workflow engine.

This module provides classes and utilities for managing the state of workflow
executions, including step states, transitions, and persistence.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Union
from dataclasses import dataclass, field, asdict
from pathlib import Path

logger = logging.getLogger(__name__)


class WorkflowStatus(Enum):
    """Enumeration of possible workflow statuses."""
    
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class StepStatus(Enum):
    """Enumeration of possible step statuses."""
    
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"


@dataclass
class StepState:
    """Represents the state of a single workflow step."""
    
    step_id: str
    status: StepStatus = StepStatus.PENDING
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None
    result: Optional[Any] = None
    attempt_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert step state to dictionary."""
        return {
            'step_id': self.step_id,
            'status': self.status.value,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error': self.error,
            'result': self.result,
            'attempt_count': self.attempt_count,
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> StepState:
        """Create step state from dictionary."""
        return cls(
            step_id=data['step_id'],
            status=StepStatus(data['status']),
            started_at=datetime.fromisoformat(data['started_at']) if data.get('started_at') else None,
            completed_at=datetime.fromisoformat(data['completed_at']) if data.get('completed_at') else None,
            error=data.get('error'),
            result=data.get('result'),
            attempt_count=data.get('attempt_count', 0),
            metadata=data.get('metadata', {})
        )
    
    def start(self) -> None:
        """Mark step as started."""
        self.status = StepStatus.RUNNING
        self.started_at = datetime.now()
        self.attempt_count += 1
    
    def complete(self, result: Optional[Any] = None) -> None:
        """Mark step as completed."""
        self.status = StepStatus.COMPLETED
        self.completed_at = datetime.now()
        self.result = result
    
    def fail(self, error: str) -> None:
        """Mark step as failed."""
        self.status = StepStatus.FAILED
        self.completed_at = datetime.now()
        self.error = error
    
    def skip(self, reason: str = "") -> None:
        """Mark step as skipped."""
        self.status = StepStatus.SKIPPED
        self.completed_at = datetime.now()
        if reason:
            self.metadata['skip_reason'] = reason


@dataclass
class WorkflowState:
    """Represents the complete state of a workflow execution."""
    
    workflow_id: str
    workflow_name: str
    status: WorkflowStatus = WorkflowStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    current_step: Optional[str] = None
    steps: Dict[str, StepState] = field(default_factory=dict)
    context: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __post_init__(self) -> None:
        """Initialize workflow state after creation."""
        if not self.steps:
            self.steps = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert workflow state to dictionary."""
        return {
            'workflow_id': self.workflow_id,
            'workflow_name': self.workflow_name,
            'status': self.status.value,
            'created_at': self.created_at.isoformat(),
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'current_step': self.current_step,
            'steps': {step_id: step.to_dict() for step_id, step in self.steps.items()},
            'context': self.context,
            'error': self.error,
            'metadata': self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> WorkflowState:
        """Create workflow state from dictionary."""
        steps = {}
        if 'steps' in data:
            steps = {
                step_id: StepState.from_dict(step_data)
                for step_id, step_data in data['steps'].items()
            }
        
        return cls(
            workflow_id=data['workflow_id'],
            workflow_name=data['workflow_name'],
            status=WorkflowStatus(data['status']),
            created_at=datetime.fromisoformat(data['created_at']),
            started_at=datetime.fromisoformat(data['started_at']) if data.get('started_at') else None,
            completed_at=datetime.fromisoformat(data['completed_at']) if data.get('completed_at') else None,
            current_step=data.get('current_step'),
            steps=steps,
            context=data.get('context', {}),
            error=data.get('error'),
            metadata=data.get('metadata', {})
        )
    
    def add_step(self, step_id: str) -> StepState:
        """Add a new step to the workflow state."""
        if step_id in self.steps:
            raise ValueError(f"Step {step_id} already exists in workflow state")
        
        step_state = StepState(step_id=step_id)
        self.steps[step_id] = step_state
        return step_state
    
    def get_step(self, step_id: str) -> Optional[StepState]:
        """Get step state by ID."""
        return self.steps.get(step_id)
    
    def set_current_step(self, step_id: str) -> None:
        """Set the current active step."""
        if step_id not in self.steps:
            raise ValueError(f"Step {step_id} not found in workflow state")
        self.current_step = step_id
    
    def start_workflow(self) -> None:
        """Mark workflow as started."""
        self.status = WorkflowStatus.RUNNING
        self.started_at = datetime.now()
    
    def complete_workflow(self) -> None:
        """Mark workflow as completed."""
        self.status = WorkflowStatus.COMPLETED
        self.completed_at = datetime.now()
        self.current_step = None
    
    def fail_workflow(self, error: str) -> None:
        """Mark workflow as failed."""
        self.status = WorkflowStatus.FAILED
        self.completed_at = datetime.now()
        self.error = error
    
    def cancel_workflow(self) -> None:
        """Mark workflow as cancelled."""
        self.status = WorkflowStatus.CANCELLED
        self.completed_at = datetime.now()
        self.current_step = None
        
        # Cancel any running steps
        for step in self.steps.values():
            if step.status == StepStatus.RUNNING:
                step.status = StepStatus.CANCELLED
                step.completed_at = datetime.now()
    
    def pause_workflow(self) -> None:
        """Pause the workflow."""
        self.status = WorkflowStatus.PAUSED
    
    def resume_workflow(self) -> None:
        """Resume the workflow."""
        if self.status != WorkflowStatus.PAUSED:
            raise ValueError("Cannot resume workflow that is not paused")
        self.status = WorkflowStatus.RUNNING
    
    def get_completed_steps(self) -> List[StepState]:
        """Get all completed steps."""
        return [step for step in self.steps.values() if step.status == StepStatus.COMPLETED]
    
    def get_failed_steps(self) -> List[StepState]:
        """Get all failed steps."""
        return [step for step in self.steps.values() if step.status == StepStatus.FAILED]
    
    def get_pending_steps(self) -> List[StepState]:
        """Get all pending steps."""
        return [step for step in self.steps.values() if step.status == StepStatus.PENDING]
    
    def is_terminal_state(self) -> bool:
        """Check if workflow is in a terminal state."""
        return self.status in {
            WorkflowStatus.COMPLETED,
            WorkflowStatus.FAILED,
            WorkflowStatus.CANCELLED
        }
    
    def get_progress_percentage(self) -> float:
        """Calculate workflow progress as percentage."""
        if not self.steps:
            return 0.0
        
        completed_count = sum(
            1 for step in self.steps.values()
            if step.status in {StepStatus.COMPLETED, StepStatus.SKIPPED}
        )
        
        return (completed_count / len(self.steps)) * 100.0


class WorkflowStateManager:
    """Manages workflow state persistence and retrieval."""
    
    def __init__(self, storage_path: Optional[Union[str, Path]] = None):
        """Initialize workflow state manager.
        
        Args:
            storage_path: Path to store workflow state files
        """
        self.storage_path = Path(storage_path) if storage_path else Path("./workflow_states")
        self.storage_path.mkdir(exist_ok=True)
        self._states: Dict[str, WorkflowState] = {}
    
    def save_state(self, state: WorkflowState) -> None:
        """Save workflow state to storage.
        
        Args:
            state: Workflow state to save
            
        Raises:
            IOError: If state cannot be saved
        """
        try:
            self._states[state.workflow_id] = state
            
            state_file = self.storage_path / f"{state.workflow_id}.json"
            with open(state_file, 'w', encoding='utf-8') as f:
                json.dump(state.to_dict(), f, indent=2, default=str)
            
            logger.debug(f"Saved workflow state for {state.workflow_id}")
            
        except Exception as e:
            logger.error(f"Failed to save workflow state {state.workflow_id}: {e}")
            raise IOError(f"Failed to save workflow state: {e}") from e
    
    def load_state(self, workflow_id: str) -> Optional[WorkflowState]:
        """Load workflow state from storage.
        
        Args:
            workflow_id: ID of workflow to load
            
        Returns:
            Workflow state if found, None otherwise
            
        Raises:
            IOError: If state file exists but cannot be loaded
        """
        # Check in-memory cache first
        if workflow_id in self._states:
            return self._states[workflow_id]
        
        state_file = self.storage_path / f"{workflow_id}.json"
        if not state_file.exists():
            return None
        
        try:
            with open(state_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            state = WorkflowState.from_dict(data)
            self._states[workflow_id] = state
            
            logger.debug(f"Loaded workflow state for {workflow_id}")
            return state
            
        except Exception as e:
            logger.error(f"Failed to load workflow state {workflow_id}: {e}")
            raise IOError(f"Failed to load workflow state: {e}") from e
    
    def delete_state(self, workflow_id: str) -> bool:
        """Delete workflow state from storage.
        
        Args:
            workflow_id: ID of workflow to delete
            
        Returns:
            True if state was deleted, False if not found
        """
        try:
            # Remove from memory
            self._states.pop(workflow_id, None)
            
            # Remove from disk
            state_file = self.storage_path / f"{workflow_id}.json"
            if state_file.exists():
                state_file.unlink()
                logger.debug(f"Deleted workflow state for {workflow_id}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete workflow state {workflow_id}: {e}")
            return False
    
    def list_workflow_ids(self) -> List[str]:
        """Get list of all stored workflow IDs."""
        workflow_ids = set(self._states.keys())
        
        # Add workflow IDs from disk
        for state_file in self.storage_path.glob("*.json"):
            workflow_id = state_file.stem
            workflow_ids.add(workflow_id)
        
        return list(workflow_ids)
    
    def cleanup_terminal_states(self, max_age_days: int = 30) -> int:
        """Clean up old terminal workflow states.
        
        Args:
            max_age_days: Maximum age in days for terminal states
            
        Returns:
            Number of states cleaned up
        """
        cleanup_count = 0
        cutoff_date = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        cutoff_date = cutoff_date.replace(day=cutoff_date.day - max_age_days)
        
        for workflow_id in list(self.list_workflow_ids()):
            try:
                state = self.load_state(workflow_id)
                if (state and 
                    state.is_terminal_state() and 
                    state.completed_at and 
                    state.completed_at < cutoff_date):
                    
                    self.delete_state(workflow_id)
                    cleanup_count += 1
                    
            except Exception as e:
                logger.warning(f"Error during cleanup of {workflow_id}: {e}")
        
        logger.info(f"Cleaned up {cleanup_count} terminal workflow states")
        return cleanup_count
