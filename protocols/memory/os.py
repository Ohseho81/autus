"""
Compatibility wrapper for MemoryOS.

Tests import `protocols.memory.os.MemoryOS`.
This module re-exports MemoryOS from memory_os so both paths work.
"""

from .memory_os import MemoryOS

__all__ = ["MemoryOS"]
