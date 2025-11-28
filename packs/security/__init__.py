"""Security Pack - ARMP, Compliance"""
from pathlib import Path
import sys

# 모든 하위 모듈 노출
_dir = Path(__file__).parent
for py_file in _dir.glob("*.py"):
    if py_file.name != "__init__.py":
        module_name = py_file.stem
        try:
            exec(f"from .{module_name} import *")
        except:
            pass
