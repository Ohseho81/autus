"""Utils Pack"""
from pathlib import Path
import sys

# 하위 모듈 자동 로드
_dir = Path(__file__).parent
for py_file in _dir.glob("*.py"):
    if py_file.name != "__init__.py":
        try:
            exec(f"from .{py_file.stem} import *")
        except Exception:
            pass
