"""
Compatibility package for workflow engine tests.

This package re-exports the public workflow engine used by tests
without modifying the core `WorkflowGraph` design defined elsewhere.
"""

from . import engine  # noqa: F401


