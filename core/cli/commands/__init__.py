"""
CLI Commands

Modular command structure for AUTUS CLI
"""

from core.cli.commands.armp import armp_commands
from core.cli.commands.protocol import protocol_commands
from core.cli.commands.memory import memory_commands

__all__ = [
    "armp_commands",
    "protocol_commands",
    "memory_commands",
]
