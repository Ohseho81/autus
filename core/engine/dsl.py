"""
AUTUS DSL (Domain Specific Language) Module
Provides a simple DSL for executing commands and workflows.
"""

from __future__ import annotations

import subprocess
import json
from typing import Dict, Any, Optional


class DSLExecutor:
    """Execute DSL commands."""
    
    def __init__(self) -> None:
        self.variables: Dict[str, Any] = {}
    
    def execute(self, command: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Execute a DSL command.
        
        Parameters
        ----------
        command : str
            DSL command to execute
        context : dict, optional
            Execution context with variables
            
        Returns
        -------
        dict
            Execution result
        """
        if context:
            self.variables.update(context)
        
        # Replace variables in command
        for key, value in self.variables.items():
            command = command.replace(f"${{{key}}}", str(value))
            command = command.replace(f"${key}", str(value))
        
        try:
            # Execute as shell command
            result = subprocess.run(
                command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'command': command
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'command': command
            }
    
    def parse_cell(self, cell_definition: str) -> Dict[str, Any]:
        """Parse a cell definition from string."""
        lines = cell_definition.strip().split('\n')
        cell = {}
        
        for line in lines:
            if ':' in line:
                key, value = line.split(':', 1)
                cell[key.strip()] = value.strip()
        
        return cell


# Global executor instance
executor = DSLExecutor()

def execute(command: str, context: Optional[Dict] = None) -> Dict[str, Any]:
    """Execute a DSL command."""
    return executor.execute(command, context)

def parse_cell(cell_definition: str) -> Dict[str, Any]:
    """Parse a cell definition."""
    return executor.parse_cell(cell_definition)
