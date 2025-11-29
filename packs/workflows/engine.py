"""
High-level workflow engine facade used by tests.

This module delegates to the lightweight YAML-based engine in
`packs.utils.engine` so we don't touch the core `WorkflowGraph`
implementation.
"""

from typing import Any, Dict, List, Tuple

from packs.utils.engine import execute_workflow as _execute_workflow


def execute_workflow(name: str, context: Dict[str, Any] | None = None) -> List[Tuple[str, Any]]:
    """
    Execute a named workflow and return its action results.
    """
    return _execute_workflow(name, context)


def execute_workflow_notify(name: str, context: Dict[str, Any] | None = None) -> List[Tuple[str, Any]]:
    """
    Backwards-compatible alias used in some examples/tests.
    """
    return execute_workflow(name, context)


